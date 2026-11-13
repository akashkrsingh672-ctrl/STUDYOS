"use client";

import { useState } from "react";
import PyqAllocationPanel from "@/components/chapter/PyqAllocationPanel";
import CalendarPopover from "@/components/common/CalendarPopover";
import Stepper from "@/components/common/Stepper";
import { addDays, formatDayMonth } from "@/lib/date";
import { MAX_QUESTIONS, completedQuestionsOf } from "@/lib/planLogic";
import { useStudy } from "@/lib/store";
import type { ChapterSeed, SubjectName, TodoSource } from "@/lib/types";

interface PyqChecklistProps {
  subject: SubjectName;
  chapter: ChapterSeed;
  /** Question sections auto-open once the chapter's theory is finished. */
  defaultOpen: boolean;
}

interface AssignTarget {
  date: string;
  source: TodoSource;
  label: string;
}

/**
 * The 02 / PYQ PRACTICE section of the design's study flow.
 *
 * The section is reachable before the lectures are finished (it simply starts
 * collapsed), question totals go up to 100 per section, every section shows a
 * progress bar, and assigning is a first-class action: pressing Today /
 * Tomorrow / Custom asks how many questions from each section should be added to
 * that day. Those questions then live in that day's Todo, where they can be
 * completed in full or logged partially.
 */
