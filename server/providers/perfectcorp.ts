// Perfect Corp YouCam (YCE) Makeup Virtual Try-On client.
// Flow: POST task/makeup-vto -> task_id -> bounded poll -> signed result URL.
// Docs: https://docs.perfectcorp.com/reference/description/ai_makeup_vto.md
// Polling MUST stay under a 10s gap (tasks are dropped otherwise) and the
// whole lifecycle is bounded and failure-safe: a stuck task returns 'failed',
// it never spins forever.

import { createHash } from 'node:crypto';
import {
  PROVIDER_BODY_REDACTION_POLICY,
  type PerfectCorpLifecycleReceipt,
  type RetainedProviderResponse,
} from '../../shared/evidence.ts';
import type { MakeupEffect, VtoRender } from '../../shared/types.ts';
import {
  ProviderError,
  redactSecrets,
  sanitizeProviderResponseBody,
  sanitizeProviderString,
  stripSignedQuery,
} from '../redact.ts';

// Effect constructors live in shared/effects.ts (used by client and server);
// re-exported here so provider consumers and tests have one import surface.
export { foundationEffect, lipColorEffect } from '../../shared/effects.ts';

export const RESULT_EXPIRY_NOTE =
  'Rendered by Perfect Corp Makeup VTO. Result URLs are signed and expire (~2 hours); persisted copies are downloaded, not hotlinked.';

export interface PerfectCorpClientOptions {
  apiKey: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  /** Milliseconds between polls. Default 2000; must stay well under 10000. */
  pollIntervalMs?: number;
  /** Total polling budget in milliseconds. Default 120000. */
  pollBudgetMs?: number;
  /** Injectable sleeper so tests run without real waiting. */
  sleep?: (ms: number) => Promise<void>;
  /** Injectable clock for deterministic receipt tests. */
  now?: () => string;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function headers(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

function base(opts: PerfectCorpClientOptions): string {
  return opts.baseUrl ?? 'https://yce-api-01.makeupar.com';
}

async function requestJson(
  url: string,
  init: RequestInit,
  fetchImpl: typeof fetch,
  receipt: {
    phase: 'create' | 'poll';
    sequence: number;
    now: () => string;
    secretValues: readonly string[];
  },
): Promise<{
  status: number;
  json: unknown;
  bodyText: string;
  responseReceipt: RetainedProviderResponse;
}> {
  const requestedAt = receipt.now();
  let res: Response;
  try {
    res = await fetchImpl(url, init);
  } catch (err) {
    throw new ProviderError(`Perfect Corp request did not complete: ${(err as Error).message}`);
  }
  const bodyText = await res.text();
  const receivedAt = receipt.now();
  const retainedBodyText = sanitizeProviderResponseBody(bodyText, receipt.secretValues);
  const retainedBodyBytes = Buffer.byteLength(retainedBodyText);
  const responseReceipt: RetainedProviderResponse = {
    sequence: receipt.sequence,
    phase: receipt.phase,
    requestedAt,
    receivedAt,
    requestUrl: sanitizeProviderString(stripSignedQuery(url), receipt.secretValues),
    finalResponseUrl: sanitizeProviderString(stripSignedQuery(res.url || url), receipt.secretValues),
    redirected: res.redirected,
    httpStatus: res.status,
    retainedBodySha256: createHash('sha256').update(retainedBodyText).digest('hex'),
    retainedBodyBytes,
    retainedBody: {
      mediaType: 'application/json',
      encoding: 'utf-8',
      redactionPolicy: PROVIDER_BODY_REDACTION_POLICY,
      bodyText: retainedBodyText,
    },
  };
  let json: unknown = null;
  try {
    json = JSON.parse(bodyText) as unknown;
  } catch {
    // leave json null; callers decide
  }
  return { status: res.status, json, bodyText, responseReceipt };
}

interface TaskCreateData {
  task_id?: string;
}

async function createMakeupVtoTaskObserved(
  srcFileUrl: string,
  effects: MakeupEffect[],
  opts: PerfectCorpClientOptions,
): Promise<{ taskId: string; response: RetainedProviderResponse }> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const now = opts.now ?? (() => new Date().toISOString());
  const url = `${base(opts)}/s2s/v2.0/task/makeup-vto`;
  const { status, json, bodyText, responseReceipt } = await requestJson(
    url,
    {
      method: 'POST',
      headers: headers(opts.apiKey),
      body: JSON.stringify({ src_file_url: srcFileUrl, effects, version: '1.0' }),
    },
    fetchImpl,
    { phase: 'create', sequence: 0, now, secretValues: [opts.apiKey] },
  );
  if (status !== 200) {
    throw new ProviderError(
      `Perfect Corp task create HTTP ${status}: ${sanitizeProviderString(bodyText.slice(0, 300), [opts.apiKey])}`,
    );
  }
  const data = (json as { data?: TaskCreateData } | null)?.data;
  const taskId = data?.task_id;
  if (typeof taskId !== 'string' || taskId.length === 0) {
    throw new ProviderError('Perfect Corp task create succeeded but returned no task_id.');
  }
  return { taskId, response: responseReceipt };
}

/** Create a makeup-vto task from a publicly accessible selfie URL. */
export async function createMakeupVtoTask(
  srcFileUrl: string,
  effects: MakeupEffect[],
  opts: PerfectCorpClientOptions,
): Promise<string> {
  return (await createMakeupVtoTaskObserved(srcFileUrl, effects, opts)).taskId;
}

export interface PollOutcome {
  taskStatus: 'success' | 'error' | 'timeout';
  imageUrl: string | null;
  pollCount: number;
  /** Redacted engine error details when taskStatus === 'error'. */
  errorDetail: string | null;
}

interface TaskPollData {
  task_id?: string;
  task_status?: string;
  results?: Array<{ download_url?: string; url?: string }> | { url?: string; download_url?: string };
  failure_reason?: string;
  error?: string;
  error_message?: string;
  polling_interval?: number;
}

interface ObservedPollOutcome {
  outcome: PollOutcome;
  responses: RetainedProviderResponse[];
  selectedPollSequence: number | null;
  mismatchedTaskIdSequences: number[];
}

/** The docs show two success shapes; accept both. */
export function extractResultUrl(data: TaskPollData): string | null {
  const results = data.results;
  if (!results) return null;
  if (Array.isArray(results)) {
    for (const r of results) {
      const u = r?.download_url ?? r?.url;
      if (typeof u === 'string' && u.length > 0) return u;
    }
    return null;
  }
  const u = results.download_url ?? results.url;
  return typeof u === 'string' && u.length > 0 ? u : null;
}

/** Bounded poll loop. Never exceeds the budget; never gaps past 10s. */
async function pollMakeupVtoTaskObserved(
  taskId: string,
  opts: PerfectCorpClientOptions,
): Promise<ObservedPollOutcome> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const sleep = opts.sleep ?? defaultSleep;
  const now = opts.now ?? (() => new Date().toISOString());
  const intervalMs = Math.min(opts.pollIntervalMs ?? 2000, 9000);
  const budgetMs = opts.pollBudgetMs ?? 120_000;
  const maxPolls = Math.max(1, Math.ceil(budgetMs / intervalMs));
  const url = `${base(opts)}/s2s/v2.0/task/makeup-vto/${encodeURIComponent(taskId)}`;

