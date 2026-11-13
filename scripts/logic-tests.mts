/**
 * StudyOS logic tests.
 *
 * The project has no test runner dependency, so this script exercises the pure
 * planning/log logic with Node's built-in assert module:
 *
 *     node scripts/logic-tests.mts
 *
 * It imports the same modules the app uses, so a pass means the store math is
 * verified without a browser.
 */
import assert from "node:assert/strict";
import {
  MAX_COUNT,
  buildDailyLog,
  clampCount,
  completedLectureCount,
  completedLectureIndices,
  completedQuestionCount,
  createLectureTodo,
  createPyqTodo,
  dayStats,
  deriveStatus,
  flattenTodos,
  gaugePct,
  isLectureTodoOf,
  isPyqTodoOf,
  subjectRollup,
} from "../src/lib/planLogic.ts";
import {
  addDays,
  buildMonthGrid,
  countDaysBetween,
  fromDateKey,
  relativeLabel,
  toDateKey,
} from "../src/lib/date.ts";
import { SUBJECTS, chaptersOf, findChapter } from "../src/lib/curriculum.ts";
import {
  STORAGE_KEY,
  STORAGE_VERSION,
  clearState,
  loadState,
  saveState,
} from "../src/lib/storage.ts";
import type { PyqSetState, StudyState, Todo } from "../src/lib/types.ts";

let passed = 0;
const failures: string[] = [];

function test(name: string, fn: () => void): void {
  try {
    fn();
    passed += 1;
    console.log(`  PASS  ${name}`);
  } catch (error) {
    failures.push(name);
    console.error(`  FAIL  ${name}`);
    console.error(`        ${(error as Error).message}`);
  }
}

const STAMP = "2026-11-13T09:00:00.000Z";
const SUBJECT = "Physics";
const CHAPTER = "electric-charges-and-fields";

const pyqSet: PyqSetState = {
  id: "m3",
  label: "3 marker questions",
  defaultTotal: 6,
  total: 6,
  done: false,
  assignedDate: null,
  assignedSource: null,
};

function lectureTodo(index: number, date: string, completed: boolean): Todo {
  return createLectureTodo({
    subject: SUBJECT,
    chapterId: CHAPTER,
    chapterTitle: "Electric Charges and Fields",
    lectureIndex: index,
    date,
    source: "today",
    createdAt: STAMP,
    completed,
  });
}

console.log("\nStudyOS logic tests\n");

/* ------------------------------------------------------- requirement 2: cap */

test("count control clamps to 0–15", () => {
  assert.equal(MAX_COUNT, 15);
  assert.equal(clampCount(-4), 0);
  assert.equal(clampCount(0), 0);
  assert.equal(clampCount(4), 4);
  assert.equal(clampCount(15), 15);
  assert.equal(clampCount(16), 15);
  assert.equal(clampCount(999), 15);
  assert.equal(clampCount(Number.NaN), 0);
  assert.equal(clampCount(7.6), 8);
});

/* -------------------------------------------------------------- date keys */

test("date keys round-trip in local time and step across boundaries", () => {
  assert.equal(toDateKey(fromDateKey("2026-11-13")), "2026-11-13");
  assert.equal(addDays("2026-11-13", 1), "2026-11-14");
  assert.equal(addDays("2026-11-30", 1), "2026-12-01");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2027-01-01", -1), "2026-12-31");
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(countDaysBetween("2026-11-13", "2026-11-14"), 1);
  assert.equal(countDaysBetween("2026-11-13", "2026-11-13"), 0);
  assert.equal(countDaysBetween("2026-11-14", "2026-11-13"), -1);
});

test("relative labels match the working-log wording", () => {
  assert.equal(relativeLabel("2026-11-13", "2026-11-13"), "Today");
  assert.equal(relativeLabel("2026-11-14", "2026-11-13"), "Tomorrow");
  assert.equal(relativeLabel("2026-11-12", "2026-11-13"), "Yesterday");
  assert.equal(relativeLabel("2026-11-20", "2026-11-13"), "Fri 20 Nov 2026");
});

