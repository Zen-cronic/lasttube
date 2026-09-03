// Human decision outcome. CIE76 explains the selected visual direction but
// never selects it, and missing exact-variant evidence fails closed.

import { deltaE, describeTradeoff } from '../../shared/color.ts';
import { deriveLeadOutcome } from '../../shared/evidence.ts';
import type { LostShade } from '../data/lostShades.ts';
import type { CandidateComparison } from './VtoStage.tsx';

interface Props {
  lost: LostShade;
  comparisons: CandidateComparison[];
  acceptedIds: string[];
  rejectedIds: string[];
  systemExcludedIds: string[];
  preferredId: string | null;
  baselineReady: boolean;
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
  rejectedIds,
  systemExcludedIds,
  preferredId,
  baselineReady,
  onRefine,
}: Props) {
  const preferred = comparisons.find(
    (candidate) => candidate.id === preferredId && acceptedIds.includes(candidate.id),
  );

  if (!preferred) {
    const systemOnly = systemExcludedIds.length === comparisons.length;
    return (
      <div className="verdict-card no-actionable-card" role="status" aria-live="polite">
        <p className="act-label">Candidate ledger · stopped</p>
        <h3>No actionable lead.</h3>
        <p>
          {systemOnly
            ? 'The system excluded every shortlisted candidate with a recorded reason.'
            : `You rejected ${rejectedIds.length} usable visual direction${rejectedIds.length === 1 ? '' : 's'}; the system excluded ${systemExcludedIds.length}. LastTube cannot silently restore either group.`}
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
  const outcome = deriveLeadOutcome({
    baselineReady,
    evidence: preferred.evidence,
    manifestValidated: preferred.manifestValidated,
    humanAccepted: acceptedIds.includes(preferred.id),
    humanPreferred: preferredId === preferred.id,
  });

  if (outcome.kind === 'actionable') {
    return (
      <div className="verdict-card actionable-card" role="status" aria-live="polite">
        <p className="act-label">Evidence complete · human preferred</p>
        <h3>Actionable exact-variant lead.</h3>
        <p>
          <strong>{outcome.exactLabel}</strong> has source-backed identity, exact variant, shade,
          finish, hashed source-image coverage, verified candidate VTO proof, and your explicit
          preference.
        </p>
        <a
          className="btn actionable-link"
          href={outcome.observedOfferUrl}
          target="_blank"
          rel="noreferrer noopener"
        >
          Open evidence-complete observed offer
        </a>
        <p className="caveat">
          This branch may support opt-in availability alerts and a disclosed affiliate handoff.
          Alert delivery and affiliate enrollment are not included in this prototype.
        </p>
      </div>
    );
  }

  return (
    <div className="verdict-card no-actionable-card" role="status" aria-live="polite">
      <p className="act-label">Visual preference saved · action blocked</p>
      <h3>No actionable lead yet.</h3>
      <p>
        Your visual preference is <strong>{preferred.title}</strong>: {tradeoff}. That human choice
        overrides color-distance ordering, but structured evidence remains incomplete. LastTube
        keeps it as a visual reference and blocks purchase language.
      </p>
      <div className="exact-listing">
        <strong>Preferred observed listing text (verbatim)</strong>
        <span>{preferred.title}</span>
        <small>
          Variant {preferred.evidence.exactVariant.state} · shade{' '}
          {preferred.evidence.exactShade.state} · finish {preferred.evidence.finish.state}
        </small>
      </div>
      <div className="evidence-ledger" aria-label="Action evidence ledger">
        <strong>Action gate</strong>
        <span>Still needed: {outcome.missing.join(' · ')}</span>
        <span>
          Source-image input: {preferred.evidence.sourceImage.state}; recorded coverage{' '}
          {((preferred.evidence.sourceImage.coverage ?? 0) * 100).toFixed(1)}%; hash{' '}
          {preferred.evidence.sourceImage.sha256 ? 'present' : 'missing'}
        </span>
        <span>
          Candidate VTO: {preferred.evidence.sameFaceRender.proofLevel.replaceAll('_', ' ')};
          output hash {preferred.evidence.sameFaceRender.outputImageSha256 ? 'present' : 'missing'}
        </span>
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
        fit. CIE76 did not choose this preference. An observed offer and any future opt-in alert or
        disclosed affiliate handoff stay locked until every action-gate field is present.
      </p>
      <button type="button" className="btn" onClick={onRefine}>
        Refine search with exact shade terms
      </button>
    </div>
  );
}
