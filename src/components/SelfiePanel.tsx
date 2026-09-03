// Selfie panel with explicit consent/privacy handling. This build ships with
// Perfect Corp's own published sample face; no real person's selfie is used
// or uploaded anywhere in the repository or demo.

export function SelfiePanel() {
  return (
    <div className="card">
      <h3>Preview shades on a demo model</h3>
      <figure className="selfie-figure">
        <img src="/sample-face.jpg" alt="Demo model portrait used for virtual try-on" width={280} />
        <figcaption>
          Demo face: Perfect Corp&apos;s published API sample image — not a real user&apos;s
          selfie.
        </figcaption>
      </figure>
      <details className="consent-note micro-details">
        <summary>How selfie privacy works</summary>
        <p>
          Your own photo would require explicit consent and go only to Perfect Corp for the render.
          Uploads stay off in this demo.
        </p>
      </details>
    </div>
  );
}