export default function PyqChecklist({ subject, chapter, defaultOpen }: PyqChecklistProps) {
  const {
    chapterState,
    pyqStats,
    setPyqTotal,
    addPyqAllocations,
    activityDates,
    todosFor,
    today,
  } = useStudy();

  /**
   * `defaultOpen` (theory finished) opens the section automatically, but an
   * explicit click always wins — no effect, so no cascading render.
   */
  const [userChoice, setUserChoice] = useState<boolean | null>(null);
  const open = userChoice ?? defaultOpen;
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [target, setTarget] = useState<AssignTarget | null>(null);

  const state = chapterState(subject, chapter.id);
  const stats = pyqStats(chapter.id);

  const queuedOn = (dateKey: string) =>
    todosFor(dateKey)
      .filter(
        (todo) =>
          todo.kind === "pyq" && todo.subject === subject && todo.chapterId === chapter.id,
      )
      .reduce((sum, todo) => sum + Math.max(0, todo.amount - completedQuestionsOf(todo)), 0);

  const summary =
    stats.total === 0
      ? "Not set"
      : `${stats.completed} / ${stats.total}${stats.queued > 0 ? ` · ${stats.queued} queued` : ""}`;

  const dayButton = (active: boolean) =>
    `flex h-[40px] flex-1 items-center justify-center text-[12px] font-semibold transition-colors ${
      active ? "bg-accent text-on-accent" : "text-accent hover:bg-accent-soft"
    }`;

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setUserChoice(!open)}
        aria-expanded={open}
        className="flex min-h-[32px] w-full flex-wrap items-center gap-3 text-left transition-colors hover:opacity-90"
      >
        <p className="flex-1 text-[11px] font-medium tracking-[0.14em] text-accent">
          02&nbsp;&nbsp;/&nbsp;&nbsp;PYQ PRACTICE
        </p>
        <p className="text-[10px] text-muted">{summary}</p>
        <span className="text-[18px] leading-none text-muted" aria-hidden="true">
          {open ? "⌃" : "⌄"}
        </span>
      </button>

      {open ? (
        <>
          {/* Section totals (0-100 each; the cap is never shown) */}
          <div className="flex flex-col gap-2">
            {state.pyqs.map((pyq) => (
              <div key={pyq.id} className="flex flex-wrap items-center gap-3">
                <p className="min-w-[150px] flex-1 text-[12px] font-medium text-primary">
                  {pyq.label}
                </p>
                <span className="text-[10px] text-muted">Total</span>
                <Stepper
                  value={pyq.total}
                  max={MAX_QUESTIONS}
                  label={`${pyq.label} total`}
                  onChange={(next) => setPyqTotal(chapter.id, pyq.id, next)}
                />
              </div>
            ))}
          </div>

          {/* Assigning is the most important action for questions */}
          <div className="relative flex flex-col gap-2 rounded-control border border-hairline bg-surface-subtle p-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="min-w-[150px] flex-1 text-[11px] font-medium text-primary">
                Assign questions to a day
              </p>
              <p className="text-[10px] text-muted">{stats.remaining} left to assign</p>
            </div>

            <div className="flex h-[40px] w-full overflow-hidden rounded-assign border border-border-medium bg-surface">
              <button
                type="button"
                className={`${dayButton(queuedOn(today) > 0)} rounded-l-assign`}
                onClick={() => setTarget({ date: today, source: "today", label: "Today" })}
              >
                Today
              </button>
              <button
                type="button"
                className={dayButton(queuedOn(addDays(today, 1)) > 0)}
                onClick={() =>
                  setTarget({ date: addDays(today, 1), source: "tomorrow", label: "Tomorrow" })
                }
              >
                Tomorrow
              </button>
              <button
                type="button"
                aria-haspopup="dialog"
                aria-expanded={calendarOpen}
                className={`${dayButton(false)} rounded-r-assign`}
                onClick={() => setCalendarOpen((current) => !current)}
              >
                Custom date
              </button>
            </div>

            <p className="text-[10px] text-muted">
              {stats.queued > 0
                ? `${stats.queued} questions are waiting in a day's Todo — tick them there to complete.`
                : "Pick a day, choose how many questions from each section, then complete them in the Todo."}
            </p>

            {calendarOpen ? (
              <CalendarPopover
                value={target?.source === "custom" ? target.date : null}
                markedDates={activityDates}
                title="Add questions to a date"
                onClose={() => setCalendarOpen(false)}
                onSelect={(dateKey) =>
                  setTarget({ date: dateKey, source: "custom", label: formatDayMonth(dateKey) })
                }
              />
            ) : null}

            {target ? (
              <PyqAllocationPanel
                key={`${target.date}-${target.source}`}
                dayLabel={target.label}
                date={target.date}
                sections={stats.sections}
                onClose={() => setTarget(null)}
                onConfirm={(counts) =>
                  addPyqAllocations(
                    chapter.id,
                    target.date,
                    target.source,
                    stats.sections
                      .map((section) => ({
                        set: state.pyqs.find((pyq) => pyq.id === section.id),
                        count: counts[section.id] ?? 0,
                      }))
                      .filter(
                        (item): item is { set: (typeof state.pyqs)[number]; count: number } =>
                          Boolean(item.set) && item.count > 0,
                      ),
                  )
                }
              />
            ) : null}
          </div>

          {/* Per-section progress bars */}
          <div className="flex flex-col gap-2">
            {state.pyqs.map((pyq) => {
              const section = stats.sections.find((item) => item.id === pyq.id);
              if (!section) return null;
              return (
                <div
                  key={pyq.id}
                  className="flex min-h-[47px] flex-wrap items-center gap-3 rounded-control bg-surface-subtle px-3 py-2"
                >
                  <span className="min-w-[130px] flex-1 truncate text-[12px] font-medium text-primary">
                    {pyq.label}
                  </span>

                  <span
                    role="presentation"
                    className="h-[6px] min-w-[110px] flex-1 overflow-hidden rounded-pill bg-surface-muted"
                  >
                    <span
                      className="block h-full rounded-pill bg-success transition-[width] duration-300"
                      style={{ width: `${section.pct}%` }}
                    />
                  </span>

                  <span className="w-[74px] shrink-0 text-right text-[10px] font-medium text-muted">
                    {section.completed} / {section.total}
                  </span>

                  {section.queued > 0 ? (
                    <span className="shrink-0 rounded-pill bg-accent-soft px-2 py-[2px] text-[9px] font-semibold text-accent">
                      {section.queued} queued
                    </span>
                  ) : (
                    <span className="w-[64px] shrink-0" />
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <p className="flex-1 text-[11px] text-muted">
              {stats.total === 0
                ? "Set the question totals above to start tracking."
                : `${stats.completed} / ${stats.total} questions completed`}
            </p>
            <p className="text-[10px] font-semibold text-muted">
              {stats.total > 0 ? `${stats.pct}% DONE` : ""}
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}
