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
  completedLectureCount,
  completedLectureIndices,
  createLectureTodo,
  createPyqTodo,
  dayStats,
  deriveStatus,
  emptyDailyLog,
  flattenTodos,
  isLectureTodoOf,
  isPyqTodoOf,
  makeTodoId,
} from "@/lib/planLogic";
import type { DayStats } from "@/lib/planLogic";
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
          lecturesPlanned: next > 0 ? chapter.lecturesPlanned : false,
        }));

        // Keep plan and log consistent: drop not-yet-done lectures that fall
        // outside the new plan. Completed history is never removed.
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

  const assignLectures = useCallback(
    (chapterId: string, date: string, source: TodoSource) => {
      mutateWithDate((current, stamp) => {
        const subject = current.activeSubject;
        const seed = findChapter(subject, chapterId);
        const chapter = current.chapters[subject]?.[chapterId];
        if (!seed || !chapter || !date) return current;

        const count = clampCount(chapter.lectures);
        const done = new Set(completedLectureIndices(flattenTodos(current.todos), subject, chapterId));
        const alreadyToday = new Set(
          (current.todos[date] ?? [])
            .filter((todo) => isLectureTodoOf(todo, subject, chapterId))
            .map((todo) => todo.lectureIndex ?? 0),
        );

        const additions: Todo[] = [];
        for (let index = 1; index <= count; index += 1) {
          if (done.has(index) || alreadyToday.has(index)) continue;
          additions.push(
            createLectureTodo({
              subject,
              chapterId,
              chapterTitle: seed.title,
              lectureIndex: index,
              date,
              source,
              createdAt: stamp,
            }),
          );
        }

        const withNew =
          additions.length > 0
            ? withTodos(current, (todos) => ({
                ...todos,
                [date]: [...(todos[date] ?? []), ...additions],
              }))
            : current;

        return withChapter(withNew, subject, chapterId, (state) => ({
          ...state,
          lecturesPlanned: true,
          lectureAssign: { date, source },
        }));
      });
    },
    [mutateWithDate],
  );

  const toggleLecture = useCallback(
    (chapterId: string, lectureIndex: number) => {
      mutateWithDate((current, stamp) => {
        const subject = current.activeSubject;
        const seed = findChapter(subject, chapterId);
        if (!seed) return current;

        const match = (todo: Todo) =>
          isLectureTodoOf(todo, subject, chapterId) && todo.lectureIndex === lectureIndex;
        const located = locateTodo(current.todos, match);

        if (located) {
          return withTodos(current, (todos) =>
            mapDate(todos, located.date, (items) =>
              items.map((todo) =>
                todo.id === located.todo.id
                  ? { ...todo, completed: !todo.completed }
                  : todo,
              ),
            ),
          );
        }

        // No plan item yet: checking it off logs it to today (Chunk 5).
        const key = todayKey();
        const todo = createLectureTodo({
          subject,
          chapterId,
          chapterTitle: seed.title,
          lectureIndex,
          date: key,
          source: "today",
          createdAt: stamp,
          completed: true,
        });
        return withTodos(current, (todos) => insertTodo(todos, key, todo));
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
        const set = current.chapters[subject]?.[chapterId]?.pyqs.find(
          (pyq) => pyq.id === setId,
        );
        if (!seed || !set) return current;

        const nextDone = !set.done;
        const targetDate = set.assignedDate ?? todayKey();
        const updated = withChapter(current, subject, chapterId, (chapter) => ({
          ...chapter,
          pyqs: chapter.pyqs.map((pyq) =>
            pyq.id === setId
              ? {
                  ...pyq,
                  done: nextDone,
                  assignedDate: pyq.assignedDate ?? targetDate,
                  assignedSource: pyq.assignedSource ?? "today",
                }
              : pyq,
          ),
        }));

        const located = locateTodo(updated.todos, (todo) =>
          isPyqTodoOf(todo, subject, chapterId, setId),
        );
        if (located) {
          return withTodos(updated, (todos) =>
            mapDate(todos, located.date, (items) =>
              items.map((todo) =>
                todo.id === located.todo.id
                  ? { ...todo, completed: nextDone, amount: set.total }
                  : todo,
              ),
            ),
          );
        }

        const todo = createPyqTodo({
          subject,
          chapterId,
          chapterTitle: seed.title,
          set,
          date: targetDate,
          source: "today",
          createdAt: stamp,
          completed: nextDone,
        });
        return withTodos(updated, (todos) => insertTodo(todos, targetDate, todo));
      });
    },
    [mutateWithDate],
  );

  const assignPyq = useCallback(
    (chapterId: string, setId: string, date: string, source: TodoSource) => {
      mutateWithDate((current, stamp) => {
        const subject = current.activeSubject;
        const seed = findChapter(subject, chapterId);
        const set = current.chapters[subject]?.[chapterId]?.pyqs.find(
          (pyq) => pyq.id === setId,
        );
        if (!seed || !set || !date) return current;

        const updated = withChapter(current, subject, chapterId, (chapter) => ({
          ...chapter,
          pyqs: chapter.pyqs.map((pyq) =>
            pyq.id === setId ? { ...pyq, assignedDate: date, assignedSource: source } : pyq,
          ),
        }));

        // Move any outstanding item for the set to the chosen day so the
        // daily target never double-counts.
        let todos = updated.todos;
        for (const existingDate of Object.keys(todos)) {
          if (existingDate === date) continue;
          todos = removeFromDay(
            todos,
            existingDate,
            (todo) => isPyqTodoOf(todo, subject, chapterId, setId) && !todo.completed,
          );
        }

        const alreadyThere = (todos[date] ?? []).some((todo) =>
          isPyqTodoOf(todo, subject, chapterId, setId),
        );
        if (alreadyThere) return { ...updated, todos };

        const todo = createPyqTodo({
          subject,
          chapterId,
          chapterTitle: seed.title,
          set,
          date,
          source,
          createdAt: stamp,
          completed: set.done,
        });
        return { ...updated, todos: insertTodo(todos, date, todo) };
      });
    },
    [mutateWithDate],
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
        completedLectureCount(allTodos, subject, chapterId),
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
    toggleLecture,
    assignLectures,
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

export function useStudy(): StudyContextValue {
  const context = useContext(StudyContext);
  if (!context) {
    throw new Error("useStudy must be used inside <StudyProvider>");
  }
  return context;
}

export default StudyProvider;


