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
  addPyqAllocations as planAddPyqAllocations,
  clampCount,
  clampQuestions,
  createLectureTodo,
  dayStats,
  deriveStatus,
  emptyDailyLog,
  flattenTodos,
  isLectureTodoOf,
  lectureDoneCount,
  lectureRowStatus as planLectureRowStatus,
  makeTodoId,
  movePendingTodos,
  normalizePyqTodo,
  pyqChapterStats,
  pyqSectionStats,
  trimPyqAllocation,
  type PyqAllocation,
} from "@/lib/planLogic";
import type { DayStats, RowStatus } from "@/lib/planLogic";
import { quoteForDate } from "@/lib/quotes";
import type { Quote } from "@/lib/quotes";
import { createChapterState, createInitialState, hydrateState, normalizeState } from "@/lib/state";
import { loadState, saveState, clearState } from "@/lib/storage";
import { createSupabaseClient } from "@/lib/supabase";
import {
  uploadStudyLog,
  downloadStudyLog,
  cloudLogExists,
  backupLocalLog,
} from "@/lib/sync";
import type {
  ChapterSeed,
  ChapterState,
  ChapterStatus,
  DailyLogEntry,
  PyqChapterStats,
  StudyState,
  SubjectName,
  SubjectProgress,
  Todo,
  TodoSource,
} from "@/lib/types";

export interface ChapterProgress {
  lectures: number;
  lecturesDone: number;
  /** Question progress (question-based, replaces the old set counters). */
  questionsCompleted: number;
  questionsTotal: number;
  questionsQueued: number;
  pyqPct: number;
  /** Full per-section breakdown for the chapter's question rows. */
  pyq: PyqChapterStats;
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
  /** Adds questions from each section to a day (one Todo per section). */
  addPyqAllocations: (
    chapterId: string,
    date: string,
    source: TodoSource,
    allocations: PyqAllocation[],
  ) => void;
  /** Logs partial progress (0..amount) on one assigned question row. */
  setPyqProgress: (date: string, todoId: string, completedCount: number) => void;
  /** Per-section question stats for a chapter (bars + allocation panel). */
  pyqStats: (chapterId: string) => PyqChapterStats;
  /** Persist the chapter's theory-lecture total ("Add N lectures"). */
  saveChapterLectures: (chapterId: string) => void;
  /** Row state for the chapter's lecture checklist. */
  lectureRowStatus: (chapterId: string, lectureIndex: number) => RowStatus;

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

  /** Authenticated Supabase user (null when not signed in). */
  user: { id: string; email: string | null } | null;
  /** True while the initial session restore / sign-in is in flight. */
  authLoading: boolean;
  /** Whether cloud sync is active for this session. */
  syncEnabled: boolean;
  /** Sign in with email + password. */
  login: (email: string, password: string) => Promise<void>;
  /** Sign up with email + password. */
  signup: (email: string, password: string) => Promise<void>;
  /** Sign out and clear local + cloud session. */
  logout: () => Promise<void>;
  /** Last auth error, if any. */
  authError: string | null;

  /** Cloud state fetched after login (null if none or not yet fetched). */
  remoteState: StudyState | null;
  /** Resolve the local-vs-cloud conflict after login. */
  resolveSync: (choice: "useCloud" | "useLocal" | "merge") => Promise<void>;
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

  // --- Supabase auth + cloud sync ---
  const [user, setUser] = useState<{ id: string; email: string | null } | null>(
    null,
  );
  const [authLoading, setAuthLoading] = useState(true);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [remoteState, setRemoteState] = useState<StudyState | null>(null);

