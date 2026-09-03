interface Props {
  reviewedCount: number;
  totalCount: number;
  confirmed: boolean;
  onConfirm: () => void;
}

export function HumanReviewGate({ reviewedCount, totalCount, confirmed, onConfirm }: Props) {
  const ready = totalCount > 0 && reviewedCount >= totalCount;

  return (
    <section className="review-gate" aria-labelledby="review-gate-title">
      <div>
        <p className="act-label">Required human checkpoint</p>
        <h3 id="review-gate-title">Review every usable same-face render.</h3>
        <p>
          Perfect Corp visualizes the estimated colors consistently; it does not verify the
          product&apos;s exact shade, finish, undertone, or formulation. Open each swatch before
          unlocking the color-distance lead.
        </p>
      </div>
      <div className="review-gate-action">
        <span aria-live="polite">
          {Math.min(reviewedCount, totalCount)} of {totalCount} usable renders reviewed
        </span>
        <button
          type="button"
          className="btn"
          disabled={!ready || confirmed}
          onClick={onConfirm}
        >
          {confirmed ? 'Visual review confirmed ✓' : 'Confirm same-face review'}
        </button>
      </div>
    </section>
  );
}
