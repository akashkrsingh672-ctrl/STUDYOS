# Implementation Log — StudyOS

Figma design (visual authority): https://www.figma.com/design/CebX98K0BKepBsWee0uE17/Untitled?node-id=0-1
File key: `CebX98K0BKepBsWee0uE17` · Page 1 → `3:2` Physics dashboard, `3:6` Chemistry, `3:10` Mathematics.

Rule followed: **extend the existing design, never reinterpret it.** All new UI reuses the
Figma tokens (surface `rgba(234,244,244,0.04)`, borders `0.1–0.28`, text `#eaf4f4`/`#a5bacb`,
accent `#5aa9e6`, success `#78dbb2`, Inter + Space Grotesk, radii 16/13/10/9/8/7/6px).

---

## Session 1 — 2026-11-13

### 0. Repository reconnaissance (before any code was written)

| Finding | Detail |
|---|---|
| No git repo | `git status` → "not a repository". Ran `git init`, set local `user.name`/`user.email`. |
| Dependencies not installed | `node_modules` held only a stray partial `next` folder. Ran `npm install` (356 packages). |
| **Baseline build was broken** | `npm run build` failed with 2 errors (see below). Recorded as the "before" state. |
| Chunk 0 partially built | Shell existed (`TopNavigation`, `Sidebar`, `SubjectPicker`, `ChapterLibrary`, `ChapterAccordion`, `Footer`), but it was a simplified interpretation of the Figma. |
| Missing plan artefacts | `src/lib/store.ts` never existed; `src/components/dashboard/` and `src/components/todo/` were **empty** folders; `Implementation_log.md`, `Project_status.md`, `Tests_performed.md` did not exist. |

Baseline build failures (pre-existing, now fixed):

1. `globals.css` — `@import url(fonts.googleapis...)` came **after** `@import "tailwindcss"`,
   which Tailwind v4 expands into real rules → *"@import rules must precede all rules"*.
2. `TopNavigation.tsx` / `ChapterAccordion.tsx` used `useState` without `"use client"` →
   *"You're importing a module that depends on `useState` into a React Server Component module."*

Also discovered while reading the shell: `text-primary`, `text-muted` and `scrollbar-hide`
were used in the existing markup but **never defined** in the theme (no `--color-primary`,
`--color-muted`, no scrollbar utility) → every label rendered in the inherited colour.

Baseline commit: `562593a chore: baseline snapshot of existing StudyOS shell (pre-existing, build failing)`.

### 1. Figma inspection (design contract extracted)

Read via the Figma MCP: full metadata tree of page `0:1` plus `get_design_context` for the
expanded accordion instance `3:9478`. Specifications captured (used verbatim in code):

| Element | Spec from Figma |
|---|---|
| Chapter card | `bg rgba(234,244,244,0.04)`, border `rgba(234,244,244,0.1)`, radius 16px |
| Chapter header | 76px tall, `px-20`, gap 16px, clickable |
| Chapter index badge | 35×35, `bg rgba(90,169,230,0.1)`, radius 10px, 12px accent text |
| Chapter title | Space Grotesk Medium 17px `#eaf4f4` |
| Status pill | 112×26, `bg rgba(90,169,230,0.08)`, radius 13px, 10px `#a5bacb`; copy "Ready to start" / "PYQ practice" |
| Theory complete bar | 34px, `bg rgba(120,219,178,0.1)`, radius 8px, `✓` + "THEORY · DONE!" `#78dbb2`, "Edit lectures" 104×32 button (`bg rgba(234,244,244,0.05)`, border `0.12`, radius 9px, accent 11px) |
| Section heading | "01 / THEORY" / "02 / PYQ PRACTICE" — accent 11px, right-hand helper 9–11px `#a5bacb` |
| Lecture counter | 112×32, radius 9px, `−` 11px semibold, value 13px semibold, `+` accent |
| Question stepper | 94×30, radius 8px, `−`/`+` 14px, value 12px |
| PYQ row | 47px, `px-12`, radius 10px, done `bg rgba(120,219,178,0.05)`, open `bg rgba(234,244,244,0.02)` |
| Checkbox | 20×20, radius 6px; open `bg 0.03` + border `rgba(165,186,203,0.4)`; done `bg rgba(120,219,178,0.16)` + border `0.65` |
| Assign control | 204×32, radius 16px, two 96px segments, 11px `#a5bacb` (this is the control Chunk 3 replaces) |
| Sidebar gauges | Daily goal 188×188 ellipse track + progress arc; Syllabus/PYQ 102×102 rings |
| Study reminder | separate 284×144 card (label / quote / detail) |
| Left rail | Monogram 44×44 radius 13px, session pill radius 14px, hairlines `rgba(234,244,244,0.1)` |

