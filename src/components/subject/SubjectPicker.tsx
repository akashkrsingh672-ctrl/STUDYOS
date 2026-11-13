interface SubjectCardProps {
  index: string;
  name: string;
  detail: string;
  selected?: boolean;
  onSelect: () => void;
}

function SubjectCard({ index, name, detail, selected = false, onSelect }: SubjectCardProps) {
  return (
    <button
      onClick={onSelect}
      className={`flex flex-col gap-1 p-3 rounded-card border ${selected ? "border-accent" : "border-hairline"} bg-surface hover:border-border-medium transition-colors w-full min-w-[338px] text-left`}
      aria-pressed={selected}
    >
      <span className="text-muted text-[11px] font-medium whitespace-nowrap">
        {index}
      </span>
      <span className="font-semibold text-[24px] text-primary leading-none">
        {name}
      </span>
      <span className="text-muted text-[10px] leading-none whitespace-normal">
        {detail}
      </span>
      {selected && (
        <span className="ml-auto mt-1 text-accent font-semibold text-[20px] leading-none">
          ✔
        </span>
      )}
    </button>
  );
}

const SUBJECTS = [
  { index: "01", name: "Physics", detail: "Mechanics · Thermodynamics · Waves" },
  { index: "02", name: "Chemistry", detail: "Organic · Inorganic · Physical" },
  { index: "03", name: "Mathematics", detail: "Calculus · Algebra · Geometry" },
];

export default function SubjectPicker({ selectedSubject }: { selectedSubject: string }) {
  return (
    <section className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
      {SUBJECTS.map((s) => (
        <SubjectCard
          key={s.name}
          index={s.index}
          name={s.name}
          detail={s.detail}
          selected={selectedSubject === s.name}
          onSelect={() => {}}
        />
      ))}
    </section>
  );
}
