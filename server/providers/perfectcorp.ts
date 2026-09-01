// Perfect Corp YouCam (YCE) Makeup Virtual Try-On client.
// Flow: POST task/makeup-vto -> task_id -> bounded poll -> signed result URL.
// Docs: https://docs.perfectcorp.com/reference/description/ai_makeup_vto.md
// Polling MUST stay under a 10s gap (tasks are dropped otherwise) and the
// whole lifecycle is bounded and failure-safe: a stuck task returns 'failed',
// it never spins forever.

import type { MakeupEffect, VtoRender } from '../../shared/types.ts';
import { ProviderError, redactSecrets } from '../redact.ts';

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
): Promise<{ status: number; json: unknown; bodyText: string }> {
  let res: Response;
  try {
    res = await fetchImpl(url, init);
  } catch (err) {
    throw new ProviderError(`Perfect Corp request did not complete: ${(err as Error).message}`);
  }
  const bodyText = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(bodyText) as unknown;
  } catch {
    // leave json null; callers decide
  }
  return { status: res.status, json, bodyText };
}

interface TaskCreateData {
  task_id?: string;
}

/** Create a makeup-vto task from a publicly accessible selfie URL. */
export async function createMakeupVtoTask(
  srcFileUrl: string,
  effects: MakeupEffect[],
  opts: PerfectCorpClientOptions,
): Promise<string> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const url = `${base(opts)}/s2s/v2.0/task/makeup-vto`;
  const { status, json, bodyText } = await requestJson(
    url,
    {
      method: 'POST',
      headers: headers(opts.apiKey),
      body: JSON.stringify({ src_file_url: srcFileUrl, effects, version: '1.0' }),
    },
    fetchImpl,
  );
  if (status !== 200) {
    throw new ProviderError(`Perfect Corp task create HTTP ${status}: ${bodyText.slice(0, 300)}`);
  }
  const data = (json as { data?: TaskCreateData } | null)?.data;
  const taskId = data?.task_id;
  if (typeof taskId !== 'string' || taskId.length === 0) {
    throw new ProviderError('Perfect Corp task create succeeded but returned no task_id.');
  }
  return taskId;
}

export interface PollOutcome {
  taskStatus: 'success' | 'error' | 'timeout';
  imageUrl: string | null;
  pollCount: number;
  /** Redacted engine error details when taskStatus === 'error'. */
  errorDetail: string | null;
}

interface TaskPollData {
  task_status?: string;
  results?: Array<{ download_url?: string; url?: string }> | { url?: string; download_url?: string };
  failure_reason?: string;
  error?: string;
  error_message?: string;
  polling_interval?: number;
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
export async function pollMakeupVtoTask(
  taskId: string,
  opts: PerfectCorpClientOptions,
): Promise<PollOutcome> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const sleep = opts.sleep ?? defaultSleep;
  const intervalMs = Math.min(opts.pollIntervalMs ?? 2000, 9000);
  const budgetMs = opts.pollBudgetMs ?? 120_000;
  const maxPolls = Math.max(1, Math.ceil(budgetMs / intervalMs));
  const url = `${base(opts)}/s2s/v2.0/task/makeup-vto/${encodeURIComponent(taskId)}`;

  let pollCount = 0;
  for (let i = 0; i < maxPolls; i += 1) {
    const { status, json, bodyText } = await requestJson(
      url,
      { method: 'GET', headers: headers(opts.apiKey) },
      fetchImpl,
    );
    pollCount += 1;
    if (status !== 200) {
      return {
        taskStatus: 'error',
        imageUrl: null,
        pollCount,
        errorDetail: redactSecrets(`HTTP ${status}: ${bodyText.slice(0, 300)}`),
      };
    }
    const data = ((json as { data?: TaskPollData } | null)?.data ?? {}) as TaskPollData;
    const taskStatus = data.task_status;
    if (taskStatus === 'success') {
      return {
        taskStatus: 'success',
        imageUrl: extractResultUrl(data),
        pollCount,
        errorDetail: null,
      };
    }
    if (taskStatus === 'error') {
      const detail = [data.error, data.error_message, data.failure_reason]
        .filter((s): s is string => typeof s === 'string' && s.length > 0)
        .join(' — ');
      return {
        taskStatus: 'error',
        imageUrl: null,
        pollCount,
        errorDetail: redactSecrets(detail || 'engine error with no detail'),
      };
    }
    // running / queued / processing — wait and try again, within budget.
    if (i < maxPolls - 1) await sleep(intervalMs);
  }
  return {
    taskStatus: 'timeout',
    imageUrl: null,
    pollCount,
    errorDetail: `polling budget (${budgetMs}ms) exhausted before the task finished`,
  };
}

/** Full lifecycle: create -> poll -> typed VtoRender. Never throws. */
export async function runMakeupVto(
  srcFileUrl: string,
  effects: MakeupEffect[],
  opts: PerfectCorpClientOptions,
): Promise<VtoRender> {
  const startedAt = new Date().toISOString();
  let taskId: string | null = null;
  try {
    taskId = await createMakeupVtoTask(srcFileUrl, effects, opts);
    const outcome = await pollMakeupVtoTask(taskId, opts);
    if (outcome.taskStatus === 'success' && outcome.imageUrl) {
      return {
        providerStatus: 'live',
        provider: 'perfectcorp',
        taskId,
        imageUrl: outcome.imageUrl,
        startedAt,
        completedAt: new Date().toISOString(),
        pollCount: outcome.pollCount,
        expiryNote: RESULT_EXPIRY_NOTE,
      };
    }
    return {
      providerStatus: 'failed',
      provider: 'perfectcorp',
      taskId,
      imageUrl: null,
      startedAt,
      completedAt: new Date().toISOString(),
      pollCount: outcome.pollCount,
      expiryNote: RESULT_EXPIRY_NOTE,
      error:
        outcome.taskStatus === 'timeout'
          ? outcome.errorDetail ?? 'timeout'
          : `Perfect Corp engine error: ${outcome.errorDetail ?? 'unknown'}`,
    };
  } catch (err) {
    return {
      providerStatus: 'failed',
      provider: 'perfectcorp',
      taskId,
      imageUrl: null,
      startedAt,
      completedAt: new Date().toISOString(),
      pollCount: 0,
      expiryNote: RESULT_EXPIRY_NOTE,
      error: redactSecrets((err as Error).message),
    };
  }
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
  );
  return { status, json };
}
