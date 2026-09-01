# LastTube

Your favorite shade vanished. LastTube finds replacements that are actually purchasable, shows them on your face, and explains the closest match.

The loop: **discontinued favorite → live candidates → on-face comparison → one source-backed closest-match verdict.**

Built for the DevNetwork [API + Cloud + AI] Hackathon 2026, with both sponsor technologies load-bearing:

- **SerpApi** discovers current replacement candidates with merchant, price, availability, and source-link evidence (Google Shopping engine).
- **Perfect Corp Makeup VTO** renders candidates on-face through a real async task lifecycle (create → bounded poll → signed result).

## Stack

TypeScript end to end. Vite + React web client; Hono on Node API server (holds provider secrets; the client only talks to `/api/*`). Vitest for offline tests.

```
shared/types.ts        provider-status + candidate/render contracts
server/providers/      SerpApi + Perfect Corp clients and normalization
server/fixtures.ts     sanitized fixtures (always labeled, never "live")
scripts/proof-*.ts     opt-in LIVE proof calls; write receipts to proofs/
proofs/                sanitized live-call receipts (evidence, committed)
```

## Setup

```bash
npm install
cp .env.example .env   # then fill in the keys (never committed)
```

Required keys: `SERPAPI_KEY`, `PERFECT_CORP_API_KEY`. Without them the API reports providers as `unavailable` — it never fakes live data.

## Run

```bash
npm run dev:api   # API on http://localhost:8787
npm run dev       # web client on http://localhost:5173 (proxies /api)
```

## Verify (no network needed)

```bash
npm run verify    # typecheck + lint + tests + build + secret scan
npm run test      # offline provider tests against sanitized fixtures
```

## Live provider proof (opt-in, spends quota)

```bash
npm run proof:serpapi       # 1 real google_shopping search -> proofs/serpapi/
npm run proof:perfectcorp   # 1 real makeup-vto lifecycle   -> proofs/perfectcorp/
```

Receipts are sanitized before being written: credential values, `api_key` params, and signed-URL query material are redacted. Result images are downloaded because Perfect Corp signed URLs expire (~2 hours).

## Provider status honesty

Every provider result is stamped `live | fixture | unavailable | failed`. Fixture data is derived from sanitized real receipts and is always visibly labeled; it can never masquerade as live evidence. Shopping listings are presented as "observed at \<time\>" evidence — not as a real-time stock check.

## Privacy

No real person's selfie is used anywhere in this repository. The demo face is Perfect Corp's own public docs sample image.
