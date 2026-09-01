import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import type { CandidateRecord, SearchResultSet } from '../shared/types.ts';
import { EvidencePanel, type DataSource } from './components/EvidencePanel.tsx';
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

  // Act 2 state
  const [hunting, setHunting] = useState(false);
  const [query, setQuery] = useState('');
  const [dataSource, setDataSource] = useState<DataSource>('live');
  const [searching, setSearching] = useState(false);
  const [search, setSearch] = useState<SearchResultSet | null>(null);
  const [shortlist, setShortlist] = useState<CandidateRecord[]>([]);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json() as Promise<Health>)
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  const runSearch = useCallback(async (q: string, source: DataSource) => {
    setSearching(true);
    try {
      const params = new URLSearchParams({ q });
      if (source === 'fixture') params.set('mode', 'fixture');
      const res = await fetch(`/api/search?${params.toString()}`);
      const body = (await res.json()) as SearchResultSet;
      setSearch(body);
    } catch (err) {
      setSearch({
        providerStatus: 'failed',
        provider: 'serpapi',
        query: q,
        observedAt: new Date().toISOString(),
        candidates: [],
        warnings: [],
        error: `Could not reach the LastTube API: ${(err as Error).message}`,
      });
    } finally {
      setSearching(false);
    }
  }, []);

  const selectLost = (shade: LostShade) => {
    setLost(shade);
    setQuery(shade.defaultQuery);
    setHunting(false);
    setSearch(null);
    setShortlist([]);
  };

  const startHunt = () => {
    if (!lost) return;
    setHunting(true);
    void runSearch(query || lost.defaultQuery, dataSource);
  };

  const toggleShortlist = (c: CandidateRecord) => {
    setShortlist((prev) => {
      if (prev.some((p) => p.id === c.id)) return prev.filter((p) => p.id !== c.id);
      if (prev.length >= 3) return prev;
      return [...prev, c];
    });
  };

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
          <LostShadePicker selected={lost} onSelect={selectLost} />
          <SelfiePanel />
        </div>
        <div className="cta-row">
          <button type="button" className="btn" disabled={lost === null} onClick={startHunt}>
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
          <EvidencePanel
            result={search}
            searching={searching}
            query={query}
            dataSource={dataSource}
            shortlist={shortlist}
            onQueryChange={setQuery}
            onDataSourceChange={(s) => {
              setDataSource(s);
              void runSearch(query, s);
            }}
            onRerun={() => void runSearch(query, dataSource)}
            onToggleShortlist={toggleShortlist}
          />
          {shortlist.length > 0 && (
            <p className="field-note" style={{ marginTop: 12 }}>
              {shortlist.length} candidate{shortlist.length > 1 ? 's' : ''} shortlisted — the
              on-face comparison stage lands in the next build packet (the Perfect Corp client and
              its live proof are already in place, see proofs/perfectcorp/).
            </p>
          )}
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
