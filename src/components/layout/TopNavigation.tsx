import { useState } from "react";

export default function TopNavigation() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const now = new Date();
  const previewDate = now.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <nav className="relative h-[66px] border-b border-hairline px-[40px] flex items-center justify-between shrink-0 z-10 bg-background">
      {/* Brand block */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="bg-monogram-bg border border-border-strong rounded-monogram size-[44px] flex items-center justify-center shrink-0">
          <span className="font-display font-bold text-[30px] text-primary leading-none">
            B
          </span>
        </div>
        <div className="flex-shrink-0">
          <p className="font-display font-bold text-[25px] text-primary leading-none">
            boardroom
          </p>
          <p className="text-muted text-[8px] leading-normal whitespace-nowrap">
            YOUR NEXT CHAPTER STARTS HERE
          </p>
        </div>
      </div>

      {/* Session status */}
      <div className="flex flex-col items-center gap-1 flex-shrink-0 hidden md:flex">
        <div className="border border-border-light rounded-session h-[28px] px-3 flex items-center gap-1">
          <span className="font-semibold text-[10px] text-accent">
            {"\u25CF"} FOCUS MODE, ON
          </span>
        </div>
        <p className="text-muted text-[10px] font-medium whitespace-nowrap">
          STUDY PREVIEW &nbsp;/&nbsp; {previewDate}
        </p>
      </div>

      {/* Right controls: hamburger (todo drawer) + preview date on mobile */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <button
          onClick={() => setDrawerOpen((p) => !p)}
          className="p-2 rounded-button text-muted hover:text-accent transition-colors shrink-0"
          aria-label="Open todo drawer"
        >
          <span className="text-[22px] leading-none block">☰</span>
        </button>
        <p className="text-muted text-[10px] font-medium whitespace-nowrap hidden md:block">
          STUDY PREVIEW &nbsp;/&nbsp; {previewDate}
        </p>
      </div>
    </nav>
  );
}
