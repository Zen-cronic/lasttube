# LastTube demo director runbook

Status: screenplay and deterministic rehearsal path are complete. Final recording, edit, operator
playback approval, public upload, and logged-out verification remain human gates.

## Format decision

- Official Perfect Corp requirement: **1–3 minute demo showing the experience end to end**.
- Target master: **2:24**, leaving 36 seconds under the cap and 84 seconds over the minimum.
- One threaded example only: Urban Decay Vice Lipstick — Backtalk → three observed listings → one
  recorded system exclusion + two human decisions → required Perfect Corp baseline → no actionable
  lead because structured variant/provenance evidence is incomplete.
- Screen recording target: about 120 seconds / 83% of runtime. Product pixels begin at 0:00.
- Capture the real built/deployed application. Use the deterministic recorded provider path for the
  main take and retain every visible `FIXTURE` label. A separate in-product beat shows the preserved
  sanitized LIVE receipt facts and explicitly says `not a new call`.
- No architecture tour. The 1–3 minute allowance belongs to consumer value and sponsor proof.

Official event source: [Devpost sponsor requirements](https://api-cloud-ai-hackathon-2026.devpost.com/).
Story/motion calibration: [Solis AI](https://www.solisai.video/)—a bold hook, a clean path, and
motion used to explain a transition. No Solis asset, trade dress, layout, or copy appears here.

## B-roll decision: no

Generated b-roll does not materially improve this film. Waterline needed brief synthetic aviation
context before its remote operational workflow became legible; LastTube's opening real-product
frame already communicates the loss, the comparison, the disclosed sample face, and the honest
decision stop. Under a 1–3 minute cap, a beauty macro would displace sponsor proof and introduce needless
risk of implying a user, product test, or provider output.

Begin on the completed real application at 0:00. Do not generate or insert a lipstick macro, user
reaction, retailer simulation, or any other illustrative footage. The earlier three-second b-roll
proposal is withdrawn and superseded by this product-first decision.

## Timed run-of-show and final voiceover

| Time | Picture / exact action | Voiceover | On-screen copy | Proof / criterion |
|---:|---|---|---|---|
| 0:00–0:09 | Open on the completed candidate ledger and stopped decision. Frame `3 OF 3 CANDIDATES RESOLVED`, the system exclusion, human states, and `NO ACTIONABLE LEAD YET`; `VTO: FIXTURE` remains visible. | “Backtalk disappeared. LastTube resolved every observed candidate, recorded my actual decision, and stopped before an unsupported offer.” | `THREE CANDIDATES → ZERO SILENT OMISSIONS` | Kill shot · Concept · Perfect Corp |
| 0:09–0:17 | Hard cut to the fresh deployed route `/?mode=demo`; hold the wordmark, `DEMO RECORDING ARMED`, and both configured-provider badges. | “Here is that decision from the beginning. The search and lost-shade baseline are receipted; candidate outputs declare their narrower metadata-only proof.” | `REAL APP · EXPLICIT PROOF LEVELS` | Honesty · Presentation |
| 0:17–0:31 | Select **Urban Decay Vice Lipstick — Backtalk**. Let its swatch tint the wordmark and headline. | “Start with the product someone already knows works: Urban Decay's retired Backtalk shade. The remembered hex is an approximation, stated up front—not hidden precision.” | `ACT 1 · THE LOSS` | Problem clarity · UI signature |
| 0:31–0:45 | Pan to the Perfect Corp sample face and privacy note, then return to **Find living replacements**. | “No real selfie is used here. This is Perfect Corp's published API sample face. A future upload remains consent-gated; the demo keeps that boundary closed.” | `SAMPLE FACE · NO REAL USER SELFIE` | Privacy · Feasibility |
| 0:45–1:02 | Click **Find living replacements**. Show loading briefly, then the SerpApi fixture badge, query, observation time, and first candidate rows. | “SerpApi turns one Google Shopping query into structured market evidence: candidate, merchant, price, listing text, source URL, and the moment it was observed.” | `SERPAPI · STRUCTURED MARKET EVIDENCE` | Load-bearing SerpApi integration |
| 1:02–1:18 | Hover or point to one source link, one price, the observation stamp, and the stock caveat. Do not open a third-party retailer. | “A listing is evidence that a product was reported—not a guarantee that it is in stock. LastTube preserves that uncertainty instead of upgrading it into a claim.” | `OBSERVED EVIDENCE ≠ STOCK GUARANTEE` | Technical honesty · Usability |
| 1:18–1:31 | Shortlist candidates 1, 2, and 3; click **Compare 3 on-face**. Hold the remembered Backtalk baseline and the `SYSTEM EXCLUDED` Ngozi row. | “The ten-percent floor is a heuristic. Ngozi's recorded two-point-five-percent coverage fails closed; the system writes that exclusion instead of dropping the row.” | `ONE SYSTEM EXCLUSION · RECORDED` | Reliability · Technical honesty |
| 1:31–1:43 | Hold the remembered baseline beside one candidate, both `VTO: FIXTURE`; point to baseline proof copy. | “Perfect Corp must first produce the remembered-shade baseline. If it fails, LastTube unlocks no candidate decision or outcome.” | `BASELINE REQUIRED` | Load-bearing Perfect Corp · Feasibility |
| 1:43–1:59 | View ABH and click **Reject**; view NYX, click **Accept visual fit**, then **Prefer**. Hold `3 OF 3 CANDIDATES RESOLVED`. | “I reject lower-distance ABH, accept NYX, and prefer it. Human judgment overrides CIE76, while every shortlisted candidate ends resolved.” | `SYSTEM EXCLUDED · REJECTED · PREFERRED` | Decision-bearing UX · Concept |
| 1:59–2:12 | Hold `NO ACTIONABLE LEAD YET`, the evidence-state ledger, exact listing text, observed-offer evidence link, and missing-fields line. | “This recording lacks validated per-run proof, exact variant, and shade. LastTube derives a stop—only complete evidence could unlock an offer or opt-in alert.” | `PRESENT · ABSENT · UNKNOWN · ACTION BLOCKED` | Concept honesty · Explainability |
| 2:12–2:20 | Scroll to **The proof boundary is explicit**. Keep all three proof cards and the runtime-proof note visible. | “These recordings retain metadata only. New live runs require a validated, versioned four-artifact bundle before review.” | `RECORDED METADATA ≠ NEW LIVE-RUN PROOF` | Live-provider credibility |
| 2:20–2:24 | End card over a clean LastTube frame. Insert verified public app, repo, and Devpost URLs only after those gates pass. | “LastTube makes uncertainty decision-safe.” | `LASTTUBE` · `LIVE_URL_PENDING` · `github.com/Zen-cronic/lasttube` | Feasibility · Close |

Estimated narration: roughly 270 words, about 113 wpm if read continuously across 2:24; the actual
spoken spans occupy roughly 108 seconds, yielding about 150 wpm while leaving action and breathing
room. Rehearse against the actions and shorten pauses before changing the script.

## Click and rehearsal script

1. Build and rehearse locally:

   ```bash
   npm run verify
   npm run capture:demo
   ```

2. For the final take, replace localhost with the verified public origin and open
   `LIVE_URL_PENDING/?mode=demo` in a clean browser profile at 1920×1080, 100% zoom.
3. Prepare two tabs of the same deployed app:
   - Tab A: completed three-candidate ledger + no-actionable-lead decision for the 0:00 kill shot.
   - Tab B: fresh `/?mode=demo` route at the top for the end-to-end flow.
4. In Tab B, confirm **Demo recording armed** before clicking anything.
5. Select Backtalk → **Find living replacements** → wait for `SERPAPI: FIXTURE` → shortlist rows 1,
   2, and 3 → **Compare 3 on-face**.
6. Confirm the remembered-shade baseline exists and Ngozi visibly reads `SYSTEM EXCLUDED` with the
   2.5% reason. View ABH and click **Reject**. View NYX, click **Accept visual fit**, then **Prefer**.
   Confirm `3 OF 3 CANDIDATES RESOLVED · 1 SYSTEM EXCLUDED`.
7. Hold `NO ACTIONABLE LEAD YET`, the `ACTION GATE` missing-fields line, and `CIE76 CONTEXT ONLY`.
8. Scroll from the stopped outcome to the three-card proof inventory. Do not open GitHub during the clean
   take; browser navigation adds risk and the in-app receipt panel contains the required facts.
9. Record three full takes. Keep the cleanest, then assemble the cold-open cut, fresh-flow cut, and
   end card. Sync voiceover to the edited cut, not raw wall-clock timestamps.

## Capture and assembly plan

- Use Recordly/OBS/Screen Studio at 1920×1080, 30 fps, H.264. Playwright Core is the rehearsal and
  screenshot driver, not the final encoder.
- Before the full recording, capture and inspect one frame containing the VTO stage, both fixture
  badges, the shade bridge, and the verdict.
- Hide notifications, bookmarks, extensions, account avatars, unrelated tabs, and password-manager
  UI. A dedicated browser profile must contain no personal login.
- Use hard cuts between the cold-open verdict, fresh route, and end card. Do not use a morph that
  implies one provider state becomes another.
- Optional caption chips remain bottom-right and never cover provider badges, source timestamps,
  caveats, or the verdict receipt.
- No copyrighted music. Silence plus voiceover is preferred; otherwise use only operator-verified
  CC0/royalty-cleared audio at a low bed and keep attribution.
- Export H.264/AAC at 1920×1080. Confirm the master is 1:00–3:00 and contains no blank/black frames.

## Evidence map

| Claim | Visible proof | Durable proof |
|---|---|---|
| SerpApi determines observed-market candidates | Act 2 candidate rows, query, source, merchant, price, observed-at, provider badge | `proofs/serpapi/2026-09-01-google-shopping.json` and `2026-09-01-normalized.json` |
| Perfect Corp baseline is genuinely receipted | Lost-shade baseline with VTO badge and explicit receipt label | `proofs/perfectcorp/2026-09-01-makeup-vto-lifecycle.json`, downloaded render, and `proofs/offline/lost-shade-baseline.json` |
| Candidate proof is not overstated | Candidate rows say `VTO metadata only`; proof inventory separates their outputs | Three `proofs/offline/candidate-*.json` manifests with explicit null request/lifecycle fields |
| New live candidate proof fails closed | Runtime-proof note; validated live candidates expose a manifest-download link | `server/runtimeEvidence.ts`; offline tests re-hash sanitized raw search, source, every sanitized Perfect response/URL lineage, and output; tampering blocks export |
| Fixture cannot masquerade as live | proof-mode banner; SerpApi and VTO fixture badges | `npm run capture:demo` rejects live search, VTO, and shade-estimate requests |
| Every candidate is resolved | One system exclusion + one rejection + one accepted/preferred row | `shared/reviewDecision.ts`; disposition and capture tests |
| Weak images cannot enter human comparison | 10% heuristic copy; Ngozi visibly system-excluded | `shared/shadeEvidence.ts`; threshold, bundle, and provenance tests |
| Perfect Corp baseline is mandatory | remembered shade plus candidate render; baseline-required copy | capture injects a failed baseline and asserts zero decision/outcome UI |
| Human judgment changes the result | ABH rejected despite lower ΔE; NYX accepted/preferred | `shared/reviewDecision.ts`; capture asserts the preferred title and `CIE76 did not choose` |
| Missing structured evidence stops action | no-actionable card, present/absent/unknown ledger, refined-search handoff | `shared/evidence.ts`; positive and fail-closed policy tests; no new provider calls |
| Failure does not become a fake result | search error/empty states and recorded exclusion rows | typed provider status plus 56 offline tests |
| Mobile judge can read the verdict | wrapped 350 px verdict capture | capture fails on horizontal overflow |

## Compliance checklist

- [ ] Real built/deployed application appears at 0:00 and throughout the end-to-end flow.
- [ ] Runtime is at least 1:00 and no more than the Perfect Corp 3:00 cap.
- [ ] Every replayed provider surface is labeled `FIXTURE`; no narration calls the replay live.
- [ ] Preserved proof is labeled `PRESERVED LIVE RECEIPTS · NOT A NEW CALL`.
- [ ] No generated b-roll, fake retailer/social chrome, user testimonial, or implied validation.
- [ ] No real person's selfie; the Perfect Corp sample face disclosure remains visible.
- [ ] No secrets, signed result URL queries, account identifiers, task token, browser history, or
  personal profile data.
- [ ] No stock guarantee, exact-shade guarantee, medical/skin claim, or category-originality claim.
- [ ] Successful lost-shade baseline is visible before any decision controls are used.
- [ ] Ngozi is visibly system-excluded; ABH rejected; NYX accepted/preferred; ledger says 3 of 3.
- [ ] Final card says `NO ACTIONABLE LEAD YET`; no Buy wording or formulation claim appears.
- [ ] Candidate fixtures are called metadata-only; only the lost-shade baseline is called a Perfect
  Corp lifecycle receipt.
- [ ] The runtime-proof note says versioned/exportable per-run, not durable storage; do not imply the
  current fixture candidates used the newer path or that a live enrichment source is configured.
- [ ] Narration calls the 10% floor a heuristic and CIE76 context only.
- [ ] English narration/captions; API names and CIE76 manually corrected.
- [ ] YouTube is Unlisted or Public, never Private; “Not made for kids”; non-empty description.
- [ ] Title is `LastTube - DevNetwork [API + Cloud + AI] Hackathon 2026`.
- [ ] Public app/repository URLs are inserted only after logged-out verification.
- [ ] Operator watches the full master with sound before upload and again from the public URL.
