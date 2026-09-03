# LastTube

**Your favorite shade vanished. LastTube tests observed listings on one face, makes you accept or reject each direction, and stops when exact-variant evidence is missing.**

The loop: **discontinued favorite → timestamped listing evidence → fail-closed shade check → required baseline → human accept/reject/preference → actionable lead or an honest stop.**

Built for the DevNetwork [API + Cloud + AI] Hackathon 2026 with both sponsor technologies load-bearing in the judged hero flow:

- **SerpApi** (Google Shopping engine) discovers observed replacement candidates with merchant, price, availability text, source links, and observation timestamps.
- **Perfect Corp Makeup VTO** renders every comparison through the real async lifecycle: `POST /s2s/v2.0/task/makeup-vto` → bounded polling → signed result download.

Public user reports support the narrow problem framing: one person described a
[ten-year search and several poor matches](https://www.reddit.com/r/makeupdupes/comments/1w4h7mw/10_year_search_for_discontinued_lip_color/),
another described [stale local-availability results](https://www.reddit.com/r/MakeupAddiction/comments/1w2pxh2/urban_decay_1993/),
and a third weighed [shade similarity against formula](https://www.reddit.com/r/PaleMUA/comments/1w3pj43/old_mac_blankety_dupe_or_alternate_colors/).
Those anecdotes do **not** establish LastTube's accuracy, validation, market size, or willingness to pay.

![Act 3 — human preference with action blocked](docs/screenshots/judge-devpost-verdict.png)

## How it works

1. **The loss** — pick a real discontinued favorite (Urban Decay's retired Vice line, BECCA's closed catalog) or name your own and set its approximate hex.
2. **The hunt** — one live SerpApi `google_shopping` search becomes an evidence panel: each row keeps merchant, price, the availability text the source actually reported, a source link, and the observation time. Copy states plainly that the row is evidence from that observation, **not a real-time stock check**.
3. **Human decision or an honest stop** — merchant-image estimation fails closed below 10% usable saturated foreground coverage. Perfect Corp must successfully render the remembered shade as a baseline and every passing candidate on the same face. The human explicitly accepts or rejects each visual direction and selects a preference among accepted candidates; CIE76 is context, never the chooser. Because the preserved preferred listing has no exact shade/variant, the demo ends with **No actionable lead yet** and a refined-search handoff.

The interface itself is tinted by the shade under consideration (`--shade`), so the product's subject — the color — is the one bold element on the page.

## Provider honesty

Every provider result is stamped `live | fixture | unavailable | failed` and the stamp is rendered next to the data it describes. Demo mode replays **recordings of real, receipted provider lifecycles** (task ids and poll counts preserved) and labels every surface `FIXTURE` — it cannot masquerade as live. Missing evidence is disclosed as missing, never fabricated.

![Demo mode — visibly labeled fixtures](docs/screenshots/demo-mode.png)

## Architecture

```
Vite + React client (src/)
  Act 1 input → Act 2 evidence panel → Act 3 baseline + human decisions + stop/handoff
        │  /api/* only — no secrets in the browser
        ▼
Hono on Node (server/)
  /api/search                → SerpApi google_shopping → typed CandidateRecords
  /api/shade-estimate        → sharp: dominant saturated color of merchant image
                               (https + host allowlist, size cap, ≥10% usable coverage)
  /api/vto                   → Perfect Corp makeup-vto: create → bounded poll
                               (2s interval, <10s gap, 120s budget) → result
  /api/demo/comparison-bundle→ labeled replay of recorded real lifecycles
        │
        ▼
shared/ (types.ts, color.ts, effects.ts, shadeEvidence.ts)
  provider status · fail-closed shade policy · hex→Lab(D65) · CIE76 ΔE
proofs/ — sanitized live-call receipts (committed evidence)
```

## Setup

```bash
npm install
cp .env.example .env   # fill in SERPAPI_KEY and PERFECT_CORP_API_KEY
```

Without keys the API reports providers as `unavailable` — it never fakes live data. Demo mode still works.

## Run

```bash
npm run dev:api   # API on http://localhost:8787
npm run dev       # web client on http://localhost:5173 (proxies /api)
```

## Verify (no network needed)

```bash
npm run verify    # typecheck + lint + 38 offline tests + build + secret scan
```

## Rehearse the judge demo (no network or provider spend)

```bash
npm run build
npm run capture:demo
```

The capture command starts the production-built app, opens `/?mode=demo` in the installed Chrome,
drives Backtalk through two usable candidates, verifies the lost-shade baseline, rejects the
lower-ΔE candidate, accepts and prefers the other, proves CIE76 did not choose, ends with no
actionable lead, and writes six screenshots under
`docs/screenshots/`. It fails if the browser attempts a live SerpApi, Perfect Corp, or merchant-image
request, if fixture rows render remote product thumbnails, if any non-local image is requested, if
fewer than three `FIXTURE` badges render, if the browser reports an error, or if the mobile verdict
overflows horizontally. Fixture listing thumbnails are deliberately replaced by local `REC`
placeholders; the merchant image URLs remain in the sanitized receipt, but the judge-demo pixels do
not depend on them. Set `CHROME_PATH` only when Chrome is installed elsewhere.

## Deployment shape (human gate)

The production server serves both `dist/` and `/api/*` from one process:

```bash
npm run build
npm run start       # http://localhost:8787
```

`Dockerfile` and `render.yaml` are a reversible judge-preview adapter. The Blueprint disables
automatic deploys and declares both provider secrets as dashboard-entered values (`sync: false`).
Creating the Render service, entering secrets, and making the URL public are intentionally left to
the operator. See Render's official [Blueprint specification](https://render.com/docs/blueprint-spec)
and [health-check contract](https://render.com/docs/health-checks).

## Live provider proof (opt-in, spends quota)

```bash
npm run proof:serpapi       # 1 real google_shopping search -> proofs/serpapi/
npm run proof:perfectcorp   # 1 real makeup-vto lifecycle   -> proofs/perfectcorp/
npx tsx scripts/build-demo-bundle.ts   # re-record the labeled demo bundle
```

Receipts are sanitized before writing: credential values, `api_key` params, and signed-URL query material are redacted; result images are downloaded because Perfect Corp signed URLs expire (~2 hours). The committed receipts include the full task lifecycle (task id, poll count, credit balance before/after).

## Honesty notes

- Shopping listings are **observed evidence with timestamps**, not stock guarantees; the copy says so wherever they appear.
- Candidate images below **10% usable saturated foreground coverage are rejected**. Passing estimates can still be skewed by packaging.
- The exact listing title and observed offer URL are preserved. If the receipt does not name a
  shade/variant, the UI says `exact shade / variant: not present`, returns no actionable lead, and
  never presents a Buy action.
- A successful image-bearing Perfect Corp render of the remembered shade is mandatory. Baseline failure blocks candidate decisions and outcomes.
- Perfect Corp provides a consistent same-face view for explicit accept/reject/preference choices. It does not validate finish, undertone, formulation, availability, or fit for a person.
- ΔE explains approximate image-derived colors; it cannot accept, reject, prefer, or restore a human-rejected candidate.
- The preserved 40-result variant audit found exact-looking titles, but no stored image bytes for an offline coverage/hash check. No new VTO calls were warranted; see [`docs/variant-evidence-audit.md`](docs/variant-evidence-audit.md).
- Preset "lost shade" hexes are labeled as approximations from published swatches.

The latest command-level evidence is tracked in [`docs/verification-receipt.md`](docs/verification-receipt.md).

## Privacy

No real person's selfie is used anywhere in this repository or demo. The demo face is Perfect Corp's own published API sample image, and the consent policy for future selfie upload is stated in the product.

## Screenshots

| Act 1 — the loss | Act 2 — the hunt |
| --- | --- |
| ![Act 1](docs/screenshots/act1-the-loss.png) | ![Act 2](docs/screenshots/act2-the-hunt.png) |
