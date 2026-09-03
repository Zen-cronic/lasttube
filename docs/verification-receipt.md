# Verification receipt — decision-bearing comparison repair

Date: 2026-09-03 EDT

Base commit: `57bfb20`

Scope: the hostile-generalist repair commit containing this receipt; resolve it with
`git log -1 --oneline`.

## What changed and what it proves

- A successful image-bearing Perfect Corp render of the remembered shade is now a hard baseline.
  Candidate work may complete concurrently, but baseline failure keeps decision controls and every
  outcome locked.
- The generic open-every-swatch confirmation is gone. Each usable candidate requires an explicit
  human `Accept visual fit` or `Reject` decision, and preference is a separate choice among accepted
  candidates.
- CIE76 is context only. The deterministic path rejects ABH even though it has the lower ΔE, then
  accepts and prefers NYX. The resulting card names the human preference, proving the metric did not
  choose or restore a rejected candidate.
- Neither preserved candidate title identifies an exact shade/variant. The product therefore says
  **No actionable lead yet**, blocks purchase language, and offers a refined-search handoff without
  automatically calling SerpApi.
- `docs/variant-evidence-audit.md` reviews all 40 preserved SerpApi titles. Exact-looking titles exist,
  but none has stored image bytes for a truthful offline hash/coverage check. No new VTO lifecycle was
  warranted or created.
- The 10% coverage floor remains explicitly labeled a conservative heuristic rather than scientific
  validation.

## Commands and results

Run from the repository root with no new provider calls:

| Command | Result |
|---|---|
| `npm run verify` | exit 0: TypeScript, ESLint, 6 Vitest files / 38 tests, Vite production build, secret scan |
| `npm run build` | exit 0: 42 modules; `dist/index.html` 1.06 kB, CSS 15.91 kB, JS 222.19 kB |
| `npm run capture:demo` | exit 0 twice: successful baseline required; 2 explicit decisions; human preference overrides CIE76; no actionable lead without exact variant; 3+ fixture badges; zero live-provider requests; zero non-local image requests; zero browser errors |
| controlled baseline-failure path inside `capture:demo` | injected failed fixture baseline; zero decision-panel and zero outcome-card elements; pass |
| `git diff --check` | exit 0 |

The two consecutive final captures produced identical SHA-256 values:

| Artifact | SHA-256 |
|---|---|
| `judge-demo-opening.png` | `0a323ebf0110671504075e222f817df15682b57cc5181cfb6d092dc81f4a3fda` |
| `judge-demo-verdict.png` | `780666494643c2c0e49aa05bbc51e0a5ec4b55075b9359c36b9c0e262ab52e91` |
| `judge-demo-mobile-verdict.png` | `522daa8c597a5a7d41317bed8b1ee573caf6a2ab36a4e2f44b124cefaa7ceef0` |
| `judge-devpost-thumbnail.png` | `3f33411c5732a61c191154b3415a2570433573e8dab9c7eea14a6bad210bb102` |
| `judge-devpost-hunt.png` | `bfe1061d71b792ad2557e6d5f8655e8451cfe0ba2280e44de3d2a3acfc875a80` |
| `judge-devpost-verdict.png` | `ce7916a1d3eda6796d58d7745571207f7280cbcfa456a9a3e31c3f8b05045b51` |

## Visual inspection

- `judge-demo-opening.png` at 1440×900: product appears at frame one; safe-demo banner and both
  configured-provider badges are visible; the porcelain/wine layout has no collision or crop.
- `judge-devpost-hunt.png` at 1500×1000: `Observed listing candidates`, `SERPAPI: FIXTURE`, local
  `REC` thumbnails, merchant, price, source, and timestamp are readable without third-party images.
- `judge-devpost-verdict.png` at 1500×1000: the remembered baseline and preferred candidate render,
  both `VTO: FIXTURE` badges, rejected ABH, accepted/preferred NYX, `NO ACTIONABLE LEAD YET`, verbatim
  preferred listing, offer, coverage, `CIE76 CONTEXT ONLY`, and preserved live receipts share one
  frame.
- `judge-demo-mobile-verdict.png` at 350×933: the complete stopped-outcome card, evidence strip, and
  refined-search button wrap without horizontal overflow.

## Provenance, cost, and remaining human gates

- Fixture inputs are sanitized recordings made on 2026-09-01 and stay visibly labeled. The live
  SerpApi and Perfect Corp receipts predate this repair.
- Repair verification made **zero** SerpApi calls, **zero** Perfect Corp calls, spent **zero**
  credits, and cost **$0**.
- No candidate-specific input image/hash or new VTO lifecycle is claimed because no exact-variant
  candidate cleared the offline evidence gate.
- This receipt does not prove a public deployment or video. Public repository visibility, public
  deployment, final 2:24 recording, YouTube upload, logged-out verification, and Devpost submission
  remain operator-owned human gates.
