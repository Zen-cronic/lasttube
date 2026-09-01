import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import type { DemoComparisonBundle } from '../server/fixtures.ts';
import { SAMPLE_FACE_URL, foundationEffect, lipColorEffect } from '../shared/effects.ts';
import type { CandidateRecord, SearchResultSet, VtoRender } from '../shared/types.ts';
import { EvidencePanel, type DataSource } from './components/EvidencePanel.tsx';
import { LostShadePicker } from './components/LostShadePicker.tsx';
import { ProviderStatusBadge, type BadgeStatus } from './components/ProviderStatusBadge.tsx';
import { SelfiePanel } from './components/SelfiePanel.tsx';
import { VerdictCard } from './components/VerdictCard.tsx';
import { VtoStage, type CandidateComparison } from './components/VtoStage.tsx';
import type { LostShade } from './data/lostShades.ts';

interface Health {
  ok: boolean;
  providers: { serpapi: string; perfectcorp: string };
}

interface ShadeEstimateResponse {
  hex?: string;
  error?: string;
}

function providerBadge(value: string | undefined): BadgeStatus {
  return value === 'configured' ? 'configured' : 'unavailable';
}

function effectsFor(category: LostShade['category'], hex: string) {
  return category === 'foundation' ? [foundationEffect(hex)] : [lipColorEffect(hex)];
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

  // Act 3 state
  const [comparing, setComparing] = useState(false);
  const [lostRender, setLostRender] = useState<VtoRender | null>(null);
  const [lostRendering, setLostRendering] = useState(false);
  const [comparisons, setComparisons] = useState<CandidateComparison[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

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

  const requestVto = useCallback(
    async (hex: string, category: LostShade['category'], source: DataSource): Promise<VtoRender> => {
      const res = await fetch('/api/vto', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          srcFileUrl: SAMPLE_FACE_URL,
          effects: effectsFor(category, hex),
          ...(source === 'fixture' ? { mode: 'fixture' } : {}),
        }),
      });
      return (await res.json()) as VtoRender;
    },
    [],
  );

  const startComparison = useCallback(async () => {
    if (!lost || shortlist.length === 0) return;
    setComparing(true);
    setActiveId(null);

    const base = (c: CandidateRecord): CandidateComparison => ({
      id: c.id,
      title: c.title,
      merchant: c.merchant,
      priceDisplay: c.price.display,
      priceValue: c.price.value,
      sourceUrl: c.sourceUrl,
      observedAt: c.observedAt,
      estimateHex: null,
      estimateError: null,
      render: null,
      rendering: false,
    });

    if (dataSource === 'fixture') {
      // Deterministic demo replay: recorded REAL lifecycles, labeled fixture.
      setLostRendering(false);
      try {
        const res = await fetch('/api/demo/comparison-bundle');
        if (!res.ok) throw new Error('demo bundle not recorded');
        const bundle = (await res.json()) as DemoComparisonBundle;
        setLostRender(bundle.lost.render);
        const byId = new Map(bundle.comparisons.map((b) => [b.candidateId, b]));
        const mapped = shortlist.map((c) => {
          const rec = byId.get(c.id);
          if (!rec) {
            return {
              ...base(c),
              estimateError: 'not in the demo recording — switch to live mode for this one',
            };
          }
          return { ...base(c), estimateHex: rec.estimateHex, render: rec.render };
        });
        setComparisons(mapped);
        setActiveId(mapped.find((m) => m.render !== null)?.id ?? null);
      } catch (err) {
        setComparisons(
          shortlist.map((c) => ({ ...base(c), estimateError: (err as Error).message })),
        );
      }
      return;
    }

    setComparisons(shortlist.map(base));

    // Render what they remember: the lost shade on the sample face.
    setLostRendering(true);
    void requestVto(lost.hex, lost.category, dataSource).then((render) => {
      setLostRender(render);
      setLostRendering(false);
    });

    // Estimate each candidate's shade from its merchant image, then render it.
    await Promise.all(
      shortlist.map(async (c) => {
        const update = (patch: Partial<CandidateComparison>) => {
          setComparisons((prev) => prev.map((p) => (p.id === c.id ? { ...p, ...patch } : p)));
        };
        if (!c.thumbnailUrl) {
          update({ estimateError: 'listing has no product image to estimate from' });
          return;
        }
        try {
          const res = await fetch(
            `/api/shade-estimate?url=${encodeURIComponent(c.thumbnailUrl)}`,
          );
          const est = (await res.json()) as ShadeEstimateResponse;
          if (!res.ok || !est.hex) {
            update({ estimateError: est.error ?? 'shade estimation failed' });
            return;
          }
          update({ estimateHex: est.hex, rendering: true });
          setActiveId((prev) => prev ?? c.id);
          const render = await requestVto(est.hex, lost.category, dataSource);
          update({ render, rendering: false });
        } catch (err) {
          update({ estimateError: (err as Error).message, rendering: false });
        }
      }),
    );
  }, [lost, shortlist, dataSource, requestVto]);

  const selectLost = (shade: LostShade) => {
    setLost(shade);
    setQuery(shade.defaultQuery);
    setHunting(false);
    setSearch(null);
    setShortlist([]);
    setComparing(false);
    setComparisons([]);
    setLostRender(null);
    setActiveId(null);
  };

  const startHunt = () => {
    if (!lost) return;
    setHunting(true);
    setComparing(false);
    setComparisons([]);
    setLostRender(null);
    setActiveId(null);
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
  const activeComparison = comparisons.find((c) => c.id === activeId);
  const activeHex = activeComparison?.estimateHex ?? lost?.hex ?? '#a96a73';
  const shadeStyle = { '--shade': activeHex } as CSSProperties;

  const allSettled =
    comparisons.length > 0 && comparisons.every((c) => c.render !== null || c.estimateError !== null);

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
            <div className="cta-row">
              <button type="button" className="btn" onClick={() => void startComparison()}>
                Compare {shortlist.length} on-face
              </button>
              <span className="field-note">
                Each candidate&apos;s shade is estimated from its merchant image, then rendered by
                Perfect Corp on the sample face.
              </span>
            </div>
          )}
        </section>
      )}

      {comparing && lost && (
        <section className="act" aria-labelledby="act3-title">
          <p className="act-label">Act 3 · The verdict</p>
          <h2 className="act-title" id="act3-title">
            Same face, same light — pick with your eyes
          </h2>
          <VtoStage
            lost={lost}
            lostRender={lostRender}
            lostRendering={lostRendering}
            comparisons={comparisons}
            activeId={activeId}
            onSelect={setActiveId}
          />
          {allSettled && <VerdictCard lost={lost} comparisons={comparisons} />}
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
