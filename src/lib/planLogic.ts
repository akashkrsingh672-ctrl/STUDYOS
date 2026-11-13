import type {
  ChapterStatus,
  DailyLogEntry,
  PyqSetState,
  Todo,
  TodoSource,
} from "./types";

/**
 * Pure planning/roll-up logic for the working log.
 *
 * This module is intentionally self-contained (type-only imports) so the same
 * functions can be exercised directly from `scripts/logic-tests.ts` in Node.
 *
 * Requirement 2: every count control is capped at 15.
 */
export const MAX_COUNT = 15;
export const MIN_COUNT = 0;

export function clampCount(value: number, max: number = MAX_COUNT): number {
  if (!Number.isFinite(value)) return MIN_COUNT;
  const rounded = Math.round(value);
  if (rounded < MIN_COUNT) return MIN_COUNT;
  if (rounded > max) return max;
  return rounded;
}

export function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

export function emptyDailyLog(): DailyLogEntry {
  return {
    lecturesCompleted: 0,
    lecturesTarget: 0,
    questionsPracticed: 0,
    chaptersPracticed: {},
    allDone: false,
    moraleShown: false,
  };
}

export interface DayStats {
  lecturesCompleted: number;
  lecturesTarget: number;
  questionsPracticed: number;
  chaptersPracticed: Record<string, number>;
  /** Chapter labels with their practised question counts, for the tooltip. */
  breakdown: {
    chapterId: string;
    chapterTitle: string;
    subject: string;
    questions: number;
  }[];
  allDone: boolean;
}

/** Derives everything the daily goal gauge, tooltip and drawer need for a day. */
export function dayStats(todos: Todo[]): DayStats {
  const lectureTodos = todos.filter((todo) => todo.kind === "lecture");
  const completedLectures = lectureTodos.filter((todo) => todo.completed);

  const practices = new Map<
    string,
    { chapterTitle: string; subject: string; questions: number }
  >();
  let questionsPracticed = 0;

  for (const todo of todos) {
    if (todo.kind !== "pyq" || !todo.completed) continue;
    questionsPracticed += todo.amount;
    const current = practices.get(todo.chapterId);
    if (current) {
      current.questions += todo.amount;
    } else {
      practices.set(todo.chapterId, {
        chapterTitle: todo.chapterTitle,
        subject: todo.subject,
        questions: todo.amount,
      });
    }
  }

  const breakdown = [...practices.entries()]
    .map(([chapterId, value]) => ({
      chapterId,
      chapterTitle: value.chapterTitle,
      subject: value.subject,
      questions: value.questions,
    }))
    .sort((a, b) => b.questions - a.questions);

  const chaptersPracticed: Record<string, number> = {};
  for (const item of breakdown) chaptersPracticed[item.chapterId] = item.questions;

  return {
    lecturesCompleted: completedLectures.length,
    lecturesTarget: lectureTodos.length,
    questionsPracticed,
    chaptersPracticed,
    breakdown,
    allDone: todos.length > 0 && todos.every((todo) => todo.completed),
  };
}

/** Builds the persisted calendar-log entry for a date (keeps `moraleShown`). */
export function buildDailyLog(
  todos: Todo[],
  previous?: DailyLogEntry,
): DailyLogEntry {
  const stats = dayStats(todos);
  return {
    lecturesCompleted: stats.lecturesCompleted,
    lecturesTarget: stats.lecturesTarget,
    questionsPracticed: stats.questionsPracticed,
    chaptersPracticed: stats.chaptersPracticed,
    allDone: stats.allDone,
    moraleShown: previous?.moraleShown ?? false,
  };
}

export function gaugePct(done: number, total: number): number {
  if (total <= 0) return 0;
  return clampCount(Math.round((done / total) * 100), 100);
}

let todoCounter = 0;

/** Stable id generator (no crypto dependency, safe in every runtime). */
export function makeTodoId(prefix: string, stamp: string): string {
  todoCounter += 1;
  return `${prefix}-${stamp}-${todoCounter}`;
}

export function createLectureTodo(input: {
  subject: Todo["subject"];
  chapterId: string;
  chapterTitle: string;
  lectureIndex: number;
  date: string;
  source: TodoSource;
  createdAt: string;
  completed?: boolean;
}): Todo {
  return {
    id: makeTodoId(`${input.chapterId}-lec-${input.lectureIndex}`, input.createdAt),
    kind: "lecture",
    subject: input.subject,
    chapterId: input.chapterId,
    chapterTitle: input.chapterTitle,
    label: `Lecture ${input.lectureIndex}`,
    amount: 1,
    lectureIndex: input.lectureIndex,
    date: input.date,
    source: input.source,
    completed: input.completed ?? false,
    createdAt: input.createdAt,
  };
}

