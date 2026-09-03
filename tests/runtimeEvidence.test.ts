// Offline contract tests for the exportable live-run proof path. All provider
// and image bytes are synthetic test fixtures; no network call occurs.

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import app from '../server/index.ts';
import {
  downloadVtoOutput,
  EXPORT_STORAGE_DISCLOSURE,
  RuntimeEvidenceStore,
  runtimeEvidenceStore,
} from '../server/runtimeEvidence.ts';
import { lipColorEffect } from '../shared/effects.ts';
import { deriveLeadOutcome } from '../shared/evidence.ts';
import type { CapturedShadeEstimate } from '../server/shadeEstimate.ts';
import type { SearchResultSet, VtoRender } from '../shared/types.ts';

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function sha256(bytes: Buffer | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function searchResult(): SearchResultSet {
  return {
    providerStatus: 'live',
    provider: 'serpapi',
    query: 'synthetic runtime proof fixture',
    observedAt: '2026-09-03T08:00:00.000Z',
    warnings: [],
    candidates: [
      {
        id: 'candidate-42',
        title: 'Synthetic Policy Fixture Lip Color',
        merchant: 'Synthetic merchant',
        productUrl: 'https://synthetic-policy-fixture.invalid/offer/42',
        sourceUrl: 'https://synthetic-policy-fixture.invalid/source/42',
        price: { display: '$12.00', value: 12, currency: 'USD' },
        availability: { observed: null, caveat: 'synthetic fixture only' },
        thumbnailUrl: 'https://encrypted-tbn0.gstatic.com/shopping?q=synthetic-fixture',
        position: 1,
        query: 'synthetic runtime proof fixture',
        observedAt: '2026-09-03T08:00:00.000Z',
        provider: 'serpapi',
      },
    ],
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
      sourceImage: {
        url: 'https://encrypted-tbn0.gstatic.com/shopping?q=synthetic-fixture',
        sha256: sha256(bytes),
        byteLength: bytes.length,
      },
    },
  };
}

function successfulRender(): VtoRender {
  return {
    providerStatus: 'live',
    provider: 'perfectcorp',
    taskId: 'synthetic-task-42',
    imageUrl: 'https://synthetic-policy-fixture.invalid/signed-output?signature=not-retained',
    startedAt: '2026-09-03T08:00:01.000Z',
    completedAt: '2026-09-03T08:00:05.000Z',
    pollCount: 3,
    expiryNote: 'synthetic fixture',
  };
}

