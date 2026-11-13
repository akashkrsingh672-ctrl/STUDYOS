"use client";

import { useEffect, useState } from "react";
import {
  WEEKDAYS,
  buildMonthGrid,
  formatFullDate,
  monthLabel,
  shiftMonth,
  todayKey,
  yearMonthOf,
} from "@/lib/date";

interface CalendarPopoverProps {
  /** Currently selected date key, if any. */
  value?: string | null;
  onSelect: (dateKey: string) => void;
  onClose: () => void;
  /** Dates that already hold log activity (daywise calendar log). */
  markedDates?: string[];
  title?: string;
}

/**
 * Inline month calendar used for "Custom date" assignment and for jumping
 * around the daywise log. Styled with the design tokens (surface, hairline
 * borders, accent selection, 7px/8px radii).
 */
export default function CalendarPopover({
  value,
  onSelect,
  onClose,
  markedDates = [],
  title = "Pick a date",
}: CalendarPopoverProps) {
  const today = todayKey();
  const anchor = value || today;
  const [{ year, monthIndex }, setMonth] = useState(() => yearMonthOf(anchor));

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const weeks = buildMonthGrid(year, monthIndex);
  const marked = new Set(markedDates);

  const navButton =
    "flex size-[24px] items-center justify-center rounded-button text-muted transition-colors hover:bg-surface-raised hover:text-accent";

  return (
    <>
      <button
        type="button"
        aria-label="Close calendar"
        onClick={onClose}
        className="fixed inset-0 z-40 cursor-default"
      />
      <div
        className="animate-pop-in absolute right-0 top-[36px] z-50 w-[264px] rounded-card border border-border-medium bg-drawer p-4 shadow-popover"
        role="dialog"
        aria-label={title}
      >
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            className={navButton}
            aria-label="Previous month"
            onClick={() => setMonth((current) => shiftMonth(current.year, current.monthIndex, -1))}
          >
            <span className="text-[13px] leading-none">‹</span>
          </button>
          <span className="text-[11px] font-semibold text-primary">
            {monthLabel(year, monthIndex)}
          </span>
          <button
            type="button"
            className={navButton}
            aria-label="Next month"
            onClick={() => setMonth((current) => shiftMonth(current.year, current.monthIndex, 1))}
          >
            <span className="text-[13px] leading-none">›</span>
          </button>
        </div>

        <div className="mb-1 grid grid-cols-7 gap-1">
          {WEEKDAYS.map((day) => (
            <span
              key={day}
              className="text-center text-[9px] font-semibold uppercase tracking-wider text-muted"
            >
              {day}
            </span>
          ))}
        </div>

        <div className="flex flex-col gap-1">
          {weeks.map((week, weekIndex) => (
            <div key={`week-${weekIndex}`} className="grid grid-cols-7 gap-1">
              {week.map((dayKey, dayIndex) => {
                if (!dayKey) {
                  return <span key={`blank-${weekIndex}-${dayIndex}`} className="h-[26px]" />;
                }
                const isSelected = dayKey === value;
                const isToday = dayKey === today;
                const isMarked = marked.has(dayKey);
                return (
                  <button
                    key={dayKey}
                    type="button"
                    onClick={() => {
                      onSelect(dayKey);
                      onClose();
                    }}
                    aria-current={isToday ? "date" : undefined}
                    aria-label={formatFullDate(dayKey)}
                    className={`relative flex h-[26px] items-center justify-center rounded-button text-[11px] transition-colors ${
                      isSelected
                        ? "bg-accent font-semibold text-on-accent"
                        : "text-primary hover:bg-surface-raised"
                    } ${isToday && !isSelected ? "border border-border-strong" : ""}`}
                  >
                    {Number(dayKey.slice(-2))}
                    {isMarked ? (
                      <span
                        aria-hidden="true"
                        className={`absolute bottom-[3px] size-[3px] rounded-full ${
                          isSelected ? "bg-on-accent" : "bg-accent"
                        }`}
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            onSelect(today);
            onClose();
          }}
          className="mt-3 w-full rounded-button border border-border-medium bg-surface py-[6px] text-[10px] font-semibold text-accent transition-colors hover:bg-surface-hover"
        >
          Jump to today
        </button>
      </div>
    </>
  );
}
