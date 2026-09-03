// The post-review evidence summary: one closest visual lead, its limitations,
// and the exact observed listing receipt behind it.

import { deltaE, describeTradeoff } from '../../shared/color.ts';
import type { LostShade } from '../data/lostShades.ts';
import type { CandidateComparison } from './VtoStage.tsx';

interface Props {
  lost: LostShade;
  comparisons: CandidateComparison[];
}

function observedTime(iso: string): string {
  try {
    return new Date(iso).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
  } catch {
    return iso;
  }
}

export function VerdictCard({ lost, comparisons }: Props) {
  const scored = comparisons
    // A color estimate without a completed same-face render never enters the
    // post-review ranking. A failed or unavailable VTO candidate cannot win on
    // color math alone.
    .filter((c) => c.estimateHex !== null && Boolean(c.render?.imageUrl))
    .map((c) => ({ c, dE: deltaE(lost.hex, c.estimateHex!) }))
    .filter((s): s is { c: CandidateComparison; dE: number } => s.dE !== null)
    .sort((a, b) => a.dE - b.dE);

  if (scored.length === 0) {
    return (
      <div className="verdict-card" role="status" aria-live="polite">
        <h3>No verdict yet</h3>
        <p className="field-note">
          None of the shortlisted candidates produced a usable shade estimate, so LastTube will not
          guess. Shortlist candidates whose product images show the actual shade.
        </p>
      </div>
    );
  }

  const best = scored[0]!;
  const runnerUp = scored[1] ?? null;
  const tradeoff = describeTradeoff(lost.hex, best.c.estimateHex!);
  const distinctSource = best.c.sourceUrl && best.c.sourceUrl !== best.c.productUrl;

  return (
    <div className="verdict-card" role="status" aria-live="polite">
      <p className="act-label">Closest visual lead · exact shade unverified</p>
      <h3>{best.c.title}</h3>
      <p>
        After the required same-face review, color distance ranks this observed listing as the
        closest visual lead to {lost.productName} — {lost.shadeName}: {tradeoff}. The preserved
        listing does not name an exact shade or variant, so this is not a purchase recommendation
        or a claim that the formula matches.
        {runnerUp &&
          ` Runner-up: ${runnerUp.c.title} (ΔE ${runnerUp.dE.toFixed(1)} vs ${best.dE.toFixed(1)}).`}
      </p>
      <div className="exact-listing">
        <strong>Observed listing text (verbatim)</strong>
        <span>{best.c.title}</span>
        <small>Exact shade / variant: not present in the preserved SerpApi result.</small>
      </div>
      <div className="receipt-strip">
        <span>merchant: {best.c.merchant}</span>
        <span>price: {best.c.priceDisplay ?? 'not reported'}</span>
        <span>observed: {observedTime(best.c.observedAt)}</span>
        {best.c.productUrl && (
          <a href={best.c.productUrl} target="_blank" rel="noreferrer noopener">
            observed offer
          </a>
        )}
        {distinctSource && (
          <a href={best.c.sourceUrl!} target="_blank" rel="noreferrer noopener">
            source evidence
          </a>
        )}
        <span>shade est: {best.c.estimateHex}</span>
        <span>usable pixels: {((best.c.estimateCoverage ?? 0) * 100).toFixed(1)}%</span>
        <span>ΔE CIE76: {best.dE.toFixed(1)}</span>
      </div>
      <p className="caveat">
        Images below 10% usable saturated foreground coverage are rejected. Packaging can still
        skew a passing estimate. ΔE and Perfect Corp&apos;s same-face render compare the estimated
        color consistently; neither validates the product&apos;s real finish, undertone, formulation,
        exact variant, availability, or fit for a person.
      </p>
    </div>
  );
}