  let pollCount = 0;
  const responses: RetainedProviderResponse[] = [];
  const mismatchedTaskIdSequences: number[] = [];
  for (let i = 0; i < maxPolls; i += 1) {
    const sequence = i + 1;
    const { status, json, bodyText, responseReceipt } = await requestJson(
      url,
      { method: 'GET', headers: headers(opts.apiKey) },
      fetchImpl,
      { phase: 'poll', sequence, now, secretValues: [opts.apiKey] },
    );
    responses.push(responseReceipt);
    pollCount += 1;
    if (status !== 200) {
      return {
        outcome: {
          taskStatus: 'error',
          imageUrl: null,
          pollCount,
          errorDetail: sanitizeProviderString(`HTTP ${status}: ${bodyText.slice(0, 300)}`, [opts.apiKey]),
        },
        responses,
        selectedPollSequence: null,
        mismatchedTaskIdSequences,
      };
    }
    const data = ((json as { data?: TaskPollData } | null)?.data ?? {}) as TaskPollData;
    if (typeof data.task_id === 'string' && data.task_id !== taskId) {
      mismatchedTaskIdSequences.push(sequence);
    }
    const taskStatus = data.task_status;
    if (taskStatus === 'success') {
      return {
        outcome: {
          taskStatus: 'success',
          imageUrl: extractResultUrl(data),
          pollCount,
          errorDetail: null,
        },
        responses,
        selectedPollSequence: sequence,
        mismatchedTaskIdSequences,
      };
    }
    if (taskStatus === 'error') {
      const detail = [data.error, data.error_message, data.failure_reason]
        .filter((s): s is string => typeof s === 'string' && s.length > 0)
        .join(' — ');
      return {
        outcome: {
          taskStatus: 'error',
          imageUrl: null,
          pollCount,
          errorDetail: redactSecrets(detail || 'engine error with no detail'),
        },
        responses,
        selectedPollSequence: sequence,
        mismatchedTaskIdSequences,
      };
    }
    // running / queued / processing — wait and try again, within budget.
    if (i < maxPolls - 1) await sleep(intervalMs);
  }
  return {
    outcome: {
      taskStatus: 'timeout',
      imageUrl: null,
      pollCount,
      errorDetail: `polling budget (${budgetMs}ms) exhausted before the task finished`,
    },
    responses,
    selectedPollSequence: null,
    mismatchedTaskIdSequences,
  };
}

