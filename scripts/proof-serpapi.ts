// OPT-IN live proof: one real SerpApi google_shopping call.
// Writes sanitized receipts to proofs/serpapi/ and refreshes the derived
// fixture at server/providers/fixtures/serpapi-google-shopping.json.
// Never prints or persists credential values.

import fs from 'node:fs';
import path from 'node:path';
import { getSerpApiConfig } from '../server/env.ts';
import { sanitizeJson } from '../server/redact.ts';
import { normalizeShoppingResponse, searchShoppingRaw } from '../server/providers/serpapi.ts';

// Hero scenario: Urban Decay's Vice lipstick line (including the cult shade
// "Backtalk") was discontinued; hunt currently listed mauve-rose analogs.
const QUERY = 'mauve rose matte lipstick';
const receiptOnly = process.argv.includes('--receipt-only');

async function main() {
  const config = getSerpApiConfig();
  if (!config) {
    console.error('SERPAPI_KEY is not set — aborting (this script is opt-in and live).');
    process.exit(1);
  }

  const recordedAt = new Date().toISOString();
  const day = recordedAt.slice(0, 10);
  console.log(`[proof:serpapi] live google_shopping search for: ${QUERY}`);

  const raw = await searchShoppingRaw(QUERY, config);
  const sanitizedRaw = sanitizeJson(raw);

  const proofDir = path.resolve('proofs/serpapi');
  fs.mkdirSync(proofDir, { recursive: true });

  const receiptPath = path.join(proofDir, `${day}-google-shopping.json`);
  fs.writeFileSync(
    receiptPath,
    JSON.stringify(
      {
        proof: 'serpapi-google-shopping',
        sanitized: true,
        recordedAt,
        query: QUERY,
        engine: 'google_shopping',
        raw: sanitizedRaw,
      },
      null,
      2,
    ),
  );

  const normalized = normalizeShoppingResponse(sanitizedRaw, QUERY, recordedAt, 'live');
  const normalizedPath = path.join(proofDir, `${day}-normalized.json`);
  fs.writeFileSync(normalizedPath, JSON.stringify(normalized, null, 2));

  let fixturePath: string | null = null;
  if (!receiptOnly) {
    // Derived fixture (trimmed to keep the repo light). `--receipt-only` deliberately
    // leaves the deterministic judged path untouched while proving freshness.
    const rawObj = sanitizedRaw as { shopping_results?: unknown[] } & Record<string, unknown>;
    const fixtureRaw = {
      ...rawObj,
      shopping_results: Array.isArray(rawObj.shopping_results)
        ? rawObj.shopping_results.slice(0, 10)
        : [],
    };
    fixturePath = path.resolve('server/providers/fixtures/serpapi-google-shopping.json');
    fs.mkdirSync(path.dirname(fixturePath), { recursive: true });
    fs.writeFileSync(
      fixturePath,
      JSON.stringify(
        {
          fixture: true,
          label:
            'FIXTURE — sanitized recording of a real SerpApi google_shopping response; not live data.',
          recordedAt,
          query: QUERY,
          raw: fixtureRaw,
        },
        null,
        2,
      ),
    );
  }

  console.log(`[proof:serpapi] status=${normalized.providerStatus}`);
  console.log(`[proof:serpapi] candidates=${normalized.candidates.length}`);
  for (const c of normalized.candidates.slice(0, 3)) {
    console.log(
      `  #${c.position} ${c.title} — ${c.merchant} — ${c.price.display ?? 'no price'}`,
    );
  }
  for (const w of normalized.warnings) console.log(`  warning: ${w}`);
  console.log(`[proof:serpapi] receipt: ${receiptPath}`);
  console.log(`[proof:serpapi] normalized: ${normalizedPath}`);
  console.log(
    fixturePath
      ? `[proof:serpapi] fixture refreshed: ${fixturePath}`
      : '[proof:serpapi] receipt-only mode: deterministic fixture unchanged',
  );
  if (normalized.providerStatus !== 'live' || normalized.candidates.length === 0) {
    console.error('[proof:serpapi] proof FAILED — no live candidates.');
    process.exit(1);
  }
}

main().catch((err: Error) => {
  console.error(`[proof:serpapi] error: ${err.message}`);
  process.exit(1);
});
