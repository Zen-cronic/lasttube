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
  acceptedIds: string[];
  rejectedIds: string[];
  preferredId: string | null;
}

/**
 * Resolve only explicit human decisions. Color distance is deliberately absent:
 * it may explain a reviewed option, but it cannot accept, reject, or prefer one.
 */
export function resolveReviewDecisions(
  reviewableIds: string[],
  decisions: Record<string, CandidateReviewDecision | undefined>,
  requestedPreferredId: string | null,
): ReviewResolution {
  const acceptedIds = reviewableIds.filter((id) => decisions[id] === 'accepted');
  const rejectedIds = reviewableIds.filter((id) => decisions[id] === 'rejected');
  const complete =
    reviewableIds.length > 0 && reviewableIds.every((id) => decisions[id] !== undefined);
  const preferredId =
    requestedPreferredId && acceptedIds.includes(requestedPreferredId)
      ? requestedPreferredId
      : null;

  return { complete, acceptedIds, rejectedIds, preferredId };
}
