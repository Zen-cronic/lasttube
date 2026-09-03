// Shared contract between the API server and the web client.
// Every provider result is stamped with a ProviderStatus so fixture data can
// never masquerade as live data anywhere downstream (UI, receipts, demo).

import type { RuntimeCandidateEvidenceManifest } from './evidence.ts';

/** How a provider call actually resolved. */
export type ProviderStatus =
  | 'live' // a real network call to the provider succeeded
  | 'fixture' // sanitized, pre-recorded provider data; must be visibly labeled
  | 'unavailable' // provider not configured (missing credentials) or disabled
  | 'failed'; // a real call was attempted and did not succeed

export type ProviderName = 'serpapi' | 'perfectcorp';

/** One observed replacement lead, normalized from a timestamped SerpApi listing. */
export interface CandidateRecord {
  id: string;
  title: string;
  /** Merchant shown by the source (e.g. "Sephora", "Ulta Beauty"). */
  merchant: string;
  /** Direct product/offer link when the source provides one. */
  productUrl: string | null;
  /** Evidence link back to the source listing (Google Shopping via SerpApi). */
  sourceUrl: string | null;
  price: {
    display: string | null;
    value: number | null;
    currency: string | null;
  };
  availability: {
    /** Exactly what the source reported (tag/delivery text), untouched. */
    observed: string | null;
    /** Honest framing: a shopping listing is not a real-time stock check. */
    caveat: string;
  };
  thumbnailUrl: string | null;
  /** Rank position in the source result page (1-based). */
  position: number;
  /** The query that produced this candidate. */
  query: string;
  /** ISO timestamp of when the evidence was observed. */
  observedAt: string;
  provider: 'serpapi';
}

/** A full candidate-discovery result with provenance and disclosures. */
export interface SearchResultSet {
  providerStatus: ProviderStatus;
  provider: 'serpapi';
  query: string;
  observedAt: string;
  candidates: CandidateRecord[];
  /** Stale/missing/conflicting-evidence disclosures for the UI to surface. */
  warnings: string[];
  /** Present only when the live server opened an exportable evidence run. */
  evidenceRunId?: string;
  /** Present when providerStatus is 'failed' or 'unavailable'. Never contains secrets. */
  error?: string;
}

/** Outcome of one Perfect Corp Makeup VTO task lifecycle. */
export interface VtoRender {
  providerStatus: ProviderStatus;
  provider: 'perfectcorp';
  taskId: string | null;
  /**
   * Rendered result image URL. Live URLs are signed and expire (~2h) —
   * download anything that must outlive the session. Fixture mode points at a
   * locally stored, clearly-labeled sample render.
   */
  imageUrl: string | null;
  startedAt: string;
  completedAt: string | null;
  pollCount: number;
  /** Disclosure the UI must show next to live renders. */
  expiryNote: string;
  /** Server-validated, exportable candidate proof. Baseline and fixtures omit it. */
  evidenceManifest?: RuntimeCandidateEvidenceManifest;
  /** Present when providerStatus is 'failed' or 'unavailable'. Never contains secrets. */
  error?: string;
}

/** Makeup effect payloads accepted by Perfect Corp `task/makeup-vto`. */
export interface LipColorPalette {
  color: string; // "#RRGGBB"
  texture: 'matte' | 'gloss' | 'holographic' | 'metallic' | 'satin' | 'sheer' | 'shimmer';
  colorIntensity: number; // 0..100
  gloss?: number;
  transparencyIntensity?: number;
  shimmerColor?: string;
  shimmerIntensity?: number;
  shimmerDensity?: number;
  shimmerSize?: number;
}

export interface LipColorEffect {
  category: 'lip_color';
  shape: { name: string };
  palettes: LipColorPalette[];
  style: { type: 'full' | 'ombre' | 'twoTone'; innerRatio?: number; featherStrength?: number };
}

export interface FoundationEffect {
  category: 'foundation';
  palettes: Array<{
    color: string;
    colorIntensity: number;
    glowIntensity: number;
    coverageIntensity: number;
  }>;
}

export type MakeupEffect = LipColorEffect | FoundationEffect;
