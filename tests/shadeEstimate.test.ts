// Offline tests: evidence-derived shade estimation. Images are generated
// in-memory with sharp — no network access.

import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { deltaE } from '../shared/color.ts';
import {
  estimateShadeFromBytes,
  isAllowedImageUrl,
} from '../server/shadeEstimate.ts';

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
    expect(est.coverage).toBeLessThan(0.3);
  });

  it('refuses an image with no saturated pixels', async () => {
    const bytes = await solidPng('#f8f8f8');
    await expect(estimateShadeFromBytes(bytes)).rejects.toThrow(/too few saturated/);
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