/** Bounded poll loop. Public compatibility wrapper omits receipt internals. */
export async function pollMakeupVtoTask(
  taskId: string,
  opts: PerfectCorpClientOptions,
): Promise<PollOutcome> {
  return (await pollMakeupVtoTaskObserved(taskId, opts)).outcome;
}

export interface MakeupVtoRunWithEvidence {
  render: VtoRender;
  /** Present only for a successful lifecycle whose complete responses were retained. */
  lifecycleReceipt: PerfectCorpLifecycleReceipt | null;
}

/** Full lifecycle plus sanitized create/poll response evidence. Never throws. */
export async function runMakeupVtoWithEvidence(
  srcFileUrl: string,
  effects: MakeupEffect[],
  opts: PerfectCorpClientOptions,
): Promise<MakeupVtoRunWithEvidence> {
  const now = opts.now ?? (() => new Date().toISOString());
  const startedAt = now();
  let taskId: string | null = null;
  try {
    const created = await createMakeupVtoTaskObserved(srcFileUrl, effects, opts);
    taskId = created.taskId;
    const observedPoll = await pollMakeupVtoTaskObserved(taskId, opts);
    const outcome = observedPoll.outcome;
    const completedAt = now();
    if (outcome.taskStatus === 'success' && outcome.imageUrl) {
      const selectedPollSequence = observedPoll.selectedPollSequence;
      if (selectedPollSequence === null) {
        throw new ProviderError('Perfect Corp success had no selected poll response.');
      }
      const sanitizedSourceUrl = stripSignedQuery(srcFileUrl);
      const sanitizedResultUrl = stripSignedQuery(outcome.imageUrl);
      const render: VtoRender = {
        providerStatus: 'live',
        provider: 'perfectcorp',
        taskId,
        imageUrl: outcome.imageUrl,
        startedAt,
        completedAt,
        pollCount: outcome.pollCount,
        expiryNote: RESULT_EXPIRY_NOTE,
      };
      return {
        render,
        lifecycleReceipt: {
          schemaVersion: 1,
          kind: 'perfectcorp-makeup-vto-lifecycle',
          provider: 'perfectcorp',
          startedAt,
          completedAt,
          request: {
            srcFileUrl: sanitizedSourceUrl,
            srcFileUrlSha256: createHash('sha256').update(srcFileUrl).digest('hex'),
            effects,
          },
          create: created.response,
          polls: observedPoll.responses,
          resultUrlLineage: {
            selectedFromPollSequence: selectedPollSequence,
            signedUrlSha256: createHash('sha256').update(outcome.imageUrl).digest('hex'),
            sanitizedUrl: sanitizedResultUrl,
          },
          validation: {
            createTaskIdPresent: true,
            pollTaskIdsMatchCreate: observedPoll.mismatchedTaskIdSequences.length === 0,
            mismatchedPollSequences: observedPoll.mismatchedTaskIdSequences,
            finalStatusMatchesRender: true,
            pollCountMatchesResponses: outcome.pollCount === observedPoll.responses.length,
            successResultUrlPresent: true,
          },
        },
      };
    }
    return {
      render: {
        providerStatus: 'failed',
        provider: 'perfectcorp',
        taskId,
        imageUrl: null,
        startedAt,
        completedAt,
        pollCount: outcome.pollCount,
        expiryNote: RESULT_EXPIRY_NOTE,
        error:
          outcome.taskStatus === 'timeout'
            ? outcome.errorDetail ?? 'timeout'
            : `Perfect Corp engine error: ${outcome.errorDetail ?? 'unknown'}`,
      },
      lifecycleReceipt: null,
    };
  } catch (err) {
    return {
      render: {
        providerStatus: 'failed',
        provider: 'perfectcorp',
        taskId,
        imageUrl: null,
        startedAt,
        completedAt: now(),
        pollCount: 0,
        expiryNote: RESULT_EXPIRY_NOTE,
        error: redactSecrets((err as Error).message),
      },
      lifecycleReceipt: null,
    };
  }
}

/** Full lifecycle compatibility wrapper used by existing proof scripts. */
export async function runMakeupVto(
  srcFileUrl: string,
  effects: MakeupEffect[],
  opts: PerfectCorpClientOptions,
): Promise<VtoRender> {
  return (await runMakeupVtoWithEvidence(srcFileUrl, effects, opts)).render;
}

/** Current credit balance — used by proof scripts to receipt actual spend. */
export async function getCreditBalance(
  opts: PerfectCorpClientOptions,
): Promise<{ status: number; json: unknown }> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const { status, json } = await requestJson(
    `${base(opts)}/s2s/v1.0/client/credit`,
    { method: 'GET', headers: headers(opts.apiKey) },
    fetchImpl,
    {
      phase: 'create',
      sequence: 0,
      now: opts.now ?? (() => new Date().toISOString()),
      secretValues: [opts.apiKey],
    },
  );
  return { status, json };
}
