// Sanitized fixture data with proof level declared per artifact (see proofs/).
// Fixture results are ALWAYS stamped providerStatus:'fixture' — they can never
// masquerade as live evidence anywhere downstream.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { BaselineEvidence, CandidateEvidence } from '../shared/evidence.ts';
import type { SearchResultSet, VtoRender } from '../shared/types.ts';
import { normalizeShoppingResponse } from './providers/serpapi.ts';
import { RESULT_EXPIRY_NOTE } from './providers/perfectcorp.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(here, 'providers', 'fixtures');
const offlineProofsDir = path.join(here, '..', 'proofs', 'offline');

export const FIXTURE_LABEL =
  'FIXTURE DATA — sanitized recording of a real provider response, not a live call.';

function readFixture<T>(name: string): T {
  const file = path.join(fixturesDir, name);
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
}

function readOfflineProof<T>(name: string): T {
  const file = path.join(offlineProofsDir, name);
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

export interface DemoComparisonBundleFile {
  fixture: true;
  label: string;
  recordedAt: string;
  lost: { hex: string; note: string; localImagePath: string };
  comparisons: Array<{
    candidateId: string;
    title: string;
    estimate: { hex: string; coverage: number; method: string };
    render: { taskId: string; pollCount: number; localImagePath: string };
  }>;
}

export interface DemoComparisonBundle {
  fixture: true;
  label: string;
  recordedAt: string;
  lost: { hex: string; note: string; render: VtoRender; evidence: BaselineEvidence };
  comparisons: Array<{
    candidateId: string;
    title: string;
    estimateHex: string;
    estimateCoverage: number;
    estimateMethod: string;
    render: VtoRender;
    evidence: CandidateEvidence;
  }>;
}

function fixtureRender(
  recordedAt: string,
  taskId: string | null,
  pollCount: number,
  localImagePath: string,
): VtoRender {
  return {
    providerStatus: 'fixture',
    provider: 'perfectcorp',
    taskId,
    imageUrl: localImagePath,
    startedAt: recordedAt,
    completedAt: recordedAt,
    pollCount,
    expiryNote: `${FIXTURE_LABEL} ${RESULT_EXPIRY_NOTE}`,
  };
}

/** Deterministic demo replay with baseline receipt and candidate metadata kept distinct. */
export function demoComparisonBundle(): DemoComparisonBundle {
  const fix = readFixture<DemoComparisonBundleFile>('demo-comparisons.json');
  const baselineEvidence = readOfflineProof<BaselineEvidence>('lost-shade-baseline.json');
  return {
    fixture: true,
    label: fix.label,
    recordedAt: fix.recordedAt,
    lost: {
      hex: fix.lost.hex,
      note: fix.lost.note,
      render: fixtureRender(
        fix.recordedAt,
        baselineEvidence.taskId,
        baselineEvidence.pollCount,
        fix.lost.localImagePath,
      ),
      evidence: baselineEvidence,
    },
    comparisons: fix.comparisons.map((c) => {
      const evidence = readOfflineProof<CandidateEvidence>(`candidate-${c.candidateId}.json`);
      return {
        candidateId: c.candidateId,
        title: c.title,
        estimateHex: c.estimate.hex,
        estimateCoverage: c.estimate.coverage,
        estimateMethod: c.estimate.method,
        render: fixtureRender(
          fix.recordedAt,
          c.render.taskId,
          c.render.pollCount,
          c.render.localImagePath,
        ),
        evidence,
      };
    }),
  };
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