describe('RuntimeEvidenceStore', () => {
  it('binds search, source bytes, request inputs, lifecycle outcome and output bytes', async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lasttube-evidence-test-'));
    temporaryRoots.push(rootDir);
    const store = new RuntimeEvidenceStore({
      rootDir,
      idFactory: () => 'run-42',
      now: () => '2026-09-03T08:00:06.000Z',
    });
    const rawBody = '{"synthetic":"serp response fixture"}';
    const runId = store.openSearchRun(searchResult(), {
      sha256: sha256(rawBody),
      byteLength: Buffer.byteLength(rawBody),
      basis: 'exact_response_body_bytes',
    });
    const captured = capturedShade();
    const collecting = await store.recordSourceImage({
      runId,
      candidateId: 'candidate-42',
      requestedUrl: captured.estimate.sourceImage.url,
      captured,
    });
    expect(collecting.integrity.state).toBe('collecting');
    expect(collecting.evidence.exactVariant.state).toBe('unknown');
    expect(collecting.evidence.exactShade.state).toBe('unknown');
    expect(collecting.evidence.finish.state).toBe('unknown');
    expect(collecting.storage.disclosure).toBe(EXPORT_STORAGE_DISCLOSURE);

    await expect(
      store.assertCandidateReadyForVto(runId, 'candidate-42', [lipColorEffect('#000000')]),
    ).rejects.toThrow(/does not match/);

    const outputBytes = Buffer.from('synthetic-vto-output-bytes');
    const manifest = await store.recordVtoOutput({
      runId,
      candidateId: 'candidate-42',
      srcFileUrl: 'https://synthetic-policy-fixture.invalid/face.jpg',
      effects: [lipColorEffect('#a96a73')],
      render: successfulRender(),
      outputBytes,
      outputMediaType: 'image/jpeg',
    });
    expect(manifest.integrity.state).toBe('validated');
    expect(manifest.searchResponse.rawBodySha256).toBe(sha256(rawBody));
    expect(manifest.evidence.sourceImage.sha256).toBe(sha256(captured.bytes));
    expect(manifest.evidence.sameFaceRender.outputImageSha256).toBe(sha256(outputBytes));
    expect(manifest.evidence.sameFaceRender.actualEffectRequest).toContain('#a96a73');
    expect(manifest.evidence.sameFaceRender.taskId).toBe('synthetic-task-42');
    expect(manifest.evidence.sameFaceRender.pollCount).toBe(3);
    expect(manifest.vtoLifecycle?.request.effects).toEqual([lipColorEffect('#a96a73')]);
    expect(manifest.vtoLifecycle?.outcome).toMatchObject({
      taskId: 'synthetic-task-42',
      pollCount: 3,
      providerStatus: 'live',
    });
    expect(JSON.stringify(manifest)).not.toContain('signature=not-retained');

    const outcome = deriveLeadOutcome({
      baselineReady: true,
      evidence: manifest.evidence,
      manifestValidated: manifest.integrity.state === 'validated',
      humanAccepted: true,
      humanPreferred: true,
    });
    expect(outcome.kind).toBe('no_actionable_lead');
    if (outcome.kind === 'no_actionable_lead') {
      expect(outcome.missing).toContain('exact variant');
      expect(outcome.missing).toContain('exact shade');
      expect(outcome.missing).toContain('finish');
    }

    const sourceArtifact = await store.readArtifact(runId, 'candidate-42', 'source');
    const outputArtifact = await store.readArtifact(runId, 'candidate-42', 'output');
    expect(sourceArtifact.bytes.equals(captured.bytes)).toBe(true);
    expect(outputArtifact.bytes.equals(outputBytes)).toBe(true);
  });

  it('exposes the manifest and retained bytes through downloadable API routes', async () => {
    const rawBody = '{"synthetic":"route fixture"}';
    const runId = runtimeEvidenceStore.openSearchRun(searchResult(), {
      sha256: sha256(rawBody),
      byteLength: Buffer.byteLength(rawBody),
      basis: 'exact_response_body_bytes',
    });
    const captured = capturedShade();
    await runtimeEvidenceStore.recordSourceImage({
      runId,
      candidateId: 'candidate-42',
      requestedUrl: captured.estimate.sourceImage.url,
      captured,
    });
    const outputBytes = Buffer.from('synthetic-route-output');
    const manifest = await runtimeEvidenceStore.recordVtoOutput({
      runId,
      candidateId: 'candidate-42',
      srcFileUrl: 'https://synthetic-policy-fixture.invalid/face.jpg',
      effects: [lipColorEffect('#a96a73')],
      render: successfulRender(),
      outputBytes,
      outputMediaType: 'image/jpeg',
    });

    const manifestResponse = await app.request(manifest.artifacts.manifestUrl);
    expect(manifestResponse.status).toBe(200);
    expect(manifestResponse.headers.get('content-disposition')).toContain('attachment');
    expect((await manifestResponse.json()).integrity.state).toBe('validated');

    const sourceResponse = await app.request(manifest.artifacts.sourceImage!.downloadUrl);
    const outputResponse = await app.request(manifest.artifacts.outputImage!.downloadUrl);
    expect(Buffer.from(await sourceResponse.arrayBuffer()).equals(captured.bytes)).toBe(true);
    expect(Buffer.from(await outputResponse.arrayBuffer()).equals(outputBytes)).toBe(true);
  });

  it('rejects an unbound candidate before provider configuration or execution', async () => {
    const response = await app.request('/api/vto', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        srcFileUrl: 'https://synthetic-policy-fixture.invalid/face.jpg',
        effects: [lipColorEffect('#a96a73')],
        evidenceRunId: 'expired-run',
        candidateId: 'candidate-42',
      }),
    });
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      error: expect.stringContaining('not found or expired'),
    });
  });
});

describe('downloadVtoOutput', () => {
  it('downloads only bounded HTTPS image bytes', async () => {
    const bytes = Buffer.from('synthetic-downloaded-output');
    const fetchImpl = (async () =>
      new Response(new Uint8Array(bytes), {
        status: 200,
        headers: { 'content-type': 'image/jpeg' },
      })) as typeof fetch;
    const downloaded = await downloadVtoOutput(
      'https://synthetic-policy-fixture.invalid/output',
      fetchImpl,
    );
    expect(downloaded.bytes.equals(bytes)).toBe(true);
    expect(downloaded.mediaType).toBe('image/jpeg');
    await expect(downloadVtoOutput('http://insecure.invalid/output', fetchImpl)).rejects.toThrow(
      /HTTPS/,
    );
  });
});
