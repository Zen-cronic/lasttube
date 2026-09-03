import type { CandidateReviewDecision } from '../../shared/reviewDecision.ts';
import type { CandidateComparison } from './VtoStage.tsx';

interface Props {
  candidates: CandidateComparison[];
  activeId: string | null;
  decisions: Record<string, CandidateReviewDecision | undefined>;
  preferredId: string | null;
  onView: (id: string) => void;
  onDecide: (id: string, decision: CandidateReviewDecision) => void;
  onPrefer: (id: string) => void;
}

export function CandidateDecisionPanel({
  candidates,
  activeId,
  decisions,
  preferredId,
  onView,
  onDecide,
  onPrefer,
}: Props) {
  const decidedCount = candidates.filter((candidate) => decisions[candidate.id]).length;

  return (
    <section className="review-gate decision-panel" aria-labelledby="decision-panel-title">
      <div className="decision-panel-intro">
        <p className="act-label">Required human decisions</p>
        <h3 id="decision-panel-title">Decide on each usable same-face render.</h3>
        <p>
          View one candidate at a time, then accept or reject its visual direction. Preference is a
          separate human choice among accepted candidates; CIE76 is supporting context only.
        </p>
        <span className="decision-count" aria-live="polite">
          {decidedCount} of {candidates.length} decisions made
        </span>
      </div>

      <div className="decision-list">
        {candidates.map((candidate) => {
          const decision = decisions[candidate.id];
          const isActive = candidate.id === activeId;
          const isPreferred = candidate.id === preferredId;
          return (
            <article
              className="decision-row"
              data-decision={decision ?? 'pending'}
              data-preferred={isPreferred}
              key={candidate.id}
            >
              <div>
                <strong>{candidate.title}</strong>
                <span>
                  {candidate.estimateCoverage === null
                    ? 'coverage unavailable'
                    : `${(candidate.estimateCoverage * 100).toFixed(1)}% usable pixels`}
                </span>
                <span>
                  {isPreferred
                    ? 'preferred visual direction'
                    : decision === 'accepted'
                      ? 'accepted visual direction'
                      : decision === 'rejected'
                        ? 'rejected — excluded from outcome'
                        : 'decision pending'}
                </span>
              </div>
              <div className="decision-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => onView(candidate.id)}
                >
                  {isActive ? 'Viewing on face' : 'View on face'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary decision-accept"
                  aria-pressed={decision === 'accepted'}
                  aria-label={`Accept visual fit for ${candidate.title}`}
                  disabled={!isActive}
                  onClick={() => onDecide(candidate.id, 'accepted')}
                >
                  Accept visual fit
                </button>
                <button
                  type="button"
                  className="btn btn-secondary decision-reject"
                  aria-pressed={decision === 'rejected'}
                  aria-label={`Reject visual fit for ${candidate.title}`}
                  disabled={!isActive}
                  onClick={() => onDecide(candidate.id, 'rejected')}
                >
                  Reject
                </button>
                <button
                  type="button"
                  className="btn decision-prefer"
                  aria-pressed={isPreferred}
                  aria-label={`Prefer ${candidate.title}`}
                  disabled={decision !== 'accepted'}
                  onClick={() => onPrefer(candidate.id)}
                >
                  {isPreferred ? 'Preferred ✓' : 'Prefer'}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <p className="field-note">
        These listing titles do not identify an exact shade or variant. Even an accepted visual
        preference remains non-actionable until variant-level evidence clears the image gate.
      </p>
    </section>
  );
}
