// Act 2 — the hunt. Live SerpApi evidence rendered as verifiable rows:
// merchant, price, availability as observed, source link, observation time.
// Provider status is always visible; fixture data is loudly labeled.

import type { CandidateRecord, SearchResultSet } from '../../shared/types.ts';
import { ProviderStatusBadge } from './ProviderStatusBadge.tsx';

export type DataSource = 'live' | 'fixture';

interface Props {
  result: SearchResultSet | null;
  searching: boolean;
  query: string;
  dataSource: DataSource;
  shortlist: CandidateRecord[];
  onQueryChange: (q: string) => void;
  onDataSourceChange: (s: DataSource) => void;
  onRerun: () => void;
  onToggleShortlist: (c: CandidateRecord) => void;
}

const SHORTLIST_CAP = 3;

function observedTime(iso: string): string {
  try {
    return new Date(iso).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
  } catch {
    return iso;
  }
}

export function EvidencePanel({
  result,
  searching,
  query,
  dataSource,
  shortlist,
  onQueryChange,
  onDataSourceChange,
  onRerun,
  onToggleShortlist,
}: Props) {
  const shortlistIds = new Set(shortlist.map((c) => c.id));

  return (
    <div>
      <div className="evidence-header">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            id="replacement-query"
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            aria-label="Replacement search query"
            style={{
              font: 'inherit',
              padding: '8px 12px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-badge)',
              background: 'var(--card)',
              color: 'inherit',
              minWidth: 260,
            }}
          />
          <button type="button" className="btn btn-secondary" onClick={onRerun} disabled={searching}>
            {searching ? 'Hunting…' : 'Re-run hunt'}
          </button>
          <label className="field-note" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={dataSource === 'fixture'}
              onChange={(e) => onDataSourceChange(e.target.checked ? 'fixture' : 'live')}
            />
            demo recording (labeled fixture)
          </label>
        </div>
        {result && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
            <ProviderStatusBadge name="SerpApi" status={result.providerStatus} />
            <span className="evidence-query">observed {observedTime(result.observedAt)}</span>
          </div>
        )}
      </div>

      {searching && (
        <div className="candidate-list" aria-hidden="true">
          <div className="skeleton-row" />
          <div className="skeleton-row" />
          <div className="skeleton-row" />
        </div>
      )}

      {!searching && result && result.error && (
        <p className="error-strip" role="alert">
          {result.providerStatus === 'unavailable' ? 'Provider unavailable: ' : 'Hunt failed: '}
          {result.error}
        </p>
      )}

      {!searching && result && !result.error && result.candidates.length === 0 && (
        <p className="warning-strip">
          No candidates surfaced for this query. Evidence is missing, not negative — try a broader
          description of the shade.
        </p>
      )}

      {!searching && result && result.candidates.length > 0 && (
        <>
          <ol className="candidate-list">
            {result.candidates.slice(0, 10).map((c) => {
              const selected = shortlistIds.has(c.id);
              const capReached = !selected && shortlist.length >= SHORTLIST_CAP;
              return (
                <li key={c.id} className="candidate-row" data-selected={selected}>
                  {dataSource === 'fixture' ? (
                    <div
                      className="thumb-fallback thumb-fixture"
                      aria-hidden="true"
                    >
                      rec
                    </div>
                  ) : c.thumbnailUrl ? (
                    <img className="thumb" src={c.thumbnailUrl} alt="" loading="lazy" />
                  ) : (
                    <div className="thumb-fallback" aria-hidden="true" />
                  )}
                  <div style={{ minWidth: 0 }}>
                    <p className="title" title={c.title}>
                      #{c.position} {c.title}
                    </p>
                    <p className="merchant-line">
                      {c.merchant}
                      {c.availability.observed ? ` · ${c.availability.observed}` : ''}
                      {c.sourceUrl && (
                        <>
                          {' · '}
                          <a href={c.sourceUrl} target="_blank" rel="noreferrer noopener">
                            source
                          </a>
                        </>
                      )}
                    </p>
                  </div>
                  <div>
                    <span className="price">{c.price.display ?? '—'}</span>
                    <span className="observed">{observedTime(c.observedAt)}</span>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: 13, marginTop: 6 }}
                      onClick={() => onToggleShortlist(c)}
                      disabled={capReached}
                      aria-pressed={selected}
                    >
                      {selected ? 'Shortlisted ✓' : capReached ? 'Max 3' : 'Try on-face'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
          {result.warnings.length > 0 && (
            <div className="warning-strip">
              {result.warnings.map((w) => (
                <span key={w}>{w}</span>
              ))}
            </div>
          )}
          <p className="caveat">
            Listings and prices are what Google Shopping reported via SerpApi at the stated
            observation time — evidence from that recorded search, not a real-time stock check.
          </p>
        </>
      )}
    </div>
  );
}
