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
          <strong>LIVE response → 40 normalized candidates</strong>
          <p>
            “mauve rose matte lipstick” · observed 2026-09-01 01:52 UTC · merchant,
            price, listing source, and availability text retained.
          </p>
        </div>
        <div>
          <p className="proof-receipt-provider">Perfect Corp · Makeup VTO</p>
          <strong>LOST-SHADE BASELINE · LIVE receipt · 19 polls</strong>
          <p>
            One unit spent · request, task, bounded lifecycle, output hash, and downloaded render
            are preserved.
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
        New LIVE candidate runs fail closed unless the server binds the exact SerpApi response
        digest, listing, fetched source bytes, Perfect request/task/polls, and downloaded output in
        a validated manifest. The current host has ephemeral storage, so that proof is downloadable
        per run—not claimed as durable across a restart.
      </p>
    </aside>
  );
}
