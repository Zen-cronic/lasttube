// LastTube API server (Hono on Node). Holds provider secrets server-side;
// the web client only ever talks to these routes.

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { getPerfectCorpConfig, getSerpApiConfig } from './env.ts';
import { fixtureSearchResultSet, fixtureVtoRender } from './fixtures.ts';
import { runMakeupVto } from './providers/perfectcorp.ts';
import { searchShopping } from './providers/serpapi.ts';
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

const port = Number(process.env.PORT ?? 8787);

// Only start listening when run directly (not when imported by tests).
if (process.argv[1] && process.argv[1].endsWith('index.ts')) {
  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`LastTube API listening on http://localhost:${info.port}`);
  });
}

export default app;
