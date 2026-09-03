import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { demoComparisonBundle } from '../server/fixtures.ts';
import type { BaselineEvidence, CandidateEvidence } from '../shared/evidence.ts';
import type { CandidateRecord } from '../shared/types.ts';

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
}

function sha256(file: string): string {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

describe('tracked offline provenance', () => {
  it('binds every candidate manifest to its listing and retained output bytes', () => {
    const normalized = readJson<{ candidates: CandidateRecord[] }>(
      'proofs/serpapi/2026-09-01-normalized.json',
    );
    const files = fs
      .readdirSync('proofs/offline')
      .filter((file) => file.startsWith('candidate-') && file.endsWith('.json'))
      .sort();
    expect(files).toHaveLength(3);

    for (const file of files) {
      const evidence = readJson<CandidateEvidence>(path.join('proofs/offline', file));
      const listing = normalized.candidates.find((candidate) => candidate.id === evidence.candidateId);
      expect(listing).toBeDefined();
      expect(evidence.listingIdentity.observedTitle).toBe(listing!.title);
      expect(evidence.listingIdentity.observedOfferUrl).toBe(listing!.productUrl);
      expect(evidence.listingIdentity.sourceUrl).toBe(listing!.sourceUrl);
      expect(sha256(evidence.listingIdentity.sourceReceiptPath!)).toBe(
        evidence.listingIdentity.sourceReceiptSha256,
      );

      const output = evidence.sameFaceRender.outputImagePath!;
      expect(fs.existsSync(output)).toBe(true);
      expect(fs.statSync(output).size).toBe(evidence.sameFaceRender.outputImageBytes);
      expect(sha256(output)).toBe(evidence.sameFaceRender.outputImageSha256);

      expect(evidence.sourceImage.state).toBe('unknown');
      expect(evidence.sourceImage.actualRequestUrl).toBeNull();
      expect(evidence.sourceImage.sha256).toBeNull();
      expect(evidence.sourceImage.byteLength).toBeNull();
      expect(evidence.sameFaceRender.proofLevel).toBe('metadata_only');
      expect(evidence.sameFaceRender.actualSourceFaceUrl).toBeNull();
      expect(evidence.sameFaceRender.actualEffectRequest).toBeNull();
      expect(evidence.sameFaceRender.lifecycleReceiptPath).toBeNull();
    }
  });

  it('distinguishes the single receipted lost-shade baseline from candidate metadata', () => {
    const baseline = readJson<BaselineEvidence>('proofs/offline/lost-shade-baseline.json');
    expect(baseline.proofLevel).toBe('verified_lifecycle');
    expect(sha256(baseline.lifecycleReceiptPath)).toBe(baseline.lifecycleReceiptSha256);
    expect(fs.statSync(baseline.outputImagePath).size).toBe(baseline.outputImageBytes);
    expect(sha256(baseline.outputImagePath)).toBe(baseline.outputImageSha256);
    expect(sha256(baseline.fixtureCopyPath)).toBe(baseline.fixtureCopySha256);

    const bundle = demoComparisonBundle();
    expect(bundle.lost.evidence.proofLevel).toBe('verified_lifecycle');
    expect(bundle.lost.render.taskId).toBe(baseline.taskId);
    expect(bundle.lost.render.pollCount).toBe(19);
    for (const candidate of bundle.comparisons) {
      expect(candidate.evidence.sameFaceRender.proofLevel).toBe('metadata_only');
      expect(candidate.evidence.sameFaceRender.lifecycleReceiptPath).toBeNull();
    }
  });
});
