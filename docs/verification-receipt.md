# Verification receipt — evidence-derived action repair

Date: 2026-09-03 EDT

Base commit: `a43ca81`

Scope: the hostile-generalist repair commit containing this receipt; resolve it with
`git log -1 --oneline`.

## What changed and what it proves

- Candidate truth is now a structured contract. Listing identity, exact variant, exact shade,
  finish, source-image provenance, and same-face render provenance each retain a separate
  `present | absent | unknown` state.
- The commercial outcome is derived from that contract. An observed offer or opt-in alert can
  appear only after a successful baseline, accepted/preferred human decision, source-backed listing
  identity, exact variant/shade/finish, hashed source image above the 10% heuristic floor, and a
  verified candidate VTO request/lifecycle/output. A unit test exercises this genuinely actionable
  all-fields-present branch; incomplete and unknown fields fail closed.
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
- Current live image estimation now returns the SHA-256 and byte count of the exact fetched source
  bytes. No historical hash is reconstructed where those bytes were not retained.
- `docs/variant-evidence-audit.md` still finds no preserved exact-variant listing with stored image
  bytes sufficient for offline qualification. No new SerpApi or Perfect Corp work was warranted.

## Commands and results

Run from the repository root with no new provider calls:

| Command | Result |
|---|---|
| `npm run verify` | exit 0: TypeScript, ESLint, 8 Vitest files / 44 tests and Vite production build; the exact staged tree subsequently passed a secret scan over 80 files |
| production build inside `npm run verify` | exit 0: 43 modules; `dist/index.html` 1.03 kB, CSS 17.06 kB, JS 229.50 kB |
| `npm run capture:demo` | exit 0 twice: successful baseline required; all 3 candidates resolved as 1 system exclusion + 2 human decisions; preference overrides CIE76; incomplete provenance blocks action; 3+ fixture badges; zero live-provider requests; zero non-local image requests; zero browser errors |
| controlled baseline-failure path inside `capture:demo` | injected failed fixture baseline; zero decision-panel and zero outcome-card elements; pass |
| provenance tests | pass: all 3 candidate listing/output bindings re-hash; missing request/lifecycle fields remain null; the baseline receipt/output re-hash independently |
| action-policy tests | pass: one complete positive branch; current fixture and an unknown-field branch both stop |

The two consecutive final captures produced identical SHA-256 values:

| Artifact | SHA-256 |
|---|---|
| `judge-demo-opening.png` | `e4900b2f99cff73e480034fcc27936bdfe8bd14c08e913fab8caa94dcfc79630` |
| `judge-demo-verdict.png` | `6bc714e87eecdeb5f6e307e189f8dfe5807ab19685ce9fe7b873772e5dc2443e` |
| `judge-demo-mobile-verdict.png` | `bf4f415136c8f3d98271713cc30e08d9bf45e9e53aaef31d60f03cb9fd2fbbd5` |
| `judge-devpost-thumbnail.png` | `e2db1a14aa1b98bf6321885d8136f4aac2786281dbd506c13f66888d5c03bbe9` |
| `judge-devpost-hunt.png` | `b37850be3ee9920a0a0eeb27ff7281c95e35adfd90ae459f4486b1db43564792` |
| `judge-devpost-verdict.png` | `9cbccf80cf9f6fcac1f1ed0ea17384553bab6722f957f65da2fa501ed0bc7a59` |

## Visual inspection

- `judge-demo-opening.png` at 1440×900: product appears at frame one; safe-demo banner and both
  configured-provider badges are visible; the porcelain/wine layout has no collision or crop.
- `judge-devpost-hunt.png` at 1500×1000: `Observed listing candidates`, `SERPAPI: FIXTURE`, local
  `REC` thumbnails, merchant, price, source, and timestamp are readable without third-party images.
- `judge-devpost-verdict.png` at 1500×1000: the complete three-row disposition ledger, system
  exclusion, human rejection/preference, structured action gate, stopped outcome, and three-level
  proof inventory remain legible in one frame. Candidate cards say metadata-only; the lost-shade
  baseline alone says live receipt.
- `judge-demo-mobile-verdict.png` at 350×1122: the stopped outcome, verbatim listing, missing-evidence
  ledger, observed offer evidence link, heuristic caveat, and refined-search button wrap without
  horizontal overflow.

## Provenance, cost, and remaining human gates

- Fixture inputs are sanitized recordings made on 2026-09-01 and stay visibly labeled. The live
  SerpApi and Perfect Corp receipts predate this repair.
- Repair verification made **zero** SerpApi calls, **zero** Perfect Corp calls, spent **zero**
  credits, and cost **$0**.
- Candidate output hashes and task/poll metadata are claimed exactly as retained. Candidate-specific
  source-image bytes/hashes and Perfect request/lifecycle receipts are explicitly **not** claimed.
- The optional business wedge is an opt-in availability alert and disclosed affiliate handoff only
  after an evidence-complete exact variant. Neither implementation nor customer demand, conversion,
  willingness to pay, alert delivery, or affiliate enrollment is claimed.
- This receipt does not prove a public deployment or video. Public repository visibility, public
  deployment, final 2:24 recording, YouTube upload, logged-out verification, and Devpost submission
  remain operator-owned human gates.
