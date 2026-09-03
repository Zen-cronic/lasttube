# Verification receipt — mobile-first product demo

Date: 2026-09-03 EDT

Accepted base: rewritten local `main` after the operator-requested purge of
`docs/design-brief.md`. Earlier packet content remains, but its pre-rewrite commit ids are historical
identifiers. The deterministic judged model, human decisions, and evidence-derived **NO ACTIONABLE
LEAD YET** outcome are unchanged.

## What changed

- LastTube is now an installable, portrait-first PWA with a standalone manifest, local app icons,
  and a static-only service worker. `/api/*` is always network-only.
- The 350–430px experience is primary; the responsive desktop site is the companion artifact. This
  Linux host has Java and `adb`, but no Android SDK/Gradle toolchain. No native Android or iOS binary
  is claimed.
- Product copy is shorter and task-led. Audit detail remains available behind disclosure controls,
  while fixture status, provider boundaries, human decisions, and missing action evidence remain
  visible.
- The single signature motion element is the **Shade Signal** progress rail. It has a reduced-motion
  fallback and does not copy third-party assets or trade dress.
- The public README no longer contains the operator-identified Reddit URL.
- The repository-local `submission/` directory remains ignored/untracked and byte-identical to the
  sibling submission package.

## Commands and results

All commands ran from the repository root.

| Command | Result |
|---|---|
| `npm run verify` | exit 0; typecheck, lint, 11 test files / 63 tests, 44-module production build, secret scan over 101 files / 3 configured values |
| `npm run capture:demo` | exit 0; production artifact; required baseline; all 3 candidates resolved; human preference overrides CIE76; incomplete provenance blocks action; 3+ fixture badges; zero provider/non-local image requests; zero browser errors |
| `diff -rq submission ../submission/lasttube` | exit 0; byte-identical packages |
| `git rev-list main -- docs/design-brief.md` | no output; purged from local `main` history |
| exact Reddit-URL scan across tracked/public submission artifacts | no matches |
| `git diff --check` | clean |

## Captured artifacts

| Artifact | Dimensions | SHA-256 |
|---|---:|---|
| `judge-demo-mobile-opening.png` | 350×800 | `902929c5ed6c324f3c52ccc083c321e2c38781925e39d63ebd20ef22ec2a2d74` |
| `judge-demo-mobile-verdict.png` | 322×719 | `aafd4335aaec79365019f0d1745eba03f278c4985e60798452ab8833383df4c5` |
| `judge-demo-opening.png` | 1440×900 | `f8e8db5b96693567b3cd6e9a923bb07656635c9570c4b76cdd40e89f77148615` |
| `judge-demo-verdict.png` | 1440×900 | `ad24f8973e0d77a5f57a0da2e3b0b404c93c8100487dc6a5b36ebb4f8cb60520` |
| `judge-devpost-thumbnail.png` | 1500×1000 | `e4e806cedddbe044d8a6d81604af276026a26dca25915772cfcf8a0580a6d23b` |
| `judge-devpost-hunt.png` | 1500×1000 | `b2186982df1f9b0755319f0ff18ef957a1761fcbc03d84cc74e16a1e95e7f7ef` |
| `judge-devpost-verdict.png` | 1500×1000 | `9eec0f14cde3c3bac88fb987b713e182729caa9ac0c1a6cfabe588a1c50cba11` |

## Direct inspection

- Desktop opening: the lost-shade problem, three proof promises, Shade Signal, and first action are
  legible in one 1440×900 frame.
- Mobile opening: 350px width has no horizontal overflow; proof pills wrap and the progress rail
  remains readable.
- Desktop verdict: complete three-row disposition, stopped result, and sponsor proof remain visible.
- Mobile verdict: the stopped result, preferred option, friendly missing-evidence chips, and refined
  search action are readable without overflow. Technical receipts are available on demand.

## Provider, privacy, and action boundaries

- Accepted implementation and capture made zero SerpApi calls and zero Perfect Corp calls.
- A discarded `general_03` model experiment used four Perfect Corp event/free-credit units (balance
  1,341 → 1,337), $0 paid. The operator then requested the previous model; all experiment assets and
  code were removed. Original model hashes remain
  `509c2309537929e878ba14206e31ace165464d784427d73af7a39002d10b9123` (source) and
  `7f133482331ada20ee89aafe5e208ed6f8858422c6efca20e84197cc7f6b67ea` (baseline render).
- No credential value, raw signed URL, raw provider receipt, real selfie, or new merchant image is
  exposed.
- The preferred fixture listing still lacks structured exact variant, exact shade, finish,
  source-image, and candidate-lifecycle evidence. The app correctly remains **NO ACTIONABLE LEAD
  YET** with no purchase CTA.
- Public deployment, remote history replacement, repository publication, video upload, Devpost
  editing/submission, and final track selection remain operator-owned gates.
