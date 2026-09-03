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
      <div className="consent-note">
        <strong>Selfie privacy.</strong> Uploading your own photo requires your explicit consent:
        the image goes only to Perfect Corp&apos;s try-on API to render results and can be deleted
        from their servers afterwards. This demo build keeps uploads off and uses the sample face
        throughout.
      </div>
    </div>
  );
}
