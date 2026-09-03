// Act 3 — the required human-review stage. Dark VTO stage showing the
// lost shade rendered from memory beside the active candidate's render, a
// swatch rail of estimated candidate shades, and per-render provider status.

import type { CandidateEvidence } from '../../shared/evidence.ts';
import type { VtoRender } from '../../shared/types.ts';
import type { LostShade } from '../data/lostShades.ts';
import { ProviderStatusBadge } from './ProviderStatusBadge.tsx';

export interface CandidateComparison {
  id: string;
  title: string;
  merchant: string;
  priceDisplay: string | null;
  priceValue: number | null;
  productUrl: string | null;
  sourceUrl: string | null;
  observedAt: string;
  estimateHex: string | null;
  estimateCoverage: number | null;
  estimateError: string | null;
  render: VtoRender | null;
  rendering: boolean;
  evidence: CandidateEvidence;
  manifestValidated: boolean;
  manifestUrl: string | null;
  systemExclusionReason: string | null;
}

interface Props {
  lost: LostShade;
  lostRender: VtoRender | null;
  lostRendering: boolean;
  comparisons: CandidateComparison[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

function RenderCell({
  label,
  sublabel,
  render,
  rendering,
}: {
  label: string;
  sublabel: string;
  render: VtoRender | null;
  rendering: boolean;
}) {
  return (
    <figure className="render-cell" style={{ margin: 0 }}>
      {render?.imageUrl ? (
        <img
          key={render.imageUrl}
          src={render.imageUrl}
          alt={label}
          className={`render-image${rendering ? ' loading' : ''}`}
        />
      ) : (
        <div
          style={{
            aspectRatio: '3 / 4',
            display: 'grid',
            placeItems: 'center',
            borderRadius: 6,
            border: '1px dashed oklch(0.4 0.01 20)',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: 'oklch(0.65 0.015 40)',
            padding: 12,
            textAlign: 'center',
          }}
          role="status"
        >
          {rendering
            ? 'Rendering on-face with Perfect Corp…'
            : render?.error
              ? `Render failed: ${render.error}`
              : 'Awaiting render'}
        </div>
      )}
      <figcaption>
        {label} · {sublabel}
        {render && (
          <>
            {' '}
            <ProviderStatusBadge name="VTO" status={render.providerStatus} />
          </>
        )}
      </figcaption>
    </figure>
  );
}

export function VtoStage({ lost, lostRender, lostRendering, comparisons, activeId, onSelect }: Props) {
  const active = comparisons.find((c) => c.id === activeId) ?? null;

  return (
    <div className="stage">
      <p className="act-label">Same face · same light · your decision</p>
      <div className="render-pair">
        <RenderCell
          label={`Remembered — ${lost.productName} (${lost.shadeName})`}
          sublabel="rendered from its approximate hex"
          render={lostRender}
          rendering={lostRendering}
        />
        {active ? (
          <RenderCell
            label={active.title}
            sublabel={
              active.estimateHex
                ? `merchant-image estimate ${active.estimateHex} · ${((active.estimateCoverage ?? 0) * 100).toFixed(1)}% usable pixels`
                : 'no shade estimate'
            }
            render={active.render}
            rendering={active.rendering}
          />
        ) : (
          <RenderCell label="Choose an option" sublabel="from the shade rail below" render={null} rendering={false} />
        )}
      </div>

      <div className="swatch-rail" role="group" aria-label="Shortlisted candidate shades">
        {comparisons.map((c) => (
          <button
            key={c.id}
            type="button"
            className="swatch"
            style={{ background: c.estimateHex ?? 'transparent' }}
            aria-pressed={c.id === activeId}
            aria-label={`${c.title}${c.estimateHex ? `, estimated shade ${c.estimateHex}` : ', no estimate'}`}
            title={c.title}
            onClick={() => onSelect(c.id)}
            disabled={!c.estimateHex}
          />
        ))}
      </div>

      {active?.estimateHex && (
        <div
          className="shade-bridge"
          key={`${lost.hex}-${active.estimateHex}`}
          aria-label={`Shade bridge from lost shade ${lost.hex} to candidate estimate ${active.estimateHex}`}
        >
          <span className="shade-bridge-swatch" style={{ background: lost.hex }} aria-hidden="true" />
          <div
            className="shade-bridge-track"
            style={{ background: `linear-gradient(90deg, ${lost.hex}, ${active.estimateHex})` }}
            aria-hidden="true"
          >
            <span className="shade-bridge-wipe" />
          </div>
          <span
            className="shade-bridge-swatch"
            style={{ background: active.estimateHex }}
            aria-hidden="true"
          />
          <p>
            <span>lost {lost.hex}</span>
            <strong>shade shift</strong>
            <span>candidate {active.estimateHex}</span>
          </p>
        </div>
      )}

      {comparisons.some((c) => c.estimateError) && (
        <p className="caveat" style={{ color: 'oklch(0.7 0.05 75)' }}>
          {comparisons
            .filter((c) => c.estimateError)
            .map((c) => `${c.title}: ${c.estimateError}`)
            .join(' · ')}
        </p>
      )}
      {(lostRender ?? active?.render) && (
        <p className="caveat" style={{ color: 'oklch(0.62 0.015 40)' }}>
          {(active?.render ?? lostRender)?.expiryNote}{' '}
          {active
            ? `Candidate proof: ${active.evidence.sameFaceRender.proofLevel.replaceAll('_', ' ')}.`
            : 'Lost-shade baseline: verified lifecycle receipt.'}
        </p>
      )}
    </div>
  );
}