  const supabase = createSupabaseClient();

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
    if (hydrated) {
      saveState(state);
      // Upload to cloud when sync is active, debounced via state change.
      if (syncEnabled && user) {
        uploadStudyLog(user.id, state).catch(() => {
          // Silent: localStorage keeps working even if cloud upload fails.
        });
      }
    }
  }, [state, hydrated, syncEnabled, user]);

  // Restore an existing Supabase session on mount (persists across browser
  // restarts via @supabase/ssr localStorage-backed session).

  const handleAuthenticated = useCallback(
    async (userId: string): Promise<void> => {
      const localState = loadState();
      const exists = await cloudLogExists(userId);

      if (exists) {
        const remote = await downloadStudyLog(userId);
        setRemoteState(remote ?? null);
        // If both local and cloud exist, wait for user to resolve (AuthPrompt).
        // syncEnabled stays false until resolveSync is called.
        if (localState) return;
        // No local data: adopt cloud.
        if (remote) {
          saveState(remote);
          setSyncEnabled(true);
        }
      } else {
        // No cloud record: seed it with local data (backed up first).
        if (localState) {
          backupLocalLog();
          await uploadStudyLog(userId, localState);
        }
        setSyncEnabled(true);
      }
    },
    [],
  );

  useEffect(() => {
    if (!supabase) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAuthLoading(false);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAuthError("Supabase is not configured.");
      return;
    }

    const client = supabase;

    let mounted = true;

    async function initAuth() {
      try {
        const { data } = await client.auth.getSession();
        if (data.session?.user) {
          const u = data.session.user;
          setUser({ id: u.id, email: u.email ?? null });
          await handleAuthenticated(u.id);
        }
      } catch (err) {
        setAuthError(err instanceof Error ? err.message : "Session restore failed.");
      } finally {
        if (mounted) setAuthLoading(false);
      }

      // Listen for auth changes (login/logout in other tabs, etc.).
      const { data: sub } = client.auth.onAuthStateChange(async (event, session) => {
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          if (session?.user) {
            const u = session.user;
            setUser({ id: u.id, email: u.email ?? null });
            await handleAuthenticated(u.id);
          }
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setSyncEnabled(false);
          setRemoteState(null);
          setAuthError(null);
        }
      });

      return () => {
        mounted = false;
        sub.subscription.unsubscribe();
      };
    }

    initAuth();
  }, [supabase, handleAuthenticated]);

  const login = useCallback(
    async (email: string, password: string) => {
      if (!supabase) {
        setAuthError("Supabase is not configured.");
        return;
      }
      const client = supabase;
      setAuthLoading(true);
      setAuthError(null);
      try {
        const { data, error } = await client.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        if (!data.user) throw new Error("No user returned.");
        // handleAuthenticated runs via onAuthStateChange listener.
      } catch (err) {
        setAuthError(err instanceof Error ? err.message : "Sign in failed.");
        setAuthLoading(false);
      }
    },
    [supabase],
  );

  const signup = useCallback(
    async (email: string, password: string) => {
      if (!supabase) {
        setAuthError("Supabase is not configured.");
        return;
      }
      const client = supabase;
      setAuthLoading(true);
      setAuthError(null);
      try {
        const { data, error } = await client.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        if (!data.user) throw new Error("No user returned.");
      } catch (err) {
        setAuthError(err instanceof Error ? err.message : "Sign up failed.");
        setAuthLoading(false);
      }
    },
    [supabase],
  );

  const logout = useCallback(async () => {
    if (!supabase) return;
    const client = supabase;
    setSyncEnabled(false);
    setRemoteState(null);
    setUser(null);
    await client.auth.signOut();
    clearState();
  }, [supabase]);

  const resolveSync = useCallback(
    async (choice: "useCloud" | "useLocal" | "merge") => {
      if (!user) return;
      setSyncEnabled(true);

      if (choice === "useCloud" && remoteState) {
        saveState(remoteState);
        return;
      }
      if (choice === "useLocal") {
        const local = loadState();
        if (local) {
          backupLocalLog();
          await uploadStudyLog(user.id, local);
        }
        return;
      }
      if (choice === "merge" && remoteState) {
        const local = loadState();
        if (local) {
          backupLocalLog();
          const merged: StudyState = {
            ...remoteState,
            dailyLog: { ...(remoteState.dailyLog ?? {}), ...(local.dailyLog ?? {}) },
            todos: { ...(remoteState.todos ?? {}), ...(local.todos ?? {}) },
          };
          saveState(merged);
          await uploadStudyLog(user.id, merged);
        }
        return;
      }
    },
    [user, remoteState],
  );

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
      const next = clampQuestions(value);
      mutate((current) => {
        const subject = current.activeSubject;
        const updated = withChapter(current, subject, chapterId, (chapter) => ({
          ...chapter,
          pyqs: chapter.pyqs.map((pyq) =>
            pyq.id === setId
              ? // A zero total means the section no longer exists: drop the
                // legacy done mark so it cannot claim progress.
                { ...pyq, total: next, done: next > 0 ? pyq.done : false }
              : pyq,
          ),
        }));

        // Allocations are real work, so trim them to the new total (oldest days
        // keep their share) instead of rewriting their amounts.
        return withTodos(updated, (todos) =>
          trimPyqAllocation(todos, subject, chapterId, setId, next),
        );
      });
    },
    [mutate],
  );

  /**
   * Adds questions from each section to a day. Counts are validated against the
   * section's remaining headroom here as well, so the panel is not the only
   * guard. Pressing the same day again tops up that day's unfinished row.
   */
  const addPyqAllocations = useCallback(
    (chapterId: string, date: string, source: TodoSource, allocations: PyqAllocation[]) => {
      if (!date) return;
      mutateWithDate((current, stamp) => {
        const subject = current.activeSubject;
        const seed = findChapter(subject, chapterId);
        const chapter = current.chapters[subject]?.[chapterId];
        if (!seed || !chapter) return current;

        const all = flattenTodos(current.todos);
        const allowed: PyqAllocation[] = [];
        for (const allocation of allocations) {
          const set = chapter.pyqs.find((pyq) => pyq.id === allocation.set.id);
          if (!set) continue;
          const stats = pyqSectionStats(all, {
            subject,
            chapterId,
            id: set.id,
            label: set.label,
            total: set.total,
            done: set.done,
          });
          const count = Math.min(clampQuestions(allocation.count), stats.remaining);
          if (count > 0) allowed.push({ set, count });
        }
        if (allowed.length === 0) return current;

        return withTodos(current, (todos) =>
          planAddPyqAllocations(todos, {
            subject,
            chapterId,
            chapterTitle: seed.title,
            date,
            source,
            allocations: allowed,
            createdAt: stamp,
          }),
        );
      });
    },
    [mutateWithDate],
  );

  /** Logs partial progress (0..amount) on one assigned question row. */
  const setPyqProgress = useCallback(
    (date: string, todoId: string, completedCount: number) => {
      mutate((current) => {
        const item = (current.todos[date] ?? []).find((todo) => todo.id === todoId);
        if (!item || item.kind !== "pyq") return current;
        const next = Math.max(0, Math.min(item.amount, Math.round(completedCount)));

        return withTodos(current, (todos) =>
          mapDate(todos, date, (items) =>
            items.map((todo) =>
              todo.id === todoId
                ? normalizePyqTodo({ ...todo, completedCount: next })
                : todo,
            ),
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

        return withTodos(current, (todos) =>
          mapDate(todos, date, (items) =>
            items.map((todo) => {
              if (todo.id !== todoId) return todo;
              // Question rows carry partial progress; the checkbox is the
              // all-or-nothing shortcut (tick = every allocated question).
              if (todo.kind === "pyq") {
                return normalizePyqTodo({
                  ...todo,
                  completedCount: nextCompleted ? todo.amount : 0,
                });
              }
              return { ...todo, completed: nextCompleted };
            }),
          ),
        );
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
      const pyq = pyqChapterStats(
        allTodos,
        subject,
        chapterId,
        chapter.pyqs.map((item) => ({
          id: item.id,
          label: item.label,
          total: item.total,
          done: item.done,
        })),
      );
      const theoryDone = lectures > 0 && lecturesDone >= lectures;

      return {
        lectures,
        lecturesDone,
        questionsCompleted: pyq.completed,
        questionsTotal: pyq.total,
        questionsQueued: pyq.queued,
        pyqPct: pyq.pct,
        pyq,
        theoryDone,
        status: deriveStatus(theoryDone, pyq.allDone),
      };
    },
    [allTodos, chapterState],
  );

  /** Per-section question stats for a chapter (bars + allocation panel). */
  const pyqStats = useCallback(
    (chapterId: string): PyqChapterStats => {
      const subject = state.activeSubject;
      const chapter = chapterState(subject, chapterId);
      return pyqChapterStats(
        allTodos,
        subject,
        chapterId,
        chapter.pyqs.map((item) => ({
          id: item.id,
          label: item.label,
          total: item.total,
          done: item.done,
        })),
      );
    },
    [allTodos, chapterState, state.activeSubject],
  );

  const lectureRowStatus = useCallback(
    (chapterId: string, lectureIndex: number): RowStatus => {
      const subject = state.activeSubject;
      const history = state.chapters[subject]?.[chapterId]?.lectureDoneHistory ?? [];
      return planLectureRowStatus(state.todos, history, subject, chapterId, lectureIndex);
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
    setPyqTotal,
    addPyqAllocations,
    setPyqProgress,
    pyqStats,

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

    user,
    authLoading,
    syncEnabled,
    login,
    signup,
    logout,
    authError,
    remoteState,
    resolveSync,
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




