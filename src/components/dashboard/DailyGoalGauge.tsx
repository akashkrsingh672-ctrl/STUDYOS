"use client";

import { useState } from "react";
import ArcGauge from "@/components/dashboard/ArcGauge";
import { gaugePct } from "@/lib/planLogic";
import { useStudy } from "@/lib/store";

/**
 * Chunk 1 — the universal daily goal gauge (one goal across all subjects) with
 * the hover/focus breakdown: "Lectures completed today X/Y" plus today's
 * question practice per chapter.
 */
export default function DailyGoalGauge() {
  const { selectedDate, today, statsFor } = useStudy();
  const [open, setOpen] = useState(false);

  const date = selectedDate || today;
  const stats = statsFor(date);
  const pct = gaugePct(stats.lecturesCompleted, stats.lecturesTarget);
  const complete = stats.lecturesTarget > 0 && stats.lecturesCompleted >= stats.lecturesTarget;

  return (
    <div
      className="relative mx-auto w-[188px]"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button
        type="button"
        aria-describedby="daily-goal-breakdown"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="block cursor-pointer rounded-full transition-opacity hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        <ArcGauge
          value={pct}
          size={188}
          strokeWidth={12}
          color={complete ? "var(--success)" : "var(--accent)"}
        >
          <span className="font-display text-[40px] font-bold leading-none text-primary">
            {pct}%
          </span>
          <span className="mt-2 text-[10px] font-medium uppercase tracking-wider text-muted">
            Daily goal
          </span>
          <span className="mt-[2px] text-[10px] text-muted">
            Lectures today {stats.lecturesCompleted}/{stats.lecturesTarget}
          </span>
        </ArcGauge>
      </button>

      {open ? (
        <div
          id="daily-goal-breakdown"
          role="tooltip"
          className="animate-fade-in absolute left-[calc(100%+12px)] top-[-6px] z-30 w-[268px] rounded-card border border-border-medium bg-drawer p-4 shadow-tooltip"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
            Daily goal · all subjects
          </p>
          <p className="mt-2 text-[12px] font-medium text-primary">
            Lectures completed today {stats.lecturesCompleted}/{stats.lecturesTarget}
          </p>
          <p className="mt-[2px] text-[10px] text-muted">
            {stats.lecturesTarget === 0
              ? "No lectures assigned to this day yet."
              : complete
                ? "Daily goal cleared — well done."
                : `${stats.lecturesTarget - stats.lecturesCompleted} lecture${
                    stats.lecturesTarget - stats.lecturesCompleted === 1 ? "" : "s"
                  } left today.`}
          </p>

          <div className="mt-3 border-t border-hairline pt-3">
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                Question practice today
              </span>
              <span className="font-semibold text-[12px] text-primary">
                {stats.questionsPracticed}
              </span>
            </div>

            {stats.breakdown.length === 0 ? (
              <p className="mt-2 text-[10px] text-muted">
                No practice logged yet for this day.
              </p>
            ) : (
              <ul className="mt-2 flex flex-col gap-[6px]">
                {stats.breakdown.map((item) => (
                  <li key={item.chapterId} className="flex items-center justify-between gap-3">
                    <span className="min-w-0 flex-1 truncate text-[11px] text-primary">
                      {item.chapterTitle}
                    </span>
                    <span className="shrink-0 rounded-pill bg-success-soft-strong px-[7px] py-[2px] text-[10px] font-semibold text-success">
                      {item.questions} q
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
