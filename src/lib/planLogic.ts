import type {
  ChapterStatus,
  DailyLogEntry,
  PyqChapterStats,
  PyqSectionStats,
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
/** Questions can be planned in far larger numbers than lectures (cap hidden in UI). */
export const MAX_QUESTIONS = 100;

export function clampCount(value: number, max: number = MAX_COUNT): number {
  if (!Number.isFinite(value)) return MIN_COUNT;
  const rounded = Math.round(value);
  if (rounded < MIN_COUNT) return MIN_COUNT;
  if (rounded > max) return max;
  return rounded;
}

/** Clamps a PYQ section total / allocation to 0-100. */
export function clampQuestions(value: number): number {
  return clampCount(value, MAX_QUESTIONS);
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
    if (todo.kind !== "pyq") continue;
    const done = completedQuestionsOf(todo);
    if (done <= 0) continue;
    questionsPracticed += done;
    const current = practices.get(todo.chapterId);
    if (current) {
      current.questions += done;
    } else {
      practices.set(todo.chapterId, {
        chapterTitle: todo.chapterTitle,
        subject: todo.subject,
        questions: done,
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
  /** Questions allocated to this day (defaults to the section total). */
  amount?: number;
  completedCount?: number;
  date: string;
  source: TodoSource;
  createdAt: string;
  completed?: boolean;
}): Todo {
  const amount = clampQuestions(input.amount ?? input.set.total);
  const completedCount = Math.max(
    0,
    Math.min(amount, Math.round(input.completedCount ?? (input.completed ? amount : 0))),
  );
  return {
    id: makeTodoId(`${input.chapterId}-pyq-${input.set.id}`, input.createdAt),
    kind: "pyq",
    subject: input.subject,
    chapterId: input.chapterId,
    chapterTitle: input.chapterTitle,
    label: input.set.label,
    amount,
    completedCount,
    setId: input.set.id,
    date: input.date,
    source: input.source,
    completed: amount > 0 && completedCount >= amount,
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
        todo.kind === "pyq" && todo.subject === subject && todo.chapterId === chapterId,
    )
    .reduce((sum, todo) => sum + completedQuestionsOf(todo), 0);
}

/**
 * Questions actually done for a log item. PYQ rows carry a partial counter;
 * lectures/custom rows are all-or-nothing.
 */
export function completedQuestionsOf(todo: Todo): number {
  if (todo.kind !== "pyq") return todo.completed ? todo.amount : 0;
  const count = todo.completedCount ?? (todo.completed ? todo.amount : 0);
  return Math.max(0, Math.min(clampQuestions(todo.amount), Math.round(count)));
}

/** Keeps a PYQ todo internally consistent after hydration or a mutation. */
export function normalizePyqTodo(todo: Todo): Todo {
  if (todo.kind !== "pyq") return todo;
  const amount = clampQuestions(todo.amount);
  const count = Math.max(0, Math.min(amount, completedQuestionsOf(todo)));
  return {
    ...todo,
    amount,
    completedCount: count,
    completed: amount > 0 && count >= amount,
  };
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

/** Row state for a chapter checklist row. */
export type RowStatus = "idle" | "queued" | "done";

/** The newest log item for one lecture row, if any. */
export function findLectureTodo(
  todos: Record<string, Todo[]>,
  subject: string,
  chapterId: string,
  lectureIndex: number,
): Todo | null {
  const dates = Object.keys(todos).sort().reverse();
  for (const date of dates) {
    const todo = (todos[date] ?? []).find(
      (item) => isLectureTodoOf(item, subject, chapterId) && item.lectureIndex === lectureIndex,
    );
    if (todo) return todo;
  }
  return null;
}

/** The newest log item for one PYQ set, if any. */
export function findPyqTodo(
  todos: Record<string, Todo[]>,
  subject: string,
  chapterId: string,
  setId: string,
): Todo | null {
  const dates = Object.keys(todos).sort().reverse();
  for (const date of dates) {
    const todo = (todos[date] ?? []).find((item) =>
      isPyqTodoOf(item, subject, chapterId, setId),
    );
    if (todo) return todo;
  }
  return null;
}

/**
 * Lecture indices finished for a chapter: historical marks (no day) merged
 * with lectures completed through the Todo, deduped and capped to the total.
 */
export function lectureDoneIndices(
  todos: Todo[],
  history: number[],
  subject: string,
  chapterId: string,
  total: number,
): number[] {
  const set = new Set<number>();
  for (const index of history) {
    if (index >= 1 && index <= total) set.add(index);
  }
  for (const index of completedLectureIndices(todos, subject, chapterId)) {
    if (index >= 1 && index <= total) set.add(index);
  }
  return [...set];
}

export function lectureDoneCount(
  todos: Todo[],
  history: number[],
  subject: string,
  chapterId: string,
  total: number,
): number {
  return lectureDoneIndices(todos, history, subject, chapterId, total).length;
}

/** idle -> queued -> done for a lecture row (history or a completed todo = done). */
export function lectureRowStatus(
  todos: Record<string, Todo[]>,
  history: number[],
  subject: string,
  chapterId: string,
  lectureIndex: number,
): RowStatus {
  if (history.includes(lectureIndex)) return "done";
  let pending = false;
  for (const date of Object.keys(todos)) {
    for (const todo of todos[date] ?? []) {
      if (!isLectureTodoOf(todo, subject, chapterId)) continue;
      if (todo.lectureIndex !== lectureIndex) continue;
      if (todo.completed) return "done";
      pending = true;
    }
  }
  return pending ? "queued" : "idle";
}

/** Per-section question progress for the chapter rows and allocation panel. */
export function pyqSectionStats(
  todos: Todo[],
  input: {
    subject: string;
    chapterId: string;
    id: string;
    label: string;
    total: number;
    done: boolean;
  },
): PyqSectionStats {
  const total = clampQuestions(input.total);
  const matching = todos.filter((todo) =>
    isPyqTodoOf(todo, input.subject, input.chapterId, input.id),
  );

  // A pre-allocation "done" mark means the whole section was finished.
  const legacyDone = input.done && total > 0;
  const completedRaw = legacyDone
    ? total
    : matching.reduce((sum, todo) => sum + completedQuestionsOf(todo), 0);
  const completed = Math.min(total, completedRaw);

  const queuedRaw = legacyDone
    ? 0
    : matching.reduce(
        (sum, todo) => sum + Math.max(0, todo.amount - completedQuestionsOf(todo)),
        0,
      );
  const queued = Math.min(queuedRaw, Math.max(0, total - completed));

  return {
    id: input.id,
    label: input.label,
    total,
    completed,
    queued,
    remaining: Math.max(0, total - completed - queued),
    pct: gaugePct(completed, total),
  };
}

/** Rolls every section of one chapter together (bars + chapter summary). */
export function pyqChapterStats(
  todos: Todo[],
  subject: string,
  chapterId: string,
  sets: { id: string; label: string; total: number; done: boolean }[],
): PyqChapterStats {
  const sections = sets.map((set) => pyqSectionStats(todos, { ...set, subject, chapterId }));
  const total = sections.reduce((sum, section) => sum + section.total, 0);
  const completed = sections.reduce((sum, section) => sum + section.completed, 0);
  const queued = sections.reduce((sum, section) => sum + section.queued, 0);

  return {
    sections,
    completed,
    total,
    queued,
    remaining: Math.max(0, total - completed - queued),
    pct: gaugePct(completed, total),
    allDone: total > 0 && completed >= total,
  };
}

export interface PyqAllocation {
  set: PyqSetState;
  /** How many questions of this section to add to the chosen day. */
  count: number;
}

/**
 * Adds (or tops up) one dated Todo per section. An existing unfinished row for
 * the same section and day is extended instead of duplicated, so the same day
 * can be pressed again without losing progress.
 */
export function addPyqAllocations(
  todos: Record<string, Todo[]>,
  input: {
    subject: Todo["subject"];
    chapterId: string;
    chapterTitle: string;
    date: string;
    source: TodoSource;
    allocations: PyqAllocation[];
    createdAt: string;
  },
): Record<string, Todo[]> {
  if (!input.date) return todos;
  const items = [...(todos[input.date] ?? [])];

  for (const { set, count } of input.allocations) {
    const amount = clampQuestions(count);
    if (amount <= 0) continue;

    const index = items.findIndex(
      (todo) => isPyqTodoOf(todo, input.subject, input.chapterId, set.id) && !todo.completed,
    );
    if (index >= 0) {
      const existing = items[index];
      items[index] = normalizePyqTodo({ ...existing, amount: existing.amount + amount });
      continue;
    }

    items.push(
      createPyqTodo({
        subject: input.subject,
        chapterId: input.chapterId,
        chapterTitle: input.chapterTitle,
        set,
        amount,
        date: input.date,
        source: input.source,
        createdAt: input.createdAt,
      }),
    );
  }

  if (items.length === 0) return todos;
  return { ...todos, [input.date]: items };
}

/**
 * Trims a section's allocations when its total is lowered: the oldest days keep
 * their share first, completed counts clamp to the new total, and rows that no
 * longer fit are dropped entirely. Empty days disappear.
 */
export function trimPyqAllocation(
  todos: Record<string, Todo[]>,
  subject: string,
  chapterId: string,
  setId: string,
  newTotal: number,
): Record<string, Todo[]> {
  const total = clampQuestions(newTotal);
  const next: Record<string, Todo[]> = {};
  let capacity = total;

  for (const date of Object.keys(todos).sort()) {
    const kept: Todo[] = [];
    for (const todo of todos[date] ?? []) {
      if (!isPyqTodoOf(todo, subject, chapterId, setId)) {
        kept.push(todo);
        continue;
      }
      if (capacity <= 0) continue;

      const normalized = normalizePyqTodo(todo);
      const amount = Math.min(normalized.amount, capacity);
      if (amount <= 0) continue;
      const completed = Math.min(normalized.completedCount ?? 0, amount);
      capacity -= amount;
      kept.push({
        ...normalized,
        amount,
        completedCount: completed,
        completed: completed >= amount,
      });
    }
    if (kept.length > 0) next[date] = kept;
  }

  return next;
}

/**
 * Moves every matching log item to `date` (keeping its id) - never duplicates.
 * Used when the assigned day changes so a pending row lives on one day only.
 */
export function movePendingTodos(
  todos: Record<string, Todo[]>,
  match: (todo: Todo) => boolean,
  date: string,
): Record<string, Todo[]> {
  if (!date) return todos;
  const next: Record<string, Todo[]> = {};
  for (const existingDate of Object.keys(todos)) {
    for (const todo of todos[existingDate] ?? []) {
      const moved = match(todo);
      const target = moved ? date : existingDate;
      const bucket = next[target] ?? [];
      bucket.push(moved ? { ...todo, date } : todo);
      next[target] = bucket;
    }
  }
  return next;
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
  questionsTotal: number;
  questionsCompleted: number;
  syllabusPct: number;
  pyqPct: number;
}

/**
 * Subject-wise roll-up for the Syllabus / PYQ gauges. Lectures count the
 * history + completed-todo union; PYQ is question-based now (completed
 * questions / configured questions) so the ring matches the section bars.
 */
export function subjectRollup(
  subjectTodos: Todo[],
  subject: string,
  chapters: {
    id: string;
    lectures: number;
    doneHistory: number[];
    sets: { id: string; label: string; total: number; done: boolean }[];
  }[],
): SubjectRollup {
  let plannedLectures = 0;
  let completedLectures = 0;
  let setsTotal = 0;
  let setsDone = 0;
  let questionsTotal = 0;
  let questionsCompleted = 0;

  for (const chapter of chapters) {
    const total = clampCount(chapter.lectures);
    plannedLectures += total;
    completedLectures += lectureDoneIndices(
      subjectTodos,
      chapter.doneHistory,
      subject,
      chapter.id,
      total,
    ).length;

    setsTotal += chapter.sets.length;
    setsDone += chapter.sets.filter((set) => set.done).length;

    const pyq = pyqChapterStats(subjectTodos, subject, chapter.id, chapter.sets);
    questionsTotal += pyq.total;
    questionsCompleted += pyq.completed;
  }

  return {
    plannedLectures,
    completedLectures,
    setsTotal,
    setsDone,
    questionsTotal,
    questionsCompleted,
    syllabusPct: gaugePct(completedLectures, plannedLectures),
    pyqPct: gaugePct(questionsCompleted, questionsTotal),
  };
}
