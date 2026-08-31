# LastTube

Your favorite shade vanished. LastTube finds replacements that are actually available, shows them on your face, and explains the closest match.

This is a fresh, independent entry for the DevNetwork API + Cloud + AI Hackathon 2026, targeting the Perfect Corp and SerpApi challenges. The repository currently contains only its build handoff and environment contract; no product implementation has been accepted yet.

The build must keep both sponsor technologies load-bearing:

- SerpApi discovers current replacement candidates, merchant evidence, price, and availability.
- Perfect Corp renders the candidates through makeup virtual try-on.

The defining product loop is: discontinued favorite → live candidates → on-face comparison → one source-backed closest-match verdict. Do not broaden this into a generic beauty concierge, skin adviser, routine builder, catalogue, or marketplace.

The local `BUILD_CHECKPOINT.md` is intentionally ignored by Git and is the authoritative handoff for the next build agent. Copy only the required values from the private credential source into a local ignored `.env`; never commit credentials.

