I now have a complete picture. Key findings:



\- \*\*Workspace\*\* `c:\\Users\\Dell\\OneDrive\\Desktop\\Akash\\STUDYOS` contains only `.clinerules` — \*\*no existing application code\*\*. I'll build from the Figma design as the visual authority.

\- \*\*Node v26.13 / npm v11.20\*\* available.

\- \*\*Figma structure\*\*: 1440px desktop dashboard — top nav (Monogram/Brand/Session status), left sidebar (countdown + subject progress gauges), main content (subject picker + chapter library). No hamburger menu exists yet; the two "add to day? sunday" buttons live in the lecture cards.

\- \*\*Design tokens\*\* (from Figma codegen): surfaces `rgba(234,244,244,0.04)`, borders `rgba(234,244,244,0.1–0.28)`, text `#eaf4f4`/`#a5bacb`, accent `#5aa9e6`, success `#78db78`, Inter font, 16px/8px/7px radii, lecture stepper currently capped at 4/8.

\- \*\*No comments\*\* in the Figma file.



Since I'm in \*\*Plan mode\*\*, I cannot make edits. Here is my plan for your review.



\---



\## Plan — StudyOS Dashboard Extension



\### Stack \& assumptions (to confirm)

\- \*\*Next.js (App Router) + React + Tailwind CSS\*\* — matches the Figma design-system output exactly (React+Tailwind classes, Inter font, arbitrary-value Tailwind classes already used in the design). No existing project to conform to, so this is the natural fit.

\- \*\*Persistence\*\*: `localStorage`-based daywise log (working log now). Future-proofed so a backend can swap in later without UI changes.

\- All dates stored as ISO `YYYY-MM-DD` keys; "today" derived from the local clock.



\### Design system to preserve

| Token | Value | Used for |

|---|---|---|

| Surface bg | `rgba(234,244,244,0.04)` | Cards, stepper, sidebar |

| Border | `rgba(234,244,244,0.1 | 0.12 | 0.28)` | Card borders, input outlines |

| Primary text | `#eaf4f4` | Headings, percentages |

| Muted text | `#a5bacb` | Labels, detail text, disabled states |

| Accent | `#5aa9e6` | Primary buttons, active indicators, "+" |

| Success green | `#78db78` (rgb 120,219,178) | Completion states, PYQ stage |

| Font | Inter (Regular/Medium/Semi\_Bold) | All typography |

| Radius | 16px cards / 8px stepper / 7px small buttons | All rounded corners |



\---



\## Data model (localStorage)

```ts

dailyLog: {

&#x20; \[date: string]: {

&#x20;   lecturesCompleted: number,      // universal daily goal progress

&#x20;   lecturesTarget: number,         // universal daily target

&#x20;   questionsPracticed: number,

&#x20;   chaptersPracticed: { \[chapter: string]: number }, // chapterwise question breakdown

&#x20;   allDone: boolean,

&#x20;   moraleShown: boolean,

&#x20; }

}

todos: {

&#x20; \[date: string]: Todo\[]            // Todo = {id, text, chapter, date, source: 'today'|'tomorrow'|'custom', completed, createdAt}

}

subjects: {

&#x20; \[subject: string]: {

&#x20;   lectures: number (0-15),        // capped at 15

&#x20;   syllabusPct: number,            // stays subjectwise

&#x20;   pyqPct: number,                 // stays subjectwise

&#x20; }

}

```



\---



\## Chunked implementation plan (test after each chunk)



\### Chunk 0 — Project foundation \& faithful base design

\- Initialize Next.js + Tailwind; install Inter font; set up `tailwind.config.js` with the design tokens above.

\- Build the shell reproducing the Figma frame: TopNav, left sidebar (countdown + subject progress), main content area, subject picker cards (Physics/Chemistry/Mathematics), chapter library with `ChapterAccordionStudyFlow`-style accordions.

\- Add `src/lib/store.ts` — localStorage persistence layer with typed getters/setters for `dailyLog`, `todos`, `subjects`.

\- \*\*Test:\*\* `npm run dev`, confirm page loads, all Figma sections render with correct colors/spacing/radius; localStorage read/write works.



\### Chunk 1 — Daily goal made universal + hover breakdown

