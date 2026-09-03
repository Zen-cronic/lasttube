import { MIN_SHADE_EVIDENCE_COVERAGE } from './shadeEvidence.ts';

export type EvidenceState = 'present' | 'absent' | 'unknown';

export interface EvidenceField {
  state: EvidenceState;
  value: string | null;
  basis: string;
}

export type RenderProofLevel = 'verified_lifecycle' | 'runtime_live' | 'metadata_only' | 'missing';

export interface BaselineEvidence {
  schemaVersion: 1;
  kind: 'lost-shade-baseline';
  proofLevel: 'verified_lifecycle';
  recordedAt: string;
  lifecycleReceiptPath: string;
  lifecycleReceiptSha256: string;
  sourceFaceUrl: string;
  effectColor: string;
  taskId: string;
  pollCount: number;
  finalStatus: 'success';
  outputImagePath: string;
  outputImageSha256: string;
  outputImageBytes: number;
  fixtureCopyPath: string;
  fixtureCopySha256: string;
  basis: string;
}

export interface CandidateEvidence {
  schemaVersion: 1;
  candidateId: string;
  listingIdentity: {
    state: EvidenceState;
    observedTitle: string;
    merchant: string;
    observedOfferUrl: string | null;
    sourceUrl: string | null;
    observedAt: string;
    sourceReceiptPath: string | null;
    sourceReceiptSha256: string | null;
    basis: string;
  };
  exactVariant: EvidenceField;
  exactShade: EvidenceField;
  finish: EvidenceField;
  sourceImage: {
    state: EvidenceState;
    listingThumbnailUrl: string | null;
    actualRequestUrl: string | null;
    sha256: string | null;
    byteLength: number | null;
    coverage: number | null;
    estimatedHex: string | null;
    method: string | null;
    basis: string;
  };
  sameFaceRender: {
    state: EvidenceState;
    proofLevel: RenderProofLevel;
    providerStatus: 'live' | 'fixture' | 'unavailable' | 'failed' | null;
    taskId: string | null;
    pollCount: number | null;
    actualSourceFaceUrl: string | null;
    actualEffectRequest: string | null;
    lifecycleReceiptPath: string | null;
    outputImagePath: string | null;
    outputImageSha256: string | null;
    outputImageBytes: number | null;
    basis: string;
  };
  systemExclusionReason: string | null;
}

export interface CandidateListingInput {
  id: string;
  title: string;
  merchant: string;
  productUrl: string | null;
  sourceUrl: string | null;
  thumbnailUrl: string | null;
  observedAt: string;
}

/**
 * Live search rows begin unknown. LastTube does not infer a shade or variant
 * from marketing prose; later evidence must deliberately move each field.
 */
export function unknownCandidateEvidence(candidate: CandidateListingInput): CandidateEvidence {
  return {
    schemaVersion: 1,
    candidateId: candidate.id,
    listingIdentity: {
      state:
        candidate.id && candidate.title && candidate.productUrl && candidate.sourceUrl
          ? 'present'
          : 'unknown',
      observedTitle: candidate.title,
      merchant: candidate.merchant,
      observedOfferUrl: candidate.productUrl,
      sourceUrl: candidate.sourceUrl,
      observedAt: candidate.observedAt,
      sourceReceiptPath: null,
      sourceReceiptSha256: null,
      basis: 'Runtime SerpApi row; no durable receipt path is assigned in browser state.',
    },
    exactVariant: {
      state: 'unknown',
      value: null,
      basis: 'No structured exact-variant field was returned or verified.',
    },
    exactShade: {
      state: 'unknown',
      value: null,
      basis: 'No structured exact-shade field was returned or verified.',
    },
    finish: {
      state: 'unknown',
      value: null,
      basis: 'Finish was not verified as a structured variant attribute.',
    },
    sourceImage: {
      state: 'unknown',
      listingThumbnailUrl: candidate.thumbnailUrl,
      actualRequestUrl: null,
      sha256: null,
      byteLength: null,
      coverage: null,
      estimatedHex: null,
      method: null,
      basis: 'Listing thumbnail URL observed; fetched bytes and hash are not yet retained.',
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
      basis: 'No candidate render has completed.',
    },
    systemExclusionReason: null,
  };
}

export type LeadOutcome =
  | {
      kind: 'actionable';
      candidateId: string;
      observedOfferUrl: string;
      exactLabel: string;
      alertEligible: true;
    }
  | {
      kind: 'no_actionable_lead';
      candidateId: string | null;
      missing: string[];
    };

function fieldIsPresent(field: EvidenceField): boolean {
  return field.state === 'present' && Boolean(field.value?.trim());
}

/**
 * Derive—not narrate—the commercial action boundary. An observed offer and
 * alert eligibility unlock only when every required piece is independently
 * present and the human accepted/preferred the candidate after a baseline.
 */
export function deriveLeadOutcome(input: {
  baselineReady: boolean;
  evidence: CandidateEvidence | null;
  humanAccepted: boolean;
  humanPreferred: boolean;
}): LeadOutcome {
  const { evidence } = input;
  if (!evidence) {
    return { kind: 'no_actionable_lead', candidateId: null, missing: ['preferred candidate'] };
  }

  const missing: string[] = [];
  if (!input.baselineReady) missing.push('successful lost-shade baseline');
  if (!input.humanAccepted) missing.push('human acceptance');
  if (!input.humanPreferred) missing.push('human preference');
  if (
    evidence.listingIdentity.state !== 'present' ||
    !evidence.listingIdentity.observedOfferUrl ||
    !evidence.listingIdentity.sourceUrl ||
    !evidence.listingIdentity.sourceReceiptPath ||
    !evidence.listingIdentity.sourceReceiptSha256
  ) {
    missing.push('source-backed listing identity and observed offer');
  }
  if (!fieldIsPresent(evidence.exactVariant)) missing.push('exact variant');
  if (!fieldIsPresent(evidence.exactShade)) missing.push('exact shade');
  if (!fieldIsPresent(evidence.finish)) missing.push('finish');
  if (
    evidence.sourceImage.state !== 'present' ||
    !evidence.sourceImage.actualRequestUrl ||
    !evidence.sourceImage.sha256 ||
    !evidence.sourceImage.byteLength ||
    !evidence.sourceImage.method ||
    evidence.sourceImage.coverage === null ||
    evidence.sourceImage.coverage < MIN_SHADE_EVIDENCE_COVERAGE
  ) {
    missing.push('hashed source image with usable coverage');
  }
  if (
    evidence.sameFaceRender.state !== 'present' ||
    evidence.sameFaceRender.proofLevel !== 'verified_lifecycle' ||
    !evidence.sameFaceRender.taskId ||
    !evidence.sameFaceRender.actualSourceFaceUrl ||
    !evidence.sameFaceRender.actualEffectRequest ||
    !evidence.sameFaceRender.lifecycleReceiptPath ||
    !evidence.sameFaceRender.outputImagePath ||
    !evidence.sameFaceRender.outputImageSha256 ||
    !evidence.sameFaceRender.outputImageBytes
  ) {
    missing.push('verified candidate VTO input/lifecycle/output');
  }

  if (missing.length > 0) {
    return { kind: 'no_actionable_lead', candidateId: evidence.candidateId, missing };
  }

  return {
    kind: 'actionable',
    candidateId: evidence.candidateId,
    observedOfferUrl: evidence.listingIdentity.observedOfferUrl!,
    exactLabel: `${evidence.listingIdentity.observedTitle} — ${evidence.exactShade.value!} (${evidence.finish.value!})`,
    alertEligible: true,
  };
}
