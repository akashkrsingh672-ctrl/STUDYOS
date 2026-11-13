// Shared domain types for the StudyOS working log.
// Kept dependency-free (type declarations only) so it can be imported anywhere.

export type SubjectName = "Physics" | "Chemistry" | "Mathematics";

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
  /** Question total for the set (0-15). */
  total: number;
  done: boolean;
  assignedDate: string | null;
  assignedSource: TodoSource | null;
}

/** Persisted per-chapter state. */
export interface ChapterState {
  /** Planned lectures for the chapter (0-15). */
  lectures: number;
  /** True once the learner confirmed the lecture plan ("Add N lectures"). */
  lecturesPlanned: boolean;
  /** Day the lecture checklist was assigned to. */
  lectureAssign: { date: string; source: TodoSource } | null;
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
  /** Lectures: 1. PYQ: number of questions in the set. */
  amount: number;
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

/** Status pill copy taken from the Figma design. */
export type ChapterStatus = "Ready to start" | "PYQ practice" | "Chapter complete";
