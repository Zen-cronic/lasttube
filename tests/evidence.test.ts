import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { deriveLeadOutcome, type CandidateEvidence } from '../shared/evidence.ts';

function completeEvidence(): CandidateEvidence {
  return {
    schemaVersion: 1,
    candidateId: 'exact-rose-42',
    listingIdentity: {
      state: 'present',
      observedTitle: 'Example Lip Color',
      merchant: 'Example merchant',
      observedOfferUrl: 'https://example.com/offer/42',
      sourceUrl: 'https://example.com/evidence/42',
      observedAt: '2026-09-03T00:00:00.000Z',
      sourceReceiptPath: 'proofs/example.json',
      sourceReceiptSha256: 'a'.repeat(64),
      basis: 'complete test evidence',
    },
    exactVariant: { state: 'present', value: '42', basis: 'structured variant id' },
    exactShade: { state: 'present', value: 'Rose Archive', basis: 'structured shade field' },
    finish: { state: 'present', value: 'matte', basis: 'structured finish field' },
    sourceImage: {
      state: 'present',
      listingThumbnailUrl: 'https://example.com/image.jpg',
      actualRequestUrl: 'https://example.com/image.jpg',
      sha256: 'b'.repeat(64),
      byteLength: 12345,
      coverage: 0.42,
      estimatedHex: '#a96a73',
      method: 'documented estimator',
      basis: 'retained bytes',
    },
    sameFaceRender: {
      state: 'present',
      proofLevel: 'verified_lifecycle',
      providerStatus: 'live',
      taskId: 'task-42',
      pollCount: 3,
      actualSourceFaceUrl: 'https://example.com/face.jpg',
      actualEffectRequest: '#a96a73 matte',
      lifecycleReceiptPath: 'proofs/vto-42.json',
      outputImagePath: 'proofs/vto-42.jpg',
      outputImageSha256: 'c'.repeat(64),
      outputImageBytes: 54321,
      basis: 'verified lifecycle',
    },
    systemExclusionReason: null,
  };
}

describe('deriveLeadOutcome', () => {
  it('unlocks the observed offer only when every required evidence field is present', () => {
    expect(
      deriveLeadOutcome({
        baselineReady: true,
        evidence: completeEvidence(),
        humanAccepted: true,
        humanPreferred: true,
      }),
    ).toEqual({
      kind: 'actionable',
      candidateId: 'exact-rose-42',
      observedOfferUrl: 'https://example.com/offer/42',
      exactLabel: 'Example Lip Color — Rose Archive (matte)',
      alertEligible: true,
    });
  });

  it('keeps the current preferred fixture non-actionable from its structured manifest', () => {
    const evidence = JSON.parse(
      fs.readFileSync('proofs/offline/candidate-5488601639792751465.json', 'utf8'),
    ) as CandidateEvidence;
    const result = deriveLeadOutcome({
      baselineReady: true,
      evidence,
      humanAccepted: true,
      humanPreferred: true,
    });
    expect(result.kind).toBe('no_actionable_lead');
    if (result.kind === 'no_actionable_lead') {
      expect(result.missing).toContain('exact variant');
      expect(result.missing).toContain('exact shade');
      expect(result.missing).toContain('hashed source image with usable coverage');
      expect(result.missing).toContain('verified candidate VTO input/lifecycle/output');
    }
  });

  it('fails closed when one otherwise-complete field becomes unknown', () => {
    const evidence = completeEvidence();
    evidence.finish = { state: 'unknown', value: null, basis: 'not retained' };
    const result = deriveLeadOutcome({
      baselineReady: true,
      evidence,
      humanAccepted: true,
      humanPreferred: true,
    });
    expect(result.kind).toBe('no_actionable_lead');
    if (result.kind === 'no_actionable_lead') expect(result.missing).toContain('finish');
  });
});
