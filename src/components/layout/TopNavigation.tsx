"use client";

import { formatMediumDate } from "@/lib/date";
import { useStudy } from "@/lib/store";

/**
 * Top navigation from the design (monogram, brand, session status, preview
 * date). The hamburger now opens the todo drawer (Chunk 4) and shows how many
 * items for the selected day are still open.
 */
export default function TopNavigation() {
  const { drawerOpen, toggleDrawer, today, selectedDate, todosFor, hydrated } = useStudy();

  const date = selectedDate || today;
  const openItems = todosFor(date).filter((todo) => !todo.completed).length;

  return (
    <nav className="relative z-10 flex h-[66px] shrink-0 items-center justify-between border-b border-hairline bg-background px-[40px]">
      {/* Brand block */}
      <div className="flex flex-shrink-0 items-center gap-3">
        <div className="flex size-[44px] shrink-0 items-center justify-center rounded-monogram border border-border-strong bg-monogram-bg">
          <span className="font-display text-[30px] font-bold leading-none text-primary">B</span>
        </div>
        <div className="flex-shrink-0">
          <p className="font-display text-[25px] font-bold leading-none text-primary">boardroom</p>
          <p className="text-[8px] leading-normal whitespace-nowrap text-muted">
            YOUR NEXT CHAPTER STARTS HERE
          </p>
        </div>
      </div>

      {/* Session status */}
      <div className="hidden flex-shrink-0 flex-col items-center gap-1 md:flex">
        <div className="flex h-[28px] items-center gap-1 rounded-session border border-border-light px-3">
          <span className="text-[10px] font-semibold text-accent">{"\u25CF"} FOCUS MODE, ON</span>
        </div>
        <p className="text-[10px] font-medium whitespace-nowrap text-muted">
          STUDY PREVIEW &nbsp;/&nbsp; {hydrated ? formatMediumDate(today) : ""}
        </p>
      </div>

      {/* Right controls: todo drawer + preview date on mobile */}
      <div className="flex flex-shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={toggleDrawer}
          aria-expanded={drawerOpen}
          aria-controls="todo-drawer"
          aria-label="Open todo drawer"
          className="flex items-center gap-2 rounded-button border border-border-medium bg-surface px-3 py-[6px] text-muted transition-colors hover:border-border-strong hover:text-accent"
        >
          <span className="text-[18px] leading-none" aria-hidden="true">
            ☰
          </span>
          <span className="text-[10px] font-semibold tracking-wider">TODO</span>
          {hydrated && openItems > 0 ? (
            <span className="rounded-pill bg-accent-soft px-[7px] py-[1px] text-[9px] font-semibold text-accent">
              {openItems}
            </span>
          ) : null}
        </button>
        <p className="hidden text-[10px] font-medium whitespace-nowrap text-muted md:block">
          STUDY PREVIEW &nbsp;/&nbsp; {hydrated ? formatMediumDate(today) : ""}
        </p>
      </div>
    </nav>
  );
}
