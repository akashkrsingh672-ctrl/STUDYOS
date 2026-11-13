"use client";

import { useState } from "react";
import CalendarPopover from "@/components/common/CalendarPopover";
import { addDays, formatDayMonth, todayKey } from "@/lib/date";
import { useStudy } from "@/lib/store";
import type { TodoSource } from "@/lib/types";

interface AssignToDateControlProps {
  assignedDate: string | null;
  assignedSource: TodoSource | null;
  onAssign: (date: string, source: TodoSource) => void;
  /** Used for the accessible group label, e.g. "lecture plan". */
  label: string;
  markedDates?: string[];
  disabled?: boolean;
}

/**
 * Chunk 3 — replaces the two non-working "add to day? sunday" buttons with
 * Add to Today / Add to Tomorrow / Custom date (calendar).
 * Same control language as the design: 32px pill, surface fill, 12% border,
 * 16px radius, 11px Inter Medium labels.
 */
export default function AssignToDateControl({
  assignedDate,
  assignedSource,
  onAssign,
  label,
  markedDates = [],
  disabled = false,
}: AssignToDateControlProps) {
  const { today } = useStudy();
  const [calendarOpen, setCalendarOpen] = useState(false);

  const tomorrow = today ? addDays(today, 1) : "";
  const isToday = Boolean(today) && assignedDate === today;
  const isTomorrow = Boolean(tomorrow) && assignedDate === tomorrow;

  const segment = (active: boolean) =>
    `flex h-[32px] w-[96px] items-center justify-center text-[11px] font-medium transition-colors ${
      active ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface-hover hover:text-primary"
    } ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`;

  return (
    <div className="relative shrink-0">
      <div
        role="group"
        aria-label={`Add ${label} to a day`}
        className="flex h-[32px] w-[288px] overflow-hidden rounded-assign border border-border-medium bg-surface"
      >
        <button
          type="button"
          disabled={disabled}
          aria-pressed={isToday}
          className={`${segment(isToday)} rounded-l-assign`}
          onClick={() => onAssign(todayKey(), "today")}
        >
          Today
        </button>
        <button
          type="button"
          disabled={disabled}
          aria-pressed={isTomorrow}
          className={segment(isTomorrow)}
          onClick={() => onAssign(addDays(todayKey(), 1), "tomorrow")}
        >
          Tomorrow
        </button>
        <button
          type="button"
          disabled={disabled}
          aria-pressed={assignedSource === "custom"}
          aria-haspopup="dialog"
          aria-expanded={calendarOpen}
          className={`${segment(assignedSource === "custom")} rounded-r-assign`}
          onClick={() => setCalendarOpen((open) => !open)}
        >
          {assignedSource === "custom" && assignedDate
            ? formatDayMonth(assignedDate)
            : "Custom date"}
        </button>
      </div>

      {calendarOpen ? (
        <CalendarPopover
          value={assignedDate}
          markedDates={markedDates}
          title={`Add ${label} to a date`}
          onClose={() => setCalendarOpen(false)}
          onSelect={(dateKey) => onAssign(dateKey, "custom")}
        />
      ) : null}
    </div>
  );
}
