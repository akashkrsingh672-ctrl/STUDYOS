"use client";

import { useEffect, useState } from "react";
import Stepper from "@/components/common/Stepper";
import type { PyqSectionStats } from "@/lib/types";

interface PyqAllocationPanelProps {
  /** Human label for the chosen day, e.g. "Today" or "16 Feb". */
  dayLabel: string;
  date: string;
  sections: PyqSectionStats[];
  onConfirm: (counts: Record<string, number>) => void;
  onClose: () => void;
}

const emptyCounts = (sections: PyqSectionStats[]): Record<string, number> =>
  Object.fromEntries(sections.map((section) => [section.id, 0]));

/**
 * "Ask how many questions from each section for this day" step of the question
 * flow. Every stepper is capped by the section's remaining headroom, so a
 * section can never be over-allocated. Styled with the shared popover language
 * (surface tokens, hairline border, popover shadow).
 */
export default function PyqAllocationPanel({
  dayLabel,
  date,
  sections,
  onConfirm,
  onClose,
}: PyqAllocationPanelProps) {
  const [counts, setCounts] = useState<Record<string, number>>(() => emptyCounts(sections));

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const total = sections.reduce((sum, section) => sum + (counts[section.id] ?? 0), 0);
  const nothingLeft = sections.every((section) => section.remaining <= 0);

  return (
    <>
      <button
        type="button"
        aria-label="Close assignment panel"
        onClick={onClose}
        className="fixed inset-0 z-40 cursor-default"
      />
      <div
        role="dialog"
        aria-label={`Add questions to ${dayLabel}`}
        className="animate-pop-in absolute left-0 top-[44px] z-50 w-[360px] max-w-[92vw] rounded-card border border-border-medium bg-drawer p-4 shadow-popover"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
          {dayLabel} · set questions
        </p>
        <p className="mt-[6px] text-[10px] text-muted">
          How many questions from each section? {date}
        </p>

        <div className="mt-3 flex flex-col gap-2">
          {sections.map((section) => {
            const used = counts[section.id] ?? 0;
            return (
              <div
                key={section.id}
                className="flex min-h-[36px] flex-wrap items-center gap-3 rounded-control bg-surface-subtle px-3 py-1"
              >
                <span className="min-w-[120px] flex-1 truncate text-[11px] font-medium text-primary">
                  {section.label}
                </span>
                <span className="text-[9px] text-muted">{section.remaining} left</span>
                <Stepper
                  value={used}
                  max={section.remaining}
                  label={`${section.label} for ${dayLabel}`}
                  disabled={section.remaining <= 0}
                  onChange={(next) =>
                    setCounts((current) => ({ ...current, [section.id]: next }))
                  }
                />
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-hairline pt-3">
          <span className="text-[10px] text-muted">
            {nothingLeft
              ? "Every question is already assigned or done."
              : `${total} question${total === 1 ? "" : "s"} selected`}
          </span>
          <button
            type="button"
            disabled={total === 0}
            onClick={() => {
              onConfirm(counts);
              onClose();
            }}
            className="h-[32px] shrink-0 rounded-soft bg-accent px-4 text-[11px] font-semibold text-on-accent transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Add {total} question{total === 1 ? "" : "s"}
          </button>
        </div>
      </div>
    </>
  );
}