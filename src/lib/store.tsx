"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { SUBJECTS, chaptersOf, findChapter } from "@/lib/curriculum";
import { addDays, countDaysBetween, todayKey } from "@/lib/date";
import {
  clampCount,
  createLectureTodo,
  createPyqTodo,
  dayStats,
  deriveStatus,
  emptyDailyLog,
  flattenTodos,
  isLectureTodoOf,
  isPyqTodoOf,
  lectureDoneCount,
  lectureRowStatus as planLectureRowStatus,
  makeTodoId,
  movePendingTodos,
  pyqRowStatus as planPyqRowStatus,
} from "@/lib/planLogic";
import type { DayStats, RowStatus } from "@/lib/planLogic";
import { quoteForDate } from "@/lib/quotes";
import type { Quote } from "@/lib/quotes";
import { createChapterState, createInitialState, hydrateState, normalizeState } from "@/lib/state";
import { loadState, saveState } from "@/lib/storage";
import type {
  ChapterSeed,
  ChapterState,
  ChapterStatus,
  DailyLogEntry,
  StudyState,
  SubjectName,
  SubjectProgress,
  Todo,
  TodoSource,
} from "@/lib/types";

export interface ChapterProgress {
  lectures: number;
  lecturesDone: number;
  setsDone: number;
  setsTotal: number;
  theoryDone: boolean;
  status: ChapterStatus;
}

export interface StudyContextValue {
  /** False during SSR / first paint so dates never mismatch on hydration. */
  hydrated: boolean;
  today: string;
  selectedDate: string;
  setSelectedDate: (dateKey: string) => void;
  goToDay: (delta: number) => void;
  jumpToToday: () => void;
  dayOffset: (dateKey: string) => number;

  activeSubject: SubjectName;
  setActiveSubject: (subject: SubjectName) => void;
  activeChapters: ChapterSeed[];

  chapterState: (subject: SubjectName, chapterId: string) => ChapterState;
  chapterProgress: (subject: SubjectName, chapterId: string) => ChapterProgress;
  setChapterLectures: (chapterId: string, value: number) => void;
  toggleLecture: (chapterId: string, lectureIndex: number) => void;
  assignLectures: (chapterId: string, date: string, source: TodoSource) => void;
  setPyqTotal: (chapterId: string, setId: string, value: number) => void;
  togglePyqDone: (chapterId: string, setId: string) => void;
  assignPyq: (chapterId: string, setId: string, date: string, source: TodoSource) => void;
  /** Persist the chapter's theory-lecture total ("Add N lectures"). */
  saveChapterLectures: (chapterId: string) => void;
  /** Row state for the chapter's lecture checklist. */
  lectureRowStatus: (chapterId: string, lectureIndex: number) => RowStatus;
  /** Row state for a PYQ set. */
  pyqRowStatus: (chapterId: string, setId: string) => RowStatus;

  todosFor: (date: string) => Todo[];
  logFor: (date: string) => DailyLogEntry;
  statsFor: (date: string) => DayStats;
  addTodo: (date: string, text: string) => void;
  toggleTodo: (date: string, todoId: string) => void;
  allDoneFor: (date: string) => boolean;
  moraleShownFor: (date: string) => boolean;
  dismissMorale: (date: string) => void;
  quote: (date: string) => Quote;
  hasActivity: (date: string) => boolean;
  /** Every date that holds log activity — marks the daywise calendar log. */
  activityDates: string[];

  subjectProgress: (subject: SubjectName) => SubjectProgress;

  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  toggleDrawer: () => void;
}

const StudyContext = createContext<StudyContextValue | null>(null);

function withChapter(
  state: StudyState,
  subject: SubjectName,
  chapterId: string,
  update: (chapter: ChapterState) => ChapterState,
): StudyState {
  const existing = state.chapters[subject]?.[chapterId];
  if (!existing) return state;
  return {
    ...state,
    chapters: {
      ...state.chapters,
      [subject]: { ...state.chapters[subject], [chapterId]: update(existing) },
    },
  };
}

function withTodos(
  state: StudyState,
  update: (todos: Record<string, Todo[]>) => Record<string, Todo[]>,
): StudyState {
  return { ...state, todos: update(state.todos) };
}

