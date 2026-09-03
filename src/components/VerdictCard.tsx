// Human decision outcome. CIE76 explains the selected visual direction but
// never selects it, and missing exact-variant evidence fails closed.

import { deltaE, describeTradeoff } from '../../shared/color.ts';
import type { LostShade } from '../data/lostShades.ts';
import type { CandidateComparison } from './VtoStage.tsx';

interface Props {
  lost: LostShade;
  comparisons: CandidateComparison[];
  acceptedIds: string[];
  preferredId: string | null;
  onRefine: () => void;
}

function observedTime(iso: string): string {
  try {
    return new Date(iso).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
  } catch {
    return iso;
  }
}

export function DecisionOutcomeCard({
  lost,
  comparisons,
  acceptedIds,
  preferredId,
  onRefine,
}: Props) {
  const preferred = comparisons.find(
    (candidate) => candidate.id === preferredId && acceptedIds.includes(candidate.id),
  );

  if (!preferred) {
    return (
      <div className="verdict-card no-actionable-card" role="status" aria-live="polite">
        <p className="act-label">Human decision · stopped</p>
        <h3>No actionable lead.</h3>
        <p>
          You rejected every usable same-face render. LastTube excludes them from the outcome and
          does not let color distance restore a candidate you rejected.
        </p>
        <button type="button" className="btn" onClick={onRefine}>
          Refine search with exact shade terms
        </button>
      </div>
    );
  }

  const dE = deltaE(lost.hex, preferred.estimateHex!);
  const tradeoff = describeTradeoff(lost.hex, preferred.estimateHex!);
  const distinctSource = preferred.sourceUrl && preferred.sourceUrl !== preferred.productUrl;

  return (
    <div className="verdict-card no-actionable-card" role="status" aria-live="polite">
      <p className="act-label">Visual preference saved · action blocked</p>
      <h3>No actionable lead yet.</h3>
      <p>
        Your visual preference is <strong>{preferred.title}</strong>: {tradeoff}. That human choice
        overrides color-distance ordering, but the observed listing does not identify an exact
        shade or variant. LastTube keeps it as a visual reference and blocks purchase language.
      </p>
      <div className="exact-listing">
        <strong>Preferred observed listing text (verbatim)</strong>
        <span>{preferred.title}</span>
        <small>Exact shade / variant: not present — actionable lead blocked.</small>
      </div>
      <div className="receipt-strip">
        <span>human accepted: {acceptedIds.length}</span>
        <span>merchant: {preferred.merchant}</span>
        <span>price observed: {preferred.priceDisplay ?? 'not reported'}</span>
        <span>observed: {observedTime(preferred.observedAt)}</span>
        {preferred.productUrl && (
          <a href={preferred.productUrl} target="_blank" rel="noreferrer noopener">
            observed offer
          </a>
        )}
        {distinctSource && (
          <a href={preferred.sourceUrl!} target="_blank" rel="noreferrer noopener">
            source evidence
          </a>
        )}
        <span>shade est: {preferred.estimateHex}</span>
        <span>usable pixels: {((preferred.estimateCoverage ?? 0) * 100).toFixed(1)}%</span>
        <span>ΔE CIE76 context only: {dE?.toFixed(1) ?? 'unavailable'}</span>
      </div>
      <p className="caveat">
        The 10% image-coverage floor is a heuristic. Perfect Corp compares estimated colors on one
        face; it does not validate the real product, formulation, exact variant, availability, or
        fit. CIE76 did not choose this preference.
      </p>
      <button type="button" className="btn" onClick={onRefine}>
        Refine search with exact shade terms
      </button>
    </div>
  );
}