test("month grid is Monday-first and complete", () => {
  const weeks = buildMonthGrid(2026, 10); // November 2026
  assert.ok(weeks.length >= 5);
  for (const week of weeks) assert.equal(week.length, 7);
  const firstWeek = weeks[0];
  // 1 Nov 2026 is a Sunday, so a Monday-first grid starts with six blanks.
  assert.deepEqual(firstWeek.slice(0, 6), [null, null, null, null, null, null]);
  assert.equal(firstWeek[6], "2026-11-01");
  const days = weeks.flat().filter((day): day is string => day !== null);
  assert.equal(days.length, 30);
  assert.equal(days[0], "2026-11-01");
  assert.equal(days[days.length - 1], "2026-11-30");
});

/* -------------------------------------------------------------- curriculum */

test("curriculum mirrors the Figma chapter lists", () => {
  assert.equal(SUBJECTS.length, 3);
  assert.deepEqual(
    SUBJECTS.map((subject) => subject.name),
    ["Physics", "Chemistry", "Mathematics"],
  );
  for (const subject of SUBJECTS) {
    assert.equal(subject.chapters.length, 4, `${subject.name} should have 4 chapters`);
    assert.equal(subject.chapters[0].index, "01");
    assert.deepEqual(
      subject.chapters[0].pyqs.map((pyq) => pyq.label),
      [
        "1 marker questions",
        "3 marker questions",
        "5 marker questions",
        "4 mark case-based questions",
      ],
    );
  }
  assert.equal(chaptersOf("Mathematics")[0].title, "Relations and Functions");
  assert.equal(findChapter("Chemistry", "solutions")?.title, "Solutions");
  assert.equal(findChapter("Physics", "does-not-exist"), undefined);
});

/* ------------------------------------------------------------- log items */

test("lecture items are built as 1-unit checklist rows", () => {
  const todo = lectureTodo(3, "2026-11-13", false);
  assert.equal(todo.kind, "lecture");
  assert.equal(todo.amount, 1);
  assert.equal(todo.lectureIndex, 3);
  assert.equal(todo.label, "Lecture 3");
  assert.equal(todo.date, "2026-11-13");
  assert.equal(todo.source, "today");
  assert.equal(todo.completed, false);
  assert.ok(isLectureTodoOf(todo, SUBJECT, CHAPTER));
  assert.equal(isLectureTodoOf(todo, "Chemistry", CHAPTER), false);
});

test("PYQ items carry the set size as their question count", () => {
  const todo = createPyqTodo({
    subject: SUBJECT,
    chapterId: CHAPTER,
    chapterTitle: "Electric Charges and Fields",
    set: pyqSet,
    date: "2026-11-14",
    source: "custom",
    createdAt: STAMP,
  });
  assert.equal(todo.kind, "pyq");
  assert.equal(todo.setId, "m3");
  assert.equal(todo.amount, 6);
  assert.equal(todo.label, "3 marker questions");
  assert.equal(todo.source, "custom");
  assert.ok(isPyqTodoOf(todo, SUBJECT, CHAPTER, "m3"));
  assert.equal(isPyqTodoOf(todo, SUBJECT, CHAPTER, "m5"), false);
});

/* ------------------------------------------- requirement 1: universal goal */

test("day stats roll lectures, questions and chapter breakdown together", () => {
  const todos: Todo[] = [
    lectureTodo(1, "2026-11-13", true),
    lectureTodo(2, "2026-11-13", true),
    lectureTodo(3, "2026-11-13", false),
    createPyqTodo({
      subject: SUBJECT,
      chapterId: CHAPTER,
      chapterTitle: "Electric Charges and Fields",
      set: pyqSet,
      date: "2026-11-13",
      source: "today",
      createdAt: STAMP,
      completed: true,
    }),
    createPyqTodo({
      subject: "Chemistry",
      chapterId: "solutions",
      chapterTitle: "Solutions",
      set: { ...pyqSet, id: "m1", label: "1 marker questions", total: 4 },
      date: "2026-11-13",
      source: "today",
      createdAt: STAMP,
      completed: true,
    }),
    createPyqTodo({
      subject: SUBJECT,
      chapterId: CHAPTER,
      chapterTitle: "Electric Charges and Fields",
      set: { ...pyqSet, id: "m5", label: "5 marker questions", total: 5 },
      date: "2026-11-13",
      source: "today",
      createdAt: STAMP,
      completed: false,
    }),
  ];

  const stats = dayStats(todos);
  assert.equal(stats.lecturesTarget, 3);
  assert.equal(stats.lecturesCompleted, 2);
  assert.equal(stats.questionsPracticed, 10); // 6 + 4; the open set is excluded
  assert.equal(stats.breakdown.length, 2);
  assert.equal(stats.chaptersPracticed[CHAPTER], 6);
  assert.equal(stats.allDone, false);
  assert.equal(gaugePct(stats.lecturesCompleted, stats.lecturesTarget), 67);
});

