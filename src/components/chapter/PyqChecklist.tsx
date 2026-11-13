"use client";

import AssignToDateControl from "@/components/common/AssignToDateControl";
import Stepper from "@/components/common/Stepper";
import { useStudy } from "@/lib/store";
import type { ChapterSeed, SubjectName } from "@/lib/types";

interface PyqChecklistProps {
  subject: SubjectName;
  chapter: ChapterSeed;
}

/**
 * The 02 / PYQ PRACTICE section of the design's study flow.
 *
 * Change Plan 2: ticking a row queues the set into the chosen day's Todo (or
 * records a historical "already done" mark when no day is chosen); the Todo
 * checkbox is what finally completes it.
 */
export default function PyqChecklist({ subject, chapter }: PyqChecklistProps) {
  const {
    chapterState,
    setPyqTotal,
    togglePyqDone,
    assignPyq,
    pyqRowStatus,
    activityDates,
  } = useStudy();
  const state = chapterState(subject, chapter.id);
  const setsDone = state.pyqs.filter((pyq) => pyq.done).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex min-h-[32px] flex-wrap items-center gap-3 text-[11px]">
        <p className="flex-1 font-medium tracking-[0.14em] text-accent">02  /  PYQ PRACTICE</p>
        <p className="text-[9px] tracking-[0.12em] text-muted">
          ASSIGN FOR TODAY / TOMORROW / CUSTOM DATE
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {state.pyqs.map((pyq) => {
          const status = pyqRowStatus(chapter.id, pyq.id);
          const done = status === "done";
          const rowTone =
            status === "done"
              ? "bg-success-soft"
              : status === "queued"
                ? "bg-accent-softer"
                : "bg-surface-subtle";
          const boxTone =
            status === "done"
              ? "border-success-border bg-success-check text-success"
              : status === "queued"
                ? "border-accent bg-accent-soft text-accent"
                : "border-border-check bg-surface-muted text-transparent hover:border-accent";
          return (
            <div
              key={pyq.id}
              className={`flex min-h-[47px] flex-wrap items-center gap-3 rounded-control px-3 py-2 ${rowTone}`}
            >
              <button
                type="button"
                role="checkbox"
                aria-checked={status === "done"}
                aria-label={`Toggle ${pyq.label}`}
                onClick={() => togglePyqDone(chapter.id, pyq.id)}
                className={`flex size-[20px] shrink-0 items-center justify-center rounded-checkbox border transition-colors ${boxTone}`}
              >
                <span className="text-[13px] font-semibold leading-none">{"\u2713"}</span>
              </button>

              <p
                className={`min-w-[140px] flex-1 text-[12px] font-medium ${
                  done ? "text-muted" : "text-primary"
                }`}
              >
                {pyq.label}
              </p>

              <span className="text-[10px] text-muted">Total</span>
              <Stepper
                value={pyq.total}
                label={`${pyq.label} total`}
                onChange={(next) => setPyqTotal(chapter.id, pyq.id, next)}
              />

              {done ? (
                <div className="flex h-[32px] w-[288px] shrink-0 items-center justify-center text-[11px] text-success">
                  {"\u2713"}&nbsp;&nbsp;Practice complete
                </div>
              ) : (
                <AssignToDateControl
                  label={pyq.label}
                  markedDates={activityDates}
                  assignedDate={pyq.assignedDate}
                  assignedSource={pyq.assignedSource}
                  onAssign={(date, source) => assignPyq(chapter.id, pyq.id, date, source)}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <p className="flex-1 text-[11px] text-muted">
          Assign a day, then tick a set to queue it - complete it from the Todo.
        </p>
        <p className="text-[10px] font-semibold text-muted">
          {setsDone}/{state.pyqs.length} SETS DONE
        </p>
      </div>
    </div>
  );
}