**Rate limit note:** the Figma MCP returned *"You've reached the Figma MCP tool call limit on the
Starter plan"* for screenshots after the metadata/design-context calls. All implementation below is
based on the metadata tree + the codegen that were successfully retrieved (they include exact sizes,
colours and copy). Frame screenshots should be re-checked when quota resets.

### 2. Approved decision (user asked, per `.clinerules` §4)

> "Realign first (recommended): bring the shell up to Figma fidelity — arc gauges + Study reminder,
> full 01/THEORY & 02/PYQ PRACTICE study-flow accordion with steppers + assignment control — then
> implement Chunks 1–5 on top of it."
> — user answer in this session

So existing components were restructured **with explicit permission**, and the Figma remains the
visual authority throughout.

### 3. Design-token work (`src/app/globals.css`)

- Moved the Google Fonts `@import` above `@import "tailwindcss"` (build blocker #1).
  Requested Inter 400/500/600/700 and Space Grotesk 500/700 (same families, no new dependency).
- Added tokens extracted from the Figma codegen:
  `--surface-subtle 0.02`, `--surface-muted 0.03`, `--surface-raised 0.05`, `--drawer #0e1729`,
  `--accent-soft 0.1`, `--accent-softer 0.08`, `--success-soft 0.05`, `--success-soft-strong 0.1`,
  `--success-check 0.16`, `--success-border 0.65`, `--border-check rgba(165,186,203,0.4)`,
  `--on-accent #172b40`, radii `--radius-control 10px`, `--radius-soft 9px`,
  `--radius-checkbox 6px`, `--radius-pill 13px`, `--radius-assign 16px`,
  shadows `--shadow-tooltip`, `--shadow-drawer`, `--shadow-popover`.
- **Fixed `--success`**: was `#78db78`, the Figma value is `#78dbb2` (the rgba forms in the design
  are `120,219,178` = `#78DBB2`). The old value was a transcription typo; corrected so green states
  match the design.
- **Added the missing aliases** `--color-primary` and `--color-muted` so the existing
  `text-primary` / `text-muted` classes actually resolve (previously undefined → no colour emitted).
- **Defined `scrollbar-hide`** (used by the workspace, subject rail and drawer) as a Tailwind v4
  `@utility`, plus `animate-drawer-in`, `animate-fade-in`, `animate-pop-in` with `@keyframes`.

### 4. Data + logic layer (new)

| File | Purpose |
|---|---|
| `src/lib/types.ts` | Domain model: `Todo` (kind `lecture`/`pyq`/`custom`), `DailyLogEntry`, `ChapterState`, `PyqSetState`, `StudyState`, `ChapterStatus`. |
| `src/lib/date.ts` | Local-time ISO date keys (`YYYY-MM-DD`, never UTC-parsed), `addDays`, `relativeLabel`, `formatFullDate`/`formatMediumDate`/`formatDayMonth`, `buildMonthGrid` (Mon-first 6-week grid), `shiftMonth`. |
| `src/lib/curriculum.ts` | The Figma curriculum: Physics (Electric Charges and Fields → Moving Charges and Magnetism), Chemistry (Solutions → The d- and f-Block Elements), Mathematics (Relations and Functions → Determinants); the 4 PYQ set categories per chapter ("1/3/5 marker questions", "4 mark case-based questions"); `DEFAULT_CHAPTER_LECTURES = 3`. |
| `src/lib/planLogic.ts` | Pure, self-contained logic: `clampCount` (**0–15**, Req 2), `dayStats` (universal daily goal + chapterwise question breakdown), `buildDailyLog`, `gaugePct`, todo factories, `completedLectureCount`/`completedQuestionCount`, `flattenTodos`, `deriveStatus`, `withDailyLog`, `subjectRollup`. |
| `src/lib/storage.ts` | localStorage layer under key `studyos:log`, version-guarded, SSR- and private-mode-safe. |
| `src/lib/state.ts` | `createInitialState()`, `normalizeState()` (rebuilds every date's log entry from the checklist and recomputes subject roll-ups → derived data can never drift) and `hydrateState()` (merges stored data onto fresh defaults so a future design revision can add chapters without wiping history). |
| `src/lib/store.tsx` | `StudyProvider` + `useStudy()`: hydration after mount, persistence on change, and every mutation in the plan (lectures, PYQ, assignment, todos, morale). |
| `src/lib/quotes.ts` | 8 rotating morale quotes + deterministic `quoteForDate()` so the sidebar reminder is stable between renders. |

### 5. Chunk-by-chunk implementation

**Realignment (Chunk 0 brought up to Figma fidelity)**

| New / rewritten file | Figma element it realises |
|---|---|
| `components/dashboard/ArcGauge.tsx` | The "Track arc / Progress arc" pair as an SVG ring (rounded cap, animated dash). `sweep` defaults to a full ring, matching the 188×188 / 102×102 ellipses in the design. |
| `components/dashboard/DailyGoalGauge.tsx` | 188px daily-goal ring with the centred % + "Daily goal" + "Lectures today X/Y" column. |
| `components/layout/Sidebar.tsx` (rewritten) | Boards countdown card (copy preserved), Subject progress card with the 188px ring + two 102px SubjectRings (`gap-30px`, centred), **new Study reminder card**, and `hidden … lg:flex` so the rail collapses on small screens. |
| `components/chapter/LectureChecklist.tsx` | The `01 / THEORY` setup section: "How many lectures are in this chapter?" + 112×32 counter + accent "Add N lectures" button, and the Figma "THEORY · DONE!" bar with "Edit lectures" once theory is complete. |
| `components/chapter/PyqChecklist.tsx` | The `02 / PYQ PRACTICE` section: 47px rows, done/open tints, 20×20 checkboxes, "Total" + 94×30 stepper, "✓ Practice complete" state. |
| `components/chapter/ChapterAccordion.tsx` (rewritten) | 76px header: 35×35 index badge, Space Grotesk 17px title, 112×26 status pill, chevron (`⌃` expanded / `⌄` collapsed, as in the design). |
| `components/chapter/ChapterLibrary.tsx` (rewritten) | Chapters for the **active subject** (previously 6 maths chapters hardcoded under a "Physics" selection); count chip shows the real count + Syllabus/PYQ chips in the existing chip style. |
| `components/subject/SubjectPicker.tsx` (rewritten) | Cards now drive `activeSubject` through the store and take index/detail from the curriculum. |
| `components/layout/TopNavigation.tsx` (rewritten) | Keeps the monogram/brand/session/preview-date layout; the previously dead hamburger (`drawerOpen` was never rendered) now opens the todo drawer, shows an open-item badge, and the date comes from the store (no hydration mismatch). |
| `app/page.tsx` (rewritten) | Wraps everything in `StudyProvider`, adds `MobileGoalBar`, `TodayChecklist`, `TodoDrawer`; keeps the original shell order (TopNav → Sidebar + main → Footer). |

**Chunk 1 — universal daily goal + hover breakdown**
One goal across all subjects (`dailyLog[date]`, derived from that day's checklist). Hovering or
focusing the 188px gauge opens a tooltip card with `Lectures completed today X/Y`, the remaining
count, `Question practice today N` and the **chapterwise breakdown list**. Syllabus/PYQ stay
subject-wise via `subjectRollup`.

**Chunk 2 — counts capped at max 15**
`clampCount` / `MAX_COUNT = 15` in `planLogic.ts`; `components/common/Stepper.tsx` implements both
Figma counters (`lg` 112×32 / `sm` 94×30) with `+` disabled at 15 and `−` disabled at 0; the setup
helper copy reads "Choose up to 15 lectures in this chapter."

**Chunk 3 — Add to Today / Tomorrow / Custom date**
`components/common/AssignToDateControl.tsx` replaces the two non-working "Day / Sunday" buttons with
a 3-segment pill (288×32, radius 16px, same fill/border/label specs as the original control), and
`components/common/CalendarPopover.tsx` opens an inline calendar for a custom date (also used for
"jump to a logged day"). Wired for PYQ sets **and** the lecture plan; assigning moves outstanding
items so a day's target never double-counts.

**Chunk 4 — hamburger todo drawer**
`components/todo/TodoDrawer.tsx`: slide-out panel (`bg-drawer`, hairline border, drawer shadow),
date navigation (‹ / Today / Calendar / ›), quick-add form, the day's checklist
(`components/todo/TodoList.tsx`), the universal daily-goal meter and `components/todo/MoraleCard.tsx`
(celebration + rotating quote) shown once per day (`moraleShown`), dismissible, with Esc/backdrop
close.

**Chunk 5 — daywise calendar log**
Every action is written into `todos[date]` and rolled up into `dailyLog[date]` by `normalizeState()`,
persisted to localStorage and re-hydrated on load; today's checklist is surfaced on the home
dashboard (`components/dashboard/TodayChecklist.tsx`) as well as in the drawer; the calendar marks
days that already hold activity. Nothing leaks between dates (covered by tests).

**Chunk 6 — polish + responsiveness**
Hover/focus states on every control, `focus-visible` ring on the gauge, eased drawer/fade/pop motion,
`scrollbar-hide` regions, wrapping rows (`flex-wrap`, `min-h` instead of fixed `h`) so the wide rows
survive narrow viewports, sidebar hidden below `lg` with `MobileGoalBar` replacing it, and
`aria-expanded` / `aria-pressed` / `role="checkbox"` / `aria-live` on interactive elements.

### 6. Deliberate deviations and interpretation calls

1. **Ring geometry.** The Figma frames "Daily goal gauge" (188×158 holding a 188×188 ellipse) and the
   102px rings place the % / label column centred inside the ellipse, which only lines up for a
   **full ring**. The gauges are therefore full rings (with a `sweep` prop available for partial
   arcs), not the horizontal bars the earlier shell used.
2. **`QuestionCountPresetStepper` → two sizes.** The plan called it the "lecture counter" while Figma
   uses it for question totals; both the 112×32 lecture counter and the 94×30 question stepper are now
   one `Stepper` component with a `size` prop.
3. **Store file name.** The plan said `src/lib/store.ts`; it is `src/lib/store.tsx` because the
   provider renders JSX. `src/lib/storage.ts` holds the typed getters/setters the plan described.
4. **`custom` todo kind.** Added to the `Todo` model so the drawer quick-add (the plan's model has a
   free `text` field) fits without inventing a fake chapter. Custom todos count toward "all done" but
   never toward lecture targets or question totals.
5. **"Add N lectures" action.** In Figma the button says "Add 1 lecture"; it now assigns the planned N
   lectures to **today** (the three date buttons can move them later), keeping the button meaningful
   in a working log.
6. **Not invented.** The Figma "Prototype hint" line at the bottom of the rail and the "Study
   greeting" block were **not** recreated: only their sizes — not their copy — were retrievable under
   the current Figma quota, and guessing user-facing copy would be worse than omitting it. They remain
   on the outstanding list below.
7. **ESLint exception.** `react-hooks/set-state-in-effect` is disabled on the single hydration line in
   `store.tsx`, with a comment: reading localStorage must happen after mount so the server and the
   first client render stay identical.
8. **tsconfig.** Added `allowImportingTsExtensions` so the Node test script can import the TS modules
   directly (`noEmit` was already set).
9. **Curriculum copy.** Subject card details ("Mechanics · Thermodynamics · Waves", …) were preserved
   from the existing shell; the chapter lists and PYQ labels were replaced with the Figma values.

### 7. Outstanding items (not done, on purpose)

- Manual browser pass of the interactive flows (I cannot drive a browser here) — checklist recorded in
  `Tests_performed.md`.
- Re-verify against Figma screenshots for pixel-level spacing once the MCP quota resets.
- Figma "Prototype hint" + "Study greeting" copy (see deviation 6).
- No backend: persistence is localStorage only, as agreed in the plan.

---

## Session 2 — 2026-11-13 · Change Plan 2 (chapter progress vs. daily tasks)

Approved plan: `2ndchangesplan.md`. The change separates **overall progress** (dashboard, date-independent)
from **daily completion** (the Todo for a chosen date).

### 1. Behaviour model implemented

| Rule (plan §2) | Implementation |
|---|---|
| `lectures` is the chapter's conserved theory-lecture total, not a plan | `ChapterState.lectures` clamped 0–15; `setChapterLectures` never consumes it; `saveChapterLectures` only flips `lecturesSaved` |
| Chapter tick, **no day selected** → historical "already done", overall only | `toggleLecture`/`togglePyqDone` write `lectureDoneHistory` / `pyq.done`; no todo is created |
| Chapter tick, **day selected** → queues a PENDING todo, does not complete | `assignLectures`/`assignPyq` store the day; the tick inserts a `completed:false` todo on that day (or removes the pending one) |
| Todo tick → the only completion, daily **and** overall | `toggleTodo` unchanged; `normalizeState` rebuilds `dailyLog` and `subjectRollup` after every mutation |
| Moving a queued item never duplicates it | `movePendingTodos` keeps the todo id and moves it to the new date; completed/historical rows stay put |

`lectureRowStatus` / `pyqRowStatus` return `idle → queued → done`; `chapterProgress.lecturesDone` is
`union(lectureDoneHistory, completed lecture todos)` capped at the total, and `setsDone` stays `pyq.done`.

### 2. Files changed

| File | Change |
|---|---|
| `src/lib/types.ts` | `lectures` documented as the conserved total; `lecturesPlanned` → `lecturesSaved`; new `lectureDoneHistory: number[]` |
| `src/lib/planLogic.ts` | New `lectureDoneIndices`, `lectureDoneCount`, `lectureRowStatus`, `pyqRowStatus`, `findLectureTodo`, `findPyqTodo`, `movePendingTodos`; `subjectRollup` takes `doneHistory` |
| `src/lib/state.ts` | `createChapterState` seeds the new fields; `hydrateState` sanitises history (1..lectures) and falls back `lecturesPlanned` → `lecturesSaved`; `normalizeState` passes history into the roll-up. Runtime imports use explicit `.ts` specifiers (see deviation 1) |
| `src/lib/storage.ts` | `STORAGE_VERSION` 1 → 2, `MIN_SUPPORTED_VERSION = 1` so v1 logs still load and migrate |
| `src/lib/store.tsx` | Queue/history rules for `toggleLecture`, `togglePyqDone`; move-not-duplicate in `assignLectures`/`assignPyq`; `chapterProgress` uses the union; exposes `lectureRowStatus`/`pyqRowStatus`; `setChapterLectures` trims history + pending rows above the new total and clears `lecturesSaved` at 0 |
| `src/components/chapter/LectureChecklist.tsx` | Setup panel driven by `lecturesSaved`; "Save N lectures" copy; three row states (idle / queued / done) with existing tokens |
| `src/components/chapter/PyqChecklist.tsx` | Three row states; "Practice complete" only when done; day hint copy |
| `src/components/todo/TodoDrawer.tsx` | Footer hint: "Tick to complete - saved in your browser" |
| `src/components/dashboard/TodayChecklist.tsx` | One-line hint under the list: ticking completes the item for both progress tracks |
| `scripts/logic-tests.mts` | Repaired the corrupted block (see §4) and added 8 Plan 2 tests |

### 3. Deliberate deviations / interpretation calls

1. **`.ts` specifiers in `state.ts`.** The test script now imports `hydrateState` directly, and Node's
   ESM resolver needs explicit extensions. `allowImportingTsExtensions` was already enabled in
   Session 1 for the same reason; Turbopack and `tsc --noEmit` both accept the `.ts` specifiers.
2. **Button copy "Save N lectures"** instead of the design's "Add N lectures" — the plan requires the
   action to clarify that it stores the chapter total (plan §4.5).
3. **Row tints.** The three states use the plan's named tokens (`bg-success-soft`,
   `border-success-border`, `bg-accent-soft`, `rounded-checkbox`) plus the already-defined
   `bg-accent-softer` / `bg-surface-subtle` for the queued/idle fills.
4. **"Add N lectures" no longer creates todos.** Only an explicit day assignment plus a row tick
   queues work, so a saved total can never silently complete anything.
5. **No "Clear day" control.** Plan §8 is explicitly out of scope until requested; `AssignToDateControl`
   is unchanged.

### 4. Test-script repair (found during this session)

The first pass left the Plan 2 test block spliced into two existing tests, which produced
`ERR_INVALID_TYPESCRIPT_SYNTAX` / `Parsing error: ';' expected` and broke `npm test`, `npm run lint`
and the build's typecheck. Repaired by restoring the four damaged tests (including the new required
`doneHistory` field in `subjectRollup` fixtures) and moving the Plan 2 block after the
practised-questions test. Three extra tests were added: un-complete reverses both progress tracks,
a shorter lecture total trims only vanished rows, and a v1 log migrates to v2 without data loss.

### 5. Verification (2026-11-13)

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npm test` | ✅ **27 passed, 0 failed** |
| `npm run lint` | ✅ clean (exit 0) |
| `npm run build` | ✅ compiled + typechecked (4.9 s) + 4/4 static pages |
| SSR smoke (`next start -p 3100`) | ✅ 200, 24,412 bytes, expected markers present, correct negatives |

### 6. Outstanding after Session 2

- Manual browser pass, including the Plan 2 flows listed in `Tests_performed.md`.
- Figma "Prototype hint" + "Study greeting" copy (Session 1 deviation 6) still not captured.
- Optional plan §8 "Clear day" affordance — not implemented (out of scope).
- No backend: persistence remains `localStorage` only.

---

## Session 3 — 2026-11-13 · Exam countdown date

Request: change the board-exam data behind the sidebar countdown to **16 February**.

- **New `src/lib/exam.ts`** — `EXAM_DATE = "2027-02-16"` (the next 16 Feb from the app's 13 Nov 2026
  working date) and `daysUntilExam(today)`: whole days remaining, clamped at 0, `null` before the app
  has hydrated a "today" key.
- **`components/layout/Sidebar.tsx`** — the hard-coded `42` / "Example exam date · 13 Mar 2026" is
  replaced by the computed count and `Exam date · 16 Feb 2027`. The card, 48px type scale, copy
  structure, tokens and layout are unchanged (no design change). Pre-hydration shows an em dash so the
  server and first client paint agree, then the live number appears.
- **`scripts/logic-tests.mts`** — one new test: the constant, 13 Nov 2026 → **95** days, the 1-day
  boundary, exam day = 0, past dates clamp to 0, and an empty "today" returns `null`.
- No new dependency; no change to the Figma-derived design language.

Verification: `npm test` **28/28**, `npm run lint` clean, `npm run build` exit 0 (4/4 static pages).

---

## Session 4 — 2026-11-13 · PYQ before-theory, question bars, day assignment, partial progress

Request: expose the PYQ section before lectures finish (collapsed until clicked / auto-open after theory), per-section question totals up to 100, progress bars per section, day-first question assignment with per-section counts, both batch and partial completion in the Todo, question-based PYQ ring, lecture whole-row click.

### 1. Behaviour model implemented

| Rule | Implementation |
|---|---|
| PYQ reachable before theory | `ChapterAccordion` always renders `<PyqChecklist defaultOpen={theoryDone} />`; collapsed before theory, expanded after |
| Question cap 100 per section (not shown in UI) | `MAX_QUESTIONS = 100`, `clampQuestions()`; lecture `Stepper` stays at 15 |
| Each section: progress bar + `completed / total` | `pyqSectionStats` / `pyqChapterStats`; bars use `bg-surface-muted` track + `bg-success` fill |
| Press Today / Tomorrow / Custom → set how many per section | `PyqAllocationPanel` lists every section with a stepper capped at remaining headroom; confirm writes one Todo per section |
| Same day pressed again tops up; different day = new row | `addPyqAllocations` extends an existing unfinished row on the same day |
| Partial progress in Todo (counter ±) and batch (checkbox = all / none) | `setPyqProgress` + `toggleTodo` both write `completedCount`; `allDone` only when fully complete |
| PYQ ring question-based | `subjectRollup.pyqPct = Σ completed / Σ total`; legacy `done` still counts as full |
| Lower section total trims allocations | `trimPyqAllocation` keeps oldest days, clamps completed, drops overflow |
| Lecture whole row toggles (click + Enter/Space) | Row is `role="checkbox" tabIndex={0}`; check box is decorative |

### 2. Files changed

| File | Change |
|---|---|
| `src/lib/types.ts` | `PyqSetState.total` documented 0-100; `done`/`assigned*` deprecated (kept for storage compat); new `Todo.completedCount?: number`; new `PyqSectionStats` / `PyqChapterStats` |
| `src/lib/planLogic.ts` | New `MAX_QUESTIONS`, `clampQuestions`, `completedQuestionsOf`, `normalizePyqTodo`, `pyqSectionStats`, `pyqChapterStats`, `PyqAllocation`, `addPyqAllocations`, `trimPyqAllocation`; `dayStats`/`completedQuestionCount` partial-aware; `subjectRollup` question-based `pyqPct`; `pyqRowStatus` removed |
| `src/lib/state.ts` | `normalizeState` normalizes PYQ todos via `normalizePyqTodo` and drops zero-amount rows; `createPyqSetState` uses `clampQuestions`; roll-up fixtures pass `label`/`total` |
| `src/lib/storage.ts` | `STORAGE_VERSION` 2 → 3 |
| `src/lib/store.tsx` | `ChapterProgress` gains question fields + `pyq`; new `addPyqAllocations`/`setPyqProgress`/`pyqStats`; `setPyqTotal` trims allocations instead of rewriting amounts; `toggleTodo` is batch for PYQ; removed `togglePyqDone`/`assignPyq`/`pyqRowStatus` |
| `src/components/chapter/PyqChecklist.tsx` | Rewritten: disclosure header, section totals (max 100), prominent Today/Tomorrow/Custom control, allocation panel, per-section bars, chapter summary |
| `src/components/chapter/PyqAllocationPanel.tsx` | New: "set how many questions per section for this day" popover with per-section steppers capped at remaining |
| `src/components/chapter/LectureChecklist.tsx` | Whole-row click (click + Enter/Space); check box decorative |
| `src/components/chapter/ChapterAccordion.tsx` | PYQ always rendered (collapsed until theory done) |
| `src/components/todo/TodoList.tsx` | PYQ rows get a `− X / Y +` counter (partial) plus batch checkbox; `TodoList` passes `onProgress` |
| `src/components/dashboard/TodayChecklist.tsx` | Passes `setPyqProgress` to `TodoList` |
| `src/components/todo/TodoDrawer.tsx` | Passes `setPyqProgress` to `TodoList` |
| `scripts/logic-tests.mts` | 6 new tests: section stats/legacy done, 100 cap vs 15, top-up + multi-day + enforcement, trim-on-lower-total, partial progress stats, chapter roll-up; updated roll-up fixtures for new `label`/`total` shape; backfill + zero-row-drop migration tests |

### 3. Verification (2026-11-13)

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npm test` | ✅ **35 passed, 0 failed** |
| `npm run lint` | ✅ clean (0 errors, 0 warnings) |
| `npm run build` | ✅ compiled + typechecked + 4/4 static pages |
| SSR smoke (`next start -p 3100`) | ✅ 200, 24,826 bytes, expected markers present, old exam-date copy absent |

### 4. Outstanding after Session 4

- Manual browser pass (checklist extended in `Tests_performed.md`).
- Figma "Prototype hint" + "Study greeting" copy still not captured (Session 1 deviation 6).
- No backend: persistence remains `localStorage` only.

---

## Session 5 — 2026-11-14 (JSON chapter preload + priority sort + info buttons + marks badges + hide completed)

### Changes

1. **Preloaded chapters from `cbsedatabaseprefetch.json`** — `src/lib/curriculum.ts` now imports all chapters from the JSON (Physics 14, Chemistry 10, Mathematics 13), replacing the hardcoded Figma curriculum of 4 chapters per subject. Subject index/detail meta kept from Figma design; PYQ template (4 sets/chapter) retained since JSON has no PYQ data.

2. **Sort by priority** — Added `sortByPriority()` helper (P1 → P2 → P3, stable by chapter number) and a toggle in the Chapter Library header. When enabled, chapter cards are reordered by priority.

3. **Info button on chapter cards** — Added an "i" info button at the top-right of each chapter header (left of the expand chevron). Opens `ChapterInfoDialog` showing unit, marks, difficulty, priority, key topics, and question types from the JSON.

4. **Color-coded marks badges** — Added `categorizeByMarks()` helper that divides each subject's chapters into High/Medium/Low by mark-value tertiles. Physics skipped (no marks data). Badge shows coloured dot + `XX MARKS` between chapter title and "Ready to start" pill. HIGH/MEDIUM/LOW legend below chapter list. Colours: High `#18CFA5` (emerald), Medium `#FFB82E` (amber), Low `#82AEFF` (soft blue).

5. **Hide completed dropdown** — Added below the sort slider with two checkboxes: (1) Lectures — hides chapters where all lectures are done; (2) Whole chapter — hides chapters with status "Chapter complete".

### Files changed

| File | Change |
|------|--------|
| `src/lib/types.ts` | Added `MarksLevel`, `ChapterPriority` types; extended `ChapterSeed` with JSON fields (chapterNumber, unit, marks, chapterMarksEstimate, unitMarks, questionTypes, keyTopics, difficulty, priority) |
| `src/lib/curriculum.ts` | Rewrote to import `cbsedatabaseprefetch.json`; added `sortByPriority()` and `categorizeByMarks()` helpers |
| `src/components/chapter/ChapterLibrary.tsx` | Added sort toggle, hide-completed dropdown, marks legend, ChapterInfoDialog rendering, chapter filtering |
| `src/components/chapter/ChapterAccordion.tsx` | Added `marksLevel`/`marksValue`/`onInfoClick` props; MarksBadge between title and status pill; info button at top-right |
| `src/components/chapter/ChapterInfoDialog.tsx` | New component: organised chapter info panel from JSON data |
| `src/app/globals.css` | Added `--color-marks-high/medium/low` CSS variables + `@theme inline` aliases |
| `scripts/logic-tests.mts` | Updated curriculum test (14/10/13 chapters); added `sortByPriority` and `categorizeByMarks` tests |

### Verification (2026-11-14)

| Gate | Command | Result |
|------|---------|--------|
| Type check | `npx tsc --noEmit` | ✅ 0 errors |
| Logic/unit tests | `npm test` | ✅ **37 passed, 0 failed** |
| Lint | `npm run lint` | ✅ clean (0 errors, 0 warnings) |
| Production build | `npm run build` | ✅ compiles + typechecks + prerenders `/` |

