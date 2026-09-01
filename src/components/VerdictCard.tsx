// The single evidence-backed decision: one closest match, its trade-off in
// plain words, and the receipt that lets a judge verify every claim.

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
    .filter((c) => c.estimateHex !== null)
    .map((c) => ({ c, dE: deltaE(lost.hex, c.estimateHex!) }))
    .filter((s): s is { c: CandidateComparison; dE: number } => s.dE !== null)
    .sort((a, b) => a.dE - b.dE);

  if (scored.length === 0) {
    return (
      <div className="verdict-card">
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
  const priceBit = best.c.priceDisplay ? ` · ${best.c.priceDisplay}` : '';

  return (
    <div className="verdict-card">
      <p className="act-label">The verdict</p>
      <h3>{best.c.title}</h3>
      <p>
        Closest living match to {lost.productName} — {lost.shadeName}: {tradeoff}. Sold by{' '}
        {best.c.merchant}
        {priceBit}.
        {runnerUp &&
          ` Runner-up: ${runnerUp.c.title} (ΔE ${runnerUp.dE.toFixed(1)} vs ${best.dE.toFixed(1)}).`}
      </p>
      <div className="receipt-strip">
        <span>merchant: {best.c.merchant}</span>
        <span>price: {best.c.priceDisplay ?? 'not reported'}</span>
        <span>observed: {observedTime(best.c.observedAt)}</span>
        {best.c.sourceUrl && (
          <a href={best.c.sourceUrl} target="_blank" rel="noreferrer noopener">
            listing source
          </a>
        )}
        <span>shade est: {best.c.estimateHex}</span>
        <span>ΔE CIE76: {best.dE.toFixed(1)}</span>
      </div>
      <p className="caveat">
        Shade estimated from the merchant&apos;s own product image — packaging can skew it. ΔE is
        an explanation aid over approximated hexes, not a guarantee of real-world appearance; the
        on-face renders above are the test that matters.
      </p>
    </div>
  );
}
