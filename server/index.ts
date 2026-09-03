// LastTube API server (Hono on Node). Holds provider secrets server-side;
// the web client only ever talks to these routes.

import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { getPerfectCorpConfig, getSerpApiConfig } from './env.ts';
import { demoComparisonBundle, fixtureSearchResultSet, fixtureVtoRender } from './fixtures.ts';
import { runMakeupVto } from './providers/perfectcorp.ts';
import { searchShopping } from './providers/serpapi.ts';
import { estimateShadeFromUrl } from './shadeEstimate.ts';
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
  const result = await searchShopping(q, config);
  return c.json(result, result.providerStatus === 'failed' ? 502 : 200);
});

// Deterministic demo replay: recorded real lifecycles, always labeled fixture.
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
  if (!url) return c.json({ error: 'missing url parameter' }, 400);
  try {
    const estimate = await estimateShadeFromUrl(url);
    return c.json(estimate);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 422);
  }
});

// Makeup VTO render. Body: { srcFileUrl, effects, mode? }
app.post('/api/vto', async (c) => {
  let body: { srcFileUrl?: string; effects?: MakeupEffect[]; mode?: string };
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
  const render = await runMakeupVto(body.srcFileUrl, body.effects, config);
  return c.json(render, render.providerStatus === 'failed' ? 502 : 200);
});

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
