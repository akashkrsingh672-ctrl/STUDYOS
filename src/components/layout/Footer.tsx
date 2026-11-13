export default function Footer() {
  return (
    <div className="border-t border-hairline bg-surface/50 h-[28px] flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-[9px] text-accent uppercase tracking-wider">
          The Study Loop
        </span>
        <span className="text-muted text-[11px] whitespace-pre">Theory   →   PYQ practice   →   Chapter complete</span>
      </div>
      <span className="text-muted text-[10px]">Sample progress · preset inputs</span>
    </div>
  );
}
