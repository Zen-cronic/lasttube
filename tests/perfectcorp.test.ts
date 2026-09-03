// Offline tests: Perfect Corp makeup-vto lifecycle — bounded polling,
// both documented result shapes, engine errors, and secret redaction.
// No network access anywhere in this file.

import { describe, expect, it } from 'vitest';
import { fixtureVtoRender } from '../server/fixtures.ts';
import {
  createMakeupVtoTask,
  extractResultUrl,
  lipColorEffect,
  pollMakeupVtoTask,
  runMakeupVto,
  runMakeupVtoWithEvidence,
} from '../server/providers/perfectcorp.ts';

const noSleep = async () => {};

/** Sequenced fetch mock: returns each response once, repeats the last. */
function sequencedFetch(responses: Array<{ status: number; body: unknown }>): typeof fetch {
  let i = 0;
  return async () => {
    const r = responses[Math.min(i, responses.length - 1)]!;
    i += 1;
    return new Response(JSON.stringify(r.body), { status: r.status });
  };
}

const baseOpts = {
  apiKey: 'pc-test-secret-abcdef123',
  pollIntervalMs: 2000,
  sleep: noSleep,
};

describe('extractResultUrl', () => {
  it('accepts the documented array shape with download_url', () => {
    expect(extractResultUrl({ results: [{ download_url: 'https://x/img.jpg' }] })).toBe(
      'https://x/img.jpg',
    );
  });
  it('accepts the documented object shape with url', () => {
    expect(extractResultUrl({ results: { url: 'https://y/img.jpg' } })).toBe('https://y/img.jpg');
  });
  it('returns null when no url is present', () => {
    expect(extractResultUrl({ results: [] })).toBeNull();
    expect(extractResultUrl({})).toBeNull();
  });
});

