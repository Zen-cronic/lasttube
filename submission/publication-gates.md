# LastTube — public repository, deployment, and submission gates

These actions change external state and were intentionally not performed by the build agent.

## 1. Public preview deployment

- [ ] Operator selects a host. The prepared path is Render Blueprint + Docker; it is reversible and
  uses a single Hono process for `dist/` and `/api/*`.
- [ ] In Render, choose **New → Blueprint**, connect the private `Zen-cronic/lasttube` repository,
  and review `render.yaml` before creating anything.
- [ ] Confirm the service uses the **free** plan and automatic deploys are **off**. Stop if the UI
  proposes a paid plan.
- [ ] Enter `SERPAPI_KEY` and `PERFECT_CORP_API_KEY` only in the provider's secret/environment UI.
  Never paste either value into Git, build logs, screenshots, or the Devpost form.
- [ ] Deploy manually, then verify `GET /api/health` returns 2xx and the landing page loads.
- [ ] Open `https://<host>/?mode=demo` logged out and complete the fixture hero path.
- [ ] Do not run a live smoke until one exact-variant candidate has stored, hashed image evidence and
  the operator confirms credits are event/free. Then cap spend to one search and two VTO renders
  total (required baseline + one candidate), confirm `LIVE` badges, and stop. Do not use a real
  selfie.
- [ ] Record `LIVE_URL_PENDING` only after logged-out verification.

References: [Render Blueprint specification](https://render.com/docs/blueprint-spec) and
[health checks](https://render.com/docs/health-checks). Local production serving and fixture-only
capture already pass. A local Docker image build remains unverified because no Docker daemon was
available in the build runtime.

## 2. Repository publication

The published Perfect Corp and SerpApi blocks do not expressly require a public repository. This
gate is still needed if the submission keeps its source and sanitized-receipt links; otherwise
remove links that a logged-out judge cannot open.

- [ ] Run `npm run verify` and `npm run capture:demo` on the exact commit to publish.
- [ ] Confirm `git status --short` is clean and `main` matches the intended private origin.
- [ ] Confirm `.env`, `.env.*`, `.claude/`, `.codex/`, `.playwright-mcp/`, `node_modules/`, and
  `dist/` are untracked/ignored.
- [ ] Inspect `proofs/` once more for credential values, signed query strings, personal images, and
  account metadata. `npm run scan:secrets` is necessary but not a substitute for this review.
- [ ] Run the provenance tests on the exact public commit. Confirm the three tracked **fixture**
  candidate manifests still call request/lifecycle fields missing and only their lost-shade
  baseline says `verified_lifecycle`.
- [ ] Confirm the new LIVE path labels versioned bundles `exportable_per_run` with
  `persistence: ephemeral`; do not claim durable storage unless a separately approved persistent
  store, retention policy, and deletion path are deployed and verified. Do not imply the no-source
  structured-enrichment interface is a configured live catalog.
- [ ] In GitHub **Settings → General → Danger Zone → Change repository visibility**, operator may
  change PRIVATE to PUBLIC only after accepting the warning.
- [ ] Verify the repository and proof links logged out. Never let an agent infer approval for this
  visibility change.

## 3. Video upload

- [ ] Record and assemble the real app using `demo-director-runbook.md`.
- [ ] Operator watches the complete master with sound and approves it.
- [ ] Upload with `youtube-upload-handoff.md`; choose Unlisted or Public, never Private.
- [ ] Verify logged-out 1080p playback, runtime 1:00–3:00, title, description, captions, and links.
- [ ] Record `YOUTUBE_URL_PENDING` only after verification.

## 4. Devpost submission

- [ ] Paste `devpost-submission.md`; replace every `_PENDING` value.
- [ ] Select both **Perfect Corp** and **SerpApi** sponsor challenges only.
- [ ] Upload screenshots in the documented order and inspect each crop in the actual form.
- [ ] Confirm the demo is 1–3 minutes, shows the application end to end, and the project page has a
  short write-up and screenshots as required by the Perfect Corp challenge.
- [ ] Re-check eligibility, event-wide fields, and any organizer updates on submission day.
- [ ] Preview the entire entry, save a local copy, and submit. Final submission is human-only.
