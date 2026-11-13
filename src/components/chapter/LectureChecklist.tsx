"use client";

import { useState } from "react";
import AssignToDateControl from "@/components/common/AssignToDateControl";
import Stepper from "@/components/common/Stepper";
import { formatDayMonth } from "@/lib/date";
import { useStudy } from "@/lib/store";
import type { ChapterSeed, SubjectName } from "@/lib/types";

interface LectureChecklistProps {
  subject: SubjectName;
  chapter: ChapterSeed;
}

/**
 * The 01 / THEORY section of the design's study flow.
 *
 * Change Plan 2: "Add N lectures" only saves the chapter's real theory-lecture
 * total. Ticking a row queues it into the chosen day's Todo (or records a
 * historical "already done" mark when no day is chosen); the Todo completes it.
 */
export default function LectureChecklist({ subject, chapter }: LectureChecklistProps) {
  const {
    chapterState,
    chapterProgress,
    setChapterLectures,
    saveChapterLectures,
    toggleLecture,
    assignLectures,
    lectureRowStatus,
    activityDates,
  } = useStudy();
  const [editing, setEditing] = useState(false);

  const state = chapterState(subject, chapter.id);
  const progress = chapterProgress(subject, chapter.id);
  const saved = state.lecturesSaved;
  const showSetup = !saved || editing;
  const lectures = state.lectures;

  const heading = (title: string, helper: string) => (
    <div className="flex min-h-[25px] flex-wrap items-center gap-3 text-[11px]">
      <p className="flex-1 font-medium tracking-[0.14em] text-accent">{title}</p>
      <p className="text-muted">{helper}</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {heading("01  /  THEORY", "Start with a lecture plan")}

      {progress.theoryDone && !editing ? (
        <div className="flex min-h-[34px] flex-wrap items-center gap-3 rounded-stepper bg-success-soft-strong px-3 py-1">
          <span className="text-[13px] font-semibold leading-none text-success">✓</span>
          <span className="flex-1 text-[11px] font-medium leading-none text-success">
            THEORY &nbsp;·&nbsp; DONE!
          </span>
          <span className="text-[11px] text-success">
            {progress.lecturesDone}/{progress.lectures} lectures
          </span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="h-[32px] w-[104px] shrink-0 rounded-soft border border-border-medium bg-surface-raised text-[11px] font-semibold text-accent transition-colors hover:bg-surface-hover"
          >
            Edit lectures
          </button>
        </div>
      ) : null}

      {showSetup ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <p className="min-w-[180px] flex-1 text-[13px] font-medium text-primary">
              How many lectures are in this chapter?
            </p>
            <Stepper
              size="lg"
              value={lectures}
              label="lecture count"
              onChange={(next) => setChapterLectures(chapter.id, next)}
            />
            <button
              type="button"
              disabled={lectures === 0}
              onClick={() => {
                saveChapterLectures(chapter.id);
                setEditing(false);
              }}
              className="h-[32px] w-[148px] shrink-0 rounded-soft bg-accent text-[11px] font-semibold text-on-accent transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              Save {lectures} lecture{lectures === 1 ? "" : "s"}
            </button>
          </div>
          <p className="text-[11px] text-muted">
            Total theory lectures in this chapter (max 15), saved for the whole course.
          </p>
        </>
      ) : null}

      {saved && lectures > 0 ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <p className="min-w-[160px] flex-1 text-[11px] text-muted">
              Pick a day, then tick a row to queue it
            </p>
            <AssignToDateControl
              label="the lecture plan"
              assignedDate={state.lectureAssign?.date ?? null}
              assignedSource={state.lectureAssign?.source ?? null}
              markedDates={activityDates}
              onAssign={(date, source) => {
                assignLectures(chapter.id, date, source);
                setEditing(false);
              }}
            />
          </div>

          <div className="flex flex-col gap-2">
            {Array.from({ length: lectures }, (_, position) => position + 1).map((index) => {
              const status = lectureRowStatus(chapter.id, index);
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
              const note =
                status === "done"
                  ? "Done"
                  : state.lectureAssign
                    ? `Tap to queue \u00b7 ${formatDayMonth(state.lectureAssign.date)}`
                    : "Tap if already done";
              return (
                <div
                  key={index}
                  role="checkbox"
                  tabIndex={0}
                  aria-checked={status === "done"}
                  aria-label={`${status === "done" ? "Unmark" : "Mark"} lecture ${index} — ${note}`}
                  onClick={() => toggleLecture(chapter.id, index)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      toggleLecture(chapter.id, index);
                    }
                  }}
                  className={`flex min-h-[47px] cursor-pointer flex-wrap items-center gap-3 rounded-control px-3 py-2 transition-colors hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${rowTone}`}
                >
                  <span
                    aria-hidden="true"
                    className={`flex size-[20px] shrink-0 items-center justify-center rounded-checkbox border transition-colors ${boxTone}`}
                  >
                    <span className="text-[13px] font-semibold leading-none">{"\u2713"}</span>
                  </span>
                  <span
                    className={`min-w-[140px] flex-1 text-[12px] font-medium ${
                      status === "done" ? "text-muted" : "text-primary"
                    }`}
                  >
                    Lecture {index}
                  </span>
                  <span className="text-[10px] text-muted">{note}</span>
                </div>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}
