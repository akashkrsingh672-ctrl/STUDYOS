"use client";

import { useEffect, useRef, useState } from "react";
import CalendarPopover from "@/components/common/CalendarPopover";
import MoraleCard from "@/components/todo/MoraleCard";
import { TodoList } from "@/components/todo/TodoList";
import { formatFullDate, relativeLabel } from "@/lib/date";
import { useStudy } from "@/lib/store";

/**
 * Chunk 4 — the hamburger todo drawer: the selected day's checklist, a quick
 * add, the universal daily goal meter, and the celebration card once the day is
 * complete. Everything it writes goes into the daywise log (Chunk 5).
 */
export default function TodoDrawer() {
  const {
    drawerOpen,
    setDrawerOpen,
    selectedDate,
    setSelectedDate,
    goToDay,
    jumpToToday,
    todosFor,
    statsFor,
    toggleTodo,
    addTodo,
    quote,
    moraleShownFor,
    dismissMorale,
    activityDates,
    today,
  } = useStudy();

  const [draft, setDraft] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen, setDrawerOpen]);

  if (!drawerOpen) return null;

  const todos = todosFor(selectedDate);
  const stats = statsFor(selectedDate);
  const pct =
    stats.lecturesTarget > 0
      ? Math.round((stats.lecturesCompleted / stats.lecturesTarget) * 100)
      : 0;
  const celebrate = stats.allDone && !moraleShownFor(selectedDate);

  const navButton =
    "flex size-[28px] shrink-0 items-center justify-center rounded-button border border-border-medium bg-surface text-muted transition-colors hover:border-border-strong hover:text-accent";

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button
        type="button"
        aria-label="Close todo drawer"
        onClick={() => setDrawerOpen(false)}
        className="absolute inset-0 cursor-default bg-background/70 backdrop-blur-[2px]"
      />

      <aside
        id="todo-drawer"
        aria-label="Todo drawer"
        className="animate-drawer-in relative z-50 flex h-full w-[380px] max-w-[92vw] flex-col border-l border-hairline bg-drawer shadow-drawer"
      >
        <header className="flex items-start justify-between gap-3 border-b border-hairline px-5 py-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
              Todo
            </p>
            <h2 className="mt-1 font-display text-[18px] font-bold leading-none text-primary">
              {relativeLabel(selectedDate, today)}
            </h2>
            <p className="mt-[6px] text-[10px] text-muted">
              Daywise log · {formatFullDate(selectedDate)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close todo drawer"
            className="shrink-0 rounded-button px-[8px] py-[4px] text-[16px] leading-none text-muted transition-colors hover:bg-surface hover:text-primary"
          >
            ×
          </button>
        </header>

        <div className="relative flex items-center gap-2 border-b border-hairline px-5 py-3">
          <button
            type="button"
            className={navButton}
            aria-label="Previous day"
            onClick={() => goToDay(-1)}
          >
            <span className="text-[13px] leading-none">‹</span>
          </button>
          <button
            type="button"
            onClick={jumpToToday}
            className="h-[28px] flex-1 rounded-button border border-border-medium bg-surface text-[10px] font-semibold text-accent transition-colors hover:bg-surface-hover"
          >
            Today
          </button>
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={calendarOpen}
            onClick={() => setCalendarOpen((open) => !open)}
            className={`${navButton} w-[74px] gap-1 text-[10px] font-semibold`}
          >
            Calendar
          </button>
          <button
            type="button"
            className={navButton}
            aria-label="Next day"
            onClick={() => goToDay(1)}
          >
            <span className="text-[13px] leading-none">›</span>
          </button>

          {calendarOpen ? (
            <CalendarPopover
              value={selectedDate}
              markedDates={activityDates}
              title="Jump to a logged day"
              onClose={() => setCalendarOpen(false)}
              onSelect={setSelectedDate}
            />
          ) : null}
        </div>

        {/* Universal daily goal meter (mirrors the sidebar gauge) */}
        <div className="border-b border-hairline px-5 py-4">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted">
              Universal daily goal
            </span>
            <span className="font-semibold text-[12px] text-primary">
              {stats.lecturesCompleted}/{stats.lecturesTarget}
            </span>
          </div>
          <div className="mt-2 h-[6px] w-full overflow-hidden rounded-full border border-border-medium bg-surface">
            <div
              className="h-full bg-accent transition-all duration-700 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-2 text-[10px] text-muted">
            Question practice today {stats.questionsPracticed}
          </p>
        </div>

        <form
          className="flex items-center gap-2 px-5 pt-4"
          onSubmit={(event) => {
            event.preventDefault();
            addTodo(selectedDate, draft);
            setDraft("");
            inputRef.current?.focus();
          }}
        >
          <input
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Add a task for this day"
            aria-label="New task"
            className="h-[32px] min-w-0 flex-1 rounded-soft border border-border-medium bg-surface px-3 text-[12px] text-primary transition-colors placeholder:text-muted focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={draft.trim().length === 0}
            className="h-[32px] shrink-0 rounded-soft bg-accent px-3 text-[11px] font-semibold text-on-accent transition-opacity disabled:opacity-40"
          >
            Add
          </button>
        </form>

        <div className="flex-1 overflow-y-auto scrollbar-hide px-5 py-4">
          {celebrate ? (
            <div className="mb-3">
              <MoraleCard
                compact
                quote={quote(selectedDate)}
                lecturesCompleted={stats.lecturesCompleted}
                questionsPracticed={stats.questionsPracticed}
                onDismiss={() => dismissMorale(selectedDate)}
              />
            </div>
          ) : null}

          {todos.length === 0 ? (
            <p className="rounded-card border border-dashed border-border-medium p-4 text-[11px] leading-relaxed text-muted">
              Nothing logged for this day yet. Use{" "}
              <span className="text-accent">Add to Today</span>,{" "}
              <span className="text-accent">Tomorrow</span> or{" "}
              <span className="text-accent">Custom date</span> inside a chapter, or add a task
              above.
            </p>
          ) : (
            <TodoList todos={todos} onToggle={(todoId) => toggleTodo(selectedDate, todoId)} />
          )}

          {!celebrate && stats.allDone ? (
            <p className="mt-3 text-[10px] font-medium text-success">
              All items checked for this day ✓
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t border-hairline px-5 py-3 text-[10px] text-muted">
          <span>Saved in your browser</span>
          <span>
            {stats.lecturesTarget} lectures · {stats.questionsPracticed} questions
          </span>
        </div>
      </aside>
    </div>
  );
}
