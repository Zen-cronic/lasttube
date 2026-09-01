// Packet-1 scaffold shell. The real UI lands after docs/design-brief.md is
// written (design-direction gate) — this page only proves the build pipeline
// and the API wiring.

import { useEffect, useState } from 'react';

interface Health {
  ok: boolean;
  providers: { serpapi: string; perfectcorp: string };
}

export default function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json() as Promise<Health>)
      .then(setHealth)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <main style={{ fontFamily: 'system-ui', maxWidth: 640, margin: '4rem auto', padding: '0 1rem' }}>
      <h1>LastTube</h1>
      <p>
        Your favorite shade vanished. LastTube finds replacements that are actually purchasable,
        shows them on your face, and explains the closest match.
      </p>
      <p style={{ color: '#666' }}>Build scaffold — product UI arrives with the design brief.</p>
      {health && (
        <ul>
          <li>SerpApi: {health.providers.serpapi}</li>
          <li>Perfect Corp: {health.providers.perfectcorp}</li>
        </ul>
      )}
      {error && <p role="alert">API server unreachable: {error}</p>}
    </main>
  );
}
