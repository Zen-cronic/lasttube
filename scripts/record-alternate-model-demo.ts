// OPT-IN live proof on a second portrait published by Perfect Corp's API
// playground. Records a lost-shade baseline and one candidate comparison.
// It does not mutate the deterministic judged fixtures or fetch merchant media.

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { getPerfectCorpConfig } from '../server/env.ts';
import { getCreditBalance, runMakeupVtoWithEvidence } from '../server/providers/perfectcorp.ts';
import { downloadVtoOutput } from '../server/runtimeEvidence.ts';
import { lipColorEffect } from '../shared/effects.ts';

const ALTERNATE_SAMPLE_FACE_URL =
  'https://plugins-media.makeupar.com/strapi/assets/general_01_f8f1fd2225.png';
const renders = [
  { key: 'baseline', hex: '#A96A73' },
  { key: 'candidate-abh', hex: '#bb727a' },
] as const;

function sha256(bytes: Buffer | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function creditTotal(json: unknown): number | null {
  const text = JSON.stringify(json ?? {});
  const amounts = [...text.matchAll(/"amount"\s*:\s*(\d+)/g)].map((m) => Number(m[1]));
  return amounts.length === 0 ? null : amounts.reduce((sum, amount) => sum + amount, 0);
}

function writeJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

async function downloadSampleFace(): Promise<Buffer> {
  const response = await fetch(ALTERNATE_SAMPLE_FACE_URL);
  if (!response.ok) throw new Error(`alternate sample download failed: HTTP ${response.status}`);
  if (!(response.headers.get('content-type') ?? '').startsWith('image/')) {
    throw new Error('alternate sample download was not an image');
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length === 0 || bytes.length > 8 * 1024 * 1024) {
    throw new Error('alternate sample image was empty or exceeded 8 MB');
  }
  return bytes;
}

async function main() {
  const config = getPerfectCorpConfig();
  if (!config) throw new Error('PERFECT_CORP_API_KEY is not set — live proof aborted.');

  const recordedAt = new Date().toISOString();
  const day = recordedAt.slice(0, 10);
  const proofDir = 'proofs/perfectcorp';
  const sampleFace = await downloadSampleFace();
  const before = creditTotal((await getCreditBalance(config)).json);
  console.log(`[alternate-model] credit before: ${before ?? 'unknown'} units`);

  const completed = [];
  for (const spec of renders) {
    console.log(`[alternate-model] rendering ${spec.key}`);
    const run = await runMakeupVtoWithEvidence(
      ALTERNATE_SAMPLE_FACE_URL,
      [lipColorEffect(spec.hex)],
      config,
    );
    if (run.render.providerStatus !== 'live' || !run.render.imageUrl || !run.lifecycleReceipt) {
      throw new Error(`${spec.key} failed: ${run.render.error ?? run.render.providerStatus}`);
    }
    const output = await downloadVtoOutput(run.render.imageUrl);
    completed.push({ spec, render: run.render, lifecycle: run.lifecycleReceipt, output });
    console.log(
      `[alternate-model] ${spec.key} succeeded (${run.render.pollCount} polls, ${output.bytes.length} bytes)`,
    );
  }

  const after = creditTotal((await getCreditBalance(config)).json);
  console.log(`[alternate-model] credit after: ${after ?? 'unknown'} units`);
  fs.mkdirSync(proofDir, { recursive: true });
  const sourcePath = `${proofDir}/${day}-alternate-model-source.png`;
  fs.writeFileSync(sourcePath, sampleFace);

  for (const item of completed) {
    const outputPath = `${proofDir}/${day}-alternate-model-${item.spec.key}-render.jpg`;
    const lifecyclePath = `${proofDir}/${day}-alternate-model-${item.spec.key}-lifecycle.json`;
    fs.writeFileSync(outputPath, item.output.bytes);
    writeJson(lifecyclePath, {
      recordedAt,
      source: {
        kind: 'perfectcorp_published_api_playground_sample',
        url: ALTERNATE_SAMPLE_FACE_URL,
        sha256: sha256(sampleFace),
        byteLength: sampleFace.length,
        retainedPath: sourcePath,
      },
      role: item.spec.key,
      effectColor: item.spec.hex,
      lifecycle: item.lifecycle,
      outputDownload: item.output.receipt,
      retainedOutputPath: outputPath,
    });
  }

  writeJson(`${proofDir}/${day}-alternate-model-session.json`, {
    proof: 'lasttube-alternate-model-comparison',
    recordedAt,
    source: {
      kind: 'perfectcorp_published_api_playground_sample',
      url: ALTERNATE_SAMPLE_FACE_URL,
      sha256: sha256(sampleFace),
      byteLength: sampleFace.length,
      retainedPath: sourcePath,
    },
    successfulRenders: completed.length,
    credits: {
      before,
      after,
      spentUnits: before !== null && after !== null ? before - after : null,
    },
    note:
      'Fresh baseline plus one candidate effect on a second official fixture model. This robustness proof is separate from the deterministic hero replay and does not establish variant, shade, finish, or an actionable lead.',
  });
  console.log(
    `[alternate-model] proof succeeded: ${completed.length} renders, ${before !== null && after !== null ? before - after : 'unknown'} units`,
  );
}

main().catch((error: Error) => {
  console.error(`[alternate-model] error: ${error.message}`);
  process.exit(1);
});
