# LastTube — Devpost submission draft

Status: paste-ready except for the operator-owned URLs marked `PENDING`. Target sponsor prizes:
**Perfect Corp — Building the Next Generation of AI-Driven Consumer Experiences** and
**SerpApi — Best AI Use Case**. This draft does not target the overall prize in its claims.

## Project name

`LastTube`

## One-line pitch

LastTube gives every discontinued-shade candidate a system or human disposition, then unlocks an
observed offer only when exact-variant and visual proof are complete.

## Inspiration

A discontinued lipstick is not just a missing SKU. The replacement advice scattered across videos,
forums, and retailer pages goes stale, while a shade that looks close in a product photo can look
different on a face. We wanted one narrow workflow that answers the decision a shopper actually
has: **what was actually listed, which images contain usable shade evidence, and does any candidate
survive a same-face decision with enough evidence to act?**

Public user reports describe [searches lasting years and several poor matches](https://www.reddit.com/r/makeupdupes/comments/1w4h7mw/10_year_search_for_discontinued_lip_color/),
[stale availability references](https://www.reddit.com/r/MakeupAddiction/comments/1w2pxh2/urban_decay_1993/),
and [substitutes that trade shade similarity against formula](https://www.reddit.com/r/PaleMUA/comments/1w3pj43/old_mac_blankety_dupe_or_alternate_colors/).
These anecdotes support the problem, not LastTube's accuracy, product validation, market size, or
willingness to pay.

## What it does

LastTube starts with a remembered discontinued shade. SerpApi turns a Google Shopping search into
structured candidate evidence—exact listing title, merchant, price, observed offer/source URL, and
observation time. The shopper shortlists up to three candidates. Every shortlisted item must finish
as either a recorded system exclusion or an explicit human accept/reject. LastTube rejects merchant
images below 10% usable saturated foreground coverage, requires a successful Perfect Corp render of
the remembered shade as the comparison baseline, and renders passing estimates on the same sample
face. Preference is accepted-only. CIE76 explains the difference; it never chooses or restores a
rejected item.

The action gate models listing identity, exact variant, shade, finish, source-image hash/coverage,
and candidate VTO proof as separate `present`, `absent`, or `unknown` evidence. An observed offer
becomes actionable only when all required fields, the baseline, and human preference are present.

In the recorded path, `Ngozi Mauve Rose Matte Lipstick` is system-excluded at 2.5% usable coverage;
the human rejects lower-ΔE `Anastasia Beverly Hills Lip Velvet`, accepts and prefers `NYX
Professional Makeup Fat Matte Lipstick`, and therefore visibly overrides the metric. The preferred
has no retained trusted shade or variant record, its source-image bytes/hash were not retained, and its candidate
VTO has task/poll metadata rather than a lifecycle receipt. LastTube displays those gaps, ends with
`No actionable lead yet`, offers a refined-search handoff, and exposes no Buy action or formulation
claim.

Every provider result is visibly stamped `LIVE`, `FIXTURE`, `UNAVAILABLE`, or `FAILED`. Listings are
described as observed evidence, not real-time stock guarantees. Candidate colors and CIE76 ΔE are
explanation aids over approximated shades, not promises of real-world appearance. When evidence is
missing, LastTube stops instead of inventing a verdict.

## How we built it

- React 19 and Vite render the three-act beauty-editorial interface: **the loss → the hunt → the
  verdict**.
- A Hono/Node service keeps sponsor credentials server-side and exposes typed API boundaries.
- SerpApi's `google_shopping` engine supplies timestamped structured listing evidence.
- Perfect Corp's Makeup VTO follows the real asynchronous lifecycle: create a task, poll inside a
  bounded budget, download the signed result before expiry, and retain its exact output bytes.
- Sharp estimates a dominant saturated product color behind HTTPS, hostname, response-size, and
  10%-minimum usable-coverage guards. Current live estimates return their exact fetched input hash
  and byte count. Low-coverage images fail closed. Shared color utilities convert approximated hex
  values to Lab D65 and compute CIE76 ΔE.
- A deterministic demo mode replays a receipted SerpApi response, one receipted lost-shade baseline,
  and candidate outputs with explicitly narrower metadata-only provenance. It is labeled `FIXTURE`
  on every affected surface and guarded against accidental live calls.
- New live searches open a versioned evidence run from the SerpApi wire digest and a separately
  hashed, sanitized raw response retained before normalization. Shade estimation retains the exact
  merchant-image bytes. Candidate VTO retains every sanitized create/poll response with timestamps,
  safe URL lineage, request inputs, and downloaded output bytes. Validation re-derives the listing
  and re-hashes four artifacts before review. The current host is ephemeral, so this is per-run
  export—not durable storage and not proof of any current fixture candidate.
- A structured enrichment contract defaults exact variant/shade/finish to unknown and has no title
  parser. Only a future receipt-bound trusted record can promote those fields; no live enrichment
  source or actionable lead is claimed.
- Pure shared policy derives candidate dispositions and the action boundary. A clearly labeled
  synthetic policy fixture proves the theoretical all-fields-present branch; it is not genuine
  product evidence. Real incomplete and unknown branches fail closed.
- The production adapter serves the built client and API from one container; public deployment is
  intentionally an operator gate.

## Where the sponsor technology does the real work

**Perfect Corp:** Makeup VTO is the required human-decision layer. The comparison is not a CSS
filter or static mock: the single preserved live lifecycle receipt is the lost-shade baseline; it
completed after 19 bounded polls, spent one event unit, and retained the request and downloaded
output. A successful image-bearing baseline is mandatory; if it fails, every decision and outcome
remains locked. Candidate fixtures retain outputs, hashes, task ids, and poll counts, but not their
requests/lifecycle responses, so LastTube labels them metadata-only rather than calling them
receipted. The human must view each usable candidate, explicitly accept or reject it, and prefer one
among the accepted set. VTO compares estimated colors consistently; it does not validate the actual
formulation or exact variant.

For a new live candidate, review stays locked unless LastTube downloads the signed Perfect output
and validates a versioned bundle binding sanitized provider-response artifacts, exact listing,
source-image bytes, request effects, every task/poll response, safe URL lineage, and output bytes.
Offline tests—not a new provider run—prove tampering fails closed. The current recorded candidates
predate this path and remain metadata-only; the submission does not upgrade their proof retroactively.

**SerpApi:** a live Google Shopping search determines which alternatives the response reported and
where the evidence came from. The preserved proof normalized 40 candidates for the hero query with
merchant, price, exact listing text, observed offer, source, and timestamp fields. Remove SerpApi
and LastTube loses its market-evidence claim; remove Perfect Corp and neither the required baseline
nor human comparison can occur, so LastTube blocks the outcome.

## Challenges we ran into

The hardest boundary was honest fallback behavior. Provider result URLs expire, shopping listings
do not prove stock, merchant images are noisy shade evidence, and a delayed live response could once
overwrite a freshly selected fixture result. We downloaded VTO outputs, bounded polling, disclosed
the data limits, and added a request-sequence guard so stale responses cannot cross truth modes.

## Accomplishments that we're proud of

- A complete discontinued-shade-to-candidate-ledger loop with both sponsor technologies load-bearing.
- Sanitized live receipts for a 40-candidate SerpApi response and a successful Perfect Corp VTO
  lost-shade baseline lifecycle.
- A fail-closed 10% evidence threshold that rejects the preserved 2.5%-coverage fixture candidate.
- No silent omissions: the recorded three-item shortlist resolves into one system exclusion, one
  human rejection, and one accepted/preferred visual direction.
- Decision-bearing accept/reject/preference controls: the recorded human choice rejects the lower-ΔE
  item, prefers the other, and still stops because structured action evidence is incomplete.
- Per-candidate offline manifests bind exact listing ids to retained VTO output hashes/bytes and
  explicitly record every missing input/request/lifecycle field.
- The live server now constructs and exposes a validated, versioned per-run candidate bundle with
  downloadable sanitized search/lifecycle artifacts and source/output bytes, while failing before
  provider execution for an unbound candidate and after any retention, cross-field, or tamper error.
- An offline audit of all 40 preserved result titles. Several exact-looking variants exist, but none
  has stored image bytes needed for a truthful coverage/hash check, so we made zero new VTO calls.
- A deterministic judge-demo route that fails its capture check if it attempts any live provider
  request or loses its `FIXTURE` labels.
- 60 offline tests, type checking, linting, production build, secret scan, responsive capture, and
  a container-ready one-process runtime.

## What we learned

Live search and virtual try-on answer different halves of the same decision. Search timestamps the
observed market; VTO makes visual judgment possible only when its baseline succeeds. A coverage
number without retained source bytes is not provenance, and task/poll metadata is not a lifecycle
receipt. Runtime proof also needs an explicit persistence boundary: on the current host, evidence is
exportable per run but not durable across redeploy. The useful product is sometimes a trustworthy
stop: human preference cannot repair missing evidence.

## What's next

Obtain licensed variant-level shade/finish data and retained source-image inputs, then add opt-in
availability alerts for evidence-complete exact variants. A disclosed affiliate handoff could fund
that workflow, but demand, conversion, willingness to pay, alert delivery, and affiliate enrollment
remain unvalidated and unimplemented. Add an explicitly consented user-photo upload only with
deletion controls and opt-in studies.

## Built with

Perfect Corp Makeup VTO, SerpApi Google Shopping, React, TypeScript, Vite, Hono, Node.js, Sharp,
Playwright Core, Vitest, Docker, Render Blueprint

## Links

- Live app: `LIVE_URL_PENDING`
- Demo-safe route: `LIVE_URL_PENDING/?mode=demo`
- Source: https://github.com/Zen-cronic/lasttube — **currently private; publication is a human gate**
- Demo video: `YOUTUBE_URL_PENDING`

## Testing instructions for judges

Open the demo-safe route with no login. Select **Urban Decay Vice Lipstick — Backtalk**, click
**Find living replacements**, shortlist the first three candidates, and click **Compare 3 on-face**.
Confirm the lost-shade baseline rendered and Ngozi is visibly `SYSTEM EXCLUDED` for 2.5% coverage.
View ABH and reject it; view NYX, accept it, and click **Prefer**. The ledger must read `3 of 3
candidates resolved`. The outcome records that human preference but says `No actionable lead yet`
and lists the still-missing action evidence. Every replayed surface is `FIXTURE`; the proof panel
distinguishes the receipted SerpApi search and lost-shade baseline from metadata-only candidate
outputs.

## Project media upload order

1. Thumbnail: `judge-devpost-thumbnail.png`
2. Hunt evidence: `judge-devpost-hunt.png`
3. Same-face human decisions + honest stop: `judge-devpost-verdict.png`

Use the exact paths and captions in `screenshot-inventory.md`.

## New-work disclosure

LastTube was built as a fresh repository during the event period. It uses standard open-source
frameworks, sponsor APIs, and Perfect Corp's published API sample face. No real person's selfie or
user-validation result appears in the project or submission.
