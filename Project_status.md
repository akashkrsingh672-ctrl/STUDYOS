# Project Status — StudyOS

Last updated: 2026-11-13 (Session 1)
Stack: Next.js 16.4.6 (App Router, Turbopack, React 19.3) · TypeScript 5 (strict) · Tailwind CSS 4.3
Persistence: browser `localStorage` (key `studyos:log`, version-guarded) — no backend yet.
Figma (visual authority): `https://www.figma.com/design/CebX98K0BKepBsWee0uE17/Untitled?node-id=0-1&m=dev`

## Verification status (as of this writing)

| Gate | Command | Result |
|---|---|---|
| Logic/unit tests | `npm test` | ✅ **19 passed, 0 failed** |
| Lint | `npm run lint` | ✅ clean (0 errors, 0 warnings) |
| Production build | `npm run build` | ✅ compiles + typechecks + prerenders `/` |
| SSR smoke test | `next start -p 3100` + HTTP fetch | ✅ 200, all sections present, correct negatives |
| Manual browser pass | — | ⏳ pending (see `Tests_performed.md`) |

> Baseline note: before this session the shell **did not build at all** (font `@import` order +
> two missing `"use client"` directives) and dependencies were not installed. Both are fixed.

## Plan coverage

| Chunk (from `1stchangeplan.md`) | Status | Where |
|---|---|---|
| 0 — foundation + faithful base design | ✅ done (realigned to Figma, approved) | `components/layout/*`, `components/chapter/*`, `components/subject/*`, `components/dashboard/ArcGauge.tsx`, `app/globals.css` |
| 1 — universal daily goal + hover breakdown | ✅ done | `components/dashboard/DailyGoalGauge.tsx`, `lib/planLogic.ts` (`dayStats`) |
| 2 — count controls capped at max 15 | ✅ done | `lib/planLogic.ts` (`MAX_COUNT`, `clampCount`), `components/common/Stepper.tsx` |
| 3 — Add to Today / Tomorrow / Custom date | ✅ done | `components/common/AssignToDateControl.tsx`, `components/common/CalendarPopover.tsx` |
| 4 — hamburger todo drawer + morale | ✅ done | `components/todo/TodoDrawer.tsx`, `TodoList.tsx`, `MoraleCard.tsx`, `components/layout/TopNavigation.tsx` |
| 5 — daywise calendar log (survives refresh) | ✅ done | `lib/store.tsx`, `lib/storage.ts`, `lib/state.ts`, `components/dashboard/TodayChecklist.tsx` |
| 6 — polish, responsiveness, regression | ✅ done (browser re-check pending) | `app/globals.css` utilities, `components/dashboard/MobileGoalBar.tsx`, responsive classes throughout |

## Requirements traceability

| # | Requirement | Implementation |
|---|---|---|
| 1 | Universal daily goal + hover "Lectures completed today X/Y" + chapterwise question practice | `DailyGoalGauge` tooltip shows X/Y, the remaining count, `Question practice today N` and the per-chapter question list; target/completed derive from the day's checklist |
| 2 | Lectures cap max 15 (was 4) | `MAX_COUNT = 15`; the stepper disables `+` at 15 and `−` at 0; helper copy updated |
| 3 | Replace the two "add to day? sunday" buttons | `AssignToDateControl` (Today / Tomorrow / Custom date + inline calendar) in every PYQ row and in the lecture section |
| 4 | Hamburger todo drawer, checklist, check → progress meter, per-date persistence, morale quotes | `TodoDrawer` (+ `TodoList`, `MoraleCard`); checks update the daily goal meter; everything keyed by date; 8 rotating quotes in the drawer, home panel and sidebar reminder |
| 5 | Daywise calendar log, survives refresh, shows today's todos on open | `todos[date]` + derived `dailyLog[date]` persisted to localStorage and re-hydrated on mount; `TodayChecklist` on the dashboard; the calendar marks logged days |

## Architecture

```
src/
  app/
    globals.css        design tokens (@theme inline) + @utility scrollbar-hide / animations
    layout.tsx         metadata + html/body shell (untouched)
    page.tsx           StudyProvider → TopNav / Sidebar / workspace (MobileGoalBar, SubjectPicker,
                       TodayChecklist, ChapterLibrary) / Footer / TodoDrawer
  lib/
    types.ts           domain model
    date.ts            local-time ISO date helpers + calendar grid
    curriculum.ts      Figma curriculum (3 subjects × 4 chapters, 4 PYQ sets each)
    planLogic.ts       pure logic (counts, day stats, roll-ups, factories, status)
    storage.ts         localStorage get/set/clear + version guard
    state.ts           initial state, normalize (derived rebuild), hydrate (merge/migrate)
    store.tsx          StudyProvider + useStudy() (state, mutations, UI state)
    quotes.ts          morale quotes + deterministic daily rotation
  components/
    common/            Stepper · AssignToDateControl · CalendarPopover
    dashboard/         ArcGauge · DailyGoalGauge · TodayChecklist · MobileGoalBar
    todo/              TodoDrawer · TodoList · MoraleCard
    chapter/           ChapterLibrary · ChapterAccordion · LectureChecklist · PyqChecklist
    layout/            TopNavigation · Sidebar · Footer (unchanged)
    subject/           SubjectPicker
scripts/logic-tests.mts   Node-based logic + persistence tests (`npm test`)
```

Single source of truth: the **checklist** (`todos[date]`). `normalizeState()` recomputes every
`dailyLog` entry and every subject roll-up after each mutation, so gauges, chips, status pills and the
tooltip can never drift out of sync with the log.

## Design tokens (extended this session)

Unchanged: `--background #0b1220`, `--foreground #eaf4f4`, `--surface rgba(234,244,244,0.04)`,
`--monogram-bg #1f3a5f`, `--border-light/medium/strong`, `--text-primary #eaf4f4`,
`--text-muted #a5bacb`, `--accent #5aa9e6`, Inter + Space Grotesk, radii 16/13/14/8/7px.

Added / corrected: `--surface-subtle|muted|raised`, `--drawer #0e1729`, `--accent-soft|softer`,
`--success` **corrected to `#78dbb2`**, `--success-soft|soft-strong|check|border`, `--border-check`,
`--on-accent #172b40`, radii `--radius-control 10 / --radius-soft 9 / --radius-checkbox 6 /
--radius-pill 13 / --radius-assign 16`, `--shadow-tooltip|drawer|popover`, the missing
`--color-primary` / `--color-muted` aliases, and the `scrollbar-hide` utility.

## Commands

```bash
npm install      # first run only (dependencies were not installed at session start)
npm run dev      # http://localhost:3000
npm run build    # production build (typechecks)
npm run start    # serve the build
npm run lint     # eslint
npm test         # logic + persistence tests (node)
```

## Next steps / known gaps

1. Manual browser pass of the interactive flows (checklist in `Tests_performed.md`).
2. Re-check pixel spacing against Figma screenshots once the MCP quota resets; the "Prototype hint"
   and "Study greeting" copy still need capturing from the file.
3. Optional future work (not requested yet): backend sync, per-subject daily goals, log export,
   drawer keyboard shortcuts.

