// Offline tests: evidence-derived shade estimation. Images are generated
// in-memory with sharp — no network access.

import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { deltaE } from '../shared/color.ts';
import {
  estimateShadeFromBytes,
  estimateShadeFromUrl,
  isAllowedImageUrl,
} from '../server/shadeEstimate.ts';
import {
  assessShadeEvidenceCoverage,
  MIN_SHADE_EVIDENCE_COVERAGE,
} from '../shared/shadeEvidence.ts';

async function solidPng(hex: string, w = 64, h = 64): Promise<Buffer> {
  return sharp({ create: { width: w, height: h, channels: 3, background: hex } })
    .png()
    .toBuffer();
}

describe('estimateShadeFromBytes', () => {
  it('recovers a solid saturated color almost exactly', async () => {
    const bytes = await solidPng('#a96a73');
    const est = await estimateShadeFromBytes(bytes);
    expect(deltaE(est.hex, '#a96a73')!).toBeLessThan(2);
    expect(est.coverage).toBeGreaterThan(0.9);
    expect(est.method).toContain('estimate');
  });

  it('ignores a white background around a product swatch', async () => {
    // Mauve square composited on a white canvas.
    const swatch = await solidPng('#a96a73', 32, 32);
    const bytes = await sharp({
      create: { width: 96, height: 96, channels: 3, background: '#ffffff' },
    })
      .composite([{ input: swatch, top: 32, left: 32 }])
      .png()
      .toBuffer();
    const est = await estimateShadeFromBytes(bytes);
    expect(deltaE(est.hex, '#a96a73')!).toBeLessThan(3);
    expect(est.coverage).toBeGreaterThanOrEqual(MIN_SHADE_EVIDENCE_COVERAGE);
    expect(est.coverage).toBeLessThan(0.3);
  });

  it('refuses an image with no saturated pixels', async () => {
    const bytes = await solidPng('#f8f8f8');
    await expect(estimateShadeFromBytes(bytes)).rejects.toThrow(/10% minimum required/);
  });

  it('fails closed when a packaging-heavy image exposes too little usable shade area', async () => {
    const tinySwatch = await solidPng('#a96a73', 14, 14);
    const bytes = await sharp({
      create: { width: 96, height: 96, channels: 3, background: '#ffffff' },
    })
      .composite([{ input: tinySwatch, top: 41, left: 41 }])
      .png()
      .toBuffer();
    await expect(estimateShadeFromBytes(bytes)).rejects.toThrow(/usable shade coverage/);
  });
});

describe('estimateShadeFromUrl', () => {
  it('returns the exact fetched input hash and byte count with the estimate', async () => {
    const bytes = await solidPng('#a96a73');
    const fetchImpl = (async () =>
      new Response(new Uint8Array(bytes), { status: 200 })) as typeof fetch;
    const estimate = await estimateShadeFromUrl(
      'https://encrypted-tbn0.gstatic.com/shopping?q=fixture',
      fetchImpl,
    );
    expect(estimate.sourceImage.byteLength).toBe(bytes.length);
    expect(estimate.sourceImage.sha256).toBe(
      createHash('sha256').update(bytes).digest('hex'),
    );
    expect(estimate.sourceImage.url).toContain('gstatic.com');
  });
});

describe('assessShadeEvidenceCoverage', () => {
  it('rejects missing, invalid, and sub-threshold coverage', () => {
    expect(assessShadeEvidenceCoverage(undefined).usable).toBe(false);
    expect(assessShadeEvidenceCoverage(Number.NaN).usable).toBe(false);
    expect(assessShadeEvidenceCoverage(0.02488425925925926).usable).toBe(false);
  });

  it('accepts evidence at the documented 10% threshold', () => {
    const assessment = assessShadeEvidenceCoverage(MIN_SHADE_EVIDENCE_COVERAGE);
    expect(assessment.usable).toBe(true);
    expect(assessment.reason).toContain('10.0%');
  });
});

describe('isAllowedImageUrl (SSRF guard)', () => {
  it('allows https evidence hosts only', () => {
    expect(isAllowedImageUrl('https://serpapi.com/searches/x/images/y.jpeg')).toBe(true);
    expect(isAllowedImageUrl('https://encrypted-tbn0.gstatic.com/shopping?q=x')).toBe(true);
    expect(isAllowedImageUrl('http://serpapi.com/x.jpg')).toBe(false);
    expect(isAllowedImageUrl('https://evil.example.com/x.jpg')).toBe(false);
    expect(isAllowedImageUrl('https://serpapi.com.evil.example/x.jpg')).toBe(false);
    expect(isAllowedImageUrl('file:///etc/passwd')).toBe(false);
  });
});
