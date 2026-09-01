// OPT-IN live proof: one real Perfect Corp Makeup VTO lifecycle
// (task create -> bounded poll -> rendered result download), receipted with
// credit balance before/after. Never prints or persists credential values.
//
// Source selfie: Perfect Corp's own public docs sample image — no real
// person's selfie is used anywhere in this repository.

import fs from 'node:fs';
import path from 'node:path';
import { getPerfectCorpConfig } from '../server/env.ts';
import { stripSignedQuery } from '../server/redact.ts';
import {
  createMakeupVtoTask,
  getCreditBalance,
  lipColorEffect,
  pollMakeupVtoTask,
} from '../server/providers/perfectcorp.ts';

const SAMPLE_SELFIE_URL =
  'https://plugins-media.makeupar.com/strapi/assets/sample_Image_1_202b6bf6e6.jpg';

// Mauve-rose in the family of Urban Decay's discontinued "Backtalk".
const EFFECTS = [lipColorEffect('#A96A73', 'matte', 80)];

function creditTotal(json: unknown): number | null {
  // Expected shape: { data: [ { amount, ... } ] } or similar; sum any amounts.
  const text = JSON.stringify(json ?? {});
  const amounts = [...text.matchAll(/"amount"\s*:\s*(\d+)/g)].map((m) => Number(m[1]));
  if (amounts.length === 0) return null;
  return amounts.reduce((a, b) => a + b, 0);
}

async function main() {
  const config = getPerfectCorpConfig();
  if (!config) {
    console.error('PERFECT_CORP_API_KEY is not set — aborting (this script is opt-in and live).');
    process.exit(1);
  }

  const recordedAt = new Date().toISOString();
  const day = recordedAt.slice(0, 10);
  const proofDir = path.resolve('proofs/perfectcorp');
  fs.mkdirSync(proofDir, { recursive: true });

  const before = await getCreditBalance(config);
  const beforeUnits = creditTotal(before.json);
  console.log(`[proof:perfectcorp] credit before: ${beforeUnits ?? 'unknown'} units`);

  console.log('[proof:perfectcorp] creating makeup-vto task (lip_color, matte)…');
  const taskId = await createMakeupVtoTask(SAMPLE_SELFIE_URL, EFFECTS, config);
  console.log(`[proof:perfectcorp] task created: ${taskId.slice(0, 12)}…`);

  const outcome = await pollMakeupVtoTask(taskId, config);
  console.log(
    `[proof:perfectcorp] task_status=${outcome.taskStatus} polls=${outcome.pollCount}`,
  );

  let renderPath: string | null = null;
  let fixtureImagePublicPath: string | null = null;
  if (outcome.taskStatus === 'success' && outcome.imageUrl) {
    const res = await fetch(outcome.imageUrl);
    if (!res.ok) throw new Error(`result download failed: HTTP ${res.status}`);
    const bytes = Buffer.from(await res.arrayBuffer());
    renderPath = path.join(proofDir, `${day}-makeup-vto-render.jpg`);
    fs.writeFileSync(renderPath, bytes);
    // Repo-local fixture copy served by Vite for the labeled demo mode.
    const publicFixtureFile = path.resolve('public/fixtures/vto-sample-render.jpg');
    fs.mkdirSync(path.dirname(publicFixtureFile), { recursive: true });
    fs.writeFileSync(publicFixtureFile, bytes);
    fixtureImagePublicPath = '/fixtures/vto-sample-render.jpg';
    console.log(`[proof:perfectcorp] render saved: ${renderPath} (${bytes.length} bytes)`);
  }

  const after = await getCreditBalance(config);
  const afterUnits = creditTotal(after.json);
  console.log(`[proof:perfectcorp] credit after: ${afterUnits ?? 'unknown'} units`);

  const receiptPath = path.join(proofDir, `${day}-makeup-vto-lifecycle.json`);
  fs.writeFileSync(
    receiptPath,
    JSON.stringify(
      {
        proof: 'perfectcorp-makeup-vto-lifecycle',
        sanitized: true,
        recordedAt,
        request: {
          endpoint: 'POST /s2s/v2.0/task/makeup-vto',
          srcFileUrl: SAMPLE_SELFIE_URL,
          srcFileNote: "Perfect Corp's own public docs sample image; no real person's selfie.",
          effects: EFFECTS,
          version: '1.0',
        },
        taskId,
        poll: {
          endpoint: 'GET /s2s/v2.0/task/makeup-vto/<task_id>',
          intervalMs: 2000,
          budgetMs: 120000,
          pollCount: outcome.pollCount,
          finalStatus: outcome.taskStatus,
          errorDetail: outcome.errorDetail,
        },
        resultUrlSanitized: outcome.imageUrl ? stripSignedQuery(outcome.imageUrl) : null,
        resultUrlNote: 'Signed query removed; live result URLs expire (~2h).',
        renderDownloadedTo: renderPath,
        credits: {
          before: beforeUnits,
          after: afterUnits,
          spentUnits:
            beforeUnits !== null && afterUnits !== null ? beforeUnits - afterUnits : null,
        },
      },
      null,
      2,
    ),
  );
  console.log(`[proof:perfectcorp] receipt: ${receiptPath}`);

  if (outcome.taskStatus === 'success' && fixtureImagePublicPath) {
    const fixturePath = path.resolve('server/providers/fixtures/perfectcorp-makeup-vto.json');
    fs.mkdirSync(path.dirname(fixturePath), { recursive: true });
    fs.writeFileSync(
      fixturePath,
      JSON.stringify(
        {
          fixture: true,
          label:
            'FIXTURE — metadata of a real, receipted Perfect Corp makeup-vto lifecycle; the image is a locally stored copy of the real render.',
          recordedAt,
          taskId,
          pollCount: outcome.pollCount,
          localImagePath: fixtureImagePublicPath,
        },
        null,
        2,
      ),
    );
    console.log(`[proof:perfectcorp] fixture refreshed: ${fixturePath}`);
    console.log('[proof:perfectcorp] proof SUCCEEDED.');
  } else {
    console.error(`[proof:perfectcorp] proof FAILED: ${outcome.errorDetail ?? 'no result URL'}`);
    process.exit(1);
  }
}

main().catch((err: Error) => {
  console.error(`[proof:perfectcorp] error: ${err.message}`);
  process.exit(1);
});
