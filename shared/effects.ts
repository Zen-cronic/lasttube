// Constructors for Perfect Corp makeup-vto effect payloads.
// Shared: the client composes effects; the server forwards them to the API.

import type { FoundationEffect, LipColorEffect } from './types.ts';

export function lipColorEffect(
  hex: string,
  texture: LipColorEffect['palettes'][number]['texture'] = 'matte',
  colorIntensity = 80,
): LipColorEffect {
  const palette: LipColorEffect['palettes'][number] = { color: hex, texture, colorIntensity };
  if (texture === 'gloss' || texture === 'sheer') {
    palette.gloss = 60;
    palette.transparencyIntensity = 40;
  }
  return {
    category: 'lip_color',
    shape: { name: 'original' },
    palettes: [palette],
    style: { type: 'full' },
  };
}

export function foundationEffect(hex: string, colorIntensity = 70): FoundationEffect {
  return {
    category: 'foundation',
    palettes: [{ color: hex, colorIntensity, glowIntensity: 30, coverageIntensity: 60 }],
  };
}

/** Public, licence-clean demo face: Perfect Corp's own docs sample image. */
export const SAMPLE_FACE_URL =
  'https://plugins-media.makeupar.com/strapi/assets/sample_Image_1_202b6bf6e6.jpg';
