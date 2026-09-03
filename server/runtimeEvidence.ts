import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  PROVIDER_BODY_REDACTION_POLICY,
  RUNTIME_EVIDENCE_BUNDLE_VERSION,
  type CandidateEvidence,
  type PerfectCorpLifecycleReceipt,
  type ProviderResponseDigest,
  type RetainedProviderResponse,
  type RuntimeCandidateEvidenceManifest,
  type StructuredCandidateEnrichment,
  type VtoOutputDownloadReceipt,
} from '../shared/evidence.ts';
import type { MakeupEffect, SearchResultSet, VtoRender } from '../shared/types.ts';
import { extractResultUrl } from './providers/perfectcorp.ts';
import {
  normalizeShoppingResponse,
  type SerpApiResponseEvidence,
} from './providers/serpapi.ts';
import { ProviderError, stripSignedQuery } from './redact.ts';
import type { CapturedShadeEstimate } from './shadeEstimate.ts';
import {
  applyStructuredEnrichment,
  structuredEnrichmentAdapter,
} from './structuredEnrichment.ts';

export const EXPORT_STORAGE_DISCLOSURE =
  'Versioned exportable evidence for this running server instance. The current deployment has no persistent disk; download the manifest and all four bound artifacts before a restart or redeploy.';

const MAX_VTO_OUTPUT_BYTES = 8 * 1024 * 1024;