test("a day is complete only when it has items and all are done", () => {
  assert.equal(dayStats([]).allDone, false);
  assert.equal(dayStats([lectureTodo(1, "2026-11-13", false)]).allDone, false);
  assert.equal(dayStats([lectureTodo(1, "2026-11-13", true)]).allDone, true);
  assert.equal(
    dayStats([
      lectureTodo(1, "2026-11-13", true),
      {
        id: "custom-1",
        kind: "custom",
        subject: SUBJECT,
        chapterId: "custom",
        chapterTitle: "",
        label: "Revise formulae",
        amount: 0,
        date: "2026-11-13",
        source: "today",
        completed: true,
        createdAt: STAMP,
      },
    ]).allDone,
    true,
  );
});

test("daily log entries rebuild from the checklist and keep moraleShown", () => {
  const todos = [lectureTodo(1, "2026-11-13", true), lectureTodo(2, "2026-11-13", false)];
  const first = buildDailyLog(todos);
  assert.equal(first.lecturesCompleted, 1);
  assert.equal(first.lecturesTarget, 2);
  assert.equal(first.moraleShown, false);

  const second = buildDailyLog(todos, { ...first, moraleShown: true });
  assert.equal(second.moraleShown, true);
  assert.equal(second.allDone, false);
});

test("gauge percentages guard against a zero target", () => {
  assert.equal(gaugePct(0, 0), 0);
  assert.equal(gaugePct(5, 0), 0);
  assert.equal(gaugePct(0, 5), 0);
  assert.equal(gaugePct(5, 5), 100);
  assert.equal(gaugePct(9, 5), 100);
  assert.equal(gaugePct(1, 3), 33);
});

/* ------------------------------------------------ daywise + subject roll-up */

test("daywise logs stay isolated per date (Chunk 5)", () => {
  const todos: Record<string, Todo[]> = {
    "2026-11-13": [lectureTodo(1, "2026-11-13", true)],
    "2026-11-14": [lectureTodo(1, "2026-11-14", false), lectureTodo(2, "2026-11-14", false)],
  };
  assert.equal(dayStats(todos["2026-11-13"]).lecturesCompleted, 1);
  assert.equal(dayStats(todos["2026-11-14"]).lecturesCompleted, 0);
  assert.equal(dayStats(todos["2026-11-14"]).lecturesTarget, 2);
  assert.equal(flattenTodos(todos).length, 3);
});

test("completed lectures are counted once per chapter across every date", () => {
  const todos = [
    lectureTodo(1, "2026-11-13", true),
    lectureTodo(1, "2026-11-14", true), // same lecture re-logged on another day
    lectureTodo(2, "2026-11-14", true),
    lectureTodo(3, "2026-11-14", false),
  ];
  assert.deepEqual(completedLectureIndices(todos, SUBJECT, CHAPTER).sort(), [1, 1, 2]);
  assert.equal(completedLectureCount(todos, SUBJECT, CHAPTER), 2);
});

test("subject roll-up drives the syllabus and PYQ rings", () => {
  const todos = [lectureTodo(1, "2026-11-13", true), lectureTodo(2, "2026-11-13", true)];
  const rollup = subjectRollup(todos, SUBJECT, [
    { id: CHAPTER, lectures: 4, sets: [{ id: "m1", done: true }, { id: "m3", done: false }] },
    { id: "current-electricity", lectures: 4, sets: [{ id: "m1", done: false }] },
  ]);
  assert.equal(rollup.plannedLectures, 8);
  assert.equal(rollup.completedLectures, 2);
  assert.equal(rollup.syllabusPct, 25);
  assert.equal(rollup.setsTotal, 3);
  assert.equal(rollup.setsDone, 1);
  assert.equal(rollup.pyqPct, 33);
});

