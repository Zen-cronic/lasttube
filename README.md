# LastTube

**Your favorite shade vanished. LastTube gives every observed listing a recorded disposition, lets
you decide between usable same-face directions, and unlocks action only for evidence-complete exact
variants.**

The loop: **discontinued favorite → timestamped listing evidence → system exclusion or human
decision for every candidate → required baseline → accepted-only preference → evidence-complete
offer or an honest stop.**

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
3. **Resolve every candidate** — merchant-image estimation fails closed below 10% usable saturated
   foreground coverage. Each shortlisted row becomes either a recorded system exclusion or an
   explicit human accept/reject after Perfect Corp successfully renders the remembered baseline.
   On the live path, the server first binds the exact search-response digest and fetched image bytes,
   then downloads the Perfect output and validates an exportable per-run manifest. A missing or
   invalid manifest system-excludes the candidate before review. Preference is accepted-only;
   CIE76 is context, never the chooser.
4. **Action gate** — an observed offer unlocks only when listing identity, exact variant, shade,
   finish, hashed source-image coverage, verified candidate VTO input/lifecycle/output, and human
   preference are all present. The tracked hero evidence is incomplete, so it ends with **No
   actionable lead yet** and a refined-search handoff.

The interface itself is tinted by the shade under consideration (`--shade`), so the product's subject — the color — is the one bold element on the page.

## Provider honesty

Every provider result is stamped `live | fixture | unavailable | failed` and the stamp is rendered
next to the data it describes. Demo mode replays a receipted SerpApi response and the one genuinely
receipted lost-shade Perfect Corp lifecycle. Candidate fixtures are narrower: three tracked outputs
with task/poll metadata, but no retained request or lifecycle responses. Their per-candidate
manifests say so, and every replay remains visibly `FIXTURE`.

New live candidate runs use a stricter proof path. The search response's exact body digest opens an
evidence run; shade estimation retains and hashes the exact fetched merchant-image bytes; Perfect
request inputs plus task/poll outcome are bound to the locally downloaded output bytes. Only a
re-hashed `validated` manifest reaches the UI policy, where it is downloadable beside the candidate.
The current Render shape has no persistent disk, so this is truthfully an **exportable per-run
manifest**, not durable storage: download the JSON and its two bound images before restart/redeploy.

![Demo mode — visibly labeled fixtures](docs/screenshots/demo-mode.png)

## Architecture

```
Vite + React client (src/)
  Act 1 input → Act 2 evidence panel → Act 3 baseline + human decisions + stop/handoff
        │  /api/* only — no secrets in the browser
        ▼
Hono on Node (server/)
  /api/search                → SerpApi result + exact response-body digest → evidence run
  /api/shade-estimate        → sharp: dominant saturated color of merchant image
                               + exact fetched bytes/hash retained per run
  /api/vto                   → Perfect Corp makeup-vto: create → bounded poll
                               → download/hash output → validate manifest or fail closed
  /api/evidence/runs/...     → downloadable manifest + bound source/output images
  /api/demo/comparison-bundle→ labeled replay with proof level per artifact
        │
        ▼
shared/ (types.ts, evidence.ts, reviewDecision.ts, shadeEvidence.ts, color.ts)
  structured evidence state · candidate disposition · action derivation · CIE76 context
proofs/ — sanitized live receipts + per-candidate offline provenance manifests
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
npm run verify    # typecheck + lint + 51 offline tests + build + secret scan
```

## Rehearse the judge demo (no network or provider spend)

```bash
npm run build
npm run capture:demo
```

The capture command starts the production-built app, opens `/?mode=demo` in the installed Chrome,
drives Backtalk through three shortlisted candidates, records one system exclusion, verifies the
lost-shade baseline, rejects the lower-ΔE candidate, accepts and prefers the other, proves CIE76 did
not choose, confirms the structured action gate stays locked, and writes six screenshots under
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

The Blueprint provisions no persistent disk. Runtime evidence files therefore live in the server's
ephemeral temporary directory and are explicitly labeled exportable per-run. Production durability
would require an operator-approved object store or persistent disk plus retention/deletion policy;
neither is claimed or provisioned by this prototype.

## Live provider proof (opt-in, spends quota)

```bash
npm run proof:serpapi       # 1 real google_shopping search -> proofs/serpapi/
npm run proof:perfectcorp   # 1 real makeup-vto lifecycle   -> proofs/perfectcorp/
npx tsx scripts/build-demo-bundle.ts   # re-record the labeled demo bundle
```

Receipts are sanitized before writing: credential values, `api_key` params, and signed-URL query
material are redacted; result images are downloaded because Perfect Corp signed URLs expire (~2
hours). The committed full Perfect Corp lifecycle belongs to the lost-shade baseline only. Candidate
artifacts are inventoried honestly under [`proofs/offline/`](proofs/offline/) with listing ids,
task/poll metadata, output hashes/bytes, estimates, coverage, and explicit `null` fields for the
source-image/request/lifecycle evidence that was not retained.

## Business wedge, without invented validation

LastTube's plausible post-prototype loop is opt-in availability monitoring for an
**evidence-complete exact variant**, followed by an observed-offer handoff. A disclosed affiliate
relationship could monetize that handoff, but neither demand, conversion, willingness to pay,
alert delivery, nor affiliate enrollment is claimed or implemented here. Incomplete evidence never
unlocks the offer/action branch.

## Honesty notes

- Shopping listings are **observed evidence with timestamps**, not stock guarantees; the copy says so wherever they appear.
- Candidate images below **10% usable saturated foreground coverage are rejected**. Passing estimates can still be skewed by packaging.
- Every shortlisted candidate ends in a visible `system excluded`, `human rejected`, or `human
  accepted` state; unresolved rows block the outcome.
- The exact listing title and observed offer URL are preserved. If the receipt does not name a
  shade/variant, the UI says `exact shade / variant: not present`, returns no actionable lead, and
  never presents a Buy action.
- `present`, `absent`, and `unknown` are separate evidence states. Marketing prose is not silently
  promoted into a structured shade or variant.
- Complete fields in unit tests are labeled **synthetic policy fixtures**. They prove only that the
  gate can open when a server-validated manifest and every required field are present; they are not
  evidence of a real actionable product lead.
- A successful image-bearing Perfect Corp render of the remembered shade is mandatory. Baseline failure blocks candidate decisions and outcomes.
- Perfect Corp provides a consistent same-face view for explicit accept/reject/preference choices. It does not validate finish, undertone, formulation, availability, or fit for a person.
- ΔE explains approximate image-derived colors; it cannot accept, reject, prefer, or restore a human-rejected candidate.
- The preserved 40-result variant audit found exact-looking titles, but no stored image bytes for an
  offline coverage/hash check. No new VTO calls were warranted; see
  [`docs/variant-evidence-audit.md`](docs/variant-evidence-audit.md).
- Preset "lost shade" hexes are labeled as approximations from published swatches.

The latest command-level evidence is tracked in [`docs/verification-receipt.md`](docs/verification-receipt.md).

## Privacy

No real person's selfie is used anywhere in this repository or demo. The demo face is Perfect Corp's own published API sample image, and the consent policy for future selfie upload is stated in the product.

## Screenshots

| Act 1 — the loss | Act 2 — the hunt |
| --- | --- |
| ![Act 1](docs/screenshots/act1-the-loss.png) | ![Act 2](docs/screenshots/act2-the-hunt.png) |
