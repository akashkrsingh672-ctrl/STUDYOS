# Tests Performed — StudyOS

Every test below was executed in this repository on **2026-11-14** (Windows, PowerShell,
Node v26.13.0, npm 11.20.0). Only tests that actually ran are listed as performed; the interactive
browser checklist at the bottom is marked **pending** because I cannot drive a browser from here.

---

## T1 · Baseline build (before any change) — ❌ FAILED (finding)

```bash
npm run build
```
Result: failed with 2 errors
1. `globals.css` → `@import rules must precede all rules aside from @charset and @layer statements`
   (the Google Fonts `@import` sat after `@import "tailwindcss"`).
2. `TopNavigation.tsx` + `ChapterAccordion.tsx` → *"You're importing a module that depends on
   `useState` into a React Server Component module."* (missing `"use client"`).

Also noted: `node_modules` was not populated (only a stray partial `next` folder) → `npm install`
required; no git repo existed → `git init`.

Both build blockers were fixed during the realignment and are covered by T4.

## T2 · Logic + persistence tests — ✅ PASSED (37/37)

```bash
npm test
# node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/logic-tests.mts
```

```
StudyOS logic tests
  PASS  curriculum mirrors the cbsedatabaseprefetch.json chapter lists   (14/10/13 chapters)
  PASS  sortByPriority orders chapters P1 → P2 → P3, stable by chapter number
  PASS  categorizeByMarks divides chapters into High / Medium / Low by marks tertiles
  PASS  count control clamps to 0–15                                    (Req 2)
  PASS  date keys round-trip in local time and step across boundaries
  PASS  relative labels match the working-log wording
  PASS  month grid is Monday-first and complete
  PASS  the exam countdown targets 16 Feb 2027
  PASS  lecture items are built as 1-unit checklist rows
  PASS  PYQ items carry the set size as their question count
  PASS  day stats roll lectures, questions and chapter breakdown together   (Req 1)
  PASS  a day is complete only when it has items and all are done
  PASS  daily log entries rebuild from the checklist and keep moraleShown
  PASS  gauge percentages guard against a zero target
  PASS  daywise logs stay isolated per date (Chunk 5)
  PASS  completed lectures are counted once per chapter across every date
  PASS  subject roll-up drives the syllabus and PYQ rings
  PASS  planned lecture totals stay capped at 15 per chapter
  PASS  practised question totals sum completed sets for a chapter
  PASS  the daywise log survives a save/reload round trip               (Chunk 5)
  PASS  corrupt or older stored data is ignored instead of crashing
  PASS  status pill copy follows progress
  PASS  historical marks and completed todos merge toward the syllabus (Plan 2)
  PASS  a lecture row is idle, queued then done (Plan 2)
  PASS  a PYQ row mirrors the same idle/queued/done flow (Plan 2)
  PASS  moving a pending item to another day never duplicates it (Plan 2)
  PASS  subject roll-up counts historical lecture marks (Plan 2)
  PASS  un-completing a todo drops daily and syllabus progress (Plan 2)
  PASS  a shorter lecture total trims only the vanished rows (Plan 2)
  PASS  a v1 log migrates to v2 without losing data (Plan 2)
  PASS  a question section counts partial, queued and remaining questions (Plan 3)
  PASS  questions are capped at 100 per section, lectures still at 15 (Plan 3)
  PASS  allocating questions writes one dated row per section and tops it up (Plan 3)
  PASS  lowering a section total trims the newest allocations first (Plan 3)
  PASS  partial question progress feeds the day stats but not "all done" (Plan 3)
  PASS  a chapter rolls its question sections together (Plan 3)
  PASS  a v2 log backfills question progress without losing data (Plan 3)
  PASS  a stale zero-question row is dropped on normalize (Plan 3)

37 passed, 0 failed
```

