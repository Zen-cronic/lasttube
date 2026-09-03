# Offline proof inventory

This directory records exactly what the repository can prove without a provider call.

## Evidence states

- `present`: the tracked artifact contains the field and its required provenance.
- `absent`: a trusted structured source explicitly records that the field is absent.
- `unknown`: the available artifact cannot distinguish present from absent; listing-title presence
  or silence never changes this state.

## Proof levels

`lost-shade-baseline.json` is the only Perfect Corp `verified_lifecycle`: it binds the sanitized
request/poll receipt, task id, 19 polls, one-unit spend, downloaded output hash/bytes, and identical
fixture copy.

Each `candidate-<id>.json` is deliberately narrower. The repository retains:

- exact SerpApi candidate/listing id, title, merchant, observed offer/source, and receipt hash;
- estimated hex, method, and recorded coverage;
- Perfect Corp task id, poll count, and retained output image hash/bytes.

It does **not** retain the candidate merchant-image input bytes/hash or actual request record, nor
the candidate Perfect Corp source/effect request and lifecycle responses. Those fields remain
explicitly `null`, and candidate VTO proof is `metadata_only`. The manifests must never be described
as lifecycle receipts.

`npm run test` hashes the referenced files, matches each candidate back to the normalized SerpApi
receipt, and verifies this proof-level distinction. No manifest makes an accuracy, formulation,
stock, customer-validation, or exact-match claim.
