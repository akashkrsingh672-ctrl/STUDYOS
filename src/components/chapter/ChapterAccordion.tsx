import { useState } from "react";

interface ChapterAccordionProps {
  chapterNumber: string;
  chapterTitle: string;
  stage: string; // e.g. "Lectures 3-3", "Setup 3", "PYQ 15"
  view?: "Collapsed" | "Expanded";
  completed?: boolean;
}

export default function ChapterAccordion({
  chapterNumber,
  chapterTitle,
  stage,
  view = "Collapsed",
  completed = false,
}: ChapterAccordionProps) {
  const [expanded, setExpanded] = useState(view === "Expanded");

  const parts = stage.split(" ");
  const stageLabel = parts[0];
  const stageValue = parts.slice(1).join(" ");

  return (
    <div
      className={`border rounded-card overflow-hidden bg-surface transition-all duration-300 ${
        completed ? "border-border-success" : "border-hairline"
      }`}
    >
      <button
        onClick={() => setExpanded((p) => !p)}
        className="flex w-full items-center justify-between px-4 py-4 hover:bg-surface-hover transition-colors"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3">
          <span className="text-muted text-[10px] font-semibold whitespace-nowrap">
            {chapterNumber}
          </span>
          <span className="font-semibold text-[14px] text-primary leading-none">
            {chapterTitle}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-medium ${completed ? "text-success" : "text-muted"}`}>
            {stageLabel} {stageValue}
          </span>
          <span className={`text-[10px] ${completed ? "text-success" : "text-accent"}`}>
            {expanded ? "⌄" : "⌃"}
          </span>
        </div>
      </button>
      {expanded && (
        <div className="border-t border-hairline bg-surface-hover/50 p-4">
          <div className="flex gap-4 text-xs text-muted">
            <span>3 lectures</span>
            <span className="px-1">•</span>
            <span>2 practice sets</span>
            <span className="px-1">•</span>
            <span>1 PYQ</span>
          </div>
        </div>
      )}
    </div>
  );
}