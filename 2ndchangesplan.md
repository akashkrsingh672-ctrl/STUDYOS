# Change Plan 2 - Chapter progress vs. daily tasks

Status: APPROVED - ready to implement (Act mode)
Created: 2026-11-13
Project: StudyOS (Next.js 16.4.6 . React 19 . TypeScript strict . Tailwind 4 . localStorage)
Figma (visual authority): https://www.figma.com/design/CebX98K0BKepBsWee0uE17/Untitled?node-id=0-1

This is the SECOND change plan. The first (`1stchangeplan.md`, chunks 0-6) is complete and green.
This plan changes HOW COMPLETION FLOWS so that:
- the DASHBOARD shows OVERALL progression (universal, date-independent), and
- the DAILY TODO is the place where tasks are actually COMPLETED for a given date.

---

## 1. Problem (current behaviour)

Confirmed by reading the code:

| Trigger | Code | Effect today |
|---|---|---|
| "Add N lectures" / Today/Tomorrow/Custom | `store.tsx > assignLectures` | Creates lecture todos (`completed:false`) for the day + sets `lectureAssign` (a "plan") |
| Tick a lecture row inside a chapter | `store.tsx > toggleLecture` | Flips the lecture todo `completed`; if no todo exists it creates one with `completed:true` -> logged done instantly |
| Tick a PYQ row inside a chapter | `store.tsx > togglePyqDone` | Sets `chapter.pyqs[].done = true` and marks the todo complete -> dashboard PYQ ring jumps instantly |
| Tick an item in the Todo | `store.tsx > toggleTodo` | Flips `completed` (+syncs `pyq.done`) -> the correct completion path |

Overall numbers (`subjects.lecturesCompleted`, `pyqPct`, status pills, sidebar rings, chips) are
already derived universally in `normalizeState()` from COMPLETED todos across all dates plus
`pyq.done`. The issue is only that the chapter checkbox completes items directly, bypassing the Todo.

## 2. Rules (agreed with the user)

A. **`lectures` = the chapter real theory-lecture count** - a conserved property, NOT a plan.
   "Add N lectures" only saves that total; it is persisted forever and never reset or consumed.
   Mirror of a PYQ set question `total`.

B. **Chapter checkbox, no day selected** -> tick marks the item **done historically**
   ("already done, pre-database"); counts toward **overall syllabus only** (no daily entry).

C. **Chapter checkbox, day selected** (Today/Tomorrow/Custom) -> tick **queues** the item into
   that day **Todo** as PENDING; it does NOT complete it.

D. **Todo checkbox** -> the only completion action; ticking sets `completed` and the item then
   counts toward **overall progress AND daily completion**. Unticking reverses both.

E. These rules apply identically to **lectures** and **questions (PYQ)**.

## 3. Behaviour matrix (per row)

Chapter row states: `idle` . `queued` (pending todo on the chosen day) . `done`.

- No day selected:  idle --tick--> history-done ; done(history) --tick--> idle
- Day selected:     idle --tick--> queued ; queued --tick--> idle ; done --tick--> no-op (un-do from Todo)
- Todo row:         pending --tick--> completed (overall + daily) ; completed --tick--> pending (reverses both)

## 4. Code changes

### 4.1 `src/lib/types.ts` - `ChapterState`
- `lectures: number` - documented as the conserved chapter lecture total.
- `lecturesPlanned: boolean` -> rename `lecturesSaved` ("the total was saved"); hydrate fallback kept.
- NEW `lectureDoneHistory: number[]` - indices ticked with NO day (historical, syllabus-only).
  Needed because a historical completion has no todo, so `completedLectureCount(todos...)` cannot see it.
- `lectureAssign`, `PyqSetState.{done, assignedDate, assignedSource}` unchanged.

### 4.2 `src/lib/planLogic.ts` (pure, testable)
- NEW `lectureDoneIndices(todos, history, subject, chapterId)` = distinct union(history, completed-lecture-todo indices), capped 1..N.
- NEW `lectureRowStatus(...)` / `pyqRowStatus(...)` -> `"idle" | "queued" | "done"`.
- NEW `findLectureTodo` / `findPyqTodo` (newest date wins, like `locateTodo`).
- `subjectRollup(...)` gains a `doneHistory` input so overall syllabus counts history + todo-done.
- `dayStats`, `buildDailyLog`, `gaugePct`, factories unchanged (daily stays todo-only).

### 4.3 `src/lib/state.ts`
- `createChapterState`: add `lectureDoneHistory: []`, `lecturesSaved: false`.
- `hydrateState`: read/sanitise `lectureDoneHistory` (ints 1..lectures); fallback `lecturesPlanned` -> `lecturesSaved`.
- `normalizeState`: pass each chapter `doneHistory` into `subjectRollup`.

### 4.4 `src/lib/store.tsx`
- `assignLectures` / `assignPyq`: set the day and MOVE pending todos to it (never duplicate); never create completed items.
- `toggleLecture` (chapter tick):
  - day set -> pending? remove . completed? no-op . history-done? no-op . else create pending todo on the assigned day.
  - no day -> completed? no-op . in history? remove . else add to history.
- `togglePyqDone` (chapter tick): same rules; no longer sets `pyq.done` by itself.
- `toggleTodo`: unchanged; keeps syncing `pyq.done`; `normalizeState` fans completion out everywhere.
- `chapterProgress`: `lecturesDone` = union(history, todo-done) capped; `setsDone` = `pyq.done`.
  The context also exposes `lectureRowStatus` / `pyqRowStatus`.
- `setChapterLectures`: keep the total; if lowered, drop queued-not-done todos and history entries above the new total.

### 4.5 Chapter components
- `LectureChecklist.tsx` / `PyqChecklist.tsx`: setup panel driven by `lecturesSaved`; button copy clarifies it
  sets the chapter total; rows render 3 states (idle / queued / done) using EXISTING tokens only
  (`bg-success-soft`, `border-success-border`, `bg-accent-soft`, `rounded-checkbox`).
- "THEORY . DONE!" bar and `02 / PYQ PRACTICE` reveal stay driven by overall completion;
  the "Practice complete" pill shows only when done.

### 4.6 Todo surfaces
- `TodoDrawer`, `TodayChecklist`, `TodoList`: no structural change; small copy hint that ticking here completes the item.

## 5. Persistence / migration
- Storage shape changes -> bump `STORAGE_VERSION` 1 -> 2 WITH a migration so existing saved logs survive (no data loss).

## 6. Edge cases / hardening
- No double-count: a lecture is queued on at most one day (pending todos move, never duplicate); history never creates a todo.
- History vs todo-done counted once (set union), capped at the chapter total.
- Un-complete from Todo drops overall AND daily progress; `moraleShown` preserved.
- Lowering the lecture total trims queued + history beyond the new total; 0 clears it; otherwise conserved.
- PYQ `done` has a single writer for todo-mode (`toggleTodo`) plus the no-day history toggle.
- Idempotent toggles, stable todo ids on day-move, empty days removed, SSR/hydration untouched.

## 7. Verification plan
- Extend `scripts/logic-tests.mts`: history union + dedupe + cap; `subjectRollup` counts history; status transitions;
  no-duplicate-on-move; un-complete drops both progresses; cap 15.
- `npm test`, `npm run lint`, `npm run build` (+ SSR smoke check).
- Update `Implementation_log.md`, `Project_status.md`, `Tests_performed.md`; commit (per `.clinerules`).

## 8. Optional extra (not in scope unless requested)
- A "Clear day" affordance in `AssignToDateControl` so a chapter can return to the "no day selected"
  (historical) mode after a day was chosen.
