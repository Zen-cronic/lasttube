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

function friendlyMissingLabel(value: string): string {
  const labels: Record<string, string> = {
    'validated per-run evidence manifest': 'Runtime proof',
    'successful lost-shade baseline': 'Baseline',
    'human acceptance': 'Your review',
    'human preference': 'Your pick',
    'source-backed listing identity and observed offer': 'Listing source',
    'exact variant': 'Exact variant',
    'exact shade': 'Exact shade',
    finish: 'Finish',
    'hashed source image with usable coverage': 'Source image',
    'verified candidate VTO input/lifecycle/output': 'VTO lifecycle',
  };
  return labels[value] ?? value;
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
        Your pick is <strong>{preferred.title}</strong>: {tradeoff}. Keep it as a visual reference;
        structured evidence is still incomplete.
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
        <span>Still needed</span>
        <div className="missing-evidence-chips">
          {outcome.missing.map((item) => (
            <span key={item}>{friendlyMissingLabel(item)}</span>
          ))}
        </div>
        <details className="micro-details evidence-ledger-details">
          <summary>Technical status</summary>
          <span>{outcome.missing.join(' · ')}</span>
          <span>
            Source image: {preferred.evidence.sourceImage.state}; coverage{' '}
            {((preferred.evidence.sourceImage.coverage ?? 0) * 100).toFixed(1)}%; hash{' '}
            {preferred.evidence.sourceImage.sha256 ? 'present' : 'missing'}
          </span>
          <span>
            VTO: {preferred.evidence.sameFaceRender.proofLevel.replaceAll('_', ' ')}; output hash{' '}
            {preferred.evidence.sameFaceRender.outputImageSha256 ? 'present' : 'missing'}
          </span>
        </details>
      </div>
      <p className="choice-chip">Your choice wins · CIE76 is context only ({dE?.toFixed(1) ?? 'n/a'})</p>
      <details className="micro-details verdict-details">
        <summary>Offer receipt and method limits</summary>
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
        </div>
        <p className="caveat">
          The 10% floor is a heuristic. Perfect Corp previews estimated colors; it does not validate
          the product, formulation, exact variant, availability, or fit.
        </p>
      </details>
      <button type="button" className="btn" onClick={onRefine}>
        Refine search with exact shade terms
      </button>
    </div>
  );
}
