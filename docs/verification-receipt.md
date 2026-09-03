# Verification receipt — exportable runtime-proof repair

Date: 2026-09-03 EDT

Base commit: `5c01771`

Scope: the runtime-proof repair commit containing this receipt; resolve it with
`git log -1 --oneline`.

## What changed and what it proves

- A successful live SerpApi search now opens an evidence run bound to the SHA-256 and byte count of
  the exact response-body bytes. The normalized listing must match that same run.
- Live shade estimation retains the exact fetched merchant-image bytes used by Sharp, plus URL,
  SHA-256, byte count, method, and coverage. The candidate id and URL must match the bound search.
- Before a candidate Perfect call, the server requires that retained shade input and checks the
  requested palette contains its estimated color. After a successful task/poll lifecycle, the
  server downloads the signed output, discards the signed URL, retains and re-hashes the output
  bytes, and binds request inputs plus task/poll/timestamps to the candidate manifest.
- The browser receives a local output URL and candidate evidence only after the server validates the
  manifest. Any missing binding, download, digest, or validation error fails closed and system-excludes
  the candidate. Validated live candidates expose the JSON manifest for download; both bound images
  have download routes.
- The Render Blueprint provisions no persistent disk. Every runtime artifact therefore says
  `exportable_per_run` and `persistence: ephemeral`, with instructions to download before restart or
  redeploy. This repair does not claim durable storage.
- Exact variant, shade, and finish remain `unknown` on the new live path because SerpApi supplies no
  trusted structured fields for them; title prose is not promoted. A validated runtime manifest is
  necessary but insufficient for action.
- The all-fields-present test is now explicitly a **synthetic policy fixture**, using `.invalid`
  URLs. It proves gate behavior only and is not called genuine action evidence.
- The current hero stays honest. NYX is accepted/preferred as a visual direction, but exact variant
  and shade are absent, source-image bytes/hash are unknown, and its candidate render has metadata
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
| `npm run verify` | exit 0: TypeScript, ESLint, 9 Vitest files / 51 offline tests, Vite production build, and secret scan of the exact 82-file staged tree; zero provider calls |
| production build inside `npm run verify` | exit 0: 43 modules; `dist/index.html` 1.03 kB, CSS 17.18 kB, JS 230.27 kB |
| `npm run capture:demo` | exit 0 twice: successful baseline required; all 3 candidates resolved as 1 system exclusion + 2 human decisions; preference overrides CIE76; incomplete provenance blocks action; 3+ fixture badges; zero live-provider requests; zero non-local image requests; zero browser errors |
| controlled baseline-failure path inside `capture:demo` | injected failed fixture baseline; zero decision-panel and zero outcome-card elements; pass |
| runtime-evidence tests | pass: response digest, listing, fetched bytes, request palette, task/polls, output bytes, manifest and artifact download routes, pre-provider rejection, and signed-URL omission |
| action-policy tests | pass: validated synthetic all-fields-present fixture opens; the same fields without manifest validation stop; current fixture and unknown-field branch stop |
| first capture attempt | assertion expected the previous missing-fields order; product correctly added the manifest gate. One bounded harness repair updated the assertion; both final runs passed |

The two consecutive final captures produced identical SHA-256 values:

| Artifact | SHA-256 |
|---|---|
| `judge-demo-opening.png` | `e4900b2f99cff73e480034fcc27936bdfe8bd14c08e913fab8caa94dcfc79630` |
| `judge-demo-verdict.png` | `371e729901bdc25ee5d63242246c1847e684e6baa1e216f418f0298fbb66b150` |
| `judge-demo-mobile-verdict.png` | `fa736719958239380e1806439e763cbff23382c805278adb5d300a94dfce1f1b` |
| `judge-devpost-thumbnail.png` | `e2db1a14aa1b98bf6321885d8136f4aac2786281dbd506c13f66888d5c03bbe9` |
| `judge-devpost-hunt.png` | `b37850be3ee9920a0a0eeb27ff7281c95e35adfd90ae459f4486b1db43564792` |
| `judge-devpost-verdict.png` | `eb6ead48d8159d4028fae46b8b45720297ef92d7031d583c17c4a51f79f6fe03` |

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
- The new runtime path was proven entirely with synthetic in-memory provider/image bytes and local
  temporary files. No manifest from a genuine new candidate is claimed, and the committed fixture
  artifacts remain at their prior proof levels.
- The optional business wedge is an opt-in availability alert and disclosed affiliate handoff only
  after an evidence-complete exact variant. Neither implementation nor customer demand, conversion,
  willingness to pay, alert delivery, or affiliate enrollment is claimed.
- This receipt does not prove a public deployment or video. Public repository visibility, public
  deployment, final 2:24 recording, YouTube upload, logged-out verification, and Devpost submission
  remain operator-owned human gates.