function sha256(bytes: Buffer | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function candidatePathKey(candidateId: string): string {
  return sha256(candidateId).slice(0, 20);
}

function jsonArtifact(value: unknown): Buffer {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function manifestUrls(runId: string, candidateId: string) {
  const base = `/api/evidence/runs/${encodeURIComponent(runId)}/candidates/${encodeURIComponent(candidateId)}`;
  return {
    manifest: `${base}/manifest`,
    search: `${base}/search-response`,
    source: `${base}/source-image`,
    lifecycle: `${base}/perfect-lifecycle`,
    output: `${base}/output-image`,
  };
}

interface PerfectLifecycleExport {
  schemaVersion: 1;
  kind: 'lasttube-perfectcorp-evidence-export';
  lifecycle: PerfectCorpLifecycleReceipt;
  outputDownload: VtoOutputDownloadReceipt;
}

interface RunRecord {
  result: SearchResultSet;
  responseEvidence: SerpApiResponseEvidence;
  createdAt: string;
  manifests: Map<string, RuntimeCandidateEvidenceManifest>;
  artifactTypes: Map<string, { source: string; output: string | null }>;
}

export interface RuntimeEvidenceStoreOptions {
  rootDir?: string;
  now?: () => string;
  idFactory?: () => string;
}

function responseDigest(response: RetainedProviderResponse): ProviderResponseDigest {
  return {
    sequence: response.sequence,
    phase: response.phase,
    requestedAt: response.requestedAt,
    receivedAt: response.receivedAt,
    requestUrl: response.requestUrl,
    finalResponseUrl: response.finalResponseUrl,
    redirected: response.redirected,
    httpStatus: response.httpStatus,
    retainedBodySha256: response.retainedBodySha256,
    retainedBodyBytes: response.retainedBodyBytes,
  };
}

function parseRetainedBody(response: RetainedProviderResponse): Record<string, unknown> {
  if (
    Buffer.byteLength(response.retainedBody.bodyText) !== response.retainedBodyBytes ||
    sha256(response.retainedBody.bodyText) !== response.retainedBodySha256
  ) {
    throw new Error(`Perfect ${response.phase} response ${response.sequence} digest mismatch`);
  }
  if (
    response.retainedBody.encoding !== 'utf-8' ||
    response.retainedBody.mediaType !== 'application/json' ||
    response.retainedBody.redactionPolicy !== PROVIDER_BODY_REDACTION_POLICY
  ) {
    throw new Error(`Perfect ${response.phase} response ${response.sequence} format mismatch`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(response.retainedBody.bodyText) as unknown;
  } catch {
    throw new Error(`Perfect ${response.phase} response ${response.sequence} is not JSON`);
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`Perfect ${response.phase} response ${response.sequence} is not an object`);
  }
  return parsed as Record<string, unknown>;
}

function exactMatch(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function validResponseEnvelope(response: RetainedProviderResponse, index: number): boolean {
  const expectedPhase = index === 0 ? 'create' : 'poll';
  const expectedSequence = index === 0 ? 0 : index;
  const requested = Date.parse(response.requestedAt);
  const received = Date.parse(response.receivedAt);
  return (
    response.phase === expectedPhase &&
    response.sequence === expectedSequence &&
    Number.isFinite(requested) &&
    Number.isFinite(received) &&
    received >= requested &&
    response.requestUrl.length > 0 &&
    response.finalResponseUrl.length > 0 &&
    response.httpStatus === 200
  );
}

/**
 * Ephemeral server-side run store. Exact retained artifacts can be downloaded
 * and independently re-hashed during this process lifetime; no persistence is
 * claimed across restart or redeploy.
 */
export class RuntimeEvidenceStore {
  private readonly rootDir: string;
  private readonly now: () => string;
  private readonly idFactory: () => string;
  private readonly runs = new Map<string, RunRecord>();

  constructor(opts: RuntimeEvidenceStoreOptions = {}) {
    this.rootDir = opts.rootDir ?? path.join(os.tmpdir(), 'lasttube-exportable-runs');
    this.now = opts.now ?? (() => new Date().toISOString());
    this.idFactory = opts.idFactory ?? randomUUID;
  }

  private runDir(runId: string): string {
    return path.join(this.rootDir, runId);
  }

  private candidateDir(runId: string, candidateId: string): string {
    return path.join(this.runDir(runId), candidatePathKey(candidateId));
  }

  async openSearchRun(
    result: SearchResultSet,
    responseEvidence: SerpApiResponseEvidence,
  ): Promise<string> {
    if (result.providerStatus !== 'live') {
      throw new ProviderError('Evidence runs require a successful live SerpApi response.');
    }
    if (
      responseEvidence.retainedBody.length !== responseEvidence.retainedBodyBytes ||
      sha256(responseEvidence.retainedBody) !== responseEvidence.retainedBodySha256
    ) {
      throw new ProviderError('Sanitized SerpApi response bytes do not match their digest.');
    }
    try {
      JSON.parse(responseEvidence.retainedBody.toString('utf8')) as unknown;
    } catch {
      throw new ProviderError('Sanitized SerpApi response artifact is not valid JSON.');
    }
    const runId = this.idFactory();
    this.runs.set(runId, {
      result,
      responseEvidence,
      createdAt: this.now(),
      manifests: new Map(),
      artifactTypes: new Map(),
    });
    await fs.promises.mkdir(this.runDir(runId), { recursive: true });
    await fs.promises.writeFile(
      path.join(this.runDir(runId), 'serp-response.json'),
      responseEvidence.retainedBody,
      { mode: 0o600 },
    );
    return runId;
  }

  private run(runId: string): RunRecord {
    const run = this.runs.get(runId);
    if (!run) throw new ProviderError('Evidence run not found or expired; repeat the live search.');
    return run;
  }

  private candidate(run: RunRecord, candidateId: string) {
    const candidate = run.result.candidates.find((item) => item.id === candidateId);
    if (!candidate) throw new ProviderError('Candidate is not part of the bound SerpApi response.');
    return candidate;
  }

  async assertCandidateReadyForVto(
    runId: string,
    candidateId: string,
    effects: MakeupEffect[],
  ): Promise<RuntimeCandidateEvidenceManifest> {
    const manifest = this.getManifest(runId, candidateId);
    if (
      manifest.integrity.state !== 'collecting' ||
      manifest.evidence.sourceImage.state !== 'present' ||
      !manifest.evidence.sourceImage.estimatedHex
    ) {
      throw new ProviderError('Candidate has no retained shade input ready for VTO.');
    }
    const estimatedHex = manifest.evidence.sourceImage.estimatedHex.toLowerCase();
    const requestedColors = effects.flatMap((effect) =>
      effect.palettes.map((palette) => palette.color.toLowerCase()),
    );
    if (!requestedColors.includes(estimatedHex)) {
      throw new ProviderError('Perfect Corp effect does not match the retained shade estimate.');
    }
    const source = await fs.promises.readFile(
      path.join(this.candidateDir(runId, candidateId), 'source-image.bin'),
    );
    if (
      sha256(source) !== manifest.evidence.sourceImage.sha256 ||
      source.length !== manifest.evidence.sourceImage.byteLength
    ) {
      throw new ProviderError('Retained shade input failed its pre-VTO digest check.');
    }
    return manifest;
  }

  private async writeManifest(manifest: RuntimeCandidateEvidenceManifest): Promise<void> {
    const dir = this.candidateDir(manifest.runId, manifest.candidateId);
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(path.join(dir, 'manifest.json'), jsonArtifact(manifest), {
      mode: 0o600,
    });
  }

  async recordSourceImage(input: {
    runId: string;
    candidateId: string;
    requestedUrl: string;
    captured: CapturedShadeEstimate;
    structuredEnrichment?: StructuredCandidateEnrichment;
  }): Promise<RuntimeCandidateEvidenceManifest> {
    const run = this.run(input.runId);
    const candidate = this.candidate(run, input.candidateId);
    if (!candidate.thumbnailUrl || candidate.thumbnailUrl !== input.requestedUrl) {
      throw new ProviderError('Shade input does not match the candidate image in the bound search.');
    }
    const capturedHash = sha256(input.captured.bytes);
    if (
      capturedHash !== input.captured.estimate.sourceImage.sha256 ||
      input.captured.bytes.length !== input.captured.estimate.sourceImage.byteLength
    ) {
      throw new ProviderError('Shade input bytes do not match their recorded digest.');
    }

    const enrichment =
      input.structuredEnrichment ?? (await structuredEnrichmentAdapter.enrich(candidate));
    const dir = this.candidateDir(input.runId, input.candidateId);
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(path.join(dir, 'source-image.bin'), input.captured.bytes, {
      mode: 0o600,
    });

    const urls = manifestUrls(input.runId, input.candidateId);
    const timestamp = this.now();
    const baseEvidence: CandidateEvidence = {
      schemaVersion: 1,
      candidateId: candidate.id,
      listingIdentity: {
        state:
          candidate.title && candidate.productUrl && candidate.sourceUrl ? 'present' : 'unknown',
        observedTitle: candidate.title,
        merchant: candidate.merchant,
        observedOfferUrl: candidate.productUrl,
        sourceUrl: candidate.sourceUrl,
        observedAt: candidate.observedAt,
        sourceReceiptPath: urls.search,
        sourceReceiptSha256: run.responseEvidence.retainedBodySha256,
        basis:
          'Exact normalized listing identity bound to retained sanitized SerpApi response bytes.',
      },
      exactVariant: {
        state: 'unknown',
        value: null,
        basis: 'No trusted structured exact-variant field; title prose is not promoted.',
      },
      exactShade: {
        state: 'unknown',
        value: null,
        basis: 'No trusted structured exact-shade field; title prose is not promoted.',
      },
      finish: {
        state: 'unknown',
        value: null,
        basis: 'No trusted structured finish field; title prose is not promoted.',
      },
      sourceImage: {
        state: 'present',
        listingThumbnailUrl: candidate.thumbnailUrl,
        actualRequestUrl: input.requestedUrl,
        sha256: capturedHash,
        byteLength: input.captured.bytes.length,
        coverage: input.captured.estimate.coverage,
        estimatedHex: input.captured.estimate.hex,
        method: input.captured.estimate.method,
        basis: 'Exact fetched bytes are retained for per-run download and match this digest.',
      },
      sameFaceRender: {
        state: 'unknown',
        proofLevel: 'missing',
        providerStatus: null,
        taskId: null,
        pollCount: null,
        actualSourceFaceUrl: null,
        actualEffectRequest: null,
        lifecycleReceiptPath: null,
        outputImagePath: null,
        outputImageSha256: null,
        outputImageBytes: null,
        basis: 'No candidate VTO lifecycle has been bound to this manifest.',
      },
      systemExclusionReason: null,
    };
    const evidence = applyStructuredEnrichment(baseEvidence, enrichment);
    const manifest: RuntimeCandidateEvidenceManifest = {
      schemaVersion: 2,
      kind: 'candidate-evidence-manifest',
      bundle: {
        format: 'lasttube-candidate-evidence',
        version: RUNTIME_EVIDENCE_BUNDLE_VERSION,
        validationProfile: 'lasttube-evidence-integrity/v2',
        requiredArtifacts: ['searchResponse', 'sourceImage', 'perfectLifecycle', 'outputImage'],
      },
      runId: input.runId,
      candidateId: input.candidateId,
      createdAt: timestamp,
      updatedAt: timestamp,
      storage: {
        mode: 'exportable_per_run',
        persistence: 'ephemeral',
        disclosure: EXPORT_STORAGE_DISCLOSURE,
      },
      searchResponse: {
        provider: 'serpapi',
        providerStatus: 'live',
        query: run.result.query,
        observedAt: run.result.observedAt,
        wireBodySha256: run.responseEvidence.wireBodySha256,
        wireBodyBytes: run.responseEvidence.wireBodyBytes,
        retainedBodySha256: run.responseEvidence.retainedBodySha256,
        retainedBodyBytes: run.responseEvidence.retainedBodyBytes,
        retainedBodyBasis: run.responseEvidence.retainedBodyBasis,
        redactionPolicy: run.responseEvidence.redactionPolicy,
      },
      structuredEnrichment: enrichment,
      vtoLifecycle: null,
      evidence,
      artifacts: {
        manifestUrl: urls.manifest,
        searchResponse: {
          downloadUrl: urls.search,
          mediaType: 'application/json',
          sha256: run.responseEvidence.retainedBodySha256,
          byteLength: run.responseEvidence.retainedBodyBytes,
        },
        sourceImage: {
          downloadUrl: urls.source,
          mediaType: input.captured.mediaType,
          sha256: capturedHash,
          byteLength: input.captured.bytes.length,
        },
        perfectLifecycle: null,
        outputImage: null,
      },
      integrity: {
        state: 'collecting',
        checkedAt: timestamp,
        checks: [
          'sanitized search response retained',
          'listing identity matched',
          'source image re-hashed',
          'structured enrichment policy applied',
        ],
        error: null,
      },
    };
    run.manifests.set(input.candidateId, manifest);
    run.artifactTypes.set(input.candidateId, { source: input.captured.mediaType, output: null });
    await this.writeManifest(manifest);
    return manifest;
  }

  async recordVtoOutput(input: {
    runId: string;
    candidateId: string;
    srcFileUrl: string;
    effects: MakeupEffect[];
    render: VtoRender;
    lifecycleReceipt: PerfectCorpLifecycleReceipt;
    outputBytes: Buffer;
    outputMediaType: string;
    outputDownload: VtoOutputDownloadReceipt;
  }): Promise<RuntimeCandidateEvidenceManifest> {
    const run = this.run(input.runId);
    const candidate = this.candidate(run, input.candidateId);
    const current = run.manifests.get(input.candidateId);
    if (!current || current.evidence.sourceImage.state !== 'present') {
      throw new ProviderError('Candidate source-image evidence must be retained before VTO.');
    }
    await this.assertCandidateReadyForVto(input.runId, input.candidateId, input.effects);
    if (input.render.providerStatus !== 'live' || !input.render.taskId || !input.render.imageUrl) {
      throw new ProviderError('Only a successful live candidate VTO can complete the manifest.');
    }
    if (!input.render.completedAt) {
      throw new ProviderError('Successful candidate VTO has no completion timestamp.');
    }
    if (input.outputBytes.length === 0 || input.outputBytes.length > MAX_VTO_OUTPUT_BYTES) {
      throw new ProviderError('Candidate VTO output is empty or exceeds the evidence size cap.');
    }
    if (!input.outputMediaType.startsWith('image/')) {
      throw new ProviderError('Candidate VTO output is not an image.');
    }

    const outputHash = sha256(input.outputBytes);
    const sourceUrlHash = sha256(input.srcFileUrl);
    const resultUrlHash = sha256(input.render.imageUrl);
    const requestSourceMatchesLifecycle =
      input.lifecycleReceipt.request.srcFileUrlSha256 === sourceUrlHash;
    const requestEffectsMatchLifecycle =
      JSON.stringify(input.lifecycleReceipt.request.effects) === JSON.stringify(input.effects);
    const downloadRequestMatchesResultUrl =
      input.outputDownload.requestedSignedUrlSha256 === resultUrlHash &&
      input.lifecycleReceipt.resultUrlLineage.signedUrlSha256 === resultUrlHash;
    const outputDigestMatchesManifest =
      input.outputDownload.outputSha256 === outputHash &&
      input.outputDownload.outputBytes === input.outputBytes.length;
    if (
      !requestSourceMatchesLifecycle ||
      !requestEffectsMatchLifecycle ||
      !downloadRequestMatchesResultUrl ||
      !outputDigestMatchesManifest
    ) {
      throw new ProviderError('Perfect lifecycle or output lineage does not match this candidate run.');
    }

    const dir = this.candidateDir(input.runId, input.candidateId);
    await fs.promises.writeFile(path.join(dir, 'output-image.bin'), input.outputBytes, {
      mode: 0o600,
    });
    const lifecycleExport: PerfectLifecycleExport = {
      schemaVersion: 1,
      kind: 'lasttube-perfectcorp-evidence-export',
      lifecycle: input.lifecycleReceipt,
      outputDownload: input.outputDownload,
    };
    const lifecycleBytes = jsonArtifact(lifecycleExport);
    await fs.promises.writeFile(path.join(dir, 'perfect-lifecycle.json'), lifecycleBytes, {
      mode: 0o600,
    });

    const urls = manifestUrls(input.runId, input.candidateId);
    const timestamp = this.now();
    const evidence: CandidateEvidence = {
      ...current.evidence,
      sameFaceRender: {
        state: 'present',
        proofLevel: 'verified_lifecycle',
        providerStatus: 'live',
        taskId: input.render.taskId,
        pollCount: input.render.pollCount,
        actualSourceFaceUrl: input.lifecycleReceipt.request.srcFileUrl,
        actualEffectRequest: JSON.stringify(input.effects),
        lifecycleReceiptPath: urls.lifecycle,
        outputImagePath: urls.output,
        outputImageSha256: outputHash,
        outputImageBytes: input.outputBytes.length,
        basis:
          'Versioned export binds sanitized create/poll bodies, request and URL lineage, and retained output bytes.',
      },
    };
    const manifest: RuntimeCandidateEvidenceManifest = {
      ...current,
      updatedAt: timestamp,
      evidence,
      vtoLifecycle: {
        provider: 'perfectcorp',
        request: {
          srcFileUrl: input.lifecycleReceipt.request.srcFileUrl,
          srcFileUrlSha256: sourceUrlHash,
          effects: input.effects,
        },
        outcome: {
          providerStatus: 'live',
          taskId: input.render.taskId,
          pollCount: input.render.pollCount,
          startedAt: input.render.startedAt,
          completedAt: input.render.completedAt,
        },
        responseDigests: [
          responseDigest(input.lifecycleReceipt.create),
          ...input.lifecycleReceipt.polls.map(responseDigest),
        ],
        resultUrlLineage: input.lifecycleReceipt.resultUrlLineage,
        outputDownload: input.outputDownload,
        crossFieldValidation: {
          ...input.lifecycleReceipt.validation,
          requestSourceMatchesLifecycle,
          requestEffectsMatchLifecycle,
          downloadRequestMatchesResultUrl,
          outputDigestMatchesManifest,
        },
      },
      artifacts: {
        ...current.artifacts,
        perfectLifecycle: {
          downloadUrl: urls.lifecycle,
          mediaType: 'application/json',
          sha256: sha256(lifecycleBytes),
          byteLength: lifecycleBytes.length,
        },
        outputImage: {
          downloadUrl: urls.output,
          mediaType: input.outputMediaType,
          sha256: outputHash,
          byteLength: input.outputBytes.length,
        },
      },
      integrity: {
        state: 'collecting',
        checkedAt: timestamp,
        checks: current.integrity.checks,
        error: null,
      },
    };
    run.manifests.set(candidate.id, manifest);
    const types = run.artifactTypes.get(candidate.id)!;
    run.artifactTypes.set(candidate.id, { ...types, output: input.outputMediaType });
    await this.writeManifest(manifest);
    return this.validateManifest(input.runId, input.candidateId);
  }

  async validateManifest(
    runId: string,
    candidateId: string,
  ): Promise<RuntimeCandidateEvidenceManifest> {
    const run = this.run(runId);
    const candidate = this.candidate(run, candidateId);
    const manifest = run.manifests.get(candidateId);
    if (!manifest) throw new ProviderError('Candidate evidence manifest does not exist.');
    const checks: string[] = [];
    try {
      if (
        manifest.schemaVersion !== 2 ||
        manifest.bundle.version !== RUNTIME_EVIDENCE_BUNDLE_VERSION ||
        manifest.bundle.validationProfile !== 'lasttube-evidence-integrity/v2' ||
        !exactMatch(manifest.bundle.requiredArtifacts, [
          'searchResponse',
          'sourceImage',
          'perfectLifecycle',
          'outputImage',
        ])
      ) {
        throw new Error('evidence bundle version mismatch');
      }
      checks.push('bundle schema and validation profile matched');

      const searchBytes = await fs.promises.readFile(
        path.join(this.runDir(runId), 'serp-response.json'),
      );
      if (
        manifest.runId !== runId ||
        manifest.candidateId !== candidateId ||
        sha256(searchBytes) !== manifest.searchResponse.retainedBodySha256 ||
        searchBytes.length !== manifest.searchResponse.retainedBodyBytes ||
        manifest.searchResponse.retainedBodySha256 !==
          manifest.artifacts.searchResponse.sha256 ||
        manifest.searchResponse.retainedBodyBytes !==
          manifest.artifacts.searchResponse.byteLength ||
        manifest.searchResponse.wireBodySha256 !== run.responseEvidence.wireBodySha256 ||
        manifest.searchResponse.wireBodyBytes !== run.responseEvidence.wireBodyBytes ||
        manifest.searchResponse.redactionPolicy !== PROVIDER_BODY_REDACTION_POLICY
      ) {
        throw new Error('search response artifact mismatch');
      }
      const rawSearch = JSON.parse(searchBytes.toString('utf8')) as unknown;
      const normalized = normalizeShoppingResponse(
        rawSearch,
        run.result.query,
        run.result.observedAt,
        'live',
      );
      const retainedCandidate = normalized.candidates.find((item) => item.id === candidateId);
      if (!retainedCandidate || !exactMatch(retainedCandidate, candidate)) {
        throw new Error('listing identity does not normalize from retained search response');
      }
      checks.push('sanitized search bytes re-hashed and listing re-derived');

      const enriched = applyStructuredEnrichment(manifest.evidence, manifest.structuredEnrichment);
      if (
        !exactMatch(enriched.exactVariant, manifest.evidence.exactVariant) ||
        !exactMatch(enriched.exactShade, manifest.evidence.exactShade) ||
        !exactMatch(enriched.finish, manifest.evidence.finish)
      ) {
        throw new Error('structured enrichment fields mismatch');
      }
      checks.push('structured enrichment source and fields validated');

      if (
        manifest.evidence.listingIdentity.observedTitle !== candidate.title ||
        manifest.evidence.listingIdentity.observedOfferUrl !== candidate.productUrl ||
        manifest.evidence.listingIdentity.sourceUrl !== candidate.sourceUrl ||
        manifest.evidence.listingIdentity.sourceReceiptSha256 !==
          manifest.searchResponse.retainedBodySha256 ||
        manifest.evidence.sourceImage.listingThumbnailUrl !== candidate.thumbnailUrl ||
        manifest.evidence.sourceImage.actualRequestUrl !== candidate.thumbnailUrl
      ) {
        throw new Error('listing or source-image identity mismatch');
      }
      checks.push('listing and requested image identity matched');

      const dir = this.candidateDir(runId, candidateId);
      const source = await fs.promises.readFile(path.join(dir, 'source-image.bin'));
      if (
        sha256(source) !== manifest.evidence.sourceImage.sha256 ||
        source.length !== manifest.evidence.sourceImage.byteLength ||
        sha256(source) !== manifest.artifacts.sourceImage?.sha256 ||
        source.length !== manifest.artifacts.sourceImage?.byteLength
      ) {
        throw new Error('source image digest mismatch');
      }
      checks.push('source image bytes re-hashed');

      if (!manifest.vtoLifecycle || !manifest.artifacts.perfectLifecycle) {
        throw new Error('Perfect lifecycle artifact missing');
      }
      const lifecycleBytes = await fs.promises.readFile(path.join(dir, 'perfect-lifecycle.json'));
      if (
        sha256(lifecycleBytes) !== manifest.artifacts.perfectLifecycle.sha256 ||
        lifecycleBytes.length !== manifest.artifacts.perfectLifecycle.byteLength
      ) {
        throw new Error('Perfect lifecycle artifact digest mismatch');
      }
      const lifecycleExport = JSON.parse(lifecycleBytes.toString('utf8')) as PerfectLifecycleExport;
      if (
        lifecycleExport.schemaVersion !== 1 ||
        lifecycleExport.kind !== 'lasttube-perfectcorp-evidence-export'
      ) {
        throw new Error('Perfect lifecycle export version mismatch');
      }
      const lifecycle = lifecycleExport.lifecycle;
      const allResponses = [lifecycle.create, ...lifecycle.polls];
      if (!allResponses.every(validResponseEnvelope)) {
        throw new Error('Perfect response order, timestamps, URL lineage, or status mismatch');
      }
      const reparsed = allResponses.map(parseRetainedBody);
      if (!exactMatch(allResponses.map(responseDigest), manifest.vtoLifecycle.responseDigests)) {
        throw new Error('Perfect response digest index mismatch');
      }
      const createTaskId = (
        reparsed[0]?.data as Record<string, unknown> | undefined
      )?.task_id;
      const selectedIndex = allResponses.findIndex(
        (response) =>
          response.phase === 'poll' &&
          response.sequence === lifecycle.resultUrlLineage.selectedFromPollSequence,
      );
      const selectedData = reparsed[selectedIndex]?.data as
        | {
            task_status?: string;
            results?:
              | Array<{ download_url?: string; url?: string }>
              | { download_url?: string; url?: string };
          }
        | undefined;
      const selectedUrl = selectedData ? extractResultUrl(selectedData) : null;
      const pollTaskIds = reparsed.slice(1).map(
        (response) => (response.data as Record<string, unknown> | undefined)?.task_id,
      );
      const mismatches = pollTaskIds.flatMap((taskId, index) =>
        typeof taskId === 'string' && taskId !== createTaskId ? [index + 1] : [],
      );
      const recomputedProviderValidation = {
        createTaskIdPresent: typeof createTaskId === 'string' && createTaskId.length > 0,
        pollTaskIdsMatchCreate: mismatches.length === 0,
        mismatchedPollSequences: mismatches,
        finalStatusMatchesRender: selectedData?.task_status === 'success',
        pollCountMatchesResponses:
          lifecycle.polls.length === manifest.vtoLifecycle.outcome.pollCount,
        successResultUrlPresent:
          Boolean(selectedUrl) && selectedUrl === lifecycle.resultUrlLineage.sanitizedUrl,
      };
      if (
        createTaskId !== manifest.vtoLifecycle.outcome.taskId ||
        !exactMatch(recomputedProviderValidation, lifecycle.validation) ||
        lifecycle.request.srcFileUrlSha256 !== manifest.vtoLifecycle.request.srcFileUrlSha256 ||
        lifecycle.request.srcFileUrl !== manifest.vtoLifecycle.request.srcFileUrl ||
        !exactMatch(lifecycle.request.effects, manifest.vtoLifecycle.request.effects) ||
        lifecycle.resultUrlLineage.signedUrlSha256 !==
          manifest.vtoLifecycle.resultUrlLineage.signedUrlSha256
      ) {
        throw new Error('Perfect lifecycle cross-field validation mismatch');
      }
      checks.push('every Perfect response body and lifecycle cross-field revalidated');

      const output = await fs.promises.readFile(path.join(dir, 'output-image.bin'));
      const outputDownload = lifecycleExport.outputDownload;
      if (
        sha256(output) !== manifest.evidence.sameFaceRender.outputImageSha256 ||
        output.length !== manifest.evidence.sameFaceRender.outputImageBytes ||
        sha256(output) !== manifest.artifacts.outputImage?.sha256 ||
        output.length !== manifest.artifacts.outputImage?.byteLength ||
        outputDownload.outputSha256 !== sha256(output) ||
        outputDownload.outputBytes !== output.length ||
        outputDownload.requestedSignedUrlSha256 !==
          lifecycle.resultUrlLineage.signedUrlSha256 ||
        outputDownload.requestedUrl !== lifecycle.resultUrlLineage.sanitizedUrl ||
        !exactMatch(outputDownload, manifest.vtoLifecycle.outputDownload)
      ) {
        throw new Error('output bytes or download URL lineage mismatch');
      }
      checks.push('output bytes and redirect-safe download lineage revalidated');

      const requiredChecks = manifest.vtoLifecycle.crossFieldValidation;
      if (
        !Object.entries(requiredChecks)
          .filter(([key]) => key !== 'mismatchedPollSequences')
          .every(([, value]) => value === true) ||
        requiredChecks.mismatchedPollSequences.length > 0 ||
        manifest.evidence.sameFaceRender.proofLevel !== 'verified_lifecycle' ||
        manifest.evidence.sameFaceRender.taskId !== manifest.vtoLifecycle.outcome.taskId ||
        manifest.evidence.sameFaceRender.pollCount !== manifest.vtoLifecycle.outcome.pollCount ||
        manifest.evidence.sameFaceRender.lifecycleReceiptPath !==
          manifest.artifacts.perfectLifecycle.downloadUrl ||
        manifest.evidence.sameFaceRender.outputImagePath !==
          manifest.artifacts.outputImage?.downloadUrl
      ) {
        throw new Error('manifest proof fields or validation results incomplete');
      }
      checks.push('manifest proof fields and all validation results passed');

      const checkedAt = this.now();
      const validated: RuntimeCandidateEvidenceManifest = {
        ...manifest,
        updatedAt: checkedAt,
        integrity: { state: 'validated', checkedAt, checks, error: null },
      };
      run.manifests.set(candidateId, validated);
      await this.writeManifest(validated);
      return validated;
    } catch (err) {
      const checkedAt = this.now();
      const invalid: RuntimeCandidateEvidenceManifest = {
        ...manifest,
        updatedAt: checkedAt,
        integrity: {
          state: 'invalid',
          checkedAt,
          checks,
          error: (err as Error).message,
        },
      };
      run.manifests.set(candidateId, invalid);
      await this.writeManifest(invalid);
      return invalid;
    }
  }

  getManifest(runId: string, candidateId: string): RuntimeCandidateEvidenceManifest {
    const manifest = this.run(runId).manifests.get(candidateId);
    if (!manifest) throw new ProviderError('Candidate evidence manifest does not exist.');
    return manifest;
  }

  async getValidatedManifest(
    runId: string,
    candidateId: string,
  ): Promise<RuntimeCandidateEvidenceManifest> {
    const manifest = await this.validateManifest(runId, candidateId);
    if (manifest.integrity.state !== 'validated') {
      throw new ProviderError(`Candidate evidence manifest is invalid: ${manifest.integrity.error}`);
    }
    return manifest;
  }

  async readArtifact(
    runId: string,
    candidateId: string,
    kind: 'search' | 'source' | 'lifecycle' | 'output',
  ): Promise<{ bytes: Buffer; mediaType: string; fileName: string }> {
    const manifest = await this.getValidatedManifest(runId, candidateId);
    const run = this.run(runId);
    const types = run.artifactTypes.get(candidateId);
    const candidates = {
      search: {
        file: path.join(this.runDir(runId), 'serp-response.json'),
        mediaType: 'application/json',
        suffix: 'sanitized-serp-response.json',
        available: true,
      },
      source: {
        file: path.join(this.candidateDir(runId, candidateId), 'source-image.bin'),
        mediaType: types?.source ?? '',
        suffix: 'source-image',
        available: Boolean(types?.source && manifest.artifacts.sourceImage),
      },
      lifecycle: {
        file: path.join(this.candidateDir(runId, candidateId), 'perfect-lifecycle.json'),
        mediaType: 'application/json',
        suffix: 'perfect-lifecycle.json',
        available: Boolean(manifest.artifacts.perfectLifecycle),
      },
      output: {
        file: path.join(this.candidateDir(runId, candidateId), 'output-image.bin'),
        mediaType: types?.output ?? '',
        suffix: 'output-image',
        available: Boolean(types?.output && manifest.artifacts.outputImage),
      },
    } as const;
    const artifact = candidates[kind];
    if (!artifact.available) throw new ProviderError('Requested evidence artifact does not exist.');
    return {
      bytes: await fs.promises.readFile(artifact.file),
      mediaType: artifact.mediaType,
      fileName: `${candidatePathKey(candidateId)}-${artifact.suffix}`,
    };
  }
}

export async function downloadVtoOutput(
  signedUrl: string,
  fetchImpl: typeof fetch = fetch,
  now: () => string = () => new Date().toISOString(),
): Promise<{ bytes: Buffer; mediaType: string; receipt: VtoOutputDownloadReceipt }> {
  let url: URL;
  try {
    url = new URL(signedUrl);
  } catch {
    throw new ProviderError('Perfect Corp returned an invalid output URL.');
  }
  if (url.protocol !== 'https:') {
    throw new ProviderError('Perfect Corp output URL must use HTTPS.');
  }
  const requestedAt = now();
  const response = await fetchImpl(url);
  const receivedAt = now();
  if (!response.ok) {
    throw new ProviderError(`Perfect Corp output download failed: HTTP ${response.status}`);
  }
  const mediaType = response.headers.get('content-type')?.split(';')[0]?.trim() || '';
  if (!mediaType.startsWith('image/')) {
    throw new ProviderError('Perfect Corp output download returned a non-image content type.');
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_VTO_OUTPUT_BYTES) {
    throw new ProviderError('Perfect Corp output is empty or exceeds the evidence size cap.');
  }
  return {
    bytes,
    mediaType,
    receipt: {
      requestedAt,
      receivedAt,
      requestedSignedUrlSha256: sha256(signedUrl),
      requestedUrl: stripSignedQuery(signedUrl),
      finalResponseUrl: stripSignedQuery(response.url || signedUrl),
      redirected: response.redirected,
      httpStatus: response.status,
      mediaType,
      outputSha256: sha256(bytes),
      outputBytes: bytes.length,
    },
  };
}

export const runtimeEvidenceStore = new RuntimeEvidenceStore();
