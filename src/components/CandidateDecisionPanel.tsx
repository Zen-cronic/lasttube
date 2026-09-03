import type {
  CandidateReviewDecision,
  ReviewResolution,
} from '../../shared/reviewDecision.ts';
import type { CandidateComparison } from './VtoStage.tsx';

interface Props {
  candidates: CandidateComparison[];
  activeId: string | null;
  decisions: Record<string, CandidateReviewDecision | undefined>;
  resolution: ReviewResolution;
  onView: (id: string) => void;
  onDecide: (id: string, decision: CandidateReviewDecision) => void;
  onPrefer: (id: string) => void;
}

export function CandidateDecisionPanel({
  candidates,
  activeId,
  decisions,
  resolution,
  onView,
  onDecide,
  onPrefer,
}: Props) {
  const dispositionById = new Map(
    resolution.dispositions.map((disposition) => [disposition.candidateId, disposition]),
  );

  return (
    <section className="review-gate decision-panel" aria-labelledby="decision-panel-title">
      <div className="decision-panel-intro">
        <p className="act-label">Required human decisions</p>
        <h3 id="decision-panel-title">Resolve every shortlisted candidate.</h3>
        <p>
          The system records exclusions; you accept or reject every usable same-face render.
          Preference is a separate human choice among accepted candidates. Nothing disappears.
        </p>
        <span className="decision-count" aria-live="polite">
          {resolution.resolvedCount} of {candidates.length} candidates resolved ·{' '}
          {resolution.systemExcludedIds.length} system excluded
        </span>
      </div>

      <div className="decision-list">
        {candidates.map((candidate) => {
          const decision = decisions[candidate.id];
          const isActive = candidate.id === activeId;
          const isPreferred = candidate.id === resolution.preferredId;
          const disposition = dispositionById.get(candidate.id);
          const isSystemExcluded = disposition?.state === 'system_excluded';
          return (
            <article
              className={`decision-row${isSystemExcluded ? ' decision-row-excluded' : ''}`}
              data-decision={disposition?.state ?? 'pending'}
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
                    : isSystemExcluded
                      ? disposition.reason
                    : decision === 'accepted'
                      ? 'accepted visual direction'
                      : decision === 'rejected'
                        ? 'rejected — excluded from outcome'
                        : 'decision pending'}
                </span>
                <span className="evidence-state-line">
                  variant {candidate.evidence.exactVariant.state} · shade{' '}
                  {candidate.evidence.exactShade.state} · finish {candidate.evidence.finish.state} ·
                  source image {candidate.evidence.sourceImage.state} · VTO{' '}
                  {candidate.evidence.sameFaceRender.proofLevel.replaceAll('_', ' ')}
                </span>
                {candidate.manifestValidated && candidate.manifestUrl && (
                  <a
                    className="manifest-link"
                    href={candidate.manifestUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    Download validated per-run manifest
                  </a>
                )}
              </div>
              {isSystemExcluded ? (
                <span className="system-excluded-stamp">System excluded</span>
              ) : (
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
              )}
            </article>
          );
        })}
      </div>

      <p className="field-note">
        An actionable offer requires present listing identity, exact variant, shade, finish, hashed
        source-image coverage, and verified candidate VTO proof. Metadata-only renders remain visual
        review aids.
      </p>
    </section>
  );
}
