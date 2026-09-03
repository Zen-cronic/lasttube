// Synthetic policy-fixture tests only. No catalog is configured or called.

import { describe, expect, it } from 'vitest';
import {
  applyStructuredEnrichment,
  NoStructuredEnrichmentAdapter,
} from '../server/structuredEnrichment.ts';
import {
  unknownCandidateEvidence,
  type StructuredCandidateEnrichment,
} from '../shared/evidence.ts';
import type { CandidateRecord } from '../shared/types.ts';

const candidate: CandidateRecord = {
  id: 'synthetic-candidate',
  title: 'Lipstick Ruby Woo Matte Limited Edition',
  merchant: 'Synthetic merchant',
  productUrl: 'https://synthetic-policy-fixture.invalid/offer',
  sourceUrl: 'https://synthetic-policy-fixture.invalid/source',
  price: { display: '$12.00', value: 12, currency: 'USD' },
  availability: { observed: null, caveat: 'synthetic policy fixture' },
  thumbnailUrl: 'https://synthetic-policy-fixture.invalid/image',
  position: 1,
  query: 'synthetic query',
  observedAt: '2026-09-03T08:00:00.000Z',
  provider: 'serpapi',
};

function baseEvidence() {
  return unknownCandidateEvidence(candidate);
}

describe('structured enrichment policy', () => {
  it('does not promote shade, variant, or finish from variant-looking title prose', async () => {
    const enrichment = await new NoStructuredEnrichmentAdapter().enrich(candidate);
    const evidence = applyStructuredEnrichment(baseEvidence(), enrichment);
    expect(evidence.exactVariant.state).toBe('unknown');
    expect(evidence.exactShade.state).toBe('unknown');
    expect(evidence.finish.state).toBe('unknown');
    expect(JSON.stringify(evidence)).not.toContain('trusted_structured_record');
  });

  it('accepts explicit fields only from a receipt-bound trusted synthetic policy fixture', () => {
    const enrichment: StructuredCandidateEnrichment = {
      schemaVersion: 1,
      candidateId: candidate.id,
      adapterId: 'synthetic-policy-fixture-adapter',
      source: {
        kind: 'trusted_structured_record',
        recordId: 'synthetic-sku-42',
        sourceUrl: 'https://synthetic-policy-fixture.invalid/catalog/42',
        receiptSha256: 'a'.repeat(64),
      },
      exactVariant: { state: 'present', value: 'SKU-42', basis: 'Synthetic structured field.' },
      exactShade: { state: 'present', value: 'Shade 42', basis: 'Synthetic structured field.' },
      finish: { state: 'present', value: 'matte', basis: 'Synthetic structured field.' },
    };
    const evidence = applyStructuredEnrichment(baseEvidence(), enrichment);
    expect(evidence.exactVariant.value).toBe('SKU-42');
    expect(evidence.exactShade.value).toBe('Shade 42');
    expect(evidence.finish.value).toBe('matte');
  });

  it('fails closed when an untrusted or mismatched record tries to promote fields', () => {
    const enrichment: StructuredCandidateEnrichment = {
      schemaVersion: 1,
      candidateId: candidate.id,
      adapterId: 'none',
      source: { kind: 'none', recordId: null, sourceUrl: null, receiptSha256: null },
      exactVariant: { state: 'present', value: 'invented', basis: 'Untrusted.' },
      exactShade: { state: 'unknown', value: null, basis: 'Unknown.' },
      finish: { state: 'unknown', value: null, basis: 'Unknown.' },
    };
    expect(() => applyStructuredEnrichment(baseEvidence(), enrichment)).toThrow(/trusted record/);
    expect(() =>
      applyStructuredEnrichment(baseEvidence(), { ...enrichment, candidateId: 'wrong-candidate' }),
    ).toThrow(/candidate id/);
  });
});
