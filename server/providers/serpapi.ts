// SerpApi client: live Google Shopping evidence for replacement candidates.
// The normalizer is pure and fully unit-testable offline against fixtures.

import type { CandidateRecord, ProviderStatus, SearchResultSet } from '../../shared/types.ts';
import { ProviderError, redactSecrets } from '../redact.ts';

export const AVAILABILITY_CAVEAT =
  'Observed on a Google Shopping listing via SerpApi at the stated time; listings are not a real-time stock check.';

/** Raw shapes we rely on from SerpApi's google_shopping engine. */
interface RawShoppingResult {
  position?: number;
  title?: string;
  link?: string;
  product_link?: string;
  product_id?: string;
  source?: string;
  price?: string;
  extracted_price?: number;
  thumbnail?: string;
  delivery?: string;
  tag?: string;
  second_hand_condition?: string;
}

interface RawShoppingResponse {
  error?: string;
  search_metadata?: { id?: string; status?: string; created_at?: string };
  search_parameters?: { q?: string; engine?: string };
  shopping_results?: RawShoppingResult[];
}

function currencyOf(display: string | null): string | null {
  if (!display) return null;
  if (display.includes('$')) return 'USD';
  if (display.includes('£')) return 'GBP';
  if (display.includes('€')) return 'EUR';
  return null;
}

/** Pure normalization: raw SerpApi JSON -> typed, source-backed candidates. */
export function normalizeShoppingResponse(
  raw: unknown,
  query: string,
  observedAt: string,
  providerStatus: ProviderStatus,
): SearchResultSet {
  const json = (raw ?? {}) as RawShoppingResponse;
  const warnings: string[] = [];

  if (json.error) {
    return {
      providerStatus: 'failed',
      provider: 'serpapi',
      query,
      observedAt,
      candidates: [],
      warnings,
      error: redactSecrets(String(json.error)),
    };
  }

  const rawResults = Array.isArray(json.shopping_results) ? json.shopping_results : [];
  if (rawResults.length === 0) {
    warnings.push('SerpApi returned no shopping results for this query; evidence is missing, not negative.');
  }

  const candidates: CandidateRecord[] = rawResults
    .filter((r) => typeof r.title === 'string' && r.title.length > 0)
    .map((r, i) => {
      const display = typeof r.price === 'string' ? r.price : null;
      const observedBits = [r.tag, r.delivery, r.second_hand_condition].filter(
        (b): b is string => typeof b === 'string' && b.length > 0,
      );
      return {
        id: r.product_id ?? `pos-${r.position ?? i + 1}`,
        title: r.title as string,
        merchant: r.source ?? 'Unknown merchant',
        productUrl: r.product_link ?? r.link ?? null,
        sourceUrl: r.link ?? r.product_link ?? null,
        price: {
          display,
          value: typeof r.extracted_price === 'number' ? r.extracted_price : null,
          currency: currencyOf(display),
        },
        availability: {
          observed: observedBits.length > 0 ? observedBits.join(' · ') : null,
          caveat: AVAILABILITY_CAVEAT,
        },
        thumbnailUrl: r.thumbnail ?? null,
        position: r.position ?? i + 1,
        query,
        observedAt,
        provider: 'serpapi' as const,
      };
    });

  const missingPrice = candidates.filter((c) => c.price.display === null).length;
  if (candidates.length > 0 && missingPrice > 0) {
    warnings.push(`${missingPrice} of ${candidates.length} listings did not report a price.`);
  }
  const missingLink = candidates.filter((c) => c.sourceUrl === null).length;
  if (missingLink > 0) {
    warnings.push(`${missingLink} listings had no source link and cannot be independently verified.`);
  }

  return {
    providerStatus,
    provider: 'serpapi',
    query,
    observedAt,
    candidates,
    warnings,
  };
}

export interface SerpApiClientOptions {
  apiKey: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  /** Result cap requested from the engine. */
  num?: number;
}

/** One live Google Shopping search. Throws ProviderError (redacted) on failure. */
export async function searchShoppingRaw(
  query: string,
  opts: SerpApiClientOptions,
): Promise<unknown> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const base = opts.baseUrl ?? 'https://serpapi.com';
  const url = new URL('/search.json', base);
  url.searchParams.set('engine', 'google_shopping');
  url.searchParams.set('q', query);
  url.searchParams.set('gl', 'us');
  url.searchParams.set('hl', 'en');
  url.searchParams.set('num', String(opts.num ?? 20));
  url.searchParams.set('api_key', opts.apiKey);

  let res: Response;
  try {
    res = await fetchImpl(url.toString(), { headers: { accept: 'application/json' } });
  } catch (err) {
    throw new ProviderError(`SerpApi request did not complete: ${(err as Error).message}`);
  }
  const body = await res.text();
  if (!res.ok) {
    throw new ProviderError(`SerpApi HTTP ${res.status}: ${body.slice(0, 300)}`);
  }
  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new ProviderError(`SerpApi returned non-JSON body (HTTP ${res.status}).`);
  }
}

/** Live search + normalization. Never throws; failures land in the result set. */
export async function searchShopping(
  query: string,
  opts: SerpApiClientOptions,
): Promise<SearchResultSet> {
  const observedAt = new Date().toISOString();
  try {
    const raw = await searchShoppingRaw(query, opts);
    return normalizeShoppingResponse(raw, query, observedAt, 'live');
  } catch (err) {
    return {
      providerStatus: 'failed',
      provider: 'serpapi',
      query,
      observedAt,
      candidates: [],
      warnings: [],
      error: redactSecrets((err as Error).message),
    };
  }
}
