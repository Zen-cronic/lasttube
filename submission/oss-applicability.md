# LastTube — OSS contribution applicability

## Decision: no upstream contribution warranted

The build surfaced no credible defect in a sponsor-owned open-source repository. The eight meaningful
issues were local product defects:

1. a stale live search could overwrite a later fixture result; LastTube fixed this with a request
   sequence guard in its own React state; and
2. the local merchant-image estimator admitted a 2.5%-coverage, packaging-heavy result; LastTube
   added and tested its own fail-closed 10% evidence floor;
3. candidate comparison could unlock after the required lost-shade baseline failed; LastTube now
   blocks every decision/outcome and proves the failure path end to end;
4. the generic review confirmation did not affect the outcome; LastTube replaced it with explicit
   reject/accept/prefer decisions and a no-actionable-lead stop;
5. system-excluded shortlist rows were omitted from the decision ledger; LastTube now records every
   candidate as system-excluded, human-rejected, or human-accepted;
6. local candidate task/poll summaries were overstated as receipted lifecycles; LastTube now binds
   the tracked outputs to offline manifests and explicitly records missing request/lifecycle fields;
7. Vite/Vitest could not create temporary files under one read-only agent sandbox; rerunning with
   the assigned repository writable resolved it and does not implicate sponsor software.
8. the live candidate path returned expiring Perfect output URLs without binding the exact search,
   source bytes, request, lifecycle outcome, and retained output; LastTube added its own versioned
   per-run bundle with sanitized raw responses and tamper checks, while explicitly labeling
   current-host storage ephemeral.

The Perfect Corp and SerpApi integrations behaved within their documented/runtime contracts. The
implementation accommodates Perfect Corp's observed response shapes, expiring signed output URL,
and bounded polling, but did not produce a minimal sponsor defect with a sponsor-controlled root
cause, affected version, reproduction, and regression test. Filing a speculative issue would add
noise and would not strengthen the submission narrative.

No GitHub search endpoint was used for this decision, and no issue or pull request was filed. If a
future reproducible sponsor defect appears, the operator should first perform a manual duplicate
check in the sponsor's official tracker, then attach a redacted request/response, documented versus
observed behavior, version/date, smallest reproduction, and proposed test—without credentials or
signed result URLs.
