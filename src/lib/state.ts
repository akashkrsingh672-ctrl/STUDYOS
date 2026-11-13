import { DEFAULT_CHAPTER_LECTURES, SUBJECTS } from "./curriculum.ts";
import {
  buildDailyLog,
  clampCount,
  emptyDailyLog,
  flattenTodos,
  subjectRollup,
} from "./planLogic.ts";
import { STORAGE_VERSION } from "./storage.ts";
import type {
  ChapterSeed,
  ChapterState,
  DailyLogEntry,
  PyqSetState,
  StudyState,
  SubjectName,
  SubjectProgress,
} from "./types";

export function createPyqSetState(pyq: ChapterSeed["pyqs"][number]): PyqSetState {
  return {
    ...pyq,
    total: clampCount(pyq.defaultTotal),
    done: false,
    assignedDate: null,
    assignedSource: null,
  };
}

export function createChapterState(seed: ChapterSeed): ChapterState {
  return {
    lectures: clampCount(DEFAULT_CHAPTER_LECTURES),
    lecturesSaved: false,
    lectureAssign: null,
    lectureDoneHistory: [],
    pyqs: seed.pyqs.map(createPyqSetState),
  };
}

/** Chapter fields that may be missing from data saved before Change Plan 2. */
type StoredChapter = Partial<ChapterState> & { lecturesPlanned?: boolean };

/** Keeps only real, in-range lecture indices from a persisted history list. */
function sanitizeLectureHistory(value: unknown, total: number): number[] {
  if (!Array.isArray(value)) return [];
  const set = new Set<number>();
  for (const item of value) {
    const index = Math.round(Number(item));
    if (Number.isFinite(index) && index >= 1 && index <= total) set.add(index);
  }
  return [...set].sort((a, b) => a - b);
}

export function createInitialState(): StudyState {
  const chapters: StudyState["chapters"] = {};
  const subjects = {} as Record<SubjectName, SubjectProgress>;

  for (const subject of SUBJECTS) {
    const subjectChapters: Record<string, ChapterState> = {};
    for (const chapter of subject.chapters) {
      subjectChapters[chapter.id] = createChapterState(chapter);
    }
    chapters[subject.name] = subjectChapters;

    const planned = subject.chapters.reduce(
      (sum, chapter) => sum + subjectChapters[chapter.id].lectures,
      0,
    );
    subjects[subject.name] = {
      lectures: planned,
      lecturesCompleted: 0,
      syllabusPct: 0,
      pyqPct: 0,
    };
  }

  return {
    version: STORAGE_VERSION,
    activeSubject: SUBJECTS[0].name,
    dailyLog: {},
    todos: {},
    subjects,
    chapters,
  };
}

/**
 * Recomputes every derived field (per-date log entries and subject roll-ups) so
 * the persisted shape always matches the data model while the daywise log stays
 * the single source of truth.
 */
export function normalizeState(state: StudyState): StudyState {
  const todos = { ...state.todos };
  const dailyLog: Record<string, DailyLogEntry> = { ...state.dailyLog };

  for (const date of Object.keys(todos)) {
    const items = todos[date] ?? [];
    if (items.length === 0) {
      delete todos[date];
      delete dailyLog[date];
      continue;
    }
    dailyLog[date] = buildDailyLog(items, dailyLog[date]);
  }

  const chapters = { ...state.chapters };
  const subjects = { ...state.subjects };
  const allTodos = flattenTodos(todos);

  for (const seed of SUBJECTS) {
    const subjectChapters = chapters[seed.name] ?? {};
    const rollup = subjectRollup(
      allTodos.filter((todo) => todo.subject === seed.name),
      seed.name,
      seed.chapters.map((chapter) => ({
        id: chapter.id,
        lectures: subjectChapters[chapter.id]?.lectures ?? 0,
        doneHistory: subjectChapters[chapter.id]?.lectureDoneHistory ?? [],
        sets: (subjectChapters[chapter.id]?.pyqs ?? []).map((pyq) => ({
          id: pyq.id,
          done: pyq.done,
        })),
      })),
    );

    subjects[seed.name] = {
      lectures: rollup.plannedLectures,
      lecturesCompleted: rollup.completedLectures,
      syllabusPct: rollup.syllabusPct,
      pyqPct: rollup.pyqPct,
    };
  }

  return {
    version: STORAGE_VERSION,
    activeSubject: subjects[state.activeSubject]
      ? state.activeSubject
      : SUBJECTS[0].name,
    dailyLog,
    todos,
    subjects,
    chapters,
  };
}

/**
 * Merges a stored log onto a fresh default state, so chapters/PYQ categories
 * added by a future design revision appear automatically without wiping the
 * learner's history.
 */
export function hydrateState(loaded: StudyState | null): StudyState {
  const base = createInitialState();
  if (!loaded) return base;

  const chapters: StudyState["chapters"] = {};
  for (const subject of SUBJECTS) {
    const storedSubject = loaded.chapters?.[subject.name] ?? {};
    const subjectChapters: Record<string, ChapterState> = {};
    for (const chapter of subject.chapters) {
      const stored = storedSubject[chapter.id];
      const fresh = createChapterState(chapter);
      if (!stored) {
        subjectChapters[chapter.id] = fresh;
        continue;
      }
      const pyqs = chapter.pyqs.map((pyq) => {
        const storedPyq = stored.pyqs?.find((item) => item.id === pyq.id);
        return storedPyq
          ? {
              ...pyq,
              total: clampCount(storedPyq.total),
              done: Boolean(storedPyq.done),
              assignedDate: storedPyq.assignedDate ?? null,
              assignedSource: storedPyq.assignedSource ?? null,
            }
          : createPyqSetState(pyq);
      });
      subjectChapters[chapter.id] = {
        lectures: clampCount(stored.lectures ?? fresh.lectures),
        lecturesSaved: Boolean(
          (stored as StoredChapter).lecturesSaved ?? (stored as StoredChapter).lecturesPlanned,
        ),
        lectureAssign: stored.lectureAssign ?? null,
        lectureDoneHistory: sanitizeLectureHistory(
          (stored as StoredChapter).lectureDoneHistory,
          clampCount(stored.lectures ?? fresh.lectures),
        ),
        pyqs,
      };
    }
    chapters[subject.name] = subjectChapters;
  }

  return normalizeState({
    version: STORAGE_VERSION,
    activeSubject: loaded.activeSubject ?? base.activeSubject,
    dailyLog: loaded.dailyLog ?? {},
    todos: loaded.todos ?? {},
    subjects: base.subjects,
    chapters,
  });
}

export { emptyDailyLog };
