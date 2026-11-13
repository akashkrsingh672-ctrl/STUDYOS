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
  MAX_QUESTIONS,
  addPyqAllocations,
  buildDailyLog,
  clampCount,
  clampQuestions,
  completedLectureCount,
  completedLectureIndices,
  completedQuestionCount,
  completedQuestionsOf,
  createLectureTodo,
  createPyqTodo,
  dayStats,
  deriveStatus,
  findLectureTodo,
  findPyqTodo,
  flattenTodos,
  gaugePct,
  isLectureTodoOf,
  isPyqTodoOf,
  lectureDoneCount,
  lectureDoneIndices,
  lectureRowStatus,
  movePendingTodos,
  normalizePyqTodo,
  pyqChapterStats,
  pyqSectionStats,
  subjectRollup,
  trimPyqAllocation,
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
import { EXAM_DATE, daysUntilExam } from "../src/lib/exam.ts";
import {
  STORAGE_KEY,
  STORAGE_VERSION,
  clearState,
  loadState,
  saveState,
} from "../src/lib/storage.ts";
import { hydrateState } from "../src/lib/state.ts";
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

test("the exam countdown targets 16 Feb 2027", () => {
  assert.equal(EXAM_DATE, "2027-02-16");
  assert.equal(daysUntilExam("2026-11-13"), 95);
  assert.equal(daysUntilExam("2027-02-15"), 1);
  assert.equal(daysUntilExam("2027-02-16"), 0);
  assert.equal(daysUntilExam("2027-03-01"), 0); // never negative
  assert.equal(daysUntilExam(""), null); // not hydrated yet
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
    {
      id: CHAPTER,
      lectures: 4,
      doneHistory: [],
      sets: [
        { id: "m1", label: "1 marker questions", total: 8, done: true },
        { id: "m3", label: "3 marker questions", total: 6, done: false },
      ],
    },
    {
      id: "current-electricity",
      lectures: 4,
      doneHistory: [],
      sets: [{ id: "m1", label: "1 marker questions", total: 8, done: false }],
    },
  ]);
  assert.equal(rollup.plannedLectures, 8);
  assert.equal(rollup.completedLectures, 2);
  assert.equal(rollup.syllabusPct, 25);
  assert.equal(rollup.setsTotal, 3);
  assert.equal(rollup.setsDone, 1);
  assert.equal(rollup.questionsTotal, 22);
  assert.equal(rollup.questionsCompleted, 8);
  assert.equal(rollup.pyqPct, 36);
});

