import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import type { DemoComparisonBundle } from '../server/fixtures.ts';
import { SAMPLE_FACE_URL, foundationEffect, lipColorEffect } from '../shared/effects.ts';
import {
  unknownCandidateEvidence,
  type RuntimeCandidateEvidenceManifest,
} from '../shared/evidence.ts';
import {
  isSuccessfulVtoRender,
  resolveCandidateDispositions,
  type CandidateReviewDecision,
} from '../shared/reviewDecision.ts';
import { assessShadeEvidenceCoverage } from '../shared/shadeEvidence.ts';
import type { CandidateRecord, SearchResultSet, VtoRender } from '../shared/types.ts';
import { CandidateDecisionPanel } from './components/CandidateDecisionPanel.tsx';
import { EvidencePanel, type DataSource } from './components/EvidencePanel.tsx';
import { LostShadePicker } from './components/LostShadePicker.tsx';
import { ProviderStatusBadge, type BadgeStatus } from './components/ProviderStatusBadge.tsx';
import { ProviderProofPanel } from './components/ProviderProofPanel.tsx';
import { SelfiePanel } from './components/SelfiePanel.tsx';
import { DecisionOutcomeCard } from './components/VerdictCard.tsx';
import { VtoStage, type CandidateComparison } from './components/VtoStage.tsx';
import type { LostShade } from './data/lostShades.ts';

interface Health {
  ok: boolean;
  providers: { serpapi: string; perfectcorp: string };
}

interface ShadeEstimateResponse {
  hex?: string;
  coverage?: number;
  sampledPixels?: number;
  method?: string;
  sourceImage?: { url: string; sha256: string; byteLength: number };
  evidenceManifest?: RuntimeCandidateEvidenceManifest;
  error?: string;
}

function providerBadge(value: string | undefined): BadgeStatus {
  return value === 'configured' ? 'configured' : 'unavailable';
}

function effectsFor(category: LostShade['category'], hex: string) {
  return category === 'foundation' ? [foundationEffect(hex)] : [lipColorEffect(hex)];
}

function failedVtoRender(error: string): VtoRender {
  const now = new Date().toISOString();
  return {
    providerStatus: 'failed',
    provider: 'perfectcorp',
    taskId: null,
    imageUrl: null,
    startedAt: now,
    completedAt: now,
    pollCount: 0,
    expiryNote: 'No render was produced.',
    error,
  };
}

