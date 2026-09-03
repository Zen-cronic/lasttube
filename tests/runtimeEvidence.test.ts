// Offline contract tests for the versioned exportable live-run proof path. All
// provider and image bytes are synthetic policy fixtures; no network occurs.

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterEach, describe, expect, it } from 'vitest';
import app from '../server/index.ts';
import {
  runMakeupVtoWithEvidence,
} from '../server/providers/perfectcorp.ts';
import type { SerpApiResponseEvidence } from '../server/providers/serpapi.ts';
import {
  downloadVtoOutput,
  EXPORT_STORAGE_DISCLOSURE,
  RuntimeEvidenceStore,
  runtimeEvidenceStore,
} from '../server/runtimeEvidence.ts';
import type { CapturedShadeEstimate } from '../server/shadeEstimate.ts';
import { lipColorEffect } from '../shared/effects.ts';
import {
  PROVIDER_BODY_REDACTION_POLICY,
  RUNTIME_EVIDENCE_BUNDLE_VERSION,
} from '../shared/evidence.ts';
import { deriveLeadOutcome } from '../shared/evidence.ts';
import type { SearchResultSet } from '../shared/types.ts';

const temporaryRoots: string[] = [];
const candidateId = 'candidate-42';
const query = 'synthetic runtime proof fixture';
const observedAt = '2026-09-03T08:00:00.000Z';
const thumbnailUrl = 'https://encrypted-tbn0.gstatic.com/shopping?q=synthetic-fixture';
const sourceFaceUrl = 'https://synthetic-policy-fixture.invalid/face.jpg?token=face-secret';

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function sha256(bytes: Buffer | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function candidatePathKey(value: string): string {
  return sha256(value).slice(0, 20);
}

function rawSearchBody(): string {
  return JSON.stringify({
    search_metadata: { id: 'synthetic-search', status: 'Success' },
    search_parameters: { q: query, engine: 'google_shopping', api_key: 'serp-secret-not-real' },
    query_token: 'query-token-not-real',
    shopping_results: [
      {
        position: 1,
        product_id: candidateId,
        title: 'Synthetic Policy Fixture Lip Color',
        source: 'Synthetic merchant',
        product_link: 'https://synthetic-policy-fixture.invalid/offer/42',
        link: 'https://synthetic-policy-fixture.invalid/source/42',
        price: '$12.00',
        extracted_price: 12,
        thumbnail: thumbnailUrl,
      },
    ],
  });
}

function searchResult(): SearchResultSet {
  return {
    providerStatus: 'live',
    provider: 'serpapi',
    query,
    observedAt,
    warnings: [],
    candidates: [
      {
        id: candidateId,
        title: 'Synthetic Policy Fixture Lip Color',
        merchant: 'Synthetic merchant',
        productUrl: 'https://synthetic-policy-fixture.invalid/offer/42',
        sourceUrl: 'https://synthetic-policy-fixture.invalid/source/42',
        price: { display: '$12.00', value: 12, currency: 'USD' },
        availability: {
          observed: null,
          caveat:
            'Observed on a Google Shopping listing via SerpApi at the stated time; listings are not a real-time stock check.',
        },
        thumbnailUrl,
        position: 1,
        query,
        observedAt,
        provider: 'serpapi',
      },
    ],
  };
}

function searchEvidence(): SerpApiResponseEvidence {
  const wireBody = rawSearchBody();
  const retainedBody = Buffer.from(
    JSON.stringify({
      ...JSON.parse(wireBody),
      search_parameters: {
        q: query,
        engine: 'google_shopping',
        api_key: '[REDACTED]',
      },
      query_token: '[REDACTED]',
    }),
  );
  return {
    wireBodySha256: sha256(wireBody),
    wireBodyBytes: Buffer.byteLength(wireBody),
    retainedBodySha256: sha256(retainedBody),
    retainedBodyBytes: retainedBody.length,
    retainedBody,
    retainedBodyBasis: 'complete_sanitized_json_before_domain_normalization',
    redactionPolicy: PROVIDER_BODY_REDACTION_POLICY,
  };
}

function capturedShade(): CapturedShadeEstimate {
  const bytes = Buffer.from('synthetic-source-image-bytes');
  return {
    bytes,
    mediaType: 'image/png',
    estimate: {
      hex: '#a96a73',
      coverage: 0.42,
      sampledPixels: 3870,
      method: 'synthetic estimator fixture',
      sourceImage: { url: thumbnailUrl, sha256: sha256(bytes), byteLength: bytes.length },
    },
  };
}

function sequencedFetch(responses: Array<{ status: number; body: unknown }>): typeof fetch {
  let index = 0;
  return async () => {
    const response = responses[Math.min(index, responses.length - 1)]!;
    index += 1;
    return new Response(JSON.stringify(response.body), {
      status: response.status,
      headers: { 'content-type': 'application/json' },
    });
  };
}

async function successfulLifecycle() {
  const signedParam = ['X-Amz', 'Signature'].join('-');
  const signedOutputUrl =
    `https://synthetic-policy-fixture.invalid/output.jpg?${signedParam}=not-retained`;
  const fetchImpl = sequencedFetch([
    {
      status: 200,
      body: {
        status: 200,
        api_key: 'perfect-secret-not-real',
        data: { task_id: 'synthetic-task-42' },
      },
    },
    {
      status: 200,
      body: { status: 200, data: { task_id: 'synthetic-task-42', task_status: 'running' } },
    },
    {
      status: 200,
      body: {
        status: 200,
        data: {
          task_id: 'synthetic-task-42',
          task_status: 'success',
          results: [{ download_url: signedOutputUrl }],
        },
      },
    },
  ]);
  const run = await runMakeupVtoWithEvidence(sourceFaceUrl, [lipColorEffect('#a96a73')], {
    apiKey: 'perfect-secret-not-real',
    fetchImpl,
    sleep: async () => {},
    now: () => '2026-09-03T08:00:05.000Z',
  });
  if (!run.lifecycleReceipt || !run.render.imageUrl) throw new Error('synthetic lifecycle failed');
  const outputBytes = Buffer.from('synthetic-vto-output-bytes');
  const downloaded = await downloadVtoOutput(
    run.render.imageUrl,
    (async () =>
      new Response(new Uint8Array(outputBytes), {
        status: 200,
        headers: { 'content-type': 'image/jpeg' },
      })) as typeof fetch,
    () => '2026-09-03T08:00:06.000Z',
  );
  return { ...run, outputBytes, downloaded };
}

async function completedStore(rootDir: string, id = 'run-42') {
  const store = new RuntimeEvidenceStore({
    rootDir,
    idFactory: () => id,
    now: () => '2026-09-03T08:00:07.000Z',
  });
  const runId = await store.openSearchRun(searchResult(), searchEvidence());
  const captured = capturedShade();
  const collecting = await store.recordSourceImage({
    runId,
    candidateId,
    requestedUrl: captured.estimate.sourceImage.url,
    captured,
  });
  const lifecycle = await successfulLifecycle();
  const manifest = await store.recordVtoOutput({
    runId,
    candidateId,
    srcFileUrl: sourceFaceUrl,
    effects: [lipColorEffect('#a96a73')],
    render: lifecycle.render,
    lifecycleReceipt: lifecycle.lifecycleReceipt!,
    outputBytes: lifecycle.outputBytes,
    outputMediaType: lifecycle.downloaded.mediaType,
    outputDownload: lifecycle.downloaded.receipt,
  });
  return { store, runId, captured, lifecycle, collecting, manifest };
}

describe('RuntimeEvidenceStore', () => {
  it('builds a versioned, independently self-consistent four-artifact bundle', async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lasttube-evidence-test-'));
    temporaryRoots.push(rootDir);
    const completed = await completedStore(rootDir);
    const { store, runId, captured, lifecycle, collecting, manifest } = completed;

    expect(collecting.integrity.state).toBe('collecting');
    expect(collecting.structuredEnrichment.source.kind).toBe('none');
    expect(collecting.evidence.exactVariant.state).toBe('unknown');
    expect(collecting.storage.disclosure).toBe(EXPORT_STORAGE_DISCLOSURE);
    expect(manifest.schemaVersion).toBe(2);
    expect(manifest.bundle.version).toBe(RUNTIME_EVIDENCE_BUNDLE_VERSION);
    expect(manifest.integrity.state).toBe('validated');
    expect(manifest.searchResponse.retainedBodySha256).toBe(searchEvidence().retainedBodySha256);
    expect(manifest.evidence.sourceImage.sha256).toBe(sha256(captured.bytes));
    expect(manifest.evidence.sameFaceRender.outputImageSha256).toBe(
      sha256(lifecycle.outputBytes),
    );
    expect(manifest.vtoLifecycle?.responseDigests).toHaveLength(3);
    expect(manifest.vtoLifecycle?.crossFieldValidation).toMatchObject({
      createTaskIdPresent: true,
      pollTaskIdsMatchCreate: true,
      finalStatusMatchesRender: true,
      pollCountMatchesResponses: true,
      successResultUrlPresent: true,
      requestSourceMatchesLifecycle: true,
      requestEffectsMatchLifecycle: true,
      downloadRequestMatchesResultUrl: true,
      outputDigestMatchesManifest: true,
    });

    const searchArtifact = await store.readArtifact(runId, candidateId, 'search');
    const sourceArtifact = await store.readArtifact(runId, candidateId, 'source');
    const lifecycleArtifact = await store.readArtifact(runId, candidateId, 'lifecycle');
    const outputArtifact = await store.readArtifact(runId, candidateId, 'output');
    expect(sha256(searchArtifact.bytes)).toBe(manifest.artifacts.searchResponse.sha256);
    expect(sourceArtifact.bytes.equals(captured.bytes)).toBe(true);
    expect(sha256(sourceArtifact.bytes)).toBe(manifest.artifacts.sourceImage?.sha256);
    expect(sha256(lifecycleArtifact.bytes)).toBe(manifest.artifacts.perfectLifecycle?.sha256);
    expect(outputArtifact.bytes.equals(lifecycle.outputBytes)).toBe(true);
    expect(sha256(outputArtifact.bytes)).toBe(manifest.artifacts.outputImage?.sha256);
    expect(searchArtifact.bytes.toString()).not.toContain('serp-secret-not-real');
    expect(searchArtifact.bytes.toString()).not.toContain('query-token-not-real');
    expect(lifecycleArtifact.bytes.toString()).not.toContain('perfect-secret-not-real');
    expect(lifecycleArtifact.bytes.toString()).not.toContain('not-retained');

    const outcome = deriveLeadOutcome({
      baselineReady: true,
      evidence: manifest.evidence,
      manifestValidated: manifest.integrity.state === 'validated',
      humanAccepted: true,
      humanPreferred: true,
    });
    expect(outcome.kind).toBe('no_actionable_lead');
  });

  it('exposes the manifest and all four retained artifacts through download routes', async () => {
    const runId = await runtimeEvidenceStore.openSearchRun(searchResult(), searchEvidence());
    const captured = capturedShade();
    await runtimeEvidenceStore.recordSourceImage({
      runId,
      candidateId,
      requestedUrl: captured.estimate.sourceImage.url,
      captured,
    });
    const lifecycle = await successfulLifecycle();
    const manifest = await runtimeEvidenceStore.recordVtoOutput({
      runId,
      candidateId,
      srcFileUrl: sourceFaceUrl,
      effects: [lipColorEffect('#a96a73')],
      render: lifecycle.render,
      lifecycleReceipt: lifecycle.lifecycleReceipt!,
      outputBytes: lifecycle.outputBytes,
      outputMediaType: lifecycle.downloaded.mediaType,
      outputDownload: lifecycle.downloaded.receipt,
    });

    const manifestResponse = await app.request(manifest.artifacts.manifestUrl);
    expect(manifestResponse.status).toBe(200);
    expect(manifestResponse.headers.get('content-disposition')).toContain('attachment');
    expect((await manifestResponse.json()).integrity.state).toBe('validated');

    for (const artifact of [
      manifest.artifacts.searchResponse,
      manifest.artifacts.sourceImage!,
      manifest.artifacts.perfectLifecycle!,
      manifest.artifacts.outputImage!,
    ]) {
      const response = await app.request(artifact.downloadUrl);
      expect(response.status).toBe(200);
      expect(response.headers.get('content-disposition')).toContain('attachment');
    }
  });

  it('detects retained-search, lifecycle, and output tampering and fails exports closed', async () => {
    for (const tamper of ['search', 'lifecycle', 'output'] as const) {
      const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), `lasttube-${tamper}-tamper-`));
      temporaryRoots.push(rootDir);
      const { store, runId } = await completedStore(rootDir, `run-${tamper}`);
      const candidateDir = path.join(rootDir, `run-${tamper}`, candidatePathKey(candidateId));
      const target =
        tamper === 'search'
          ? path.join(rootDir, `run-${tamper}`, 'serp-response.json')
          : tamper === 'lifecycle'
            ? path.join(candidateDir, 'perfect-lifecycle.json')
            : path.join(candidateDir, 'output-image.bin');
      fs.appendFileSync(target, '\ntampered');

      await expect(store.getValidatedManifest(runId, candidateId)).rejects.toThrow(/invalid/);
      await expect(store.readArtifact(runId, candidateId, tamper)).rejects.toThrow(/invalid/);
      expect(store.getManifest(runId, candidateId).integrity.state).toBe('invalid');
    }
  });

  it('revalidates persisted manifest and search bytes before provider execution', async () => {
    for (const tamper of ['manifest', 'search'] as const) {
      const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), `lasttube-pre-vto-${tamper}-`));
      temporaryRoots.push(rootDir);
      const runId = `run-pre-${tamper}`;
      const store = new RuntimeEvidenceStore({ rootDir, idFactory: () => runId });
      await store.openSearchRun(searchResult(), searchEvidence());
      const captured = capturedShade();
      await store.recordSourceImage({
        runId,
        candidateId,
        requestedUrl: captured.estimate.sourceImage.url,
        captured,
      });
      const target =
        tamper === 'manifest'
          ? path.join(rootDir, runId, candidatePathKey(candidateId), 'manifest.json')
          : path.join(rootDir, runId, 'serp-response.json');
      fs.appendFileSync(target, '\ntampered');
      await expect(
        store.assertCandidateReadyForVto(runId, candidateId, [lipColorEffect('#a96a73')]),
      ).rejects.toThrow(/Pre-VTO evidence bundle validation failed/);
    }
  });

  it('rejects Perfect endpoint or chronology lineage that does not match the task', async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lasttube-lineage-'));
    temporaryRoots.push(rootDir);
    const store = new RuntimeEvidenceStore({ rootDir, idFactory: () => 'run-lineage' });
    const runId = await store.openSearchRun(searchResult(), searchEvidence());
    const captured = capturedShade();
    await store.recordSourceImage({
      runId,
      candidateId,
      requestedUrl: captured.estimate.sourceImage.url,
      captured,
    });
    const lifecycle = await successfulLifecycle();
    lifecycle.lifecycleReceipt!.polls[0]!.requestUrl =
      'https://yce-api-01.makeupar.com/s2s/v2.0/task/makeup-vto/wrong-task';
    const manifest = await store.recordVtoOutput({
      runId,
      candidateId,
      srcFileUrl: sourceFaceUrl,
      effects: [lipColorEffect('#a96a73')],
      render: lifecycle.render,
      lifecycleReceipt: lifecycle.lifecycleReceipt!,
      outputBytes: lifecycle.outputBytes,
      outputMediaType: lifecycle.downloaded.mediaType,
      outputDownload: lifecycle.downloaded.receipt,
    });
    expect(manifest.integrity.state).toBe('invalid');
    expect(manifest.integrity.error).toMatch(/endpoint lineage/);
  });

  it('rejects an unbound candidate before provider configuration or execution', async () => {
    const response = await app.request('/api/vto', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        srcFileUrl: 'https://synthetic-policy-fixture.invalid/face.jpg',
        effects: [lipColorEffect('#a96a73')],
        evidenceRunId: 'expired-run',
        candidateId,
      }),
    });
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      error: expect.stringContaining('not found or expired'),
    });
  });
});