Key assertions worth calling out:
- `clampCount`: `-4 → 0`, `16 → 15`, `999 → 15`, `NaN → 0`, `7.6 → 8` (max 15 enforced everywhere).
- `dayStats`: 3 lecture items with 2 done → target 3 / completed 2 / 67%; questions `6 + 4 = 10` with
  an open set excluded; chapterwise breakdown grouped per chapter.
- Daywise isolation: the same lecture logged on two dates counts as one completed lecture for the
  chapter, while each date keeps its own target/completion.
- Persistence: save → load round-trip restores the log (including `moraleShown`); corrupt JSON and an
  older `version` both return `null` instead of throwing.
- Change Plan 2 (details in T7): historical marks merge with completed todos and dedupe/cap; row status
  walks idle → queued → done; moving a pending item keeps its id on one day; un-completing reverses
  daily **and** syllabus progress; a v1 saved log upgrades to v2 with no data loss.
- Exam countdown: `EXAM_DATE = "2027-02-16"`; 13 Nov 2026 → **95** days, 15 Feb 2027 → 1, exam day → 0,
  a past date clamps to 0, and an un-hydrated (empty) day returns `null`.
- Change Plan 3: question sections cap at 100 per section while lectures stay at 15; one day-press
  tops up that day's row instead of duplicating; lowering a section total trims the newest allocation;
  partial progress counts toward the day but not "all done" until the full amount is done.

## T3 · Lint — ✅ PASSED (clean)

```bash
npm run lint
```
`eslint` → no output (0 errors, 0 warnings) after fixing one unused variable and adding the
documented `react-hooks/set-state-in-effect` exception on the hydration line.
Re-run after Change Plan 2: **exit 0, 0 problems** (the earlier parse failure in
`scripts/logic-tests.mts` is covered in T7). Re-run after Change Plan 3: **exit 0, 0 problems**.

## T4 · Production build — ✅ PASSED

```bash
npm run build
```
```
▲ Next.js 16.4.6 (Turbopack)
- Cache Components enabled
- Partial Prefetching enabled
  Creating an optimized production build ...
✓ Compiled successfully in 2.6s
  Running TypeScript ...
  Finished TypeScript in 2.6s ...
✓ Generating static pages (4/4) in 1020ms
Route (app)   ┌ ○ /        └ ○ /_not-found      ○ (Static) prerendered as static content
```
This also proves the strict TypeScript pass over every new module and that `/` still prerenders.
Re-run after Change Plan 2: **exit 0** — compiled in 3.5 s, TypeScript in 4.9 s, 4/4 pages.
Re-run after Change Plan 3: **exit 0** — compiled in 2.6 s, TypeScript in 2.6 s, 4/4 pages.

### T4b · Type check — ✅ PASSED

```bash
npx tsc --noEmit
```
Exit 0 with **0 errors** across the app and `scripts/logic-tests.mts` (this gate is also part of
`next build`).

## T5 · Live SSR smoke test — ✅ PASSED

```bash
node node_modules/next/dist/bin/next start -p 3100     # then HTTP GET http://localhost:3100
```
Response: **200**, 24,826 bytes of HTML (Session 4 re-run). Content markers:

| Marker | Expected | Actual |
|---|---|---|
| `Chapter library` | present | ✅ True |
| `Electric Charges and Fields` (active subject = Physics) | present | ✅ True |
| `Ready to start` (status pill, initial state) | present | ✅ True |
| `How many lectures are in this chapter?` (first accordion expanded) | present | ✅ True |
| `Daily goal` (188px ring + label) | present | ✅ True |
| `Study reminder` (sidebar card) | present | ✅ True |
| `Open todo drawer` (home panel action) | present | ✅ True |
| `Boards countdown` | present | ✅ True |
| `boardroom` (brand) | present | ✅ True |
| `PYQ PRACTICE` | absent at theory stage | ✅ False (correct staging) |
| `Electrochemistry` (Chemistry chapter) | absent | ✅ False (subject switch respected) |
| `Relations and Functions` (Maths chapter) | absent | ✅ False |
| `aria-label="Todo drawer"` | absent while closed | ✅ False |

