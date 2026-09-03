import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { PerfectCorpLifecycleReceipt, VtoOutputDownloadReceipt } from '../shared/evidence.ts';
import { SAMPLE_FACE_URL } from '../shared/effects.ts';

interface AlternateLifecycleProof {
  source: { url: string; sha256: string; byteLength: number; retainedPath: string };
  effectColor: string;
  lifecycle: PerfectCorpLifecycleReceipt;
  outputDownload: VtoOutputDownloadReceipt;
  retainedOutputPath: string;
}

interface AlternateSessionProof {
  source: AlternateLifecycleProof['source'];
  successfulRenders: number;
  credits: { before: number; after: number; spentUnits: number };
  note: string;
}

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
}

function sha256(file: string): string {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

describe('alternate official fixture-model proof', () => {
  it('binds one baseline and one comparison to the same different model and retained bytes', () => {
    const session = readJson<AlternateSessionProof>(
      'proofs/perfectcorp/2026-09-03-alternate-model-session.json',
    );
    const proofs = ['baseline', 'candidate-abh'].map((role) =>
      readJson<AlternateLifecycleProof>(
        `proofs/perfectcorp/2026-09-03-alternate-model-${role}-lifecycle.json`,
      ),
    );

    expect(session.successfulRenders).toBe(2);
    expect(session.credits.before - session.credits.after).toBe(session.credits.spentUnits);
    expect(session.credits.spentUnits).toBe(2);
    expect(session.source.url).not.toBe(SAMPLE_FACE_URL);
    expect(sha256(session.source.retainedPath)).toBe(session.source.sha256);
    expect(fs.statSync(session.source.retainedPath).size).toBe(session.source.byteLength);
    expect(session.note).toContain('does not establish variant, shade, finish');

    for (const proof of proofs) {
      expect(proof.source).toEqual(session.source);
      expect(proof.lifecycle.request.srcFileUrl).toBe(session.source.url);
      expect(proof.lifecycle.validation).toMatchObject({
        createTaskIdPresent: true,
        pollTaskIdsMatchCreate: true,
        finalStatusMatchesRender: true,
        pollCountMatchesResponses: true,
        successResultUrlPresent: true,
      });
      expect(sha256(proof.retainedOutputPath)).toBe(proof.outputDownload.outputSha256);
      expect(fs.statSync(proof.retainedOutputPath).size).toBe(proof.outputDownload.outputBytes);
      expect(proof.outputDownload.requestedUrl).not.toMatch(/X-Amz-/i);
      expect(proof.outputDownload.finalResponseUrl).not.toMatch(/X-Amz-/i);
      expect(JSON.stringify(proof)).not.toMatch(/Bearer\s+[A-Za-z0-9]/);
    }
    expect(proofs[0]!.effectColor).not.toBe(proofs[1]!.effectColor);
    expect(proofs[0]!.outputDownload.outputSha256).not.toBe(
      proofs[1]!.outputDownload.outputSha256,
    );
  });

  it('keeps the fresh search separate from the deterministic fixture replay', () => {
    const fresh = readJson<{ providerStatus: string; observedAt: string; candidates: unknown[] }>(
      'proofs/serpapi/2026-09-03-normalized.json',
    );
    const fixture = readJson<{ recordedAt: string }>(
      'server/providers/fixtures/serpapi-google-shopping.json',
    );
    expect(fresh.providerStatus).toBe('live');
    expect(fresh.candidates).toHaveLength(40);
    expect(Date.parse(fresh.observedAt)).toBeGreaterThan(Date.parse(fixture.recordedAt));
    expect(fixture.recordedAt.startsWith('2026-09-01')).toBe(true);
  });
});
