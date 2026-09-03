// LastTube API server (Hono on Node). Holds provider secrets server-side;
// the web client only ever talks to these routes.

import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono, type Context } from 'hono';
import { getPerfectCorpConfig, getSerpApiConfig } from './env.ts';
import { demoComparisonBundle, fixtureSearchResultSet, fixtureVtoRender } from './fixtures.ts';
import { runMakeupVtoWithEvidence } from './providers/perfectcorp.ts';
import { searchShoppingWithEvidence } from './providers/serpapi.ts';
import {
  downloadVtoOutput,
  runtimeEvidenceStore,
} from './runtimeEvidence.ts';
import { captureShadeFromUrl } from './shadeEstimate.ts';
import type { MakeupEffect, SearchResultSet, VtoRender } from '../shared/types.ts';

const app = new Hono();

app.get('/api/health', (c) => {
  return c.json({
    ok: true,
    providers: {
      serpapi: getSerpApiConfig() ? 'configured' : 'unavailable',
      perfectcorp: getPerfectCorpConfig() ? 'configured' : 'unavailable',
    },
  });
});

// Candidate discovery. `mode=fixture` opts into the labeled demo recording.
app.get('/api/search', async (c) => {
  const q = c.req.query('q')?.trim() ?? '';
  const mode = c.req.query('mode') ?? 'live';
  if (mode === 'fixture') {
    return c.json(fixtureSearchResultSet());
  }
  if (!q) {
    return c.json({ error: 'missing q parameter' }, 400);
  }
  const config = getSerpApiConfig();
  if (!config) {
    const unavailable: SearchResultSet = {
      providerStatus: 'unavailable',
      provider: 'serpapi',
      query: q,
      observedAt: new Date().toISOString(),
      candidates: [],
      warnings: [],
      error: 'SerpApi is not configured (SERPAPI_KEY missing).',
    };
    return c.json(unavailable, 503);
  }
  const search = await searchShoppingWithEvidence(q, config);
  const result = search.result;
  if (result.providerStatus === 'live' && search.responseEvidence) {
    result.evidenceRunId = await runtimeEvidenceStore.openSearchRun(
      result,
      search.responseEvidence,
    );
  }
  return c.json(result, result.providerStatus === 'failed' ? 502 : 200);
});

// Deterministic demo replay: one receipted baseline plus explicitly narrower
// candidate output metadata, always labeled fixture.
app.get('/api/demo/comparison-bundle', (c) => {
  try {
    return c.json(demoComparisonBundle());
  } catch {
    return c.json({ error: 'demo bundle is not recorded in this checkout' }, 404);
  }
});

// Evidence-derived shade estimation from a merchant product image.
app.get('/api/shade-estimate', async (c) => {
  const url = c.req.query('url') ?? '';
  const evidenceRunId = c.req.query('evidenceRunId') ?? '';
  const candidateId = c.req.query('candidateId') ?? '';
  if (!url) return c.json({ error: 'missing url parameter' }, 400);
  if (!evidenceRunId || !candidateId) {
    return c.json(
      { error: 'evidenceRunId and candidateId are required for exportable live evidence' },
      400,
    );
  }
  try {
    const captured = await captureShadeFromUrl(url);
    const evidenceManifest = await runtimeEvidenceStore.recordSourceImage({
      runId: evidenceRunId,
      candidateId,
      requestedUrl: url,
      captured,
    });
    return c.json({ ...captured.estimate, evidenceManifest });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 422);
  }
});

