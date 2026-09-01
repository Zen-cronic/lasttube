import { useEffect, useState, type CSSProperties } from 'react';
import { LostShadePicker } from './components/LostShadePicker.tsx';
import { ProviderStatusBadge, type BadgeStatus } from './components/ProviderStatusBadge.tsx';
import { SelfiePanel } from './components/SelfiePanel.tsx';
import type { LostShade } from './data/lostShades.ts';

interface Health {
  ok: boolean;
  providers: { serpapi: string; perfectcorp: string };
}

function providerBadge(value: string | undefined): BadgeStatus {
  return value === 'configured' ? 'configured' : 'unavailable';
}

export default function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [lost, setLost] = useState<LostShade | null>(null);
  const [hunting, setHunting] = useState(false);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json() as Promise<Health>)
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  // Signature element: the shade under consideration tints the interface.
  const shadeStyle = { '--shade': lost?.hex ?? '#a96a73' } as CSSProperties;

  return (
    <div className="page" style={shadeStyle}>
      <header className="site-header">
        <div>
          <p className="wordmark">
            Last<span className="tube">Tube</span>
          </p>
          <p className="tagline">Your favorite shade vanished. Meet its closest living match.</p>
        </div>
        <div className="provider-strip">
          <ProviderStatusBadge name="SerpApi" status={providerBadge(health?.providers.serpapi)} />
          <ProviderStatusBadge
            name="Perfect Corp"
            status={providerBadge(health?.providers.perfectcorp)}
          />
        </div>
      </header>

      <section className="hero">
        <h1>
          They discontinued <em>your</em> shade.
        </h1>
        <p>
          Name the one you lost. LastTube gathers live purchase evidence for its closest living
          relatives, renders them on-face with Perfect Corp&apos;s try-on engine, and calls one
          winner — trade-offs stated, sources attached.
        </p>
      </section>

      <section className="act" aria-labelledby="act1-title">
        <p className="act-label">Act 1 · The loss</p>
        <h2 className="act-title" id="act1-title">
          What are we replacing?
        </h2>
        <div className="two-col">
          <LostShadePicker selected={lost} onSelect={setLost} />
          <SelfiePanel />
        </div>
        <div className="cta-row">
          <button
            type="button"
            className="btn"
            disabled={lost === null}
            onClick={() => setHunting(true)}
          >
            Find living replacements
          </button>
          {lost === null && (
            <span className="field-note">Pick a lost shade to start the hunt.</span>
          )}
        </div>
      </section>

      {hunting && lost && (
        <section className="act" aria-labelledby="act2-title">
          <p className="act-label">Act 2 · The hunt</p>
          <h2 className="act-title" id="act2-title">
            Current, purchasable candidates
          </h2>
          <div className="card">
            <p className="field-note">
              Candidate discovery wiring lands in the next build packet — the SerpApi client and
              its live proof are already in place (see proofs/serpapi/).
            </p>
          </div>
        </section>
      )}

      <p className="footer-note">
        LastTube · DevNetwork [API + Cloud + AI] Hackathon 2026 entry. Sponsor integrations:
        SerpApi (candidate evidence) and Perfect Corp Makeup VTO (on-face rendering). Shopping
        listings are shown as observed evidence with timestamps — not a real-time stock check.
      </p>
    </div>
  );
}
