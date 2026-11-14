"use client";

import { useCallback } from "react";
import type { ChapterSeed } from "@/lib/types";

interface ChapterInfoDialogProps {
  open: boolean;
  chapter: ChapterSeed;
  onClose: () => void;
}

const LEVEL_COLORS: Record<string, string> = {
  High: "text-marks-high bg-marks-high/10 border-marks-high/30",
  Medium: "text-marks-medium bg-marks-medium/10 border-marks-medium/30",
  Low: "text-marks-low bg-marks-low/10 border-marks-low/30",
};

const PRIORITY_COLORS: Record<string, string> = {
  P1: "text-accent bg-accent-soft border-accent/30",
  P2: "text-muted bg-surface-muted border-hairline",
  P3: "text-muted bg-surface-muted border-hairline",
};

/**
 * Organised chapter info panel fetched from cbsedatabaseprefetch.json.
 * Shows unit, marks, difficulty, priority, key topics and question types.
 */
export default function ChapterInfoDialog({
  open,
  chapter,
  onClose,
}: ChapterInfoDialogProps) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  if (!open) return null;

  const marksValue = chapter.marks ?? chapter.chapterMarksEstimate ?? chapter.unitMarks;
  const difficultyColor = LEVEL_COLORS[chapter.difficulty] ?? LEVEL_COLORS.Medium;
  const priorityColor = PRIORITY_COLORS[chapter.priority] ?? PRIORITY_COLORS.P2;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="chapter-info-title"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-drawer border border-border-medium rounded-card shadow-popover"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-hairline">
          <h3
            id="chapter-info-title"
            className="font-display text-[17px] font-medium text-primary"
          >
            {chapter.index}. {chapter.title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chapter info"
            className="shrink-0 p-1 text-muted hover:text-primary transition-colors"
          >
            <span className="text-[20px] leading-none">×</span>
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Meta row: Unit | Marks | Difficulty | Priority */}
          <div className="flex flex-wrap gap-3 items-start">
            <div className="flex-1 min-w-[120px] space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-muted">Unit</span>
              <span className="text-[13px] text-primary">{chapter.unit}</span>
            </div>
            <div className="flex-1 min-w-[120px] space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-muted">Marks</span>
              <span className="text-[13px] text-primary">
                {marksValue != null ? `${marksValue} MARKS` : "— MARKS"}
              </span>
            </div>
            <div className="flex-1 min-w-[100px] space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-muted">Difficulty</span>
              <span
                className={`text-[11px] font-medium rounded-stepper px-2 py-0.5 border ${difficultyColor}`}
              >
                {chapter.difficulty}
              </span>
            </div>
            <div className="flex-1 min-w-[100px] space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-muted">Priority</span>
              <span
                className={`text-[11px] font-medium rounded-stepper px-2 py-0.5 border ${priorityColor}`}
              >
                {chapter.priority}
              </span>
            </div>
          </div>

          {/* Key Topics */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-muted">Key Topics</span>
            <ul className="flex flex-wrap gap-2 text-[13px] text-primary leading-relaxed">
              {chapter.keyTopics.map((topic, i) => (
                <li key={i} className="rounded-control bg-surface px-2 py-1 border border-hairline">
                  {topic}
                </li>
              ))}
            </ul>
          </div>

          {/* Question Types */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-muted">Question Types</span>
            <ul className="flex flex-wrap gap-2 text-[13px] text-primary leading-relaxed">
              {chapter.questionTypes.map((type, i) => (
                <li key={i} className="rounded-control bg-surface px-2 py-1 border border-hairline">
                  {type}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-hairline">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-button border border-border-medium bg-surface px-4 py-2 text-[11px] font-medium text-primary hover:bg-surface-hover transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}