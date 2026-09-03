import { createHash } from 'node:crypto';
import type {
  CandidateEvidence,
  EvidenceField,
  StructuredCandidateEnrichment,
} from '../shared/evidence.ts';
import type { CandidateRecord } from '../shared/types.ts';
import { ProviderError } from './redact.ts';

const UNKNOWN_VARIANT_BASIS =
  'No trusted structured enrichment source is configured; listing-title prose is not promoted.';

export interface StructuredEnrichmentAdapter {
  readonly id: string;
  enrich(candidate: CandidateRecord): Promise<StructuredCandidateEnrichment>;
}

function unknownField(): EvidenceField {
  return { state: 'unknown', value: null, basis: UNKNOWN_VARIANT_BASIS };
}

/** Default adapter: deliberately ignores even variant-looking words in titles. */
export class NoStructuredEnrichmentAdapter implements StructuredEnrichmentAdapter {
  readonly id = 'none';

  async enrich(candidate: CandidateRecord): Promise<StructuredCandidateEnrichment> {
    return {
      schemaVersion: 1,
      candidateId: candidate.id,
      adapterId: this.id,
      source: {
        kind: 'none',
        recordId: null,
        sourceUrl: null,
        receiptSha256: null,
        receipt: null,
      },
      exactVariant: unknownField(),
      exactShade: unknownField(),
      finish: unknownField(),
    };
  }
}

function isSha256(value: string | null): value is string {
  return Boolean(value && /^[a-f0-9]{64}$/i.test(value));
}

function validateField(field: EvidenceField, label: string): void {
  if (field.state === 'present' && !field.value?.trim()) {
    throw new ProviderError(`Structured ${label} is present but has no value.`);
  }
  if (field.state !== 'present' && field.value !== null) {
    throw new ProviderError(`Structured ${label} cannot carry a value when ${field.state}.`);
  }
}

/**
 * Apply only an explicitly trusted, receipt-bound structured record. This
 * function has no title parser and therefore cannot silently infer attributes
 * from ambiguous listing copy.
 */
export function applyStructuredEnrichment(
  evidence: CandidateEvidence,
  enrichment: StructuredCandidateEnrichment,
): CandidateEvidence {
  if (evidence.candidateId !== enrichment.candidateId) {
    throw new ProviderError('Structured enrichment candidate id does not match the evidence row.');
  }
  validateField(enrichment.exactVariant, 'exact variant');
  validateField(enrichment.exactShade, 'exact shade');
  validateField(enrichment.finish, 'finish');

  const promotesAny = [enrichment.exactVariant, enrichment.exactShade, enrichment.finish].some(
    (field) => field.state === 'present',
  );
  if (
    promotesAny &&
    (enrichment.source.kind !== 'trusted_structured_record' ||
      !enrichment.source.recordId ||
      !enrichment.source.sourceUrl ||
      !isSha256(enrichment.source.receiptSha256) ||
      !enrichment.source.receipt)
  ) {
    throw new ProviderError(
      'Structured attributes require a trusted record id, source URL, and receipt SHA-256.',
    );
  }
  if (enrichment.source.kind === 'none' && promotesAny) {
    throw new ProviderError('The no-source enrichment adapter cannot promote exact attributes.');
  }
  if (enrichment.source.kind === 'trusted_structured_record') {
    const receipt = enrichment.source.receipt;
    if (!receipt || receipt.mediaType !== 'application/json' || receipt.encoding !== 'utf-8') {
      throw new ProviderError('Trusted structured enrichment has no retained JSON receipt bytes.');
    }
    if (
      Buffer.byteLength(receipt.bodyText) !== receipt.byteLength ||
      createHash('sha256').update(receipt.bodyText).digest('hex') !==
        enrichment.source.receiptSha256
    ) {
      throw new ProviderError('Trusted structured enrichment receipt digest does not match its bytes.');
    }
    let record: Record<string, unknown>;
    try {
      record = JSON.parse(receipt.bodyText) as Record<string, unknown>;
    } catch {
      throw new ProviderError('Trusted structured enrichment receipt is not JSON.');
    }
    if (
      record.candidateId !== enrichment.candidateId ||
      record.recordId !== enrichment.source.recordId ||
      record.sourceUrl !== enrichment.source.sourceUrl ||
      record.exactVariant !== enrichment.exactVariant.value ||
      record.exactShade !== enrichment.exactShade.value ||
      record.finish !== enrichment.finish.value
    ) {
      throw new ProviderError('Trusted structured enrichment receipt fields do not match promotion.');
    }
  } else if (enrichment.source.receipt || enrichment.source.receiptSha256) {
    throw new ProviderError('No-source enrichment cannot carry receipt evidence.');
  }

  return {
    ...evidence,
    exactVariant: enrichment.exactVariant,
    exactShade: enrichment.exactShade,
    finish: enrichment.finish,
  };
}

export const structuredEnrichmentAdapter: StructuredEnrichmentAdapter =
  new NoStructuredEnrichmentAdapter();
