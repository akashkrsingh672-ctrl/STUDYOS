"use client";

import ArcGauge from "@/components/dashboard/ArcGauge";
import { gaugePct } from "@/lib/planLogic";
import { useStudy } from "@/lib/store";

/**
 * Chunk 6 — responsive companion to the sidebar: below the desktop breakpoint
 * the goal, progress and drawer entry point move into a single compact row so
 * the dashboard keeps working on narrower screens.
 */
export default function MobileGoalBar() {
  const { selectedDate, today, statsFor, setDrawerOpen } = useStudy();
  const date = selectedDate || today;
  const stats = statsFor(date);
  const pct = gaugePct(stats.lecturesCompleted, stats.lecturesTarget);

  return (
    <section className="flex items-center gap-4 rounded-card border border-hairline bg-surface p-4 lg:hidden">
      <ArcGauge value={pct} size={62} strokeWidth={6}>
        <span className="font-semibold text-[12px] leading-none text-primary">{pct}%</span>
      </ArcGauge>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
          Daily goal
        </p>
        <p className="mt-1 text-[11px] text-primary">
          Lectures today {stats.lecturesCompleted}/{stats.lecturesTarget}
        </p>
        <p className="mt-[2px] text-[10px] text-muted">
          Question practice {stats.questionsPracticed}
        </p>
      </div>
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="shrink-0 rounded-button border border-border-medium bg-surface px-3 py-[6px] text-[10px] font-semibold text-accent transition-colors hover:bg-surface-hover"
      >
        Todos
      </button>
    </section>
  );
}