\- Replace any subjectwise daily goal with a single \*\*universal\*\* Daily Goal gauge (keep Syllabus \& PYQ gauges subjectwise as-is).

\- Hover state on the daily goal progress arc shows a tooltip: `Lectures completed today X/Y total` + `Question practice today` with a chapterwise breakdown list.

\- Wire `lecturesCompleted` / `lecturesTarget` / `chaptersPracticed` into the store.

\- \*\*Test:\*\* hover reveals tooltip with correct counts and chapterwise list; syllabus/PYQ gauges still per-subject.



\### Chunk 2 — Lectures cap extended to max 15

\- Extend `QuestionCountPresetStepper` (lecture counter) from max 4 → max 15 (type `0..15`), across all subject chapters.

\- Keep the same stepper aesthetic (30px high, 94px wide, +/- buttons, 7px radius).

\- \*\*Test:\*\* increment reaches 15 and stops; decrement to 0; value persists per subject/chapter.



\### Chunk 3 — Add-to-date buttons (replace "add to day? sunday")

\- Remove the two non-working "add to day? sunday" buttons from lecture cards.

\- Add three aesthetic-matched buttons: \*\*Add to Today\*\* / \*\*Add to Tomorrow\*\* / \*\*Add to Custom Date\*\* (opens a calendar picker).

\- Same button style family as existing controls (rounded-7px, accent text, surface bg).

\- Calendar picker opens inline/overlay for custom date selection.

\- \*\*Test:\*\* buttons render matching design; clicking logs the lecture goal to the chosen date's store entry; custom date calendar opens and picks a date.



\### Chunk 4 — Todo section via hamburger drawer

\- Add a hamburger icon to TopNav; clicking opens a slide-out \*\*Todo drawer\*\* matching the overall aesthetic (surface bg, borders, Inter typography).

\- Drawer shows the selected date's todos with a checklist; \*\*Add to Today\*\* populates today's list.

\- Checking a todo logs it into that day's `dailyLog` progress meter (lectures completed +1).

\- Date navigation in the drawer: open tomorrow/other date → see that day's todos; on that date the app shows its todos automatically on load.

\- \*\*Morale:\*\* when all todos for a day are done, show a creative celebration card + rotating motivational quote.

\- \*\*Test:\*\* open/close drawer; add today/tomorrow/custom todo; check item → progress meter updates; date switching shows correct todos; all-done triggers morale card.



\### Chunk 5 — Daywise calendar log (working log)

\- Persist every action daywise in `dailyLog`/`todos` keyed by date (the calendar log).

\- On app load, surface the current date's todos in the drawer/home.

\- Ensure data survives refresh (localStorage).

\- \*\*Test:\*\* refresh preserves data; different dates hold independent logs; adding on one date doesn't leak to another.



\### Chunk 6 — Polish, responsiveness \& regression check

\- Hover/focus states, transitions, mobile sidebar behavior.

\- Verify all pre-existing Figma sections (countdown, gauges, chapter accordions, footer) still render and behave as before.

\- Final walkthrough of all 5 requirements end-to-end.

\- \*\*Test:\*\* full manual test of each requirement + confirm nothing from the original design was removed/broken.



\---



\## How each requirement maps

| # | Requirement | Chunk |

|---|---|---|

| 1 | Universal daily goal + hover "Lectures completed today X/Y" + chapterwise question practice | 1 |

| 2 | Lectures cap max 15 (was 4) | 2 |

| 3 | Replace 2 "add to day? sunday" buttons with Add to Today / Tomorrow / Custom date (calendar) | 3 |

| 4 | Hamburger todo drawer, checklist, check → daily progress meter, per-date persistence, morale quotes | 4 |

| 5 | Daywise calendar log, survives refresh, shows today's todos on open | 5 |



\---



\### Open decisions to confirm before I start

1\. \*\*Stack:\*\* proceed with Next.js + React + Tailwind (matches Figma output)? Or do you prefer plain React/Vite?

2\. \*\*Persistence:\*\* localStorage working log is acceptable for now (backend swap later)?

3\. \*\*Scope:\*\* build the full base design from the Figma first (Chunk 0), or do you already have a codebase you want me to integrate into?



Once you're satisfied with this plan, please \*\*toggle to Act mode\*\* and I'll begin implementing Chunk 0.