test("planned lecture totals stay capped at 15 per chapter", () => {
  const rollup = subjectRollup([], SUBJECT, [
    { id: CHAPTER, lectures: 99, sets: [] },
    { id: "current-electricity", lectures: -5, sets: [] },
  ]);
  assert.equal(rollup.plannedLectures, 15);
});

test("practised question totals sum completed sets for a chapter", () => {
  const todos = [
    createPyqTodo({
      subject: SUBJECT,
      chapterId: CHAPTER,
      chapterTitle: "Electric Charges and Fields",
      set: pyqSet,
      date: "2026-11-13",
      source: "today",
      createdAt: STAMP,
      completed: true,
    }),
    createPyqTodo({
      subject: SUBJECT,
      chapterId: CHAPTER,
      chapterTitle: "Electric Charges and Fields",
      set: { ...pyqSet, id: "m5", total: 5 },
      date: "2026-11-13",
      source: "today",
      createdAt: STAMP,
      completed: false,
    }),
  ];
  assert.equal(completedQuestionCount(todos, SUBJECT, CHAPTER), 6);
  assert.equal(completedQuestionCount(todos, "Chemistry", CHAPTER), 0);
});

/* ------------------------------------------------------- persistence layer */

const fakeStore = new Map<string, string>();
interface FakeWindow {
  localStorage: {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
    removeItem: (key: string) => void;
  };
}
(globalThis as unknown as { window: FakeWindow }).window = {
  localStorage: {
    getItem: (key) => fakeStore.get(key) ?? null,
    setItem: (key, value) => {
      fakeStore.set(key, value);
    },
    removeItem: (key) => {
      fakeStore.delete(key);
    },
  },
};

const storedState: StudyState = {
  version: STORAGE_VERSION,
  activeSubject: "Physics",
  dailyLog: {
    "2026-11-13": {
      lecturesCompleted: 1,
      lecturesTarget: 2,
      questionsPracticed: 6,
      chaptersPracticed: { [CHAPTER]: 6 },
      allDone: false,
      moraleShown: true,
    },
  },
  todos: { "2026-11-13": [lectureTodo(1, "2026-11-13", true)] },
  subjects: {
    Physics: { lectures: 12, lecturesCompleted: 1, syllabusPct: 8, pyqPct: 0 },
    Chemistry: { lectures: 12, lecturesCompleted: 0, syllabusPct: 0, pyqPct: 0 },
    Mathematics: { lectures: 12, lecturesCompleted: 0, syllabusPct: 0, pyqPct: 0 },
  },
  chapters: {},
};

test("the daywise log survives a save/reload round trip", () => {
  clearState();
  assert.equal(loadState(), null);

  saveState(storedState);
  const reloaded = loadState();
  assert.ok(reloaded);
  assert.equal(reloaded.activeSubject, "Physics");
  assert.equal(reloaded.dailyLog["2026-11-13"].lecturesCompleted, 1);
  assert.equal(reloaded.dailyLog["2026-11-13"].moraleShown, true);
  assert.equal(reloaded.todos["2026-11-13"].length, 1);
  assert.equal(reloaded.todos["2026-11-13"][0].completed, true);

  clearState();
  assert.equal(loadState(), null);
});

test("corrupt or older stored data is ignored instead of crashing", () => {
  fakeStore.set(STORAGE_KEY, "{not json");
  assert.equal(loadState(), null);

  fakeStore.set(STORAGE_KEY, JSON.stringify({ ...storedState, version: 0 }));
  assert.equal(loadState(), null);

  fakeStore.clear();
});

/* --------------------------------------------------------- status pill copy */

test("status pill copy follows progress", () => {
  assert.equal(deriveStatus(false, false), "Ready to start");
  assert.equal(deriveStatus(true, false), "PYQ practice");
  assert.equal(deriveStatus(true, true), "Chapter complete");
});

console.log(`\n${passed} passed, ${failures.length} failed\n`);
if (failures.length > 0) {
  console.error("Failed:");
  for (const name of failures) console.error(`  - ${name}`);
  process.exitCode = 1;
}