export function createPyqTodo(input: {
  subject: Todo["subject"];
  chapterId: string;
  chapterTitle: string;
  set: PyqSetState;
  date: string;
  source: TodoSource;
  createdAt: string;
  completed?: boolean;
}): Todo {
  return {
    id: makeTodoId(`${input.chapterId}-pyq-${input.set.id}`, input.createdAt),
    kind: "pyq",
    subject: input.subject,
    chapterId: input.chapterId,
    chapterTitle: input.chapterTitle,
    label: input.set.label,
    amount: input.set.total,
    setId: input.set.id,
    date: input.date,
    source: input.source,
    completed: input.completed ?? false,
    createdAt: input.createdAt,
  };
}

/** All log items, flattened across every date (used for subject roll-ups). */
export function flattenTodos(todos: Record<string, Todo[]>): Todo[] {
  return Object.keys(todos)
    .sort()
    .flatMap((date) => todos[date] ?? []);
}

export function completedLectureIndices(
  todos: Todo[],
  subject: string,
  chapterId: string,
): number[] {
  return todos
    .filter(
      (todo) =>
        todo.kind === "lecture" &&
        todo.completed &&
        todo.subject === subject &&
        todo.chapterId === chapterId &&
        typeof todo.lectureIndex === "number",
    )
    .map((todo) => todo.lectureIndex as number);
}

/** Distinct lectures finished for a chapter, across every date. */
export function completedLectureCount(
  todos: Todo[],
  subject: string,
  chapterId: string,
): number {
  return new Set(completedLectureIndices(todos, subject, chapterId)).size;
}

export function completedQuestionCount(
  todos: Todo[],
  subject: string,
  chapterId: string,
): number {
  return todos
    .filter(
      (todo) =>
        todo.kind === "pyq" &&
        todo.completed &&
        todo.subject === subject &&
        todo.chapterId === chapterId,
    )
    .reduce((sum, todo) => sum + todo.amount, 0);
}

export function isLectureTodoOf(
  todo: Todo,
  subject: string,
  chapterId: string,
): boolean {
  return (
    todo.kind === "lecture" && todo.subject === subject && todo.chapterId === chapterId
  );
}

export function isPyqTodoOf(
  todo: Todo,
  subject: string,
  chapterId: string,
  setId: string,
): boolean {
  return (
    todo.kind === "pyq" &&
    todo.subject === subject &&
    todo.chapterId === chapterId &&
    todo.setId === setId
  );
}

/** Status pill copy from Figma, derived from live progress. */
export function deriveStatus(
  theoryDone: boolean,
  allSetsDone: boolean,
): ChapterStatus {
  if (!theoryDone) return "Ready to start";
  if (!allSetsDone) return "PYQ practice";
  return "Chapter complete";
}

/**
 * Rebuilds a date's log entry after a change, keeping the daywise calendar log
 * in sync (Chunk 5) while preserving the `moraleShown` flag.
 */
export function withDailyLog(
  log: Record<string, DailyLogEntry>,
  date: string,
  todos: Todo[],
): Record<string, DailyLogEntry> {
  return { ...log, [date]: buildDailyLog(todos, log[date]) };
}

export interface SubjectRollup {
  plannedLectures: number;
  completedLectures: number;
  setsTotal: number;
  setsDone: number;
  syllabusPct: number;
  pyqPct: number;
}

/**
 * Subject-wise roll-up for the Syllabus / PYQ gauges (Chunk 1 keeps those
 * subjectwise while the daily goal becomes universal).
 */
export function subjectRollup(
  subjectTodos: Todo[],
  subject: string,
  chapters: { id: string; lectures: number; sets: { id: string; done: boolean }[] }[],
): SubjectRollup {
  let plannedLectures = 0;
  let completedLectures = 0;
  let setsTotal = 0;
  let setsDone = 0;

  for (const chapter of chapters) {
    plannedLectures += clampCount(chapter.lectures);
    completedLectures += completedLectureCount(subjectTodos, subject, chapter.id);
    setsTotal += chapter.sets.length;
    setsDone += chapter.sets.filter((set) => set.done).length;
  }

  return {
    plannedLectures,
    completedLectures,
    setsTotal,
    setsDone,
    syllabusPct: gaugePct(completedLectures, plannedLectures),
    pyqPct: gaugePct(setsDone, setsTotal),
  };
}
