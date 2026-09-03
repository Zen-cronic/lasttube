# Verification receipt — versioned, tamper-evident runtime bundle

Date: 2026-09-03 EDT

Base commit: `1c5c7dc`

Scope: the runtime-proof repair commit containing this receipt; resolve it with
`git log -1 --oneline`.

## What changed and what it proves

- A successful live SerpApi search opens an evidence run bound to the original wire-body digest and
  byte count. Before domain normalization, the complete JSON object is recursively stripped of
  secret-shaped fields and URL query tokens; those exact retained bytes receive a separate digest,
  file, and download route. Validation re-normalizes the candidate from that retained artifact.
- Live shade estimation retains the exact fetched merchant-image bytes used by Sharp, plus URL,
  SHA-256, byte count, method, and coverage. The candidate id and URL must match the bound search.
- Before a candidate Perfect call, the server requires that retained shade input and checks the
  requested palette contains its estimated color. Every create/poll response is retained after
  recursive redaction with its own digest, request/receive timestamps, HTTP status, and safe
  request/final-response URL lineage. The result URL's full value is represented only by SHA-256;
  query material is not retained. Download bytes and redirects are bound back to that lineage.
- The browser receives a local output URL and candidate evidence only after the server validates the
  `lasttube-candidate-evidence/2.0.0` bundle. Any missing binding, download, digest, cross-field check,
  or later file tamper fails closed. Validated candidates expose an index plus four bound artifact
  routes: sanitized Serp response, source image, sanitized Perfect lifecycle, and output image.
- The Render Blueprint provisions no persistent disk. Every runtime artifact therefore says
  `exportable_per_run` and `persistence: ephemeral`, with instructions to download before restart or
  redeploy. This repair does not claim durable storage.
- Exact variant, shade, and finish remain `unknown` on the new live path because no trusted structured
  source is configured. A typed enrichment interface defaults to no source, has no title parser, and
  requires retained JSON receipt bytes whose digest, candidate, record, source, and field values all
  cross-match before any structured field can become present.
  Its positive contract test is synthetic policy-fixture proof, not genuine product evidence.
- Credential-like response fields including page tokens, signatures, policy/session values, and URL
  fragments are removed or redacted recursively. Adversarial fixtures prove those values do not survive.
- Pre-VTO validation re-reads the persisted manifest, sanitized search artifact, structured receipt,
  re-derived listing, and source image before provider execution. Final validation enforces task id,
  endpoint lineage, response order, lifecycle chronology, and output-download lineage.
- The all-fields-present test is now explicitly a **synthetic policy fixture**, using `.invalid`
  URLs. It proves gate behavior only and is not called genuine action evidence.
- The current hero stays honest. NYX is accepted/preferred as a visual direction, but exact variant
  and shade are unknown, source-image bytes/hash are unknown, and its candidate render has metadata
  only. The UI therefore says **No actionable lead yet**, preserves the observed listing/offer as
  evidence, blocks purchase language, and offers a refined-search handoff without a provider call.
- Every shortlisted candidate is accounted for: Ngozi is system-excluded at 2.5% coverage, ABH is
  human-rejected, and NYX is human-accepted/preferred. Any unresolved row blocks the outcome.
- Three candidate manifests bind listing ids, titles, receipt hash, task/poll metadata, retained
  output hashes/bytes, estimates, and coverage. Their missing source request and Perfect lifecycle
  fields are explicit `null`s. A separate baseline manifest is the only candidate-stage artifact
  with a genuine 19-poll Perfect Corp lifecycle receipt.
- The existing fixture hero is unchanged in provenance: its three candidate outputs predate the
  live-run exporter and remain metadata-only. It still resolves every row and stops on NYX; nothing
  is retroactively upgraded.

## Commands and results

Run from the repository root with no new provider calls:

| Command | Result |
|---|---|
| `npm run verify` | exit 0: TypeScript, ESLint, 10 Vitest files / 60 offline tests, Vite production build, and secret scan; zero provider calls |
| production build inside `npm run verify` | exit 0: 43 modules; `dist/index.html` 1.03 kB, CSS 17.18 kB, JS 230.26 kB |
| `npm run capture:demo` | exit 0 twice: successful baseline required; all 3 candidates resolved as 1 system exclusion + 2 human decisions; preference overrides CIE76; incomplete provenance blocks action; 3+ fixture badges; zero live-provider requests; zero non-local image requests; zero browser errors |
| controlled baseline-failure path inside `capture:demo` | injected failed fixture baseline; zero decision-panel and zero outcome-card elements; pass |
| runtime-evidence tests | pass: versioned bundle; retained/redacted Serp and every Perfect response; listing re-derivation; fetched/output bytes; four artifact routes; pre-provider persisted-manifest/search checks; task/chronology/endpoint lineage; tamper rejection |
| action-policy tests | pass: validated synthetic all-fields-present fixture opens; the same fields without manifest validation stop; current fixture and unknown-field branch stop |
| structured-enrichment tests | pass: title prose stays unknown; retained receipt bytes/digest/fields must cross-match; missing trust metadata, candidate mismatch, and receipt tampering fail closed |
| first staged secret scan | correctly rejected a literal synthetic signed-URL parameter in two tests; one bounded fixture repair constructs that parameter from safe fragments; final exact 93-file scan passed |

The two consecutive final captures produced identical SHA-256 values:

| Artifact | SHA-256 |
|---|---|
| `judge-demo-opening.png` | `e4900b2f99cff73e480034fcc27936bdfe8bd14c08e913fab8caa94dcfc79630` |
| `judge-demo-verdict.png` | `8bf89b1bc1532993add85da4f5fafd732b2b2ea7bee7a7d795a92080009013d1` |
| `judge-demo-mobile-verdict.png` | `18357a958c8a78c5f6ce7c520d9ca8661a6526ab4b8894cbd8cf808334f5ee19` |
| `judge-devpost-thumbnail.png` | `e2db1a14aa1b98bf6321885d8136f4aac2786281dbd506c13f66888d5c03bbe9` |
| `judge-devpost-hunt.png` | `b37850be3ee9920a0a0eeb27ff7281c95e35adfd90ae459f4486b1db43564792` |
| `judge-devpost-verdict.png` | `f599ac2202e4784d67875b0ad1a27cc5973bb9a83ee4a603cd62a3f179136336` |

## Visual inspection

- `judge-demo-opening.png` at 1440×900: product appears at frame one; safe-demo banner and both
  configured-provider badges are visible; the porcelain/wine layout has no collision or crop.
- `judge-devpost-hunt.png` at 1500×1000: `Observed listing candidates`, `SERPAPI: FIXTURE`, local
  `REC` thumbnails, merchant, price, source, and timestamp are readable without third-party images.
- `judge-devpost-verdict.png` at 1500×1000: the complete three-row disposition ledger, system
  exclusion, human rejection/preference, structured action gate, stopped outcome, and three-level
  proof inventory and exportable-live-run disclosure remain legible in one frame. Candidate cards
  say metadata-only; the lost-shade baseline alone says live receipt.
- `judge-demo-mobile-verdict.png` at 350×1137: the stopped outcome, verbatim listing, missing-evidence
  ledger, observed offer evidence link, heuristic caveat, and refined-search button wrap without
  horizontal overflow.

## Provenance, cost, and remaining human gates

- Fixture inputs are sanitized recordings made on 2026-09-01 and stay visibly labeled. The live
  SerpApi and Perfect Corp receipts predate this repair.
- Repair verification made **zero** SerpApi calls, **zero** Perfect Corp calls, spent **zero**
  credits, and cost **$0**.
- Candidate output hashes and task/poll metadata are claimed exactly as retained. Candidate-specific
  source-image bytes/hashes and Perfect request/lifecycle receipts are explicitly **not** claimed.
- The new runtime path and tamper behavior were proven entirely with synthetic in-memory provider/image
  bytes and local temporary files. No version-2 bundle from a genuine candidate is claimed, and the committed fixture
  artifacts remain at their prior proof levels.
- The optional business wedge is an opt-in availability alert and disclosed affiliate handoff only
  after an evidence-complete exact variant. Neither implementation nor customer demand, conversion,
  willingness to pay, alert delivery, or affiliate enrollment is claimed.
- This receipt does not prove a public deployment or video. Public repository visibility, public
  deployment, final 2:24 recording, YouTube upload, logged-out verification, and Devpost submission
  remain operator-owned human gates.
