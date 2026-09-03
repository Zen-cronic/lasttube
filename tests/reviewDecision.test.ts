import { describe, expect, it } from 'vitest';
import {
  isSuccessfulVtoRender,
  resolveCandidateDispositions,
  type CandidateDispositionInput,
} from '../shared/reviewDecision.ts';
import type { VtoRender } from '../shared/types.ts';

function render(overrides: Partial<VtoRender> = {}): VtoRender {
  return {
    providerStatus: 'fixture',
    provider: 'perfectcorp',
    taskId: 'fixture-task',
    imageUrl: '/fixtures/render.jpg',
    startedAt: '2026-09-01T00:00:00.000Z',
    completedAt: '2026-09-01T00:00:01.000Z',
    pollCount: 1,
    expiryNote: 'fixture',
    ...overrides,
  };
}

function candidate(
  id: string,
  systemExclusionReason: string | null = null,
): CandidateDispositionInput {
  return { id, reviewable: systemExclusionReason === null, systemExclusionReason };
}

describe('isSuccessfulVtoRender', () => {
  it('requires a completed live-or-fixture image for the lost-shade baseline', () => {
    expect(isSuccessfulVtoRender(render())).toBe(true);
    expect(isSuccessfulVtoRender(render({ providerStatus: 'live' }))).toBe(true);
    expect(isSuccessfulVtoRender(render({ providerStatus: 'failed', imageUrl: null }))).toBe(false);
    expect(isSuccessfulVtoRender(render({ providerStatus: 'unavailable' }))).toBe(false);
    expect(isSuccessfulVtoRender(render({ imageUrl: null }))).toBe(false);
    expect(isSuccessfulVtoRender(null)).toBe(false);
  });
});

describe('resolveCandidateDispositions', () => {
  it('does not complete while any shortlisted candidate is silently unresolved', () => {
    const result = resolveCandidateDispositions(
      [candidate('a'), candidate('b'), candidate('weak', 'coverage below 10%')],
      { a: 'accepted' },
      null,
    );
    expect(result.complete).toBe(false);
    expect(result.resolvedCount).toBe(2);
    expect(result.dispositions.find((item) => item.candidateId === 'b')?.state).toBe('pending');
  });

  it('records one system exclusion plus every explicit human decision', () => {
    const result = resolveCandidateDispositions(
      [candidate('closer'), candidate('human-choice'), candidate('weak', '2.5% coverage')],
      { closer: 'rejected', 'human-choice': 'accepted' },
      'human-choice',
    );
    expect(result.complete).toBe(true);
    expect(result.resolvedCount).toBe(3);
    expect(result.acceptedIds).toEqual(['human-choice']);
    expect(result.rejectedIds).toEqual(['closer']);
    expect(result.systemExcludedIds).toEqual(['weak']);
    expect(result.preferredId).toBe('human-choice');
  });

  it('cannot prefer a rejected candidate', () => {
    const result = resolveCandidateDispositions(
      [candidate('a'), candidate('b')],
      { a: 'accepted', b: 'rejected' },
      'b',
    );
    expect(result.complete).toBe(true);
    expect(result.preferredId).toBeNull();
  });

  it('never lets a human decision restore a system-excluded candidate', () => {
    const result = resolveCandidateDispositions(
      [candidate('weak', 'source image below threshold')],
      { weak: 'accepted' },
      'weak',
    );
    expect(result.complete).toBe(true);
    expect(result.acceptedIds).toEqual([]);
    expect(result.systemExcludedIds).toEqual(['weak']);
    expect(result.preferredId).toBeNull();
  });
});
