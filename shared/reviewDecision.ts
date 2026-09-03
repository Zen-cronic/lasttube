import type { VtoRender } from './types.ts';

export type CandidateReviewDecision = 'accepted' | 'rejected';

export function isSuccessfulVtoRender(render: VtoRender | null): boolean {
  return Boolean(
    render &&
      (render.providerStatus === 'live' || render.providerStatus === 'fixture') &&
      render.imageUrl,
  );
}

export interface ReviewResolution {
  complete: boolean;
  resolvedCount: number;
  acceptedIds: string[];
  rejectedIds: string[];
  systemExcludedIds: string[];
  preferredId: string | null;
  dispositions: Array<{
    candidateId: string;
    state: 'pending' | 'human_accepted' | 'human_rejected' | 'system_excluded';
    reason: string | null;
  }>;
}

export interface CandidateDispositionInput {
  id: string;
  reviewable: boolean;
  systemExclusionReason: string | null;
}

/**
 * Resolve only explicit human decisions. Color distance is deliberately absent:
 * it may explain a reviewed option, but it cannot accept, reject, or prefer one.
 */
export function resolveCandidateDispositions(
  candidates: CandidateDispositionInput[],
  decisions: Record<string, CandidateReviewDecision | undefined>,
  requestedPreferredId: string | null,
): ReviewResolution {
  const reviewableIds = candidates
    .filter((candidate) => candidate.reviewable && !candidate.systemExclusionReason)
    .map((candidate) => candidate.id);
  const acceptedIds = reviewableIds.filter((id) => decisions[id] === 'accepted');
  const rejectedIds = reviewableIds.filter((id) => decisions[id] === 'rejected');
  const systemExcludedIds = candidates
    .filter((candidate) => Boolean(candidate.systemExclusionReason))
    .map((candidate) => candidate.id);
  const dispositions = candidates.map((candidate) => {
    if (candidate.systemExclusionReason) {
      return {
        candidateId: candidate.id,
        state: 'system_excluded' as const,
        reason: candidate.systemExclusionReason,
      };
    }
    if (!candidate.reviewable || !decisions[candidate.id]) {
      return { candidateId: candidate.id, state: 'pending' as const, reason: null };
    }
    return {
      candidateId: candidate.id,
      state:
        decisions[candidate.id] === 'accepted'
          ? ('human_accepted' as const)
          : ('human_rejected' as const),
      reason: null,
    };
  });
  const resolvedCount = dispositions.filter((disposition) => disposition.state !== 'pending').length;
  const complete = candidates.length > 0 && resolvedCount === candidates.length;
  const preferredId =
    requestedPreferredId && acceptedIds.includes(requestedPreferredId)
      ? requestedPreferredId
      : null;

  return {
    complete,
    resolvedCount,
    acceptedIds,
    rejectedIds,
    systemExcludedIds,
    preferredId,
    dispositions,
  };
}
