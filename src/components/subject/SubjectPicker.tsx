"use client";

import { SUBJECTS } from "@/lib/curriculum";
import { useStudy } from "@/lib/store";
import type { SubjectName } from "@/lib/types";

interface SubjectCardProps {
  index: string;
  name: SubjectName;
  detail: string;
  selected?: boolean;
  onSelect: () => void;
}

function SubjectCard({ index, name, detail, selected = false, onSelect }: SubjectCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex w-full min-w-[338px] flex-col gap-1 rounded-card border p-4 text-left transition-colors ${
        selected
          ? "border-accent bg-accent-softer"
          : "border-hairline bg-surface hover:border-border-medium"
      }`}
    >
      <span className="text-[11px] font-medium whitespace-nowrap text-muted">{index}</span>
      <span className="text-[24px] font-semibold leading-none text-primary">{name}</span>
      <span className="text-[10px] leading-none text-muted">{detail}</span>
      {selected ? (
        <span className="ml-auto mt-1 text-[20px] font-semibold leading-none text-accent">
          ✔
        </span>
      ) : null}
    </button>
  );
}

export default function SubjectPicker() {
  const { activeSubject, setActiveSubject } = useStudy();

  return (
    <section className="flex gap-4 overflow-x-auto scrollbar-hide">
      {SUBJECTS.map((subject) => (
        <SubjectCard
          key={subject.name}
          index={subject.index}
          name={subject.name}
          detail={subject.detail}
          selected={activeSubject === subject.name}
          onSelect={() => setActiveSubject(subject.name)}
        />
      ))}
    </section>
  );
}
