import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { MakeupEffect, SearchResultSet, VtoRender } from '../shared/types.ts';
import type {
  CandidateEvidence,
  RuntimeCandidateEvidenceManifest,
} from '../shared/evidence.ts';
import type { CapturedShadeEstimate } from './shadeEstimate.ts';
import type { SerpApiResponseDigest } from './providers/serpapi.ts';
import { ProviderError } from './redact.ts';

export const EXPORT_STORAGE_DISCLOSURE =
  'Exportable evidence for this running server instance. The current deployment has no persistent disk; download the manifest and both bound images before a restart or redeploy.';

const MAX_VTO_OUTPUT_BYTES = 8 * 1024 * 1024;

function sha256(bytes: Buffer | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function candidatePathKey(candidateId: string): string {
  return sha256(candidateId).slice(0, 20);
}

function manifestUrls(runId: string, candidateId: string) {
  const base = `/api/evidence/runs/${encodeURIComponent(runId)}/candidates/${encodeURIComponent(candidateId)}`;
  return {
    manifest: `${base}/manifest`,
    source: `${base}/source-image`,
    output: `${base}/output-image`,
  };
}

interface RunRecord {
  result: SearchResultSet;
  digest: SerpApiResponseDigest;
  createdAt: string;
  manifests: Map<string, RuntimeCandidateEvidenceManifest>;
  artifactTypes: Map<string, { source: string; output: string | null }>;
}

export interface RuntimeEvidenceStoreOptions {
  rootDir?: string;
  now?: () => string;
  idFactory?: () => string;
}

/**
 * Ephemeral server-side run store. It writes exact input/output bytes locally
 * so they can be downloaded and re-hashed during the current server lifetime.
 * It deliberately makes no persistence claim across restart or redeploy.
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

  openSearchRun(result: SearchResultSet, digest: SerpApiResponseDigest): string {
    if (result.providerStatus !== 'live') {
      throw new ProviderError('Evidence runs require a successful live SerpApi response.');
    }
    const runId = this.idFactory();
    this.runs.set(runId, {
      result,
      digest,
      createdAt: this.now(),
      manifests: new Map(),
      artifactTypes: new Map(),
    });
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

  private candidateDir(runId: string, candidateId: string): string {
    return path.join(this.rootDir, runId, candidatePathKey(candidateId));
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
    await fs.promises.writeFile(
      path.join(dir, 'manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
      { mode: 0o600 },
    );
  }

  async recordSourceImage(input: {
    runId: string;
    candidateId: string;
    requestedUrl: string;
    captured: CapturedShadeEstimate;
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

    const dir = this.candidateDir(input.runId, input.candidateId);
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(path.join(dir, 'source-image.bin'), input.captured.bytes, {
      mode: 0o600,
    });

    const urls = manifestUrls(input.runId, input.candidateId);
    const timestamp = this.now();
    const evidence: CandidateEvidence = {
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
        sourceReceiptPath: urls.manifest,
        sourceReceiptSha256: run.digest.sha256,
        basis:
          'Exact normalized listing identity bound to the SHA-256 of the live SerpApi response body.',
      },
      exactVariant: {
        state: 'unknown',
        value: null,
        basis: 'SerpApi returned no trusted structured exact-variant field; title prose is not promoted.',
      },
      exactShade: {
        state: 'unknown',
        value: null,
        basis: 'SerpApi returned no trusted structured exact-shade field; title prose is not promoted.',
      },
      finish: {
        state: 'unknown',
        value: null,
        basis: 'SerpApi returned no trusted structured finish field; title prose is not promoted.',
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
    const manifest: RuntimeCandidateEvidenceManifest = {
      schemaVersion: 1,
      kind: 'candidate-evidence-manifest',
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
        rawBodySha256: run.digest.sha256,
        rawBodyBytes: run.digest.byteLength,
        digestBasis: 'exact_response_body_bytes',
      },
      vtoLifecycle: null,
      evidence,
      artifacts: {
        manifestUrl: urls.manifest,
        sourceImage: { downloadUrl: urls.source, mediaType: input.captured.mediaType },
        outputImage: null,
      },
      integrity: {
        state: 'collecting',
        checkedAt: timestamp,
        checks: ['search response digest retained', 'listing identity matched', 'source image re-hashed'],
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
    outputBytes: Buffer;
    outputMediaType: string;
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

    const dir = this.candidateDir(input.runId, input.candidateId);
    await fs.promises.writeFile(path.join(dir, 'output-image.bin'), input.outputBytes, { mode: 0o600 });
    const urls = manifestUrls(input.runId, input.candidateId);
    const outputHash = sha256(input.outputBytes);
    const timestamp = this.now();
    const evidence: CandidateEvidence = {
      ...current.evidence,
      sameFaceRender: {
        state: 'present',
        proofLevel: 'verified_lifecycle',
        providerStatus: 'live',
        taskId: input.render.taskId,
        pollCount: input.render.pollCount,
        actualSourceFaceUrl: input.srcFileUrl,
        actualEffectRequest: JSON.stringify(input.effects),
        lifecycleReceiptPath: urls.manifest,
        outputImagePath: urls.output,
        outputImageSha256: outputHash,
        outputImageBytes: input.outputBytes.length,
        basis:
          'Per-run manifest binds exact Perfect request inputs, task/poll outcome, and retained output bytes.',
      },
    };
    const manifest: RuntimeCandidateEvidenceManifest = {
      ...current,
      updatedAt: timestamp,
      evidence,
      vtoLifecycle: {
        provider: 'perfectcorp',
        request: {
          srcFileUrl: input.srcFileUrl,
          effects: input.effects,
        },
        outcome: {
          providerStatus: 'live',
          taskId: input.render.taskId,
          pollCount: input.render.pollCount,
          startedAt: input.render.startedAt,
          completedAt: input.render.completedAt,
        },
      },
      artifacts: {
        ...current.artifacts,
        outputImage: { downloadUrl: urls.output, mediaType: input.outputMediaType },
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
        manifest.runId !== runId ||
        manifest.candidateId !== candidateId ||
        manifest.searchResponse.rawBodySha256 !== run.digest.sha256 ||
        manifest.searchResponse.rawBodyBytes !== run.digest.byteLength
      ) {
        throw new Error('search response digest mismatch');
      }
      checks.push('search response digest matched');
      if (
        manifest.evidence.listingIdentity.observedTitle !== candidate.title ||
        manifest.evidence.listingIdentity.observedOfferUrl !== candidate.productUrl ||
        manifest.evidence.listingIdentity.sourceUrl !== candidate.sourceUrl ||
        manifest.evidence.sourceImage.listingThumbnailUrl !== candidate.thumbnailUrl ||
        manifest.evidence.sourceImage.actualRequestUrl !== candidate.thumbnailUrl
      ) {
        throw new Error('listing identity mismatch');
      }
      checks.push('listing identity matched');
      const dir = this.candidateDir(runId, candidateId);
      const source = await fs.promises.readFile(path.join(dir, 'source-image.bin'));
      if (
        sha256(source) !== manifest.evidence.sourceImage.sha256 ||
        source.length !== manifest.evidence.sourceImage.byteLength
      ) {
        throw new Error('source image digest mismatch');
      }
      checks.push('source image bytes re-hashed');
      const output = await fs.promises.readFile(path.join(dir, 'output-image.bin'));
      if (
        sha256(output) !== manifest.evidence.sameFaceRender.outputImageSha256 ||
        output.length !== manifest.evidence.sameFaceRender.outputImageBytes
      ) {
        throw new Error('output image digest mismatch');
      }
      checks.push('VTO output bytes re-hashed');
      if (
        manifest.evidence.sameFaceRender.proofLevel !== 'verified_lifecycle' ||
        !manifest.evidence.sameFaceRender.actualSourceFaceUrl ||
        !manifest.evidence.sameFaceRender.actualEffectRequest ||
        !manifest.evidence.sameFaceRender.taskId ||
        !manifest.evidence.sameFaceRender.pollCount ||
        !manifest.vtoLifecycle ||
        manifest.vtoLifecycle.request.srcFileUrl !==
          manifest.evidence.sameFaceRender.actualSourceFaceUrl ||
        JSON.stringify(manifest.vtoLifecycle.request.effects) !==
          manifest.evidence.sameFaceRender.actualEffectRequest ||
        manifest.vtoLifecycle.outcome.taskId !== manifest.evidence.sameFaceRender.taskId ||
        manifest.vtoLifecycle.outcome.pollCount !== manifest.evidence.sameFaceRender.pollCount ||
        manifest.evidence.sameFaceRender.outputImagePath !==
          manifest.artifacts.outputImage?.downloadUrl
      ) {
        throw new Error('VTO request or lifecycle outcome missing');
      }
      checks.push('Perfect request and task/poll outcome present');
      const validated: RuntimeCandidateEvidenceManifest = {
        ...manifest,
        updatedAt: this.now(),
        integrity: {
          state: 'validated',
          checkedAt: this.now(),
          checks,
          error: null,
        },
      };
      run.manifests.set(candidateId, validated);
      await this.writeManifest(validated);
      return validated;
    } catch (err) {
      const invalid: RuntimeCandidateEvidenceManifest = {
        ...manifest,
        updatedAt: this.now(),
        integrity: {
          state: 'invalid',
          checkedAt: this.now(),
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

  async readArtifact(
    runId: string,
    candidateId: string,
    kind: 'source' | 'output',
  ): Promise<{ bytes: Buffer; mediaType: string; fileName: string }> {
    const run = this.run(runId);
    const manifest = this.getManifest(runId, candidateId);
    const types = run.artifactTypes.get(candidateId);
    const mediaType = kind === 'source' ? types?.source : types?.output;
    if (!mediaType || (kind === 'output' && !manifest.artifacts.outputImage)) {
      throw new ProviderError('Requested evidence artifact does not exist.');
    }
    const file = path.join(
      this.candidateDir(runId, candidateId),
      kind === 'source' ? 'source-image.bin' : 'output-image.bin',
    );
    return {
      bytes: await fs.promises.readFile(file),
      mediaType,
      fileName: `${candidatePathKey(candidateId)}-${kind}-image`,
    };
  }
}

export async function downloadVtoOutput(
  signedUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ bytes: Buffer; mediaType: string }> {
  let url: URL;
  try {
    url = new URL(signedUrl);
  } catch {
    throw new ProviderError('Perfect Corp returned an invalid output URL.');
  }
  if (url.protocol !== 'https:') {
    throw new ProviderError('Perfect Corp output URL must use HTTPS.');
  }
  const response = await fetchImpl(url);
  if (!response.ok) throw new ProviderError(`Perfect Corp output download failed: HTTP ${response.status}`);
  const mediaType = response.headers.get('content-type')?.split(';')[0]?.trim() || '';
  if (!mediaType.startsWith('image/')) {
    throw new ProviderError('Perfect Corp output download returned a non-image content type.');
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_VTO_OUTPUT_BYTES) {
    throw new ProviderError('Perfect Corp output is empty or exceeds the evidence size cap.');
  }
  return { bytes, mediaType };
}

export const runtimeEvidenceStore = new RuntimeEvidenceStore();
