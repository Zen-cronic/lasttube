// Perceptual color math for the closest visual-lead ranking.
// sRGB hex -> CIE Lab (D65) and CIE76 delta-E, plus plain-language trade-off
// wording. Delta-E here is an explanation aid over approximated shade hexes —
// the same-face render is a required human comparison, not formulation proof.

export interface Lab {
  L: number;
  a: number;
  b: number;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const v = parseInt(m[1]!, 16);
  return { r: (v >> 16) & 0xff, g: (v >> 8) & 0xff, b: v & 0xff };
}

function srgbToLinear(c: number): number {
  const x = c / 255;
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

export function hexToLab(hex: string): Lab | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const r = srgbToLinear(rgb.r);
  const g = srgbToLinear(rgb.g);
  const b = srgbToLinear(rgb.b);
  // sRGB D65 reference white.
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

/** CIE76 delta-E between two hexes; null when either hex is invalid. */
export function deltaE(hexA: string, hexB: string): number | null {
  const la = hexToLab(hexA);
  const lb = hexToLab(hexB);
  if (!la || !lb) return null;
  return Math.sqrt((la.L - lb.L) ** 2 + (la.a - lb.a) ** 2 + (la.b - lb.b) ** 2);
}

export function deltaETier(dE: number): string {
  if (dE < 5) return 'a near-twin';
  if (dE < 12) return 'a close relative';
  if (dE < 20) return 'a visible cousin';
  return 'a different family';
}

/** Plain-language trade-off between the lost shade and a candidate. */
export function describeTradeoff(lostHex: string, candidateHex: string): string | null {
  const lost = hexToLab(lostHex);
  const cand = hexToLab(candidateHex);
  if (!lost || !cand) return null;
  const dE = Math.sqrt(
    (lost.L - cand.L) ** 2 + (lost.a - cand.a) ** 2 + (lost.b - cand.b) ** 2,
  );
  const parts: string[] = [];
  const dL = cand.L - lost.L;
  if (Math.abs(dL) >= 3) parts.push(dL > 0 ? 'lighter' : 'deeper');
  const dB = cand.b - lost.b;
  if (Math.abs(dB) >= 3) parts.push(dB > 0 ? 'warmer' : 'cooler');
  const dA = cand.a - lost.a;
  if (Math.abs(dA) >= 3) parts.push(dA > 0 ? 'pinker' : 'more muted');
  const tier = deltaETier(dE);
  if (parts.length === 0) {
    return `${tier} (ΔE ${dE.toFixed(1)}) — virtually the same color on paper`;
  }
  return `${tier} (ΔE ${dE.toFixed(1)}) — slightly ${parts.join(', ')}`;
}
