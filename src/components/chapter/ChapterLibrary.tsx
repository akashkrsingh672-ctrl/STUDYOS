"use client";

import ChapterAccordion from "@/components/chapter/ChapterAccordion";
import { useStudy } from "@/lib/store";

/**
 * Chapter library for the active subject. Chapter names, order and count come
 * from the Figma design (Physics / Chemistry / Mathematics, 4 chapters each).
 */
export default function ChapterLibrary() {
  const { activeSubject, activeChapters, subjectProgress } = useStudy();
  const progress = subjectProgress(activeSubject);
  const count = String(activeChapters.length).padStart(2, "0");

  const chip =
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
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {activeChapters.map((chapter, index) => (
          <ChapterAccordion
            key={chapter.id}
            subject={activeSubject}
            chapter={chapter}
            defaultExpanded={index === 0}
          />
        ))}
      </div>
    </section>
  );
}
