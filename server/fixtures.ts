// Sanitized fixture data, derived from real provider receipts (see proofs/).
// Fixture results are ALWAYS stamped providerStatus:'fixture' — they can never
// masquerade as live evidence anywhere downstream.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SearchResultSet, VtoRender } from '../shared/types.ts';
import { normalizeShoppingResponse } from './providers/serpapi.ts';
import { RESULT_EXPIRY_NOTE } from './providers/perfectcorp.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(here, 'providers', 'fixtures');

export const FIXTURE_LABEL =
  'FIXTURE DATA — sanitized recording of a real provider response, not a live call.';

function readFixture<T>(name: string): T {
  const file = path.join(fixturesDir, name);
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
}

interface SerpApiFixtureFile {
  fixture: true;
  label: string;
  recordedAt: string;
  query: string;
  raw: unknown;
}

/** Candidate discovery from the sanitized SerpApi recording. */
export function fixtureSearchResultSet(): SearchResultSet {
  const fix = readFixture<SerpApiFixtureFile>('serpapi-google-shopping.json');
  const set = normalizeShoppingResponse(fix.raw, fix.query, fix.recordedAt, 'fixture');
  set.warnings.unshift(FIXTURE_LABEL);
  return set;
}

interface PerfectCorpFixtureFile {
  fixture: true;
  label: string;
  recordedAt: string;
  taskId: string;
  pollCount: number;
  /** Repo-local copy of the rendered image (signed URL copies expire). */
  localImagePath: string;
}

/** VTO render pointing at the locally stored, clearly-labeled sample render. */
export function fixtureVtoRender(): VtoRender {
  const fix = readFixture<PerfectCorpFixtureFile>('perfectcorp-makeup-vto.json');
  return {
    providerStatus: 'fixture',
    provider: 'perfectcorp',
    taskId: fix.taskId,
    imageUrl: fix.localImagePath,
    startedAt: fix.recordedAt,
    completedAt: fix.recordedAt,
    pollCount: fix.pollCount,
    expiryNote: `${FIXTURE_LABEL} ${RESULT_EXPIRY_NOTE}`,
  };
}
