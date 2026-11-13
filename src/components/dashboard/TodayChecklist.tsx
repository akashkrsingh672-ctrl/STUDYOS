"use client";

import MoraleCard from "@/components/todo/MoraleCard";
import { TodoList } from "@/components/todo/TodoList";
import { formatFullDate, relativeLabel } from "@/lib/date";
import { useStudy } from "@/lib/store";

/**
 * Chunk 5 — the daywise log surfaced on the home dashboard: on load this shows
 * today's checklist (and follows the date picked in the drawer), so the log is
 * never hidden behind the drawer only.
 */
export default function TodayChecklist() {
  const {
    today,
    selectedDate,
    statsFor,
    todosFor,
    toggleTodo,
    jumpToToday,
    quote,
    moraleShownFor,
    dismissMorale,
    drawerOpen,
    setDrawerOpen,
    hydrated,
  } = useStudy();

  const date = selectedDate || today;
  const todos = todosFor(date);
  const stats = statsFor(date);
  const celebrate = stats.allDone && !moraleShownFor(date);
  const isToday = !date || date === today;

  const chip =
    "flex items-center gap-2 rounded-button border border-border-medium bg-surface px-3 py-1 text-[11px] font-medium text-muted";

  return (
    <section className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col">
          <h2 className="font-semibold text-[24px] leading-none text-primary">
            Today’s plan
          </h2>
          <p className="mt-1 text-[10px] leading-none text-muted">
            {hydrated
              ? `Working log · ${relativeLabel(date, today)} · ${formatFullDate(date)}`
              : "Working log"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={chip}>
            <span className="font-semibold text-primary">
              {stats.lecturesCompleted}/{stats.lecturesTarget}
            </span>
            LECTURES
          </span>
          <span className={chip}>
            <span className="font-semibold text-primary">{stats.questionsPracticed}</span>
            QUESTIONS
          </span>
          {isToday ? null : (
            <button
              type="button"
              onClick={jumpToToday}
              className="rounded-button border border-border-medium bg-surface px-3 py-1 text-[10px] font-semibold text-accent transition-colors hover:bg-surface-hover"
            >
              Back to today
            </button>
          )}
          <button
            type="button"
            onClick={() => setDrawerOpen(!drawerOpen)}
            className="rounded-button border border-border-medium bg-surface px-3 py-1 text-[10px] font-semibold text-accent transition-colors hover:bg-surface-hover"
          >
            Open todo drawer
          </button>
        </div>
      </div>

      {celebrate ? (
        <MoraleCard
          quote={quote(date)}
          lecturesCompleted={stats.lecturesCompleted}
          questionsPracticed={stats.questionsPracticed}
          onDismiss={() => dismissMorale(date)}
        />
      ) : null}

      {todos.length === 0 ? (
        <p className="rounded-card border border-dashed border-border-medium p-4 text-[11px] leading-relaxed text-muted">
          Nothing logged for {hydrated ? relativeLabel(date, today).toLowerCase() : "this day"} yet.
          Set your lecture plan or tick a PYQ set inside a chapter below — every action lands in this
          daywise log and survives a refresh.
        </p>
      ) : (
        <>
          <TodoList todos={todos} onToggle={(todoId) => toggleTodo(date, todoId)} />
          <p className="text-[10px] text-muted">
            Tick an item here to complete it — the daily goal and syllabus update together.
          </p>
        </>
      )}
    </section>
  );
}
