// OPT-IN live recording of the deterministic demo bundle.
// Takes the top 3 candidates from the sanitized SerpApi fixture, estimates
// each shade from its merchant image, renders each through Perfect Corp,
// downloads the outputs locally, and writes a labeled task/poll summary.
// This legacy script does NOT persist candidate request/lifecycle receipts;
// outputs must remain described as metadata-only until a separate receipt
// captures the input bytes/hash, request, lifecycle, and downloaded result.

import fs from 'node:fs';
import path from 'node:path';
import { getPerfectCorpConfig } from '../server/env.ts';
import { lipColorEffect, SAMPLE_FACE_URL } from '../shared/effects.ts';
import { createMakeupVtoTask, pollMakeupVtoTask } from '../server/providers/perfectcorp.ts';
import { estimateShadeFromUrl } from '../server/shadeEstimate.ts';
import { normalizeShoppingResponse } from '../server/providers/serpapi.ts';

const LOST_HEX = '#A96A73'; // UD Backtalk approximation — matches the packet-1 proof render.

async function main() {
  const config = getPerfectCorpConfig();
  if (!config) {
    console.error('PERFECT_CORP_API_KEY is not set — aborting (this script is opt-in and live).');
    process.exit(1);
  }

  const fixtureFile = path.resolve('server/providers/fixtures/serpapi-google-shopping.json');
  const serpFixture = JSON.parse(fs.readFileSync(fixtureFile, 'utf8')) as {
    recordedAt: string;
    query: string;
    raw: unknown;
  };
  const set = normalizeShoppingResponse(
    serpFixture.raw,
    serpFixture.query,
    serpFixture.recordedAt,
    'fixture',
  );
  const withThumbs = set.candidates.filter((c) => c.thumbnailUrl !== null).slice(0, 3);
  if (withThumbs.length === 0) {
    console.error('No fixture candidates with thumbnails.');
    process.exit(1);
  }

  const recordedAt = new Date().toISOString();
  const comparisons: unknown[] = [];

  for (const c of withThumbs) {
    console.log(`[demo-bundle] ${c.id} — ${c.title}`);
    let estimate;
    try {
      estimate = await estimateShadeFromUrl(c.thumbnailUrl!);
    } catch (err) {
      console.log(`  estimate failed (${(err as Error).message}) — skipping candidate`);
      continue;
    }
    console.log(`  estimated shade ${estimate.hex} (coverage ${(estimate.coverage * 100).toFixed(0)}%)`);
    const taskId = await createMakeupVtoTask(SAMPLE_FACE_URL, [lipColorEffect(estimate.hex)], config);
    const outcome = await pollMakeupVtoTask(taskId, config);
    if (outcome.taskStatus !== 'success' || !outcome.imageUrl) {
      console.log(`  render FAILED: ${outcome.errorDetail ?? outcome.taskStatus} — skipping`);
      continue;
    }
    const res = await fetch(outcome.imageUrl);
    if (!res.ok) {
      console.log(`  render download failed HTTP ${res.status} — skipping`);
      continue;
    }
    const bytes = Buffer.from(await res.arrayBuffer());
    const safeId = c.id.replace(/[^a-zA-Z0-9_-]/g, '');
    const localFile = path.resolve(`public/fixtures/vto-demo-${safeId}.jpg`);
    fs.mkdirSync(path.dirname(localFile), { recursive: true });
    fs.writeFileSync(localFile, bytes);
    console.log(`  render saved (${bytes.length} bytes, ${outcome.pollCount} polls)`);
    comparisons.push({
      candidateId: c.id,
      title: c.title,
      estimate: { hex: estimate.hex, coverage: estimate.coverage, method: estimate.method },
      render: {
        taskId,
        pollCount: outcome.pollCount,
        localImagePath: `/fixtures/vto-demo-${safeId}.jpg`,
      },
    });
  }

  if (comparisons.length === 0) {
    console.error('[demo-bundle] no comparisons recorded — bundle not written.');
    process.exit(1);
  }

  const bundlePath = path.resolve('server/providers/fixtures/demo-comparisons.json');
  fs.writeFileSync(
    bundlePath,
    JSON.stringify(
      {
        fixture: true,
        label:
          'FIXTURE — locally retained candidate outputs with task/poll metadata. Candidate request/lifecycle receipts are not written by this script; replay with visible labels.',
        recordedAt,
        lost: {
          hex: LOST_HEX,
          note: 'Lost-shade render recorded during the packet-1 live proof.',
          localImagePath: '/fixtures/vto-sample-render.jpg',
        },
        comparisons,
      },
      null,
      2,
    ),
  );
  console.log(`[demo-bundle] wrote ${bundlePath} with ${comparisons.length} comparisons.`);
}

main().catch((err: Error) => {
  console.error(`[demo-bundle] error: ${err.message}`);
  process.exit(1);
});
