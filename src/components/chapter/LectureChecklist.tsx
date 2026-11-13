"use client";

import { useState } from "react";
import AssignToDateControl from "@/components/common/AssignToDateControl";
import Stepper from "@/components/common/Stepper";
import { formatDayMonth, todayKey } from "@/lib/date";
import { useStudy } from "@/lib/store";
import type { ChapterSeed, SubjectName } from "@/lib/types";

interface LectureChecklistProps {
  subject: SubjectName;
  chapter: ChapterSeed;
}

/**
 * The 01 / THEORY section of the design's study flow.
 *
 * Chunk 2: the lecture counter runs 0–15 (was 0–4).
 * Chunk 3: the plan is assigned to Today / Tomorrow / a Custom date, and
 * checking a lecture logs it into that day's progress meter.
 */
export default function LectureChecklist({ subject, chapter }: LectureChecklistProps) {
  const {
    chapterState,
    chapterProgress,
    setChapterLectures,
    toggleLecture,
    assignLectures,
    activityDates,
  } = useStudy();
  const [editing, setEditing] = useState(false);

  const state = chapterState(subject, chapter.id);
  const progress = chapterProgress(subject, chapter.id);
  const planned = state.lecturesPlanned || state.lectureAssign !== null;
  const showSetup = !progress.theoryDone || editing;
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
                assignLectures(chapter.id, todayKey(), "today");
                setEditing(false);
              }}
              className="h-[32px] w-[148px] shrink-0 rounded-soft bg-accent text-[11px] font-semibold text-on-accent transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              Add {lectures} lecture{lectures === 1 ? "" : "s"}
            </button>
          </div>
          <p className="text-[11px] text-muted">
            Choose up to 15 lectures in this chapter. Your checklist appears here.
          </p>
        </>
      ) : null}

      {planned && lectures > 0 ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <p className="min-w-[160px] flex-1 text-[11px] text-muted">
              Assign these lectures to a day
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
              const done = index <= progress.lecturesDone;
              return (
                <div
                  key={index}
                  className={`flex min-h-[47px] flex-wrap items-center gap-3 rounded-control px-3 py-2 ${
                    done ? "bg-success-soft" : "bg-surface-subtle"
                  }`}
                >
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={done}
                    aria-label={`Lecture ${index}`}
                    onClick={() => toggleLecture(chapter.id, index)}
                    className={`flex size-[20px] shrink-0 items-center justify-center rounded-checkbox border transition-colors ${
                      done
                        ? "border-success-border bg-success-check text-success"
                        : "border-border-check bg-surface-muted text-transparent hover:border-accent"
                    }`}
                  >
                    <span className="text-[13px] font-semibold leading-none">✓</span>
                  </button>
                  <span
                    className={`min-w-[140px] flex-1 text-[12px] font-medium ${
                      done ? "text-muted" : "text-primary"
                    }`}
                  >
                    Lecture {index}
                  </span>
                  <span className="text-[10px] text-muted">
                    {done
                      ? "Logged"
                      : state.lectureAssign
                        ? `Planned · ${formatDayMonth(state.lectureAssign.date)}`
                        : "Not assigned"}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}
