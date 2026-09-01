// Offline tests: SerpApi normalization + fixture labeling + redaction.
// No network access anywhere in this file.

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fixtureSearchResultSet, FIXTURE_LABEL } from '../server/fixtures.ts';
import {
  AVAILABILITY_CAVEAT,
  normalizeShoppingResponse,
  searchShopping,
} from '../server/providers/serpapi.ts';

const fixtureFile = path.resolve('server/providers/fixtures/serpapi-google-shopping.json');
const fixture = JSON.parse(fs.readFileSync(fixtureFile, 'utf8')) as {
  fixture: boolean;
  recordedAt: string;
  query: string;
  raw: unknown;
};

describe('normalizeShoppingResponse', () => {
  it('produces evidence-complete candidate records from the sanitized fixture', () => {
    const set = normalizeShoppingResponse(fixture.raw, fixture.query, fixture.recordedAt, 'fixture');
    expect(set.candidates.length).toBeGreaterThan(0);
    for (const c of set.candidates) {
      expect(c.title.length).toBeGreaterThan(0);
      expect(c.merchant.length).toBeGreaterThan(0);
      expect(c.query).toBe(fixture.query);
      expect(c.observedAt).toBe(fixture.recordedAt);
      expect(c.availability.caveat).toBe(AVAILABILITY_CAVEAT);
      expect(c.provider).toBe('serpapi');
    }
    const withSource = set.candidates.filter((c) => c.sourceUrl !== null);
    expect(withSource.length).toBeGreaterThan(0);
    const withPrice = set.candidates.filter((c) => c.price.value !== null);
    expect(withPrice.length).toBeGreaterThan(0);
  });

  it('keeps the caller-declared provider status and never invents "live"', () => {
    const set = normalizeShoppingResponse(fixture.raw, fixture.query, fixture.recordedAt, 'fixture');
    expect(set.providerStatus).toBe('fixture');
  });

  it('discloses missing evidence instead of failing silently', () => {
    const set = normalizeShoppingResponse({ shopping_results: [] }, 'q', 'now', 'live');
    expect(set.candidates).toHaveLength(0);
    expect(set.warnings.some((w) => w.includes('no shopping results'))).toBe(true);
  });

  it('maps a provider error body to a failed status', () => {
    const set = normalizeShoppingResponse({ error: 'Invalid API key.' }, 'q', 'now', 'live');
    expect(set.providerStatus).toBe('failed');
    expect(set.error).toContain('Invalid API key');
  });
});

describe('fixtureSearchResultSet', () => {
  it('is stamped fixture and visibly labeled, never live', () => {
    const set = fixtureSearchResultSet();
    expect(set.providerStatus).toBe('fixture');
    expect(set.warnings[0]).toBe(FIXTURE_LABEL);
  });
});

describe('searchShopping failure paths', () => {
  it('returns failed status without leaking the api key into the error', async () => {
    const apiKey = 'test-secret-key-12345678';
    const failingFetch: typeof fetch = async (input) => {
      throw new Error(`connect ECONNREFUSED for ${String(input)}`);
    };
    const set = await searchShopping('anything', { apiKey, fetchImpl: failingFetch });
    expect(set.providerStatus).toBe('failed');
    expect(set.error).toBeDefined();
    expect(set.error).not.toContain(apiKey);
    expect(set.error).toContain('api_key=[REDACTED]');
  });

  it('maps HTTP errors to failed status with a redacted message', async () => {
    const apiKey = 'another-secret-key-9999';
    const fetch401: typeof fetch = async () =>
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    const set = await searchShopping('anything', { apiKey, fetchImpl: fetch401 });
    expect(set.providerStatus).toBe('failed');
    expect(set.error).toContain('HTTP 401');
    expect(set.error).not.toContain(apiKey);
  });
});
