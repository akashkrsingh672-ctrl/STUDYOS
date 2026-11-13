import type { Quote } from "@/lib/quotes";

interface MoraleCardProps {
  quote: Quote;
  lecturesCompleted: number;
  questionsPracticed: number;
  onDismiss?: () => void;
  compact?: boolean;
}

/**
 * Chunk 4 — the celebration shown when every item for a day is checked off,
 * plus a rotating motivational quote. Uses the design's success tint, border
 * and card radius so it reads as part of the same product.
 */
export default function MoraleCard({
  quote,
  lecturesCompleted,
  questionsPracticed,
  onDismiss,
  compact = false,
}: MoraleCardProps) {
  return (
    <div
      className={`animate-pop-in rounded-card border border-border-success bg-success-soft-strong ${
        compact ? "p-4" : "p-5"
      }`}
      role="status"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-[26px] items-center justify-center rounded-full border border-success-border bg-success-check text-[13px] font-semibold text-success">
            ✓
          </span>
          <span className="font-semibold text-[13px] text-success">
            {compact ? "Day complete" : "Every item done — day complete!"}
          </span>
        </div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss celebration"
            className="shrink-0 rounded-button px-[6px] py-[2px] text-[13px] text-success transition-colors hover:bg-success-check"
          >
            ×
          </button>
        ) : null}
      </div>

      <p className="mt-3 font-display text-[15px] leading-snug text-primary">
        “{quote.text}”
      </p>
      <p className="mt-[6px] text-[10px] text-muted">— {quote.author}</p>

      <div className="mt-4 flex items-center gap-4 border-t border-success-border/40 pt-3 text-[10px] text-muted">
        <span>
          <span className="font-semibold text-success">{lecturesCompleted}</span> lectures
        </span>
        <span className="text-border-strong">|</span>
        <span>
          <span className="font-semibold text-success">{questionsPracticed}</span> questions
        </span>
      </div>
    </div>
  );
}
