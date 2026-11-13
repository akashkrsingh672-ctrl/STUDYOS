# Tests Performed — StudyOS

Every test below was executed in this repository on **2026-11-13** (Windows, PowerShell,
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

## T2 · Logic + persistence tests — ✅ PASSED (19/19)

```bash
npm test
# node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/logic-tests.mts
```

```
StudyOS logic tests
  PASS  count control clamps to 0–15                                    (Req 2)
  PASS  date keys round-trip in local time and step across boundaries
  PASS  relative labels match the working-log wording
  PASS  month grid is Monday-first and complete
  PASS  curriculum mirrors the Figma chapter lists        (3 × 4 chapters, 4 PYQ sets each)
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

19 passed, 0 failed
```

Key assertions worth calling out:
- `clampCount`: `-4 → 0`, `16 → 15`, `999 → 15`, `NaN → 0`, `7.6 → 8` (max 15 enforced everywhere).
- `dayStats`: 3 lecture items with 2 done → target 3 / completed 2 / 67%; questions `6 + 4 = 10` with
  an open set excluded; chapterwise breakdown grouped per chapter.
- Daywise isolation: the same lecture logged on two dates counts as one completed lecture for the
  chapter, while each date keeps its own target/completion.
- Persistence: save → load round-trip restores the log (including `moraleShown`); corrupt JSON and an
  older `version` both return `null` instead of throwing.

## T3 · Lint — ✅ PASSED (clean)

```bash
npm run lint
```
`eslint` → no output (0 errors, 0 warnings) after fixing one unused variable and adding the
documented `react-hooks/set-state-in-effect` exception on the hydration line.

## T4 · Production build — ✅ PASSED

```bash
npm run build
```
```
▲ Next.js 16.4.6 (Turbopack)
- Cache Components enabled
- Partial Prefetching enabled
  Creating an optimized production build ...
✓ Compiled successfully in 1398ms
  Running TypeScript ...
  Finished TypeScript in 4.0s ...
✓ Generating static pages (4/4) in 1461ms
Route (app)   ┌ ○ /        └ ○ /_not-found      ○ (Static) prerendered as static content
```
This also proves the strict TypeScript pass over every new module and that `/` still prerenders.

## T5 · Live SSR smoke test — ✅ PASSED

```bash
node node_modules/next/dist/bin/next start -p 3100     # then HTTP GET http://localhost:3100
```
Response: **200**, 24,406 bytes of HTML. Content markers:

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
| Boards countdown card (42 / exam-date copy) | ✅ present, copy preserved |
| Subject picker cards | ✅ present, now switching subjects for real |
| Chapter library + accordions | ✅ present, expanded into the design's study flow |
| Workspace footer ("The Study Loop" path) | ✅ `components/layout/Footer.tsx` untouched |
| `app/layout.tsx` metadata, fonts, background/foreground | ✅ untouched |
| `next.config.ts`, `eslint.config.mjs`, `README.md` | ✅ untouched |

---

## Pending — manual browser checklist (needs a human)

Run `npm run dev` and confirm:

1. Hover/focus the 188px daily goal ring → tooltip shows `Lectures completed today X/Y`,
   `Question practice today N` and the chapterwise list (empty state before any practice).
2. Chapter accordion: pick 5 lectures → "Add 5 lectures" → the checklist grows to 5 rows and today's
   goal target becomes 5; `+` stops at 15; `−` stops at 0; values persist per chapter.
3. Tick lectures → the ring %, sidebar chips and home-panel counts all move together.
4. Complete all lectures → the green "THEORY · DONE!" bar appears with "Edit lectures", and the
   `02 / PYQ PRACTICE` section appears with the status pill switching to "PYQ practice".
5. PYQ rows: change totals, use Today / Tomorrow / Custom date (calendar opens, picking a date marks
   that segment), tick a set → "✓ Practice complete", and the syllabus/PYQ rings update.
6. Hamburger → drawer opens; navigate ‹ / › / Today; the calendar marks days with activity; quick-add
   works; Esc and backdrop close it.
7. Complete every item for a day → celebration card + rotating quote (once per day, dismissible) and
   the sidebar reminder tints green.
8. Reload the page → the log, dates and completion states survive; other dates remain untouched.
9. Switch Physics → Chemistry → Mathematics → chapters, chips and rings follow the subject.
10. Narrow the window below 1024px → the rail collapses, the compact goal bar appears, rows wrap
    without clipping.