function insertTodo(
  todos: Record<string, Todo[]>,
  date: string,
  todo: Todo,
): Record<string, Todo[]> {
  return { ...todos, [date]: [...(todos[date] ?? []), todo] };
}

function mapDate(
  todos: Record<string, Todo[]>,
  date: string,
  update: (items: Todo[]) => Todo[],
): Record<string, Todo[]> {
  return { ...todos, [date]: update(todos[date] ?? []) };
}

/** Removes items from a day, dropping empty days (keeps the log tidy). */
function removeFromDay(
  todos: Record<string, Todo[]>,
  date: string,
  match: (todo: Todo) => boolean,
): Record<string, Todo[]> {
  const remaining = (todos[date] ?? []).filter((todo) => !match(todo));
  const next = { ...todos };
  if (remaining.length === 0) {
    delete next[date];
  } else {
    next[date] = remaining;
  }
  return next;
}

export function StudyProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StudyState>(() => createInitialState());
  const [hydrated, setHydrated] = useState(false);
  const [today, setToday] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Load the daywise log once, on the client only.
  useEffect(() => {
    const key = todayKey();
    // localStorage hydration must happen after mount so the server and the
    // first client render stay identical (no hydration mismatch). This is the
    // documented external-store sync case, not a render-driven state update.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(hydrateState(loadState()));
    setToday(key);
    setSelectedDate(key);
    setHydrated(true);

    // Keep "today" honest across midnight / long-lived tabs.
    const interval = window.setInterval(() => {
      const nextKey = todayKey();
      setToday((current) => (current === nextKey ? current : nextKey));
    }, 60000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (hydrated) saveState(state);
  }, [state, hydrated]);

  const mutate = useCallback((updater: (current: StudyState) => StudyState) => {
    setState((current) => normalizeState(updater(current)));
  }, []);

  const mutateWithDate = useCallback(
    (updater: (current: StudyState, stamp: string) => StudyState) => {
      const stamp = new Date().toISOString();
      setState((current) => normalizeState(updater(current, stamp)));
    },
    [],
  );

  /* ---------------------------------------------------------------- lectures */

  const setChapterLectures = useCallback(
    (chapterId: string, value: number) => {
      const next = clampCount(value);
      mutate((current) => {
        const subject = current.activeSubject;
        const updated = withChapter(current, subject, chapterId, (chapter) => ({
          ...chapter,
          lectures: next,
          lecturesSaved: next > 0 ? chapter.lecturesSaved : false,
          // A shorter total means those lecture rows no longer exist.
          lectureDoneHistory: chapter.lectureDoneHistory.filter((index) => index <= next),
        }));

        return withTodos(updated, (todos) => {
          const trimmed: Record<string, Todo[]> = {};
          for (const date of Object.keys(todos)) {
            const items = (todos[date] ?? []).filter(
              (todo) =>
                !(
                  todo.kind === "lecture" &&
                  todo.subject === subject &&
                  todo.chapterId === chapterId &&
                  !todo.completed &&
                  (todo.lectureIndex ?? 0) > next
                ),
            );
            if (items.length > 0) trimmed[date] = items;
          }
          return trimmed;
        });
      });
    },
    [mutate],
  );

  /** "Add N lectures" - saves the chapter's real theory-lecture total only. */
  const saveChapterLectures = useCallback(
    (chapterId: string) => {
      mutate((current) =>
        withChapter(current, current.activeSubject, chapterId, (chapter) => ({
          ...chapter,
          lecturesSaved: chapter.lectures > 0,
        })),
      );
    },
    [mutate],
  );

  const assignLectures = useCallback(
    (chapterId: string, date: string, source: TodoSource) => {
      mutate((current) => {
        const subject = current.activeSubject;
        const chapter = current.chapters[subject]?.[chapterId];
        if (!chapter || !date) return current;

        // Choosing a day enables queue mode. Pending lecture rows for this
        // chapter move to the chosen day; completed rows stay where they are
        // (history) and historical marks are untouched.
        const todos = movePendingTodos(
          current.todos,
          (todo) => isLectureTodoOf(todo, subject, chapterId) && !todo.completed,
          date,
        );

        return withChapter(withTodos(current, () => todos), subject, chapterId, (state) => ({
          ...state,
          lectureAssign: { date, source },
        }));
      });
    },
    [mutate],
  );

  const toggleLecture = useCallback(
    (chapterId: string, lectureIndex: number) => {
      mutateWithDate((current, stamp) => {
        const subject = current.activeSubject;
        const seed = findChapter(subject, chapterId);
        const chapter = current.chapters[subject]?.[chapterId];
        if (!seed || !chapter) return current;

        // Finished through the Todo -> it is done; undo it there.
        const alreadyDone = flattenTodos(current.todos).some(
          (todo) =>
            isLectureTodoOf(todo, subject, chapterId) &&
            todo.lectureIndex === lectureIndex &&
            todo.completed,
        );
        if (alreadyDone) return current;

        const assign = chapter.lectureAssign;

        if (assign) {
          // Queue mode: a tick moves the row into the chosen day's Todo.
          const pending = locateTodo(
            current.todos,
            (todo) =>
              isLectureTodoOf(todo, subject, chapterId) &&
              todo.lectureIndex === lectureIndex &&
              !todo.completed,
          );
          if (pending) {
            return withTodos(current, (todos) =>
              removeFromDay(todos, pending.date, (todo) => todo.id === pending.todo.id),
            );
          }
          if (chapter.lectureDoneHistory.includes(lectureIndex)) return current;

          const todo = createLectureTodo({
            subject,
            chapterId,
            chapterTitle: seed.title,
            lectureIndex,
            date: assign.date,
            source: assign.source,
            createdAt: stamp,
            completed: false,
          });
          return withTodos(current, (todos) => insertTodo(todos, assign.date, todo));
        }

        // No day selected: a tick records a historical ("already done") mark
        // that counts toward overall syllabus only.
        return withChapter(current, subject, chapterId, (state) => ({
          ...state,
          lectureDoneHistory: toggleIndex(state.lectureDoneHistory, lectureIndex),
        }));
      });
    },
    [mutateWithDate],
  );

  /* -------------------------------------------------------------------- PYQ */

  const setPyqTotal = useCallback(
    (chapterId: string, setId: string, value: number) => {
      const next = clampCount(value);
      mutate((current) => {
        const subject = current.activeSubject;
        const updated = withChapter(current, subject, chapterId, (chapter) => ({
          ...chapter,
          pyqs: chapter.pyqs.map((pyq) =>
            pyq.id === setId ? { ...pyq, total: next } : pyq,
          ),
        }));

        return withTodos(updated, (todos) => {
          const synced: Record<string, Todo[]> = {};
          for (const date of Object.keys(todos)) {
            const items = (todos[date] ?? []).map((todo) =>
              isPyqTodoOf(todo, subject, chapterId, setId)
                ? { ...todo, amount: next }
                : todo,
            );
            if (items.length > 0) synced[date] = items;
          }
          return synced;
        });
      });
    },
    [mutate],
  );

  const togglePyqDone = useCallback(
    (chapterId: string, setId: string) => {
      mutateWithDate((current, stamp) => {
        const subject = current.activeSubject;
        const seed = findChapter(subject, chapterId);
        const chapter = current.chapters[subject]?.[chapterId];
        const set = chapter?.pyqs.find((pyq) => pyq.id === setId);
        if (!seed || !chapter || !set) return current;

        // Finished through the Todo -> it is done; undo it there.
        const alreadyDone = flattenTodos(current.todos).some(
          (todo) => isPyqTodoOf(todo, subject, chapterId, setId) && todo.completed,
        );
        if (alreadyDone) return current;

        const day = set.assignedDate;

        if (day) {
          // Queue mode: a tick moves the set into the chosen day's Todo.
          const pending = locateTodo(
            current.todos,
            (todo) => isPyqTodoOf(todo, subject, chapterId, setId) && !todo.completed,
          );
          if (pending) {
            return withTodos(current, (todos) =>
              removeFromDay(todos, pending.date, (todo) => todo.id === pending.todo.id),
            );
          }
          if (set.done) return current;

          const todo = createPyqTodo({
            subject,
            chapterId,
            chapterTitle: seed.title,
            set,
            date: day,
            source: set.assignedSource ?? "today",
            createdAt: stamp,
            completed: false,
          });
          return withTodos(current, (todos) => insertTodo(todos, day, todo));
        }

        // No day selected: a tick records a historical ("already done") mark
        // that counts toward overall PYQ progress only.
        return withChapter(current, subject, chapterId, (state) => ({
          ...state,
          pyqs: state.pyqs.map((pyq) => (pyq.id === setId ? { ...pyq, done: !pyq.done } : pyq)),
        }));
      });
    },
    [mutateWithDate],
  );

  const assignPyq = useCallback(
    (chapterId: string, setId: string, date: string, source: TodoSource) => {
      mutate((current) => {
        const subject = current.activeSubject;
        const chapter = current.chapters[subject]?.[chapterId];
        const set = chapter?.pyqs.find((pyq) => pyq.id === setId);
        if (!chapter || !set || !date) return current;

        const updated = withChapter(current, subject, chapterId, (state) => ({
          ...state,
          pyqs: state.pyqs.map((pyq) =>
            pyq.id === setId ? { ...pyq, assignedDate: date, assignedSource: source } : pyq,
          ),
        }));

        // Move any outstanding item for the set to the chosen day so the daily
        // target never double-counts.
        return withTodos(updated, (todos) =>
          movePendingTodos(
            todos,
            (todo) => isPyqTodoOf(todo, subject, chapterId, setId) && !todo.completed,
            date,
          ),
        );
      });
    },
    [mutate],
  );

  /* --------------------------------------------------------------- todo list */

  const toggleTodo = useCallback(
    (date: string, todoId: string) => {
      mutate((current) => {
        const item = (current.todos[date] ?? []).find((todo) => todo.id === todoId);
        if (!item) return current;
        const nextCompleted = !item.completed;

        const updated = withTodos(current, (todos) =>
          mapDate(todos, date, (items) =>
            items.map((todo) =>
              todo.id === todoId ? { ...todo, completed: nextCompleted } : todo,
            ),
          ),
        );

        if (item.kind === "pyq" && item.setId) {
          return withChapter(updated, item.subject, item.chapterId, (chapter) => ({
            ...chapter,
            pyqs: chapter.pyqs.map((pyq) =>
              pyq.id === item.setId ? { ...pyq, done: nextCompleted } : pyq,
            ),
          }));
        }
        return updated;
      });
    },
    [mutate],
  );

  const addTodo = useCallback(
    (date: string, text: string) => {
      const label = text.trim();
      if (!label || !date) return;
      mutateWithDate((current, stamp) => {
        const todo: Todo = {
          id: makeTodoId("task", stamp),
          kind: "custom",
          subject: current.activeSubject,
          chapterId: "custom",
          chapterTitle: "",
          label,
          amount: 0,
          date,
          source: date === todayKey() ? "today" : "custom",
          completed: false,
          createdAt: stamp,
        };
        return withTodos(current, (todos) => insertTodo(todos, date, todo));
      });
    },
    [mutateWithDate],
  );

  const dismissMorale = useCallback(
    (date: string) => {
      mutate((current) => ({
        ...current,
        dailyLog: {
          ...current.dailyLog,
          [date]: { ...(current.dailyLog[date] ?? emptyDailyLog()), moraleShown: true },
        },
      }));
    },
    [mutate],
  );

  const setActiveSubject = useCallback(
    (subject: SubjectName) => {
      mutate((current) => ({ ...current, activeSubject: subject }));
    },
    [mutate],
  );

  const goToDay = useCallback(
    (delta: number) => {
      setSelectedDate((current) => addDays(current || todayKey(), delta));
    },
    [],
  );

  const jumpToToday = useCallback(() => {
    setSelectedDate(todayKey());
  }, []);

  /* --------------------------------------------------------------- derived */

  const allTodos = useMemo(() => flattenTodos(state.todos), [state.todos]);

  const chapterState = useCallback(
    (subject: SubjectName, chapterId: string): ChapterState => {
      const found = state.chapters[subject]?.[chapterId];
      if (found) return found;
      const seed = findChapter(subject, chapterId) ?? SUBJECTS[0].chapters[0];
      return createChapterState(seed);
    },
    [state.chapters],
  );

  const chapterProgress = useCallback(
    (subject: SubjectName, chapterId: string): ChapterProgress => {
      const chapter = chapterState(subject, chapterId);
      const lectures = clampCount(chapter.lectures);
      const lecturesDone = Math.min(
        lectureDoneCount(allTodos, chapter.lectureDoneHistory, subject, chapterId, lectures),
        lectures,
      );
      const setsTotal = chapter.pyqs.length;
      const setsDone = chapter.pyqs.filter((pyq) => pyq.done).length;
      const theoryDone = lectures > 0 && lecturesDone >= lectures;

      return {
        lectures,
        lecturesDone,
        setsDone,
        setsTotal,
        theoryDone,
        status: deriveStatus(theoryDone, setsTotal > 0 && setsDone >= setsTotal),
      };
    },
    [allTodos, chapterState],
  );

  const lectureRowStatus = useCallback(
    (chapterId: string, lectureIndex: number): RowStatus => {
      const subject = state.activeSubject;
      const history = state.chapters[subject]?.[chapterId]?.lectureDoneHistory ?? [];
      return planLectureRowStatus(state.todos, history, subject, chapterId, lectureIndex);
    },
    [state.activeSubject, state.chapters, state.todos],
  );

  const pyqRowStatus = useCallback(
    (chapterId: string, setId: string): RowStatus => {
      const subject = state.activeSubject;
      const done = Boolean(
        state.chapters[subject]?.[chapterId]?.pyqs.find((pyq) => pyq.id === setId)?.done,
      );
      return planPyqRowStatus(state.todos, done, subject, chapterId, setId);
    },
    [state.activeSubject, state.chapters, state.todos],
  );

  const todosFor = useCallback((date: string) => state.todos[date] ?? [], [state.todos]);

  const logFor = useCallback(
    (date: string): DailyLogEntry => state.dailyLog[date] ?? emptyDailyLog(),
    [state.dailyLog],
  );

  const statsFor = useCallback(
    (date: string): DayStats => dayStats(state.todos[date] ?? []),
    [state.todos],
  );

  const value: StudyContextValue = {
    hydrated,
    today,
    selectedDate,
    setSelectedDate,
    goToDay,
    jumpToToday,
    dayOffset: (dateKey: string) => (today && dateKey ? countDaysBetween(today, dateKey) : 0),

    activeSubject: state.activeSubject,
    setActiveSubject,
    activeChapters: chaptersOf(state.activeSubject),

    chapterState,
    chapterProgress,
    setChapterLectures,
    saveChapterLectures,
    toggleLecture,
    assignLectures,
    lectureRowStatus,
    pyqRowStatus,
    setPyqTotal,
    togglePyqDone,
    assignPyq,

    todosFor,
    logFor,
    statsFor,
    addTodo,
    toggleTodo,
    allDoneFor: (date: string) => (state.todos[date] ?? []).length > 0 && statsFor(date).allDone,
    moraleShownFor: (date: string) => (state.dailyLog[date]?.moraleShown ?? false),
    dismissMorale,
    quote: (date: string) => quoteForDate(date || today),
    hasActivity: (date: string) => (state.todos[date] ?? []).length > 0,
    activityDates: Object.keys(state.todos).filter(
      (date) => (state.todos[date] ?? []).length > 0,
    ),

    subjectProgress: (subject: SubjectName) => state.subjects[subject],

    drawerOpen,
    setDrawerOpen,
    toggleDrawer: () => setDrawerOpen((open) => !open),
  };

  return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>;
}

/**
 * Locates a log item by predicate. When the same plan item exists on several
 * days (for example a lecture moved from tomorrow to today) the newest day wins.
 */
function locateTodo(
  todos: Record<string, Todo[]>,
  match: (todo: Todo) => boolean,
): { date: string; todo: Todo } | null {
  const dates = Object.keys(todos).sort().reverse();
  for (const date of dates) {
    const todo = (todos[date] ?? []).find(match);
    if (todo) return { date, todo };
  }
  return null;
}

/** Adds or removes a lecture index from a sorted history list. */
function toggleIndex(list: number[], index: number): number[] {
  return list.includes(index)
    ? list.filter((item) => item !== index)
    : [...list, index].sort((a, b) => a - b);
}

export function useStudy(): StudyContextValue {
  const context = useContext(StudyContext);
  if (!context) {
    throw new Error("useStudy must be used inside <StudyProvider>");
  }
  return context;
}

export default StudyProvider;


