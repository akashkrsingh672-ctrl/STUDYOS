// Shared domain types for the StudyOS working log.
// Kept dependency-free (type declarations only) so it can be imported anywhere.

export type SubjectName = "Physics" | "Chemistry" | "Mathematics";

/** Marks badge level used for the colour-coded chapter mark badge (Chemistry / Mathematics only). */
export type MarksLevel = "High" | "Medium" | "Low";

/** Chapter priority from cbsedatabaseprefetch.json: P1 → P2 → P3. */
export type ChapterPriority = "P1" | "P2" | "P3";

/** Where a study item was assigned to a day from. */
export type TodoSource = "today" | "tomorrow" | "custom";

export type TodoKind = "lecture" | "pyq" | "custom";

/** A PYQ (past-year question) set category, as designed in Figma. */
export interface PyqSetSeed {
  id: string;
  label: string;
  defaultTotal: number;
}

export interface ChapterSeed {
  id: string;
  /** Display index, e.g. "01". */
  index: string;
  title: string;
  pyqs: PyqSetSeed[];
  /** Chapter number from cbsedatabaseprefetch.json. */
  chapterNumber: number;
  /** Unit / topic grouping from the JSON. */
  unit: string;
  /** Raw marks from the JSON (may be null). */
  marks: number | null;
  /** chapter_marks_estimate from the JSON (may be null). */
  chapterMarksEstimate: number | null;
  /** unit_marks from the JSON (may be null). */
  unitMarks: number | null;
  questionTypes: string[];
  keyTopics: string[];
  difficulty: "High" | "Medium" | "Low";
  priority: ChapterPriority;
}

export interface SubjectSeed {
  name: SubjectName;
  /** Display index, e.g. "01". */
  index: string;
  detail: string;
  chapters: ChapterSeed[];
}

/** Persisted per-PYQ-set state. */
export interface PyqSetState extends PyqSetSeed {
  /** Section question total (0-100). A conserved property, not a plan. */
  total: number;
  /**
   * Legacy "whole section done" mark from before per-question allocations.
   * Still counted as a full completion so older saves keep their progress, but
   * the current UI never writes it (questions are completed through the Todo).
   */
  done: boolean;
  /** @deprecated Allocations now live in `todos`; kept for storage compatibility. */
  assignedDate: string | null;
  /** @deprecated Allocations now live in `todos`; kept for storage compatibility. */
  assignedSource: TodoSource | null;
}

/** Persisted per-chapter state. */
export interface ChapterState {
  /** Total theory lectures in the chapter (0-15). A conserved property, not a plan. */
  lectures: number;
  /** True once the learner saved the chapter's lecture total (Add N lectures). */
  lecturesSaved: boolean;
  /** Day the lecture rows are queued to. Null means no day has been chosen. */
  lectureAssign: { date: string; source: TodoSource } | null;
  /**
   * Lecture indices marked done with no day selected (historical / already-done
   * entry). Counts toward overall syllabus only, never toward a day.
   */
  lectureDoneHistory: number[];
  pyqs: PyqSetState[];
}

/** A single daywise log item. */
export interface Todo {
  id: string;
  kind: TodoKind;
  subject: SubjectName;
  chapterId: string;
  chapterTitle: string;
  label: string;
  /** Lectures: 1. PYQ: number of questions allocated to this day (0-100). */
  amount: number;
  /**
   * PYQ only: how many of `amount` questions are actually done (0..amount).
   * Lets a learner log partial progress; `completed` only turns true once this
   * reaches `amount`.
   */
  completedCount?: number;
  /** 1-based position for lecture checklists. */
  lectureIndex?: number;
  setId?: string;
  /** ISO date key (YYYY-MM-DD) this item belongs to. */
  date: string;
  source: TodoSource;
  completed: boolean;
  createdAt: string;
}

/** Derived roll-up for one date (the daywise calendar log entry). */
export interface DailyLogEntry {
  lecturesCompleted: number;
  lecturesTarget: number;
  questionsPracticed: number;
  /** chapter id -> questions practised */
  chaptersPracticed: Record<string, number>;
  allDone: boolean;
  moraleShown: boolean;
}

export interface SubjectProgress {
  /** Planned lecture total for the subject. */
  lectures: number;
  lecturesCompleted: number;
  syllabusPct: number;
  pyqPct: number;
}

export interface StudyState {
  version: number;
  activeSubject: SubjectName;
  dailyLog: Record<string, DailyLogEntry>;
  todos: Record<string, Todo[]>;
  subjects: Record<SubjectName, SubjectProgress>;
  /** subject name -> chapter id -> chapter state */
  chapters: Record<string, Record<string, ChapterState>>;
}

/** Per-section PYQ progress for the chapter question rows and allocation panel. */
export interface PyqSectionStats {
  id: string;
  label: string;
  /** Configured section total (0-100). */
  total: number;
  /** Questions actually completed (legacy done counts as the full total). */
  completed: number;
  /** Allocated to a day but not yet completed. */
  queued: number;
  /** Headroom left to allocate: total - completed - queued. */
  remaining: number;
  /** completed / total, 0-100. */
  pct: number;
}

/** Chapter-level roll-up of every PYQ section. */
export interface PyqChapterStats {
  sections: PyqSectionStats[];
  completed: number;
  total: number;
  queued: number;
  remaining: number;
  pct: number;
  /** True when every configured question is done. */
  allDone: boolean;
}

/** Status pill copy taken from the Figma design. */
export type ChapterStatus = "Ready to start" | "PYQ practice" | "Chapter complete";
