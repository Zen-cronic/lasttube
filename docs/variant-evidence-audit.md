# Preserved variant-evidence audit

Date: 2026-09-03 EDT

Question: does the already-preserved 40-result SerpApi receipt contain a listing whose exact
shade/variant is identifiable **and** whose image can clear LastTube's current evidence gate without
a new network call?

## Inputs and method

- Sanitized raw receipt: `proofs/serpapi/2026-09-01-google-shopping.json`
  - SHA-256: `47068505373315820870273dd3c5d06b4e491e75cf41ba113926150345a64fe4`
- Normalized receipt: `proofs/serpapi/2026-09-01-normalized.json`
  - SHA-256: `b6eade6ec3bd8b4261f5e025627840fc989888b1742f9ec779211f9436d35857`
- The audit searched all 40 exact preserved listing titles. No SerpApi request, merchant request,
  thumbnail download, or Perfect Corp request was made.
- Qualification requires both: (1) shade/variant text present in the preserved listing, and (2)
  stored image bytes that can be hashed and evaluated by the 10% coverage gate. A remote thumbnail
  URL alone is not offline image evidence.

## Exact or potentially exact titles found

| Position / product id | Exact preserved title | Variant read | Offline image evidence | Decision |
|---|---|---|---|---|
| 11 / `2758308699958914403` | `Pink Rosette Matte Liquid Lipstick \| Rosy Mauve Lip Color for Women, Long-Lasting, Waterproof, Long Wear, Vegan, Gluten Free, Velvety Finish` | `Pink Rosette` appears shade-like | URL only; no stored bytes, hash, extraction, or coverage | Not qualified |
| 20 / `6417161676081155765` | `Liquid Matte Lips - Rose Mauve - LL126` | `Rose Mauve`, code `LL126` — strongest exact-variant title | URL only; no stored bytes, hash, extraction, or coverage | Not qualified |
| 23 / `5737833288130296589` | `Matte Lipstick - ALPHA RED - lsmt03` | `ALPHA RED`, code `lsmt03`; explicitly red rather than the remembered mauve | URL only; no stored bytes, hash, extraction, or coverage | Not qualified and wrong direction |
| 28 / `8168417448261271274` | `MAUVE MATTE LIPSTICK` | Ambiguous: title does not distinguish product name from variant | URL only; no stored bytes, hash, extraction, or coverage | Not exact; not qualified |
| 32 / `13877057134958949621` | `Miss Mauve Matte Liquid Lipstick. Liquid to Matte Lipstick. Mauve Lipstick. Pink Lipstick` | `Miss Mauve` appears shade-like | URL only; no stored bytes, hash, extraction, or coverage | Not qualified |

## Decision

**No preserved exact-variant listing qualifies for a new VTO render.** The receipt retains remote
thumbnail URLs, but it does not retain the candidate image bytes needed for an offline hash,
extraction, or coverage check. Downloading those URLs would be a new network retrieval and would no
longer be the requested offline-first evaluation. Therefore LastTube made **zero new Perfect Corp
calls** and spent **zero credits**.

The demo now ends with `NO ACTIONABLE LEAD` after explicit human accept/reject/preference decisions.
It offers a refine-search handoff but does not automatically call SerpApi. A future proof attempt may
proceed only after the operator intentionally acquires and preserves the exact candidate image,
confirms its identity/license, records its SHA-256 and extraction coverage, and confirms any VTO
credits are event/free. That remains a human/post-hackathon gate, not evidence claimed here.

## Current hero-candidate provenance boundary

The three candidates already present in the deterministic comparison now have individual tracked
manifests under `proofs/offline/candidate-*.json`. Each binds the SerpApi candidate/listing id to the
exact observed title and offer, retained estimate/coverage, candidate VTO task/poll summary, and the
SHA-256 plus byte count of the retained output image.

Those manifests also preserve the negative evidence instead of filling gaps by inference:

- the merchant source-image bytes, hash, and actual request record are missing;
- the candidate Perfect Corp source-face/effect request and lifecycle responses are missing;
- their output/task/poll records are therefore `metadata_only`, not receipted lifecycles; and
- only `proofs/offline/lost-shade-baseline.json` points to a genuine tracked Perfect Corp request,
  19-poll lifecycle, one-unit receipt, and hashed output.

This provenance repair does not qualify any current hero candidate. The structured outcome policy
requires all identity, exact variant, shade, finish, source-image, candidate-VTO, baseline, and human
decision fields before it can expose an actionable observed offer or alert-eligible state.

New live runs now close the mechanical retention gap prospectively: the server binds the exact
SerpApi response digest and listing, retained merchant-image bytes/hash/coverage, Perfect request
and task/poll outcome, and downloaded output bytes in a validated, downloadable per-run manifest.
The current deployment has no persistent disk, so that export is ephemeral until downloaded. It
does not supply or infer exact variant/shade/finish fields and does not retroactively qualify the
three recorded fixture candidates above.
