import { describe, expect, it } from 'vitest';
import {
  isSuccessfulVtoRender,
  resolveReviewDecisions,
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

describe('resolveReviewDecisions', () => {
  it('does not complete until every usable candidate has an explicit decision', () => {
    expect(resolveReviewDecisions(['a', 'b'], { a: 'accepted' }, null)).toEqual({
      complete: false,
      acceptedIds: ['a'],
      rejectedIds: [],
      preferredId: null,
    });
  });

  it('lets rejection remove the lower-distance candidate from the human outcome', () => {
    expect(
      resolveReviewDecisions(
        ['closer-by-color', 'human-choice'],
        { 'closer-by-color': 'rejected', 'human-choice': 'accepted' },
        'human-choice',
      ),
    ).toEqual({
      complete: true,
      acceptedIds: ['human-choice'],
      rejectedIds: ['closer-by-color'],
      preferredId: 'human-choice',
    });
  });

  it('cannot prefer a rejected candidate', () => {
    const result = resolveReviewDecisions(
      ['a', 'b'],
      { a: 'accepted', b: 'rejected' },
      'b',
    );
    expect(result.complete).toBe(true);
    expect(result.preferredId).toBeNull();
  });

  it('supports a deliberate no-lead outcome when the human rejects every render', () => {
    const result = resolveReviewDecisions(
      ['a', 'b'],
      { a: 'rejected', b: 'rejected' },
      null,
    );
    expect(result.complete).toBe(true);
    expect(result.acceptedIds).toEqual([]);
    expect(result.rejectedIds).toEqual(['a', 'b']);
  });
});
