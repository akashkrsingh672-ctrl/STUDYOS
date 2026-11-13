export interface GaugeProps {
  label: string;
  value: number; // 0-100
  sublabel: string;
  color: "muted" | "success";
}

function Gauge({ label, value, sublabel, color }: GaugeProps) {
  const stroke = color === "success" ? "border-success" : "border-medium";
  const pctText = color === "success" ? "text-success" : "text-primary";
  return (
    <div className="relative w-full group">
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-muted text-[11px] font-medium whitespace-nowrap">
          {label}
        </span>
        <span className={`font-semibold text-[32px] leading-none ${pctText}`}>
          {value}%
        </span>
      </div>
      <div className="w-full h-[8px] rounded-full bg-surface overflow-hidden border border-border-medium">
        <div
          className={`h-full transition-all duration-700 ease-out ${
            color === "success" ? "bg-success" : "bg-accent"
          }`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <span className="text-[11px] text-muted mt-1 whitespace-nowrap">
        {sublabel}
      </span>
    </div>
  );
}

export default function Sidebar() {
  return (
    <aside className="w-[284px] flex-shrink-0 flex flex-col gap-6 pt-6">
      {/* Countdown card */}
      <div className="bg-surface border border-hairline rounded-card p-6">
        <p className="text-muted text-[11px] font-medium mb-1 uppercase tracking-wider">
          Boards countdown
        </p>
        <p className="font-display font-bold text-[48px] text-primary leading-tight">
          42
        </p>
        <p className="text-muted text-[11px] mt-2 leading-relaxed">
          Days until board exams
        </p>
        <div className="h-px border-hairline mt-4" />
        <p className="text-muted text-[10px]">
          Example exam date · 13 Mar 2026
        </p>
      </div>

      {/* Subject progress */}
      <div className="flex-1">
        <p className="text-muted text-[11px] font-medium mb-4 uppercase tracking-wider">
          Subject progress
        </p>
        <Gauge label="Daily goal" value={60} sublabel="Lectures completed today 6/10" color="muted" />
        <Gauge label="Syllabus" value={45} sublabel="Physics · Mechanics" color="muted" />
        <Gauge label="PYQ" value={78} sublabel="Past-year questions" color="success" />
      </div>
    </aside>
  );
}