The server was stopped after the check.

## T6 · Regression of pre-existing behaviour

| Original element | Status after changes |
|---|---|
| Top navigation (monogram, brand, descriptor, session pill, preview date) | ✅ present (T5), visually unchanged; hamburger now functional |
| Boards countdown card | ✅ present with the same card/tokens; now live — 16 Feb 2027 exam date, days computed from the hydrated "today" (42 / "13 Mar 2026" placeholder replaced) |
| Subject picker cards | ✅ present, now switching subjects for real |
| Chapter library + accordions | ✅ present, expanded into the design's study flow |
| Workspace footer ("The Study Loop" path) | ✅ `components/layout/Footer.tsx` untouched |
| `app/layout.tsx` metadata, fonts, background/foreground | ✅ untouched |
| `next.config.ts`, `eslint.config.mjs`, `README.md` | ✅ untouched |

## T7 · Change Plan 2 — history vs. the queue — ✅ PASSED (7/7)

Scope: `2ndchangesplan.md` §7. Every assertion runs through the same modules the app uses.

| Test | What it proves |
|---|---|
| historical marks and completed todos merge toward the syllabus | `lectureDoneIndices([lecture 2 done], history [1], total 4)` → `[1,2]`; count 2; an out-of-range history mark `9` is ignored |
| a lecture row is idle, queued then done | pending todo → `queued`; no todo → `idle`; a history mark or a completed todo → `done` |
| moving a pending item to another day never duplicates it | the id is preserved, the old day is dropped, a completed item is not moved |
| subject roll-up counts historical lecture marks | `doneHistory [1,2]` with `lectures 4` → 2 completed, 50% |
| un-completing a todo drops daily and syllabus progress | `dayStats` 1 → 0 completed (target stays 2) and `subjectRollup` 1 → 0 |
| a shorter lecture total trims only the vanished rows | history `[2,4]` + todos 1,4: total 4 → `[1,2,4]`; total 3 → `[1,2]` |
| a v1 log migrates to v2 without losing data | `hydrateState` keeps both todos and `moraleShown`, derives `lecturesSaved` from `lecturesPlanned`, sanitises history `[1,9]` → `[1]`, keeps `pyq.done`, bumps `version` to 2 |

### Repair finding

The first implementation pass left the new test block spliced inside two existing tests, so
`npm test`, `npm run lint` and the build's typecheck all failed with
`ERR_INVALID_TYPESCRIPT_SYNTAX` / `Parsing error: ';' expected`. The four damaged tests were restored
(`completedLectureIndices` / `completedLectureCount` assertions, the `setsTotal` / `setsDone` /
`pyqPct` assertions, the 15-cap fixtures and the practised-questions tail), the now-required
`doneHistory` field was added to every `subjectRollup` fixture, and the Plan 2 block was moved after
the existing tests. `npx tsc --noEmit` then reported **0 errors**.

---

## T8 · Change Plan 3 — PYQ before theory, question bars, day assignment, partial progress — ✅ PASSED (8/8)

Scope: the question-side changes approved with Change Plan 3. Every assertion runs through the same
modules the app uses.

| Test | What it proves |
|---|---|
| a question section counts partial, queued and remaining questions | `completedQuestionsOf` → 4 of 10 done; `pyqSectionStats` → completed 4, queued 12, remaining 4 of 20; legacy `done` → 20/20 |
| questions are capped at 100 per section, lectures still at 15 | `clampQuestions(101)` → 100, `clampQuestions(9999)` → 100, `clampCount(99)` → 15 |
| allocating questions writes one dated row per section and tops it up | same-day press extends the row (10 + 5 → 15, one row); a second day gets its own row; 2 rows total |
| lowering a section total trims the newest allocations first | total 12 keeps oldest day (10) and shrinks newest (10 → 2); total 0 drops both rows |
| partial question progress feeds day stats but not "all done" | `questionsPracticed` = 6 with `allDone=false`; full → 10 with `allDone=true` |
| a chapter rolls its question sections together | 10 + 4 = 14 total, 6 completed → 43%, `allDone=false` |
| a v2 log backfills question progress without losing data | `hydrateState` bumps version to 3, backfills `completedCount` from `completed`, keeps `moraleShown`, `questionsPracticed` = 6 |
| a stale zero-question row is dropped on normalize | `normalizePyqTodo` clamps `amount` to 0 and `completed` to false; `dayStats` = 0 practiced |

