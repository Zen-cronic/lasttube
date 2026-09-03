// Judge-visible bridge between deterministic fixture playback and the
// sanitized live-provider receipts committed in proofs/. This is preserved
// evidence of prior calls, never presented as a new live request.

const REPO_PROOFS_URL = 'https://github.com/Zen-cronic/lasttube/tree/main/proofs';

export function ProviderProofPanel() {
  return (
    <aside className="proof-receipts" aria-labelledby="proof-receipts-title">
      <div className="proof-receipts-heading">
        <div>
          <p className="act-label">Preserved proof inventory · not a new call</p>
          <h3 id="proof-receipts-title">The proof boundary is explicit.</h3>
        </div>
        <a href={REPO_PROOFS_URL} target="_blank" rel="noreferrer noopener">
          inspect sanitized proof ↗
        </a>
      </div>
      <div className="proof-receipt-grid">
        <div>
          <p className="proof-receipt-provider">SerpApi · Google Shopping</p>
          <strong>FRESH LIVE response → 40 candidates</strong>
          <p>
            “mauve rose matte lipstick” · observed 2026-09-03 14:00 UTC · receipt-only freshness
            check; the deterministic Sep 1 replay was not overwritten.
          </p>
        </div>
        <div>
          <p className="proof-receipt-provider">Perfect Corp · Makeup VTO</p>
          <strong>BASELINE + SECOND-MODEL CHECK</strong>
          <p>
            The judged baseline receipt remains preserved. A Sep 3 live check added baseline and
            candidate lifecycles on a different official sample model, with downloaded output hashes.
          </p>
        </div>
        <div>
          <p className="proof-receipt-provider">Candidate fixture outputs</p>
          <strong>3 outputs → task/poll metadata only</strong>
          <p>
            Output hashes and byte counts are retained. Candidate source-image bytes, request
            bodies, and lifecycle responses were not retained and are not claimed as receipts.
          </p>
        </div>
      </div>
      <p className="field-note proof-runtime-note">
        New LIVE candidate runs fail closed unless a versioned bundle re-hashes the sanitized raw
        SerpApi response, listing, fetched source bytes, every sanitized Perfect response, URL
        lineage, and downloaded output. Its four bound artifacts are exportable per run; current-host
        storage is ephemeral, not durable across restart.
      </p>
    </aside>
  );
}
