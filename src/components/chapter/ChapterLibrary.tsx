"use client";

import { useState } from "react";
import ChapterAccordion from "@/components/chapter/ChapterAccordion";
import ChapterInfoDialog from "@/components/chapter/ChapterInfoDialog";
import { useStudy } from "@/lib/store";
import { sortByPriority, categorizeByMarks } from "@/lib/curriculum";
import type { MarksLevel } from "@/lib/types";

/** Chapter library for the active subject. Chapter names, order and count come
 * from cbsedatabaseprefetch.json (Physics / Chemistry / Mathematics). */
export default function ChapterLibrary() {
  const { activeSubject, activeChapters, chapterProgress, subjectProgress } = useStudy();
  const progress = subjectProgress(activeSubject);
  const [isSortByPriority, setIsSortByPriority] = useState(false);
  const [hideCompleted, setHideCompleted] = useState({ lectures: false, wholeChapter: false });
  const [openInfoChapterId, setOpenInfoChapterId] = useState<string | null>(null);

  const openChapter = activeChapters.find((c) => c.id === openInfoChapterId) ?? undefined;

  // Marks categorisation (Chemistry / Mathematics only — Physics has no marks data)
  const marksLevels =
    activeSubject === "Physics" ? new Map<string, MarksLevel>() : categorizeByMarks(activeChapters);

  // Apply hide-completed filters
  let filtered = activeChapters;
  if (hideCompleted.lectures || hideCompleted.wholeChapter) {
    filtered = activeChapters.filter((chapter) => {
      const cp = chapterProgress(activeSubject, chapter.id);
      const allLecturesDone = cp.lectures > 0 && cp.lecturesDone >= cp.lectures;
      const chapterComplete = cp.status === "Chapter complete";

      if (hideCompleted.lectures && allLecturesDone) return false;
      if (hideCompleted.wholeChapter && chapterComplete) return false;
      return true;
    });
  }

  // Apply priority sort when toggled
  const displayChapters = isSortByPriority ? sortByPriority(filtered) : filtered;

  const count = String(activeChapters.length).padStart(2, "0");

  const chip =
    "flex items-center gap-2 rounded-button border border-border-medium bg-surface px-3 py-1 text-[11px] font-medium text-muted";

  const toggleLabel =
    "flex items-center gap-2 rounded-button border border-border-medium bg-surface px-3 py-1 text-[11px] font-medium text-muted";

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col">
          <h2 className="font-semibold text-[24px] leading-none text-primary">
            Chapter library
          </h2>
          <p className="mt-1 text-[10px] leading-none text-muted">
            Pick a chapter to start studying
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={chip}>
            <span className="font-semibold text-primary">{count}</span>
            CHAPTERS
          </span>
          <span className={chip}>
            <span className="font-semibold text-primary">{progress.syllabusPct}%</span>
            SYLLABUS
          </span>
          <span className={chip}>
            <span className="font-semibold text-primary">{progress.pyqPct}%</span>
            PYQ
          </span>
          <span className={toggleLabel} role="switch" aria-checked={isSortByPriority} onClick={() => setIsSortByPriority((v) => !v)}>
            {isSortByPriority ? "✓" : "○"} SORT BY PRIORITY
          </span>
        </div>
      </div>

      {/* Hide completed dropdown (below the sort slider) */}
      <div
        className="flex w-full items-center justify-between gap-3 rounded-card border border-hairline bg-surface px-4 py-2"
      >
        <span className="text-[10px] uppercase tracking-wider text-muted">Hide completed</span>
        <div className="flex items-center gap-4 text-[11px]">
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hideCompleted.lectures}
              onChange={() =>
                setHideCompleted((p) => ({ ...p, lectures: !p.lectures }))
              }
              className="size-4 rounded-control text-accent"
            />
            <span className="text-muted">Lectures</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hideCompleted.wholeChapter}
              onChange={() =>
                setHideCompleted((p) => ({ ...p, wholeChapter: !p.wholeChapter }))
              }
              className="size-4 rounded-control text-accent"
            />
            <span className="text-muted">Whole chapter</span>
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {displayChapters.map((chapter, index) => (
          <ChapterAccordion
            key={chapter.id}
            subject={activeSubject}
            chapter={chapter}
            defaultExpanded={index === 0}
            marksLevel={marksLevels.get(chapter.id)}
            marksValue={chapter.marks ?? chapter.chapterMarksEstimate ?? chapter.unitMarks ?? null}
            onInfoClick={() => setOpenInfoChapterId(chapter.id)}
          />
        ))}
      </div>

      {/* Marks legend (below the chapter list) */}
      {activeSubject !== "Physics" && marksLevels.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-wider text-muted mt-2">
          <span className="flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-marks-high"></span>
            HIGH
          </span>
          <span className="flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-marks-medium"></span>
            MEDIUM
          </span>
          <span className="flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-marks-low"></span>
            LOW
          </span>
        </div>
      )}

      {openChapter && (
        <ChapterInfoDialog
          open={true}
          chapter={openChapter}
          onClose={() => setOpenInfoChapterId(null)}
        />
      )}
    </section>
  );
}
