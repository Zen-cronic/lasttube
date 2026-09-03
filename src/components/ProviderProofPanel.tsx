// Judge-visible bridge between deterministic fixture playback and the
// sanitized live-provider receipts committed in proofs/. This is preserved
// evidence of prior calls, never presented as a new live request.

const REPO_PROOFS_URL = 'https://github.com/Zen-cronic/lasttube/tree/main/proofs';

export function ProviderProofPanel() {
  return (
    <aside className="proof-receipts" aria-labelledby="proof-receipts-title">
      <div className="proof-receipts-heading">
        <div>
          <p className="act-label">Preserved live receipts · not a new call</p>
          <h3 id="proof-receipts-title">The fixture has a paper trail.</h3>
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
          <strong>LIVE lifecycle → success after 19 bounded polls</strong>
          <p>
            One unit spent · signed result downloaded before expiry · task lifecycle and
            sanitized response preserved with the rendered image.
          </p>
        </div>
      </div>
    </aside>
  );
}