describe('downloadVtoOutput', () => {
  it('downloads only bounded HTTPS image bytes and records safe URL lineage', async () => {
    const bytes = Buffer.from('synthetic-downloaded-output');
    const signedParam = ['X-Amz', 'Signature'].join('-');
    const signedUrl =
      `https://synthetic-policy-fixture.invalid/output?${signedParam}=not-retained`;
    const fetchImpl = (async () =>
      new Response(new Uint8Array(bytes), {
        status: 200,
        headers: { 'content-type': 'image/jpeg' },
      })) as typeof fetch;
    const downloaded = await downloadVtoOutput(signedUrl, fetchImpl);
    expect(downloaded.bytes.equals(bytes)).toBe(true);
    expect(downloaded.receipt.requestedSignedUrlSha256).toBe(sha256(signedUrl));
    expect(downloaded.receipt.requestedUrl).not.toContain('not-retained');
    await expect(downloadVtoOutput('http://insecure.invalid/output', fetchImpl)).rejects.toThrow(
      /HTTPS/,
    );
  });

  it('accepts a provider octet-stream only when the bounded bytes decode as an image', async () => {
    const png = await sharp({
      create: { width: 2, height: 2, channels: 3, background: '#a96a73' },
    })
      .png()
      .toBuffer();
    const genericFetch = (async () =>
      new Response(new Uint8Array(png), {
        status: 200,
        headers: { 'content-type': 'application/octet-stream' },
      })) as typeof fetch;
    const downloaded = await downloadVtoOutput(
      'https://synthetic-policy-fixture.invalid/output',
      genericFetch,
    );
    expect(downloaded.mediaType).toBe('image/png');

    const invalidFetch = (async () =>
      new Response(new TextEncoder().encode('not an image'), {
        status: 200,
        headers: { 'content-type': 'application/octet-stream' },
      })) as typeof fetch;
    await expect(
      downloadVtoOutput('https://synthetic-policy-fixture.invalid/output', invalidFetch),
    ).rejects.toThrow(/could not be decoded/);
  });
});
