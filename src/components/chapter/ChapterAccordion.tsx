"use client";

import { useState } from "react";
import LectureChecklist from "@/components/chapter/LectureChecklist";
import PyqChecklist from "@/components/chapter/PyqChecklist";
import { useStudy } from "@/lib/store";
import type { ChapterSeed, SubjectName } from "@/lib/types";

interface ChapterAccordionProps {
  subject: SubjectName;
  chapter: ChapterSeed;
  defaultExpanded?: boolean;
}

/**
 * The design's "ChapterAccordionStudyFlow": 76px header (35px index badge,
 * Space Grotesk title, 112x26 status pill, chevron) plus the 01 / THEORY and
 * 02 / PYQ PRACTICE sections. The status pill copy comes from the Figma design
 * and now reflects live progress.
 */
export default function ChapterAccordion({
  subject,
  chapter,
  defaultExpanded = false,
}: ChapterAccordionProps) {
  const { chapterProgress } = useStudy();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const progress = chapterProgress(subject, chapter.id);

  const complete = progress.status === "Chapter complete";

  return (
    <div
      className={`overflow-hidden rounded-card border bg-surface transition-colors duration-300 ${
        complete ? "border-border-success" : "border-hairline"
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((previous) => !previous)}
        aria-expanded={expanded}
        className="flex min-h-[76px] w-full flex-wrap items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-surface-hover"
      >
        <span className="flex size-[35px] shrink-0 items-center justify-center rounded-control bg-accent-soft text-[12px] font-medium text-accent">
          {chapter.index}
        </span>
        <span className="min-w-[160px] flex-1 truncate font-display text-[17px] font-medium text-primary">
          {chapter.title}
        </span>
        <span
          className={`flex h-[26px] w-[112px] shrink-0 items-center justify-center rounded-pill text-[10px] font-medium ${
            complete ? "bg-success-soft-strong text-success" : "bg-accent-softer text-muted"
          }`}
        >
          {progress.status}
        </span>
        <span className="shrink-0 text-[18px] leading-none text-muted" aria-hidden="true">
          {expanded ? "⌃" : "⌄"}
        </span>
      </button>

      {expanded ? (
        <div className="flex flex-col gap-4 border-t border-hairline px-5 pb-5 pt-4">
          <LectureChecklist subject={subject} chapter={chapter} />
          <PyqChecklist
            subject={subject}
            chapter={chapter}
            defaultOpen={progress.theoryDone}
          />
        </div>
      ) : null}
    </div>
  );
}