export default function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [lost, setLost] = useState<LostShade | null>(null);

  // Act 2 state
  const [hunting, setHunting] = useState(false);
  const [query, setQuery] = useState('');
  const [dataSource, setDataSource] = useState<DataSource>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') === 'demo' ? 'fixture' : 'live';
  });
  const [searching, setSearching] = useState(false);
  const [search, setSearch] = useState<SearchResultSet | null>(null);
  const [shortlist, setShortlist] = useState<CandidateRecord[]>([]);

  // Act 3 state
  const [comparing, setComparing] = useState(false);
  const [lostRender, setLostRender] = useState<VtoRender | null>(null);
  const [lostRendering, setLostRendering] = useState(false);
  const [comparisons, setComparisons] = useState<CandidateComparison[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reviewDecisions, setReviewDecisions] = useState<
    Record<string, CandidateReviewDecision | undefined>
  >({});
  const [preferredId, setPreferredId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json() as Promise<Health>)
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  // Sequence guard so a slow earlier hunt (e.g. a live search still in flight
  // when the user switches to the labeled demo recording) can never overwrite
  // a later result with data from the wrong source.
  const searchSeq = useRef(0);

  const runSearch = useCallback(async (q: string, source: DataSource) => {
    const seq = ++searchSeq.current;
    setSearching(true);
    try {
      const params = new URLSearchParams({ q });
      if (source === 'fixture') params.set('mode', 'fixture');
      const res = await fetch(`/api/search?${params.toString()}`);
      const body = (await res.json()) as SearchResultSet;
      if (seq !== searchSeq.current) return;
      setSearch(body);
    } catch (err) {
      if (seq !== searchSeq.current) return;
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
      if (seq === searchSeq.current) setSearching(false);
    }
  }, []);

  const requestVto = useCallback(
    async (
      hex: string,
      category: LostShade['category'],
      source: DataSource,
      evidenceBinding?: { runId: string; candidateId: string },
    ): Promise<VtoRender> => {
      const res = await fetch('/api/vto', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          srcFileUrl: SAMPLE_FACE_URL,
          effects: effectsFor(category, hex),
          ...(source === 'fixture' ? { mode: 'fixture' } : {}),
          ...(evidenceBinding
            ? {
                evidenceRunId: evidenceBinding.runId,
                candidateId: evidenceBinding.candidateId,
              }
            : {}),
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
    setReviewDecisions({});
    setPreferredId(null);
    setLostRender(null);

    const base = (c: CandidateRecord): CandidateComparison => ({
      id: c.id,
      title: c.title,
      merchant: c.merchant,
      priceDisplay: c.price.display,
      priceValue: c.price.value,
      productUrl: c.productUrl,
      sourceUrl: c.sourceUrl,
      observedAt: c.observedAt,
      estimateHex: null,
      estimateCoverage: null,
      estimateError: null,
      render: null,
      rendering: false,
      evidence: unknownCandidateEvidence(c),
      manifestValidated: false,
      manifestUrl: null,
      systemExclusionReason: null,
    });

    if (dataSource === 'fixture') {
      // Deterministic replay: one receipted baseline plus candidate outputs
      // whose narrower offline provenance is explicit in each manifest.
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
            const reason = 'System excluded — no retained demo output for this candidate.';
            return {
              ...base(c),
              estimateError: reason,
              systemExclusionReason: reason,
            };
          }
          const assessment = assessShadeEvidenceCoverage(rec.estimateCoverage);
          if (!assessment.usable) {
            const reason =
              rec.evidence.systemExclusionReason ??
              `System excluded — recorded image rejected: ${assessment.reason}.`;
            return {
              ...base(c),
              estimateCoverage: assessment.coverage,
              estimateError: reason,
              systemExclusionReason: reason,
              evidence: { ...rec.evidence, systemExclusionReason: reason },
            };
          }
          return {
            ...base(c),
            estimateHex: rec.estimateHex,
            estimateCoverage: rec.estimateCoverage,
            render: rec.render,
            evidence: rec.evidence,
            manifestValidated: false,
            manifestUrl: null,
          };
        });
        setComparisons(mapped);
      } catch (err) {
        const reason = `System excluded — ${(err as Error).message}`;
        setComparisons(
          shortlist.map((c) => ({
            ...base(c),
            estimateError: reason,
            systemExclusionReason: reason,
          })),
        );
      }
      return;
    }

    setComparisons(shortlist.map(base));

    // The remembered shade is a required comparison baseline. Candidate work
    // may run concurrently, but no decision UI unlocks unless this promise
    // resolves to a successful image-bearing VTO result.
    setLostRendering(true);
    const baselinePromise = requestVto(lost.hex, lost.category, dataSource)
      .then((render) => setLostRender(render))
      .catch((err) =>
        setLostRender(failedVtoRender(`Lost-shade baseline failed: ${(err as Error).message}`)),
      )
      .finally(() => setLostRendering(false));

    // Estimate each candidate's shade from its merchant image, then render it.
    const candidatePromises = shortlist.map(async (c) => {
        const update = (patch: Partial<CandidateComparison>) => {
          setComparisons((prev) => prev.map((p) => (p.id === c.id ? { ...p, ...patch } : p)));
        };
        if (!c.thumbnailUrl) {
          const reason = 'System excluded — listing has no product image to estimate from.';
          update({ estimateError: reason, systemExclusionReason: reason });
          return;
        }
        const evidenceRunId = search?.evidenceRunId;
        if (!evidenceRunId) {
          const reason = 'System excluded — live search has no exportable evidence run.';
          update({ estimateError: reason, systemExclusionReason: reason });
          return;
        }
        try {
          const params = new URLSearchParams({
            url: c.thumbnailUrl,
            evidenceRunId,
            candidateId: c.id,
          });
          const res = await fetch(`/api/shade-estimate?${params.toString()}`);
          const est = (await res.json()) as ShadeEstimateResponse;
          if (!res.ok || !est.hex) {
            const reason = `System excluded — ${est.error ?? 'shade estimation failed'}.`;
            update({ estimateError: reason, systemExclusionReason: reason });
            return;
          }
          const assessment = assessShadeEvidenceCoverage(est.coverage);
          if (!assessment.usable) {
            const reason = `System excluded — merchant image rejected: ${assessment.reason}.`;
            update({
              estimateCoverage: assessment.coverage,
              estimateError: reason,
              systemExclusionReason: reason,
            });
            return;
          }
          if (!est.evidenceManifest || est.evidenceManifest.integrity.state !== 'collecting') {
            const reason =
              'System excluded — shade estimate has no bound exportable evidence manifest.';
            update({ estimateError: reason, systemExclusionReason: reason });
            return;
          }
          const evidenceAfterEstimate =
            est.evidenceManifest.evidence;
          update({
            estimateHex: est.hex,
            estimateCoverage: assessment.coverage,
            rendering: true,
            evidence: evidenceAfterEstimate,
            manifestValidated: false,
            manifestUrl: est.evidenceManifest.artifacts.manifestUrl,
          });
          const render = await requestVto(est.hex, lost.category, dataSource, {
            runId: evidenceRunId,
            candidateId: c.id,
          });
          const renderSucceeded = isSuccessfulVtoRender(render);
          const manifestValidated = render.evidenceManifest?.integrity.state === 'validated';
          const evidenceAfterRender = manifestValidated
            ? render.evidenceManifest!.evidence
            : {
                ...evidenceAfterEstimate,
                sameFaceRender: {
                  ...evidenceAfterEstimate.sameFaceRender,
                  state: 'absent' as const,
                  proofLevel: 'missing' as const,
                  providerStatus: render.providerStatus,
                  basis: 'Candidate VTO did not return a validated exportable manifest.',
                },
              };
          update({
            render,
            rendering: false,
            evidence: evidenceAfterRender,
            manifestValidated,
            manifestUrl: render.evidenceManifest?.artifacts.manifestUrl ?? null,
            ...(renderSucceeded && manifestValidated
              ? {}
              : {
                  systemExclusionReason:
                    'System excluded — candidate VTO did not produce a validated exportable manifest.',
                }),
          });
        } catch (err) {
          const reason = `System excluded — ${(err as Error).message}`;
          update({ estimateError: reason, systemExclusionReason: reason, rendering: false });
        }
      });
    await Promise.all([baselinePromise, ...candidatePromises]);
  }, [lost, shortlist, dataSource, requestVto, search]);

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
    setReviewDecisions({});
    setPreferredId(null);
  };

  const startHunt = () => {
    if (!lost) return;
    setHunting(true);
    setComparing(false);
    setComparisons([]);
    setLostRender(null);
    setActiveId(null);
    setReviewDecisions({});
    setPreferredId(null);
    void runSearch(query || lost.defaultQuery, dataSource);
  };

  const changeDataSource = (source: DataSource) => {
    setDataSource(source);
    if (hunting && query) void runSearch(query, source);
  };

  const toggleShortlist = (c: CandidateRecord) => {
    setShortlist((prev) => {
      if (prev.some((p) => p.id === c.id)) return prev.filter((p) => p.id !== c.id);
      if (prev.length >= 3) return prev;
      return [...prev, c];
    });
  };

  const reviewCandidate = (id: string) => {
    setActiveId(id);
  };

  const decideCandidate = (id: string, decision: CandidateReviewDecision) => {
    setActiveId(id);
    setReviewDecisions((prev) => ({ ...prev, [id]: decision }));
    if (decision === 'rejected') {
      setPreferredId((current) => (current === id ? null : current));
    }
  };

  const refineSearch = () => {
    if (!lost) return;
    setQuery(`"${lost.shadeName}" ${lost.productName} exact shade`);
    setComparing(false);
    setActiveId(null);
    requestAnimationFrame(() => {
      document.getElementById('replacement-query')?.focus();
      document.getElementById('act2-title')?.scrollIntoView({ behavior: 'smooth' });
    });
  };

  // Signature element: the shade under consideration tints the interface.
  const activeComparison = comparisons.find((c) => c.id === activeId);
  const activeHex = activeComparison?.estimateHex ?? lost?.hex ?? '#a96a73';
  const shadeStyle = { '--shade': activeHex } as CSSProperties;

  const allCandidatesSettled =
    comparisons.length > 0 &&
    comparisons.every((c) => c.render !== null || c.systemExclusionReason !== null);
  const baselineSettled = !lostRendering && lostRender !== null;
  const comparisonSettled = baselineSettled && allCandidatesSettled;
  const baselineReady = isSuccessfulVtoRender(lostRender);
  const reviewResolution = resolveCandidateDispositions(
    comparisons.map((candidate) => ({
      id: candidate.id,
      reviewable:
        !candidate.systemExclusionReason &&
        candidate.estimateHex !== null &&
        isSuccessfulVtoRender(candidate.render),
      systemExclusionReason: candidate.systemExclusionReason,
    })),
    reviewDecisions,
    preferredId,
  );

  return (
    <div className="page" style={shadeStyle}>
      <header className="site-header">
        <div>
          <p className="wordmark">
            Last<span className="tube">Tube</span>
          </p>
          <p className="tagline">Your favorite shade vanished. Account for every candidate before you act.</p>
        </div>
        <div className="provider-strip">
          <ProviderStatusBadge name="SerpApi" status={providerBadge(health?.providers.serpapi)} />
          <ProviderStatusBadge
            name="Perfect Corp"
            status={providerBadge(health?.providers.perfectcorp)}
          />
        </div>
      </header>

      <aside className="proof-mode" data-mode={dataSource} aria-label="Provider proof mode">
        <div>
          <p className="proof-mode-label">
            {dataSource === 'fixture' ? 'Demo recording armed' : 'Live provider mode'}
          </p>
          <p className="proof-mode-copy" aria-live="polite">
            {dataSource === 'fixture'
              ? 'A receipted SerpApi search and lost-shade baseline replay locally. Candidate outputs retain metadata only; every replay stays labeled FIXTURE.'
              : 'The next hunt and comparison call the configured sponsor APIs and may consume event credits.'}
          </p>
        </div>
        <div className="mode-switch" role="group" aria-label="Choose live or demo provider data">
          <button
            type="button"
            aria-pressed={dataSource === 'live'}
            onClick={() => changeDataSource('live')}
          >
            Live APIs
          </button>
          <button
            type="button"
            aria-pressed={dataSource === 'fixture'}
            onClick={() => changeDataSource('fixture')}
          >
            Safe demo
          </button>
        </div>
      </aside>

      <section className="hero">
        <h1>
          They discontinued <em>your</em> shade.
        </h1>
        <p>
          Name the one you lost. LastTube gathers timestamped listing evidence, rejects images with
          too little usable shade signal, and records every shortlist row as system-excluded or
          human-decided after a successful Perfect Corp baseline. Only an evidence-complete exact
          variant can unlock an observed offer; missing fields produce an explicit stop.
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
            Observed listing candidates
          </h2>
          <EvidencePanel
            result={search}
            searching={searching}
            query={query}
            dataSource={dataSource}
            shortlist={shortlist}
            onQueryChange={setQuery}
            onDataSourceChange={changeDataSource}
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
          <p className="act-label">Act 3 · Human review</p>
          <h2 className="act-title" id="act3-title">
            Same face, same light — inspect before any lead
          </h2>
          <VtoStage
            lost={lost}
            lostRender={lostRender}
            lostRendering={lostRendering}
            comparisons={comparisons}
            activeId={activeId}
            onSelect={reviewCandidate}
          />
          {comparisonSettled && !baselineReady && (
            <div className="recovery-row baseline-block" role="alert">
              <div>
                <p className="act-label">Baseline required</p>
                <h3>Lost-shade baseline failed. Comparison is blocked.</h3>
                <p>
                  Without a successful image-bearing Perfect Corp render of the remembered shade,
                  candidate decisions and outcomes stay locked.
                </p>
              </div>
              <button type="button" className="btn btn-secondary" onClick={() => void startComparison()}>
                Retry baseline{dataSource === 'live' ? ' (uses provider calls)' : ''}
              </button>
            </div>
          )}
          {comparisonSettled && baselineReady && comparisons.length > 0 && (
            <CandidateDecisionPanel
              candidates={comparisons}
              activeId={activeId}
              decisions={reviewDecisions}
              resolution={reviewResolution}
              onView={reviewCandidate}
              onDecide={decideCandidate}
              onPrefer={setPreferredId}
            />
          )}
          {comparisonSettled &&
            baselineReady &&
            reviewResolution.complete &&
            (reviewResolution.acceptedIds.length === 0 || reviewResolution.preferredId) && (
              <DecisionOutcomeCard
                lost={lost}
                comparisons={comparisons}
                acceptedIds={reviewResolution.acceptedIds}
                rejectedIds={reviewResolution.rejectedIds}
                systemExcludedIds={reviewResolution.systemExcludedIds}
                preferredId={reviewResolution.preferredId}
                baselineReady={baselineReady}
                onRefine={refineSearch}
              />
            )}
          {comparisonSettled &&
            baselineReady &&
            reviewResolution.complete &&
            reviewResolution.acceptedIds.length > 0 &&
            !reviewResolution.preferredId && (
              <p className="warning-strip" role="status">
                Review complete. Choose one accepted candidate as your visual preference, or reject
                it to stop with no lead.
              </p>
            )}
          {comparisonSettled && <ProviderProofPanel />}
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
