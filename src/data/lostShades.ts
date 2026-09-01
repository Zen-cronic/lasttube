// Preset discontinued favorites for the hero flow. Facts are conservative and
// checkable; shade hexes are approximations from published swatches and are
// labeled as such in the UI. Search queries hunt for currently purchasable
// analogs, not the dead product itself.

export interface LostShade {
  id: string;
  productName: string;
  shadeName: string;
  category: 'lip_color' | 'foundation';
  finish: 'matte' | 'satin' | 'gloss';
  /** Approximate — always shown with the approximation note. */
  hex: string;
  discontinuedNote: string;
  defaultQuery: string;
}

export const HEX_NOTE = 'Shade hex approximated from published swatches.';

export const LOST_SHADES: LostShade[] = [
  {
    id: 'ud-backtalk',
    productName: 'Urban Decay Vice Lipstick',
    shadeName: 'Backtalk',
    category: 'lip_color',
    finish: 'matte',
    hex: '#A96A73',
    discontinuedNote: 'Urban Decay retired the Vice lipstick line; the cult mauve went with it.',
    defaultQuery: 'mauve rose matte lipstick',
  },
  {
    id: 'ud-1993',
    productName: 'Urban Decay Vice Lipstick',
    shadeName: '1993',
    category: 'lip_color',
    finish: 'matte',
    hex: '#8E5A4E',
    discontinuedNote: 'Same retired Vice line — the definitive 90s brown.',
    defaultQuery: '90s warm brown matte lipstick',
  },
  {
    id: 'becca-shell',
    productName: 'BECCA Ultimate Coverage 24 Hour Foundation',
    shadeName: 'Shell',
    category: 'foundation',
    finish: 'satin',
    hex: '#E3B98F',
    discontinuedNote: 'BECCA Cosmetics closed in 2021 — every shade in the line was discontinued.',
    defaultQuery: 'full coverage natural finish foundation light medium neutral',
  },
];
