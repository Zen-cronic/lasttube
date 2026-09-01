// Offline tests: perceptual color math and trade-off wording.

import { describe, expect, it } from 'vitest';
import { deltaE, deltaETier, describeTradeoff, hexToLab, hexToRgb } from '../shared/color.ts';

describe('hexToRgb / hexToLab', () => {
  it('parses hex with and without #', () => {
    expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
    expect(hexToRgb('00ff00')).toEqual({ r: 0, g: 255, b: 0 });
    expect(hexToRgb('nope')).toBeNull();
  });

  it('maps white and black to the Lab extremes', () => {
    const white = hexToLab('#ffffff')!;
    expect(white.L).toBeCloseTo(100, 0);
    expect(Math.abs(white.a)).toBeLessThan(0.5);
    expect(Math.abs(white.b)).toBeLessThan(0.5);
    const black = hexToLab('#000000')!;
    expect(black.L).toBeCloseTo(0, 0);
  });

  it('computes the canonical Lab for sRGB red', () => {
    const red = hexToLab('#ff0000')!;
    expect(red.L).toBeCloseTo(53.24, 0);
    expect(red.a).toBeCloseTo(80.09, 0);
    expect(red.b).toBeCloseTo(67.2, 0);
  });
});

describe('deltaE', () => {
  it('is zero for identical colors and large for opposites', () => {
    expect(deltaE('#a96a73', '#a96a73')).toBe(0);
    expect(deltaE('#000000', '#ffffff')!).toBeCloseTo(100, 0);
    expect(deltaE('bad', '#ffffff')).toBeNull();
  });
});

describe('describeTradeoff', () => {
  it('names the direction of the difference in plain language', () => {
    // Candidate clearly lighter and warmer than the lost mauve.
    const text = describeTradeoff('#8e4a55', '#c98a80')!;
    expect(text).toContain('lighter');
    expect(text).toMatch(/ΔE \d/);
    expect(text).toContain(deltaETier(deltaE('#8e4a55', '#c98a80')!));
  });

  it('says so when colors are virtually identical', () => {
    const text = describeTradeoff('#a96a73', '#aa6b74')!;
    expect(text).toContain('near-twin');
    expect(text).toContain('virtually the same');
  });
});
