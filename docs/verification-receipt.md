# Verification receipt — alternate official model proof

Date: 2026-09-03 EDT

Base commit: `c678561`

Scope: Packet 14, a bounded provider-freshness and alternate-model proof. The deterministic judged
hero, human decisions, and evidence-derived **NO ACTIONABLE LEAD YET** outcome are unchanged.

Demo-director follow-up: the model card now says **Preview shades on a demo model**; the built
Safe-demo rehearsal passed with no external calls. `.playwright-mcp/` is ignored before recording,
and the repository-local `submission/` snapshot is removed from Git tracking while remaining on disk
and byte-identical to the sibling submission package.

## What changed and what it proves

- `npm run proof:serpapi -- --receipt-only` made one fresh Google Shopping call for
  `mauve rose matte lipstick`. It returned 40 live normalized candidates and wrote sanitized
  September 3 receipts without replacing the September 1 deterministic fixture.
- A second portrait published in Perfect Corp's own API playground was retained at
  `proofs/perfectcorp/2026-09-03-alternate-model-source.png`. It is disclosed fixture media, not a
  LastTube user's selfie.
- The alternate-model proof retains two new successful Makeup VTO lifecycles: a Backtalk-family
  baseline (`#A96A73`) and one ABH candidate-effect comparison (`#bb727a`). Each completed after four
  bounded polls. Sanitized create/poll responses, source hash/bytes, output-download lineage,
  downloaded output hash/bytes, and the credit delta are committed.
- Perfect Corp served the first signed output with `application/octet-stream`. The existing output
  gate rejected it before saving the signed URL or bytes. The bounded repair accepts the provider's
  generic binary type only when the response remains within the size cap and Sharp successfully
  decodes the exact bytes as an image; invalid generic bytes still fail closed.
- The first rejected download consumed one unit. The retry retained two successful outputs and spent
  two more units. Packet total: three Perfect Corp units, from 1,344 to 1,341.
- The alternate-model evidence is a separate robustness proof. It does not replace or retroactively
  upgrade the judged candidate fixtures, fetch merchant media, validate variant/shade/finish, or
  unlock an offer.
- The proof panel now exposes both the fresh SerpApi receipt and `BASELINE + SECOND-MODEL CHECK` while
  continuing to label the three judged candidate outputs as task/poll metadata only.

## Commands and results

All commands ran from the repository root.

| Command | Result |
|---|---|
| `npm run proof:serpapi -- --receipt-only` | exit 0; 1 live call; 40 candidates; deterministic fixture unchanged |
| first `npm run proof:alternate-model` | exit 1 after 1 successful provider task; generic response media type rejected before persistence; 1 unit spent |
| `npm run typecheck && npx vitest run tests/runtimeEvidence.test.ts && npm run lint -- --quiet` | exit 0 after the bounded decoder-backed repair; 8 focused tests passed |
| retry `npm run proof:alternate-model` | exit 0; baseline + candidate succeeded in 4 polls each; 2 retained outputs; 2 units spent |
| `npx vitest run tests/alternateModelProof.test.ts tests/runtimeEvidence.test.ts` | exit 0; 10/10 focused tests passed |
| `npm run verify` | exit 0; typecheck, lint, 11 test files / 63 tests, 43-module production build, secret scan |
| `npm run capture:demo` | exit 0 twice; built artifact; baseline required; all 3 candidates resolved; preference overrides CIE76; incomplete evidence blocks action; 3+ fixture badges; zero provider/non-local image requests; zero browser errors |
| `diff -qr submission ../submission/lasttube` | exit 0; byte-identical packages |
| `git diff --check` | clean |

The two final captures were byte-identical:

| Artifact | SHA-256 |
|---|---|
| `judge-demo-opening.png` | `7e3b70ae3c7038f9750cdf41e22f5faac34bd7d71112e9b208b91bae23a0f490` |
| `judge-demo-verdict.png` | `357b45b84da6b2eae4283f61f74175a6b2fd82494a56f0b3d0ae16b523c276c9` |
| `judge-demo-mobile-verdict.png` | `18357a958c8a78c5f6ce7c520d9ca8661a6526ab4b8894cbd8cf808334f5ee19` |
| `judge-devpost-thumbnail.png` | `ae5ff3f5e8dd4b43cbe40e262062549dd8184dff7c632d323a2d4a6bdb6d83d7` |
| `judge-devpost-hunt.png` | `b37850be3ee9920a0a0eeb27ff7281c95e35adfd90ae459f4486b1db43564792` |
| `judge-devpost-verdict.png` | `0b9d1a8a7638235f5915e4a7ca0619393ed5c75d531849c651504ba3d1889bde` |

## Direct inspection

- Alternate source: 1080×1427 neutral-front portrait, visibly different from the judged fixture.
- Alternate baseline render: successful mauve-rose lip application; source face and framing retained.
- Alternate candidate render: visibly lighter/pinker than the baseline; source face and framing match.
- Built desktop artifact: 1500×1000 verdict keeps the three-row disposition ledger, stopped outcome,
  fresh SerpApi/second-model proof copy, and metadata-only judged-candidate boundary in one frame.
- Built mobile artifact: 350×1172 verdict remains readable with no horizontal overflow.
- Opening artifact: 1440×900 product-first layout remains clean, visibly arms Safe demo, and the
  friendlier demo-model heading fits without collision.

## Provider, privacy, and action boundaries

- Provider cost: 1 SerpApi event/free-plan search, 3 Perfect Corp event units, $0 paid.
- No credential value, raw signed URL, signed query, or raw provider receipt is committed or printed.
- No real selfie, operator media, new merchant product image, public deployment, push, publication,
  upload, Devpost edit/submission, outreach, or final track selection occurred.
- The current preferred fixture listing still lacks trusted structured exact variant, exact shade,
  finish, and source-image evidence. The product correctly remains **NO ACTIONABLE LEAD YET** with no
  purchase CTA.
- Public deployment, repository visibility, video recording/upload, logged-out judge verification,
  Devpost entry, and final sponsor-track selection remain operator-owned gates.
