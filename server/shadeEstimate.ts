// Estimate a candidate product's shade from the merchant's own product image
// (the SerpApi thumbnail). Honest, evidence-derived, and disclosed: pixels are
// filtered to saturated, non-background colors and averaged. Packaging can
// skew the estimate — the UI says so, and the on-face render is the real test.

import sharp from 'sharp';
import {
  assessShadeEvidenceCoverage,
  MIN_SHADE_EVIDENCE_COVERAGE,
} from '../shared/shadeEvidence.ts';
import { ProviderError } from './redact.ts';

export const SHADE_ESTIMATE_METHOD =
  `Dominant saturated color of the merchant product image (background pixels excluded; minimum ${Math.round(MIN_SHADE_EVIDENCE_COVERAGE * 100)}% usable coverage); an estimate, not a lab match or formulation check.`;

/** Hosts we are willing to fetch product images from (SSRF guard). */
const ALLOWED_HOSTS = [/(^|\.)serpapi\.com$/, /(^|\.)gstatic\.com$/, /(^|\.)googleusercontent\.com$/];

export function isAllowedImageUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:') return false;
    return ALLOWED_HOSTS.some((re) => re.test(u.hostname));
  } catch {
    return false;
  }
}

export interface ShadeEstimate {
  hex: string;
  /** 0..1 share of pixels that survived the background/saturation filter. */
  coverage: number;
  sampledPixels: number;
  method: string;
}

/** Estimate the dominant saturated color from raw image bytes. */
export async function estimateShadeFromBytes(bytes: Buffer): Promise<ShadeEstimate> {
  const { data, info } = await sharp(bytes)
    .resize(96, 96, { fit: 'inside' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let kept = 0;
  const total = info.width * info.height;
  for (let i = 0; i < data.length; i += 3) {
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    // Skip background-ish pixels: near-white, near-black, low saturation.
    if (max > 245 && min > 225) continue;
    if (max < 30) continue;
    if (sat < 0.18) continue;
    rSum += r;
    gSum += g;
    bSum += b;
    kept += 1;
  }
  const coverage = kept / total;
  const assessment = assessShadeEvidenceCoverage(coverage);
  if (!assessment.usable) {
    throw new ProviderError(`Image rejected: ${assessment.reason}.`);
  }
  const toHex = (v: number) => Math.round(v).toString(16).padStart(2, '0');
  return {
    hex: `#${toHex(rSum / kept)}${toHex(gSum / kept)}${toHex(bSum / kept)}`,
    coverage,
    sampledPixels: kept,
    method: SHADE_ESTIMATE_METHOD,
  };
}

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/** Fetch (allow-listed, size-capped) + estimate. */
export async function estimateShadeFromUrl(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ShadeEstimate> {
  if (!isAllowedImageUrl(url)) {
    throw new ProviderError('Image URL is not on the allowed evidence hosts.');
  }
  const res = await fetchImpl(url);
  if (!res.ok) {
    throw new ProviderError(`Image fetch failed: HTTP ${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_IMAGE_BYTES) {
    throw new ProviderError('Image exceeds the size cap for shade estimation.');
  }
  return estimateShadeFromBytes(buf);
}
