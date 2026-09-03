import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { deriveLeadOutcome, type CandidateEvidence } from '../shared/evidence.ts';

/** Synthetic policy fixture only. This is not provider or product evidence. */
function syntheticPolicyFixtureEvidence(): CandidateEvidence {
  return {
    schemaVersion: 1,
    candidateId: 'exact-rose-42',
    listingIdentity: {
      state: 'present',
      observedTitle: 'Example Lip Color',
      merchant: 'Example merchant',
      observedOfferUrl: 'https://synthetic-policy-fixture.invalid/offer/42',
      sourceUrl: 'https://synthetic-policy-fixture.invalid/evidence/42',
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
      listingThumbnailUrl: 'https://synthetic-policy-fixture.invalid/image.jpg',
      actualRequestUrl: 'https://synthetic-policy-fixture.invalid/image.jpg',
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
      actualSourceFaceUrl: 'https://synthetic-policy-fixture.invalid/face.jpg',
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
  it('unlocks only for a validated, all-fields-present synthetic policy fixture', () => {
    expect(
      deriveLeadOutcome({
        baselineReady: true,
        evidence: syntheticPolicyFixtureEvidence(),
        manifestValidated: true,
        humanAccepted: true,
        humanPreferred: true,
      }),
    ).toEqual({
      kind: 'actionable',
      candidateId: 'exact-rose-42',
      observedOfferUrl: 'https://synthetic-policy-fixture.invalid/offer/42',
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
      manifestValidated: false,
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
    const evidence = syntheticPolicyFixtureEvidence();
    evidence.finish = { state: 'unknown', value: null, basis: 'not retained' };
    const result = deriveLeadOutcome({
      baselineReady: true,
      evidence,
      manifestValidated: true,
      humanAccepted: true,
      humanPreferred: true,
    });
    expect(result.kind).toBe('no_actionable_lead');
    if (result.kind === 'no_actionable_lead') expect(result.missing).toContain('finish');
  });

  it('blocks even complete synthetic fields when the per-run manifest is not validated', () => {
    const result = deriveLeadOutcome({
      baselineReady: true,
      evidence: syntheticPolicyFixtureEvidence(),
      manifestValidated: false,
      humanAccepted: true,
      humanPreferred: true,
    });
    expect(result.kind).toBe('no_actionable_lead');
    if (result.kind === 'no_actionable_lead') {
      expect(result.missing).toContain('validated per-run evidence manifest');
    }
  });
});
