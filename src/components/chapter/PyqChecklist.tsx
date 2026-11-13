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
 * Chunk 2: question totals run 0–15.
 * Chunk 3: the "Assign for day / Sunday" control is replaced with
 * Add to Today / Add to Tomorrow / Custom date (calendar).
 */
export default function PyqChecklist({ subject, chapter }: PyqChecklistProps) {
  const { chapterState, setPyqTotal, togglePyqDone, assignPyq, activityDates } = useStudy();
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
          const done = pyq.done;
          return (
            <div
              key={pyq.id}
              className={`flex min-h-[47px] flex-wrap items-center gap-3 rounded-control px-3 py-2 ${
                done ? "bg-success-soft" : "bg-surface-subtle"
              }`}
            >
              <button
                type="button"
                role="checkbox"
                aria-checked={done}
                aria-label={`Mark ${pyq.label} as done`}
                onClick={() => togglePyqDone(chapter.id, pyq.id)}
                className={`flex size-[20px] shrink-0 items-center justify-center rounded-checkbox border transition-colors ${
                  done
                    ? "border-success-border bg-success-check text-success"
                    : "border-border-check bg-surface-muted text-transparent hover:border-accent"
                }`}
              >
                <span className="text-[13px] font-semibold leading-none">✓</span>
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
                  ✓&nbsp;&nbsp;Practice complete
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
          Set each question total, then tick a set when every question is done.
        </p>
        <p className="text-[10px] font-semibold text-muted">
          {setsDone}/{state.pyqs.length} SETS DONE
        </p>
      </div>
    </div>
  );
}
