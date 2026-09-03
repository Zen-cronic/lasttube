# LastTube submission handoff

Paste-ready materials for the DevNetwork [API + Cloud + AI] Hackathon 2026. The application is
implemented and locally verified; every action that changes external state remains an operator
gate.

- `devpost-submission.md` — project story, sponsor-track answers, links, and media order
- `demo-director-runbook.md` — 2:24 screenplay, click path, VO, proof map, b-roll decision
- `youtube-upload-handoff.md` — title, description, chapters, tags, and settings
- `social.md` — X, LinkedIn, and short-form drafts
- `screenshot-inventory.md` — exact files, dimensions, captions, and truth mode
- `publication-gates.md` — deployment, repository, video, and submission checklist
- `submission-audit.md` — deadline-ordered pass/fail audit and fix-by times
- `oss-applicability.md` — sponsor-upstream contribution decision

Placeholders ending in `_PENDING` must not be published as literal values. No upload, deployment,
repository visibility change, social post, or Devpost submission was performed by the build agent.

## Snapshot provenance

This operator handoff directory is snapshotted byte-for-byte under the LastTube repository's tracked
`submission/` directory so a cloud checkout contains the complete judge package. The sibling copy
remains the operator-facing working location; after any later edit, re-snapshot it and require
`diff -qr <sibling>/submission/lasttube <repo>/submission` to produce no output before release.