describe('runMakeupVto lifecycle', () => {
  it('retains every sanitized create/poll response with timestamps and URL lineage', async () => {
    const signedParam = ['X-Amz', 'Signature'].join('-');
    const signedUrl = `https://s3.invalid/img.jpg?${signedParam}=must-not-survive`;
    const fetchImpl = sequencedFetch([
      {
        status: 200,
        body: {
          api_key: baseOpts.apiKey,
          data: { task_id: 'task-receipt' },
        },
      },
      {
        status: 200,
        body: { data: { task_id: 'task-receipt', task_status: 'running' } },
      },
      {
        status: 200,
        body: {
          data: {
            task_id: 'task-receipt',
            task_status: 'success',
            results: [{ download_url: signedUrl }],
          },
        },
      },
    ]);
    const run = await runMakeupVtoWithEvidence(
      'https://example.invalid/face.jpg?token=private-input',
      [lipColorEffect('#A96A73')],
      { ...baseOpts, fetchImpl, now: () => '2026-09-03T08:00:00.000Z' },
    );
    expect(run.render.providerStatus).toBe('live');
    expect(run.lifecycleReceipt?.polls).toHaveLength(2);
    expect(run.lifecycleReceipt?.validation).toMatchObject({
      createTaskIdPresent: true,
      pollTaskIdsMatchCreate: true,
      finalStatusMatchesRender: true,
      pollCountMatchesResponses: true,
      successResultUrlPresent: true,
    });
    const retained = JSON.stringify(run.lifecycleReceipt);
    expect(retained).not.toContain(baseOpts.apiKey);
    expect(retained).not.toContain('must-not-survive');
    expect(retained).not.toContain('private-input');
    expect(run.lifecycleReceipt?.resultUrlLineage.signedUrlSha256).toHaveLength(64);
    for (const response of [
      run.lifecycleReceipt!.create,
      ...run.lifecycleReceipt!.polls,
    ]) {
      expect(response.requestedAt).toBeTruthy();
      expect(response.receivedAt).toBeTruthy();
      expect(response.retainedBodySha256).toHaveLength(64);
    }
  });

  it('create -> poll running -> success yields a live render', async () => {
    const fetchImpl = sequencedFetch([
      { status: 200, body: { status: 200, data: { task_id: 'task-abc' } } },
      { status: 200, body: { status: 200, data: { task_status: 'running' } } },
      {
        status: 200,
        body: {
          status: 200,
          data: { task_status: 'success', results: [{ download_url: 'https://s3/img.jpg?sig=x' }] },
        },
      },
    ]);
    const render = await runMakeupVto('https://example.com/face.jpg', [lipColorEffect('#A96A73')], {
      ...baseOpts,
      fetchImpl,
    });
    expect(render.providerStatus).toBe('live');
    expect(render.taskId).toBe('task-abc');
    expect(render.imageUrl).toContain('https://s3/img.jpg');
    expect(render.pollCount).toBe(2);
    expect(render.completedAt).not.toBeNull();
  });

  it('maps an engine error to failed without throwing', async () => {
    const fetchImpl = sequencedFetch([
      { status: 200, body: { status: 200, data: { task_id: 'task-err' } } },
      {
        status: 200,
        body: {
          status: 200,
          data: { task_status: 'error', error: 'error_no_face', error_message: 'No face detected.' },
        },
      },
    ]);
    const render = await runMakeupVto('https://example.com/no-face.jpg', [lipColorEffect('#A96A73')], {
      ...baseOpts,
      fetchImpl,
    });
    expect(render.providerStatus).toBe('failed');
    expect(render.imageUrl).toBeNull();
    expect(render.error).toContain('error_no_face');
  });

  it('a task stuck in running is bounded by the poll budget, not infinite', async () => {
    const fetchImpl = sequencedFetch([
      { status: 200, body: { status: 200, data: { task_id: 'task-stuck' } } },
      { status: 200, body: { status: 200, data: { task_status: 'running' } } },
    ]);
    const render = await runMakeupVto('https://example.com/face.jpg', [lipColorEffect('#A96A73')], {
      ...baseOpts,
      fetchImpl,
      pollBudgetMs: 10_000, // 5 polls at 2000ms
    });
    expect(render.providerStatus).toBe('failed');
    expect(render.pollCount).toBe(5);
    expect(render.error).toContain('budget');
  });

  it('never leaks the api key into errors, even when the body echoes auth', async () => {
    const apiKey = 'pc-test-secret-abcdef123';
    const fetchImpl: typeof fetch = async () =>
      new Response(`server saw: Bearer ${apiKey}`, { status: 500 });
    const render = await runMakeupVto('https://example.com/face.jpg', [lipColorEffect('#A96A73')], {
      ...baseOpts,
      fetchImpl,
    });
    expect(render.providerStatus).toBe('failed');
    expect(render.error).toBeDefined();
    expect(render.error).not.toContain(apiKey);
  });
});

describe('createMakeupVtoTask', () => {
  it('rejects a 200 response with no task_id', async () => {
    const fetchImpl = sequencedFetch([{ status: 200, body: { status: 200, data: {} } }]);
    await expect(
      createMakeupVtoTask('https://example.com/face.jpg', [lipColorEffect('#A96A73')], {
        ...baseOpts,
        fetchImpl,
      }),
    ).rejects.toThrow(/no task_id/);
  });
});

describe('pollMakeupVtoTask bounds', () => {
  it('caps the interval below the 10s task-loss threshold', async () => {
    const fetchImpl = sequencedFetch([
      { status: 200, body: { status: 200, data: { task_status: 'running' } } },
    ]);
    const sleeps: number[] = [];
    const outcome = await pollMakeupVtoTask('t', {
      ...baseOpts,
      fetchImpl,
      pollIntervalMs: 60_000, // deliberately over the threshold
      pollBudgetMs: 27_000,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
    });
    expect(outcome.taskStatus).toBe('timeout');
    for (const ms of sleeps) expect(ms).toBeLessThan(10_000);
  });
});

describe('fixtureVtoRender', () => {
  it('is stamped fixture, visibly labeled, and points at a local image', () => {
    const render = fixtureVtoRender();
    expect(render.providerStatus).toBe('fixture');
    expect(render.expiryNote).toContain('FIXTURE');
    expect(render.imageUrl).toMatch(/^\/fixtures\//);
  });
});
