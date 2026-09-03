// Offline tests: the deterministic demo bundle replays recorded real
// lifecycles and can never present itself as live.

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { demoComparisonBundle } from '../server/fixtures.ts';
import { assessShadeEvidenceCoverage } from '../shared/shadeEvidence.ts';

describe('demoComparisonBundle', () => {
  it('is stamped fixture end to end with local render copies', () => {
    const bundle = demoComparisonBundle();
    expect(bundle.fixture).toBe(true);
    expect(bundle.label).toContain('FIXTURE');
    expect(bundle.lost.render.providerStatus).toBe('fixture');
    expect(bundle.comparisons.length).toBeGreaterThan(0);
    for (const c of bundle.comparisons) {
      expect(c.render.providerStatus).toBe('fixture');
      expect(c.render.expiryNote).toContain('FIXTURE');
      expect(c.render.imageUrl).toMatch(/^\/fixtures\//);
      expect(c.estimateHex).toMatch(/^#[0-9a-f]{6}$/i);
      expect(typeof c.estimateCoverage).toBe('number');
      // The recorded render image actually exists in public/.
      const file = path.resolve('public', c.render.imageUrl!.replace(/^\//, ''));
      expect(fs.existsSync(file)).toBe(true);
    }
    const lostFile = path.resolve('public', bundle.lost.render.imageUrl!.replace(/^\//, ''));
    expect(fs.existsSync(lostFile)).toBe(true);
  });

  it('retains the weak recording for audit but leaves at least two usable final candidates', () => {
    const bundle = demoComparisonBundle();
    const usable = bundle.comparisons.filter((c) =>
      assessShadeEvidenceCoverage(c.estimateCoverage).usable,
    );
    const rejected = bundle.comparisons.filter(
      (c) => !assessShadeEvidenceCoverage(c.estimateCoverage).usable,
    );
    expect(usable).toHaveLength(2);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]!.title).toBe('Ngozi Mauve Rose Matte Lipstick');
  });

  it('carries real task ids and poll counts from the recording', () => {
    const bundle = demoComparisonBundle();
    for (const c of bundle.comparisons) {
      expect(typeof c.render.taskId).toBe('string');
      expect(c.render.pollCount).toBeGreaterThan(0);
    }
  });
});