// Makeup VTO render. Body: { srcFileUrl, effects, mode? }
app.post('/api/vto', async (c) => {
  let body: {
    srcFileUrl?: string;
    effects?: MakeupEffect[];
    mode?: string;
    evidenceRunId?: string;
    candidateId?: string;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'invalid JSON body' }, 400);
  }
  if (body.mode === 'fixture') {
    return c.json(fixtureVtoRender());
  }
  if (!body.srcFileUrl || !Array.isArray(body.effects) || body.effects.length === 0) {
    return c.json({ error: 'srcFileUrl and a non-empty effects array are required' }, 400);
  }
  const hasEvidenceBinding = Boolean(body.evidenceRunId || body.candidateId);
  if (hasEvidenceBinding && (!body.evidenceRunId || !body.candidateId)) {
    return c.json({ error: 'evidenceRunId and candidateId must be supplied together' }, 400);
  }
  if (body.evidenceRunId && body.candidateId) {
    try {
      await runtimeEvidenceStore.assertCandidateReadyForVto(
        body.evidenceRunId,
        body.candidateId,
        body.effects,
      );
    } catch (err) {
      return c.json({ error: (err as Error).message }, 409);
    }
  }
  const config = getPerfectCorpConfig();
  if (!config) {
    const unavailable: VtoRender = {
      providerStatus: 'unavailable',
      provider: 'perfectcorp',
      taskId: null,
      imageUrl: null,
      startedAt: new Date().toISOString(),
      completedAt: null,
      pollCount: 0,
      expiryNote: '',
      error: 'Perfect Corp is not configured (PERFECT_CORP_API_KEY missing).',
    };
    return c.json(unavailable, 503);
  }
  const vtoRun = await runMakeupVtoWithEvidence(body.srcFileUrl, body.effects, config);
  const render = vtoRun.render;
  if (
    render.providerStatus === 'live' &&
    render.imageUrl &&
    body.evidenceRunId &&
    body.candidateId &&
    vtoRun.lifecycleReceipt
  ) {
    try {
      const output = await downloadVtoOutput(render.imageUrl);
      const evidenceManifest = await runtimeEvidenceStore.recordVtoOutput({
        runId: body.evidenceRunId,
        candidateId: body.candidateId,
        srcFileUrl: body.srcFileUrl,
        effects: body.effects,
        render,
        lifecycleReceipt: vtoRun.lifecycleReceipt,
        outputBytes: output.bytes,
        outputMediaType: output.mediaType,
        outputDownload: output.receipt,
      });
      if (evidenceManifest.integrity.state !== 'validated') {
        throw new Error(`candidate evidence manifest ${evidenceManifest.integrity.state}`);
      }
      return c.json({
        ...render,
        imageUrl: evidenceManifest.artifacts.outputImage!.downloadUrl,
        expiryNote:
          'Perfect Corp output downloaded, hashed, and retained for this exportable server run. Download the manifest before restart or redeploy.',
        evidenceManifest,
      });
    } catch (err) {
      const failed: VtoRender = {
        ...render,
        providerStatus: 'failed',
        imageUrl: null,
        error: `Candidate evidence export failed: ${(err as Error).message}`,
      };
      return c.json(failed, 502);
    }
  }
  return c.json(render, render.providerStatus === 'failed' ? 502 : 200);
});

app.get('/api/evidence/runs/:runId/candidates/:candidateId/manifest', async (c) => {
  try {
    const manifest = await runtimeEvidenceStore.getValidatedManifest(
      c.req.param('runId') ?? '',
      c.req.param('candidateId') ?? '',
    );
    const safeId = manifest.candidateId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80);
    c.header('Content-Disposition', `attachment; filename="lasttube-${safeId}-manifest.json"`);
    c.header('Cache-Control', 'no-store');
    return c.json(manifest);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 409);
  }
});

async function evidenceArtifact(
  c: Context,
  kind: 'search' | 'source' | 'lifecycle' | 'output',
) {
  try {
    const artifact = await runtimeEvidenceStore.readArtifact(
      c.req.param('runId') ?? '',
      c.req.param('candidateId') ?? '',
      kind,
    );
    return new Response(new Uint8Array(artifact.bytes), {
      headers: {
        'Content-Type': artifact.mediaType,
        'Content-Disposition': `attachment; filename="${artifact.fileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 404);
  }
}

app.get('/api/evidence/runs/:runId/candidates/:candidateId/source-image', (c) =>
  evidenceArtifact(c, 'source'),
);
app.get('/api/evidence/runs/:runId/candidates/:candidateId/search-response', (c) =>
  evidenceArtifact(c, 'search'),
);
app.get('/api/evidence/runs/:runId/candidates/:candidateId/perfect-lifecycle', (c) =>
  evidenceArtifact(c, 'lifecycle'),
);
app.get('/api/evidence/runs/:runId/candidates/:candidateId/output-image', (c) =>
  evidenceArtifact(c, 'output'),
);

// One-process production shape: the same Hono service owns API routes and the
// built Vite client. API handlers remain above the static fallback so an
// unknown /api/* request can never silently return index.html.
if (process.env.NODE_ENV === 'production') {
  app.all('/api/*', (c) => c.json({ error: 'API route not found' }, 404));
  app.use('/*', serveStatic({ root: './dist' }));
  app.get('*', serveStatic({ path: './dist/index.html' }));
}

const port = Number(process.env.PORT ?? 8787);

// Only start listening when run directly (not when imported by tests).
if (process.argv[1] && process.argv[1].endsWith('index.ts')) {
  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`LastTube API listening on http://localhost:${info.port}`);
  });
}

export default app;