test("planned lecture totals stay capped at 15 per chapter", () => {
  const rollup = subjectRollup([], SUBJECT, [
    { id: CHAPTER, lectures: 99, doneHistory: [], sets: [] },
    { id: "current-electricity", lectures: -5, doneHistory: [], sets: [] },
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

/* ------------------------------------- change plan 2: history vs. the queue */

test("historical marks and completed todos merge toward the syllabus (Plan 2)", () => {
  const todos = [lectureTodo(2, "2026-11-13", true), lectureTodo(3, "2026-11-13", false)];
  const done = lectureDoneIndices(todos, [1], SUBJECT, CHAPTER, 4);
  assert.deepEqual(done.sort((a, b) => a - b), [1, 2]);
  assert.equal(lectureDoneCount(todos, [1], SUBJECT, CHAPTER, 4), 2);
  assert.deepEqual(
    lectureDoneIndices(todos, [1, 9], SUBJECT, CHAPTER, 4).sort((a, b) => a - b),
    [1, 2],
  );
});

test("a lecture row is idle, queued then done (Plan 2)", () => {
  const todos: Record<string, Todo[]> = {
    "2026-11-13": [
      createLectureTodo({
        subject: SUBJECT,
        chapterId: CHAPTER,
        chapterTitle: "Electric Charges and Fields",
        lectureIndex: 1,
        date: "2026-11-13",
        source: "today",
        createdAt: STAMP,
        completed: false,
      }),
    ],
  };
  assert.equal(lectureRowStatus(todos, [], SUBJECT, CHAPTER, 1), "queued");
  assert.equal(lectureRowStatus(todos, [], SUBJECT, CHAPTER, 2), "idle");
  assert.equal(lectureRowStatus(todos, [3], SUBJECT, CHAPTER, 3), "done");
  const done = {
    "2026-11-13": todos["2026-11-13"].map((todo) => ({ ...todo, completed: true })),
  };
  assert.equal(lectureRowStatus(done, [], SUBJECT, CHAPTER, 1), "done");
});

test("a question section counts partial, queued and remaining questions", () => {
  const todos: Record<string, Todo[]> = {
    "2026-11-13": [
      createPyqTodo({
        subject: SUBJECT,
        chapterId: CHAPTER,
        chapterTitle: "Electric Charges and Fields",
        set: pyqSet,
        amount: 10,
        completedCount: 4,
        date: "2026-11-13",
        source: "today",
        createdAt: STAMP,
      }),
    ],
    "2026-11-14": [
      createPyqTodo({
        subject: SUBJECT,
        chapterId: CHAPTER,
        chapterTitle: "Electric Charges and Fields",
        set: pyqSet,
        amount: 6,
        date: "2026-11-14",
        source: "tomorrow",
        createdAt: STAMP,
      }),
    ],
  };
  const all = flattenTodos(todos);

  assert.equal(completedQuestionsOf(all[0]), 4);
  assert.equal(findPyqTodo(todos, SUBJECT, CHAPTER, "m3")?.date, "2026-11-14"); // newest day wins
  assert.equal(findLectureTodo(todos, SUBJECT, CHAPTER, 1), null);

  const stats = pyqSectionStats(all, {
    subject: SUBJECT,
    chapterId: CHAPTER,
    id: "m3",
    label: "3 marker questions",
    total: 20,
    done: false,
  });
  assert.equal(stats.completed, 4);
  assert.equal(stats.queued, 12);
  assert.equal(stats.remaining, 4); // 20 - 4 completed - 12 queued
  assert.equal(stats.pct, 20);

  // A legacy "done" mark means the whole section is finished.
  const legacy = pyqSectionStats(all, {
    subject: SUBJECT,
    chapterId: CHAPTER,
    id: "m3",
    label: "3 marker questions",
    total: 20,
    done: true,
  });
  assert.equal(legacy.completed, 20);
  assert.equal(legacy.queued, 0);
  assert.equal(legacy.remaining, 0);
  assert.equal(legacy.pct, 100);
});

test("questions are capped at 100 per section, lectures still at 15", () => {
  assert.equal(MAX_QUESTIONS, 100);
  assert.equal(clampQuestions(-3), 0);
  assert.equal(clampQuestions(12.6), 13);
  assert.equal(clampQuestions(100), 100);
  assert.equal(clampQuestions(101), 100);
  assert.equal(clampQuestions(9999), 100);
  assert.equal(clampCount(99), 15);
});

test("allocating questions writes one dated row per section and tops it up", () => {
  let todos: Record<string, Todo[]> = {};

  todos = addPyqAllocations(todos, {
    subject: SUBJECT,
    chapterId: CHAPTER,
    chapterTitle: "Electric Charges and Fields",
    date: "2026-11-13",
    source: "today",
    allocations: [{ set: pyqSet, count: 10 }],
    createdAt: STAMP,
  });
  todos = addPyqAllocations(todos, {
    subject: SUBJECT,
    chapterId: CHAPTER,
    chapterTitle: "Electric Charges and Fields",
    date: "2026-11-13",
    source: "today",
    allocations: [{ set: pyqSet, count: 5 }],
    createdAt: STAMP,
  });
  todos = addPyqAllocations(todos, {
    subject: SUBJECT,
    chapterId: CHAPTER,
    chapterTitle: "Electric Charges and Fields",
    date: "2026-11-14",
    source: "tomorrow",
    allocations: [{ set: pyqSet, count: 3 }],
    createdAt: STAMP,
  });

  assert.equal(todos["2026-11-13"].length, 1, "same day tops up instead of duplicating");
  assert.equal(todos["2026-11-13"][0].amount, 15);
  assert.equal(todos["2026-11-14"][0].amount, 3, "a second day gets its own row");
  assert.equal(flattenTodos(todos).length, 2);
});

test("lowering a section total trims the newest allocations first", () => {
  const base: Record<string, Todo[]> = {
    "2026-11-13": [
      { ...createPyqTodo({ subject: SUBJECT, chapterId: CHAPTER, chapterTitle: "Chapter", set: pyqSet, amount: 10, completedCount: 10, date: "2026-11-13", source: "today", createdAt: STAMP }) },
    ],
    "2026-11-14": [
      { ...createPyqTodo({ subject: SUBJECT, chapterId: CHAPTER, chapterTitle: "Chapter", set: pyqSet, amount: 10, date: "2026-11-14", source: "tomorrow", createdAt: STAMP }) },
    ],
  };

  const trimmed = trimPyqAllocation(base, SUBJECT, CHAPTER, "m3", 12);
  assert.equal(trimmed["2026-11-13"][0].amount, 10);
  assert.equal(trimmed["2026-11-13"][0].completedCount, 10);
  assert.equal(trimmed["2026-11-14"][0].amount, 2, "leftover questions shrink the newest row");

  const cleared = trimPyqAllocation(base, SUBJECT, CHAPTER, "m3", 0);
  assert.equal(cleared["2026-11-13"], undefined);
  assert.equal(cleared["2026-11-14"], undefined);
});

test("partial question progress feeds the day stats but not 'all done'", () => {
  const partial = [
    { ...createPyqTodo({ subject: SUBJECT, chapterId: CHAPTER, chapterTitle: "Chapter", set: pyqSet, amount: 10, date: "2026-11-13", source: "today", createdAt: STAMP }), completedCount: 6 },
  ];
  const stats = dayStats(partial);
  assert.equal(stats.questionsPracticed, 6);
  assert.equal(stats.allDone, false);

  const full = [normalizePyqTodo({ ...partial[0], completedCount: 10 })];
  assert.equal(dayStats(full).questionsPracticed, 10);
  assert.equal(dayStats(full).allDone, true);
  assert.equal(completedQuestionCount(full, SUBJECT, CHAPTER), 10);
});

test("a chapter rolls its question sections together", () => {
  const todos: Record<string, Todo[]> = {
    "2026-11-13": [
      { ...createPyqTodo({ subject: SUBJECT, chapterId: CHAPTER, chapterTitle: "Chapter", set: pyqSet, amount: 6, date: "2026-11-13", source: "today", createdAt: STAMP }), completedCount: 6 },
    ],
  };
  const chapter = pyqChapterStats(flattenTodos(todos), SUBJECT, CHAPTER, [
    { id: "m3", label: "3 marker questions", total: 10, done: false },
    { id: "m5", label: "5 marker questions", total: 4, done: false },
  ]);
  assert.equal(chapter.total, 14);
  assert.equal(chapter.completed, 6);
  assert.equal(chapter.pct, 43);
  assert.equal(chapter.sections.length, 2);
  assert.equal(chapter.allDone, false);
});

test("moving a pending item to another day never duplicates it (Plan 2)", () => {
  const todos: Record<string, Todo[]> = {
    "2026-11-13": [
      createLectureTodo({
        subject: SUBJECT,
        chapterId: CHAPTER,
        chapterTitle: "Electric Charges and Fields",
        lectureIndex: 1,
        date: "2026-11-13",
        source: "today",
        createdAt: STAMP,
        completed: false,
      }),
    ],
  };
  const id = todos["2026-11-13"][0].id;
  const moved = movePendingTodos(todos, (todo) => !todo.completed, "2026-11-14");
  assert.equal(moved["2026-11-13"], undefined);
  assert.equal(moved["2026-11-14"].length, 1);
  assert.equal(moved["2026-11-14"][0].id, id);
  assert.equal(moved["2026-11-14"][0].date, "2026-11-14");

  const kept = movePendingTodos(
    { "2026-11-13": [{ ...todos["2026-11-13"][0], completed: true }] },
    (todo) => !todo.completed,
    "2026-11-14",
  );
  assert.equal(kept["2026-11-13"].length, 1);
  assert.equal(kept["2026-11-14"], undefined);
});

test("subject roll-up counts historical lecture marks (Plan 2)", () => {
  const rollup = subjectRollup([], SUBJECT, [
    {
      id: CHAPTER,
      lectures: 4,
      doneHistory: [1, 2],
      sets: [{ id: "m1", label: "1 marker questions", total: 4, done: false }],
    },
  ]);
  assert.equal(rollup.completedLectures, 2);
  assert.equal(rollup.syllabusPct, 50);
  assert.equal(rollup.questionsCompleted, 0);
  assert.equal(rollup.pyqPct, 0);
});

test("un-completing a todo drops daily and syllabus progress (Plan 2)", () => {
  const todos = [lectureTodo(1, "2026-11-13", true), lectureTodo(2, "2026-11-13", false)];
  assert.equal(dayStats(todos).lecturesCompleted, 1);
  assert.equal(lectureDoneIndices(todos, [], SUBJECT, CHAPTER, 4).length, 1);
  assert.equal(
    subjectRollup(todos, SUBJECT, [{ id: CHAPTER, lectures: 4, doneHistory: [], sets: [] }])
      .completedLectures,
    1,
  );

  const undone = todos.map((todo) => ({ ...todo, completed: false }));
  assert.equal(dayStats(undone).lecturesCompleted, 0);
  assert.equal(dayStats(undone).lecturesTarget, 2);
  assert.equal(lectureDoneIndices(undone, [], SUBJECT, CHAPTER, 4).length, 0);
  assert.equal(
    subjectRollup(undone, SUBJECT, [{ id: CHAPTER, lectures: 4, doneHistory: [], sets: [] }])
      .completedLectures,
    0,
  );
});

test("a shorter lecture total trims only the vanished rows (Plan 2)", () => {
  const todos = [lectureTodo(1, "2026-11-13", true), lectureTodo(4, "2026-11-13", true)];
  assert.deepEqual(
    lectureDoneIndices(todos, [2, 4], SUBJECT, CHAPTER, 4).sort((a, b) => a - b),
    [1, 2, 4],
  );
  assert.deepEqual(
    lectureDoneIndices(todos, [2, 4], SUBJECT, CHAPTER, 3).sort((a, b) => a - b),
    [1, 2],
  );
});

test("a v1 log migrates to v2 without losing data (Plan 2)", () => {
  const v1 = {
    version: 1,
    activeSubject: "Physics",
    dailyLog: {
      "2026-11-13": {
        lecturesCompleted: 2,
        lecturesTarget: 3,
        questionsPracticed: 6,
        chaptersPracticed: { [CHAPTER]: 6 },
        allDone: false,
        moraleShown: true,
      },
    },
    todos: {
      "2026-11-13": [lectureTodo(1, "2026-11-13", true), lectureTodo(2, "2026-11-13", true)],
    },
    subjects: {},
    chapters: {
      Physics: {
        [CHAPTER]: {
          lectures: 5,
          // Pre-Plan-2 field name; `lectureDoneHistory` is new and must survive sanitising.
          lecturesPlanned: true,
          lectureAssign: null,
          lectureDoneHistory: [1, 9],
          pyqs: [
            {
              ...pyqSet,
              id: "m1",
              label: "1 marker questions",
              defaultTotal: 4,
              total: 4,
              done: true,
            },
          ],
        },
      },
    },
  } as unknown as StudyState;

  const migrated = hydrateState(v1);
  const chapter = migrated.chapters.Physics[CHAPTER];
  assert.equal(migrated.version, STORAGE_VERSION);
  assert.equal(chapter.lectures, 5);
  assert.equal(chapter.lecturesSaved, true);
  assert.deepEqual(chapter.lectureDoneHistory, [1]);
  assert.equal(chapter.pyqs.find((pyq) => pyq.id === "m1")?.done, true);
  assert.equal(migrated.todos["2026-11-13"].length, 2);
  assert.equal(migrated.dailyLog["2026-11-13"].moraleShown, true);
  assert.equal(migrated.dailyLog["2026-11-13"].lecturesCompleted, 2);
});

test("a v2 log backfills question progress without losing data (Plan 3)", () => {
  const v2 = {
    version: 2,
    activeSubject: "Physics",
    dailyLog: {},
    todos: {
      "2026-11-13": [
        {
          id: "legacy-pyq-row",
          kind: "pyq",
          subject: SUBJECT,
          chapterId: CHAPTER,
          chapterTitle: "Electric Charges and Fields",
          label: "3 marker questions",
          amount: 6,
          setId: "m3",
          date: "2026-11-13",
          source: "today",
          completed: true,
          createdAt: STAMP,
        },
      ],
    },
    subjects: {},
    chapters: {},
  } as unknown as StudyState;

  const migrated = hydrateState(v2);
  const item = migrated.todos["2026-11-13"][0];
  assert.equal(migrated.version, STORAGE_VERSION);
  assert.equal(item.amount, 6);
  assert.equal(item.completedCount, 6, "a finished v2 row keeps its full progress");
  assert.equal(item.completed, true);
  assert.equal(migrated.dailyLog["2026-11-13"].questionsPracticed, 6);
});

test("a stale zero-question row is dropped on normalize", () => {
  const todos = [normalizePyqTodo({ ...createPyqTodo({ subject: SUBJECT, chapterId: CHAPTER, chapterTitle: "Chapter", set: pyqSet, amount: 0, date: "2026-11-13", source: "today", createdAt: STAMP }) })];
  assert.equal(todos[0].amount, 0);
  assert.equal(todos[0].completed, false);
  assert.equal(dayStats(todos).questionsPracticed, 0);
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
