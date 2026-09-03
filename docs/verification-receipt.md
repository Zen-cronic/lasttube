# Verification receipt — evidence-backed shade review

Date: 2026-09-03 EDT

Base commit: `f904e04`

Scope: the judge-panel repair commit containing this receipt; resolve it with `git log -1 --oneline`.

## What changed and what it proves

- Merchant-image shade estimation now has one shared, fail-closed minimum: at least **10% of sampled
  pixels must survive the background, near-black, and low-saturation filters**. Missing, invalid, or
  lower coverage produces an error rather than a color estimate or ranking candidate.
- The 10% value is a conservative product heuristic chosen to reject the preserved 2.5%-coverage
  packaging-heavy fixture. It is not a scientifically validated quality score. Passing coverage can
  still be skewed by packaging, which is disclosed in the UI and submission copy.
- The fixture retains all three recorded estimates for audit, but only the 39.7% and 35.2% candidates
  can enter its final comparison. The 2.5% candidate is visibly rejected if selected.
- A completed Perfect Corp same-face render is required for ranking. The human must open every
  usable render and confirm the checkpoint before the lead appears; a failed/unavailable VTO result
  cannot win on color math alone.
- The final card preserves the exact observed listing text and observed-offer URL. Because the
  preserved hero listing does not name a shade or variant, it says **closest visual lead — exact
  shade unverified**, makes no formulation claim, and exposes no Buy action.

## Commands and results

Run from the repository root with no new provider calls:

| Command | Result |
|---|---|
| `npm run verify` | exit 0: TypeScript, ESLint, 5 Vitest files / 33 tests, Vite production build, secret scan |
| `npm run build` | exit 0: 41 modules; `dist/index.html` 1.03 kB, CSS 14.29 kB, JS 218.14 kB |
| `npm run capture:demo` | exit 0 twice: 2 usable fixture candidates; human-review gate; exact-listing caveat; 3+ fixture badges; zero live provider requests; zero non-local image requests; zero browser errors |
| `git diff --check` | exit 0 |

The two consecutive final captures produced identical SHA-256 values:

| Artifact | SHA-256 |
|---|---|
| `judge-demo-opening.png` | `2b1088951381580a49245208f21a01c2644a46c30d6634e4d532587ed83064b1` |
| `judge-demo-verdict.png` | `a0f2c43e232f3607c84067e7d70c4d7594ea6192b240810e2b0711a38476dcfc` |
| `judge-demo-mobile-verdict.png` | `e41a26c55f946be00a91164379bc68497cbded201d156158b93bd22c738269ee` |
| `judge-devpost-thumbnail.png` | `46da5d9ba852c7423c0a92fa4fa87f621795ebfcd83eb4157e4d684f6b6a2850` |
| `judge-devpost-hunt.png` | `5657a1086cfb0816b26f73704685b904da9886487625d6e91da566346e7a3311` |
| `judge-devpost-verdict.png` | `6057368ddbc824aaff6d10e2c1c19926b50f698adb2f8cb085f67a6863791529` |

## Visual inspection

- `judge-demo-opening.png` at 1440×900: product appears at frame one; the safe-demo banner and both
  configured-provider badges are visible; the porcelain/wine layout has no collision or crop.
- `judge-devpost-hunt.png` at 1500×1000: the heading says **Observed listing candidates**; SerpApi is
  visibly `FIXTURE`; deterministic `REC` thumbnails, merchant, price, source, and timestamp remain
  legible without any third-party image request.
- `judge-devpost-verdict.png` at 1500×1000: both Perfect Corp renders and `VTO: FIXTURE` badges, the
  `2 OF 2` confirmed human checkpoint, exact-shade-unverified lead, verbatim listing text, observed
  offer, coverage, ΔE, and preserved live receipt cards share one frame. Text is compact but legible.
- `judge-demo-mobile-verdict.png` at 350×532: the exact-listing card and receipt strip wrap without
  horizontal overflow.

## Provenance, cost, and remaining human gates

- Fixture inputs are sanitized recordings made on 2026-09-01 and remain visibly labeled. The live
  SerpApi and Perfect Corp receipt files were preserved before this repair.
- Repair verification made **zero** provider calls and cost **$0**.
- This receipt does not prove a public deployment or video. Public repository visibility, public
  deployment, final 2:24 recording, YouTube upload, logged-out link verification, and Devpost
  submission remain operator-owned human gates.
