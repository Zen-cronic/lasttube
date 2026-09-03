// Shared fail-closed policy for merchant-image shade evidence. Coverage is the
// fraction of sampled pixels that survived the background/saturation filter.

export const MIN_SHADE_EVIDENCE_COVERAGE = 0.1;

export interface ShadeEvidenceAssessment {
  usable: boolean;
  coverage: number | null;
  reason: string;
}

export function assessShadeEvidenceCoverage(
  coverage: number | null | undefined,
): ShadeEvidenceAssessment {
  const minimum = `${Math.round(MIN_SHADE_EVIDENCE_COVERAGE * 100)}%`;
  if (typeof coverage !== 'number' || !Number.isFinite(coverage) || coverage < 0 || coverage > 1) {
    return {
      usable: false,
      coverage: null,
      reason: `usable shade coverage is missing or invalid; ${minimum} minimum required`,
    };
  }
  if (coverage < MIN_SHADE_EVIDENCE_COVERAGE) {
    return {
      usable: false,
      coverage,
      reason: `${(coverage * 100).toFixed(1)}% usable shade coverage; ${minimum} minimum required`,
    };
  }
  return {
    usable: true,
    coverage,
    reason: `${(coverage * 100).toFixed(1)}% usable shade coverage`,
  };
}