## Pending — manual browser checklist (needs a human)

Run `npm run dev` and confirm:

1. Hover/focus the 188px daily goal ring → tooltip shows `Lectures completed today X/Y`,
   `Question practice today N` and the chapterwise list (empty state before any practice).
2. Chapter accordion: pick 5 lectures → "Save 5 lectures" → the checklist grows to 5 rows and the
   total persists per chapter. Saving alone must **not** change today's goal target; `+` stops at 15,
   `−` stops at 0.
3. With **no day** chosen: tick lectures 1–2 → rows turn green as historical "already done"; the
   syllabus ring / sidebar chips move, but today's daily goal target and completion do not.
4. Choose Today (also try Tomorrow and Custom date) for the lecture plan → tick a row → it shows
   "queued" and appears as a **pending** item in the dashboard list / todo drawer; the day's lecture
   target increases by one.
5. Tick that item in the Todo → it completes and **both** the daily goal and the syllabus move.
   Untick → both reverse, and `moraleShown` is preserved.
6. Complete every lecture through the Todo → the green "THEORY · DONE!" bar appears with
   "Edit lectures", and `02 / PYQ PRACTICE` appears with the status pill switching to "PYQ practice".
7. PYQ rows: change totals; with no day a tick marks the set historically (overall PYQ ring only);
   with a day a tick queues it into the Todo, and completing it there shows "✓ Practice complete".
8. Move a queued item Today → Tomorrow → Custom date: it appears on exactly one day each time (the
   calendar marks it), never duplicated; reload keeps a single copy.
9. Lower the lecture total below ticked rows → queued/history rows above the new total disappear;
   setting 0 clears them; otherwise the total is conserved.
10. Hamburger → drawer opens; navigate ‹ / › / Today; the calendar marks days with activity; quick-add
    works; Esc and backdrop close it.
11. Complete every item for a day → celebration card + rotating quote (once per day, dismissible) and
    the sidebar reminder tints green.
12. Reload the page → the log, dates and completion states survive; other dates remain untouched.
13. Switch Physics → Chemistry → Mathematics → chapters, chips and rings follow the subject.
14. Narrow the window below 1024px → the rail collapses, the compact goal bar appears, rows wrap
    without clipping.
15. Migration: in devtools set `studyos:log` to a `version: 1` payload that uses `lecturesPlanned`
    (and no `lectureDoneHistory`) → reload → the saved todos/`moraleShown` survive, the flag is
    honoured and the state is rewritten as version 2.
16. Copy hints: the dashboard list shows "Tick an item here to complete it — the daily goal and
    syllabus update together." and the drawer footer shows "Tick to complete - saved in your browser".
17. Before lectures are done: open a chapter accordion → "02 / PYQ PRACTICE" is present but
    collapsed (only its summary line shows); click it to expand.
18. After lectures are done: the PYQ section starts expanded; each section shows a progress bar
    with `X / Y` and `N queued`.
19. Set section totals (each stepper goes past 15 — no "100" copy shown) → press Today → a panel
    asks how many questions from each section for today → confirm → those questions appear as
    pending items in today's Todo / drawer, one row per section.
20. Press Today again → the same day's unfinished rows grow instead of duplicating; press Tomorrow
    → a separate row appears for tomorrow.
21. In the Todo: click the counter `+`/`−` to log partial progress (the checkbox still ticks all / unticks all); lowering a section total shrinks the newest day's row first.

