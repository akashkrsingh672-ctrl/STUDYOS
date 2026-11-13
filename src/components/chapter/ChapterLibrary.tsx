import ChapterAccordion from "./ChapterAccordion";

const CHAPTERS = [
  { number: "01", title: "Relations and Functions", stage: "Lectures 3-3" },
  { number: "02", title: "Inverse Trigonometric Functions", stage: "Setup 3" },
  { number: "03", title: "Matrices", stage: "Setup 3" },
  { number: "04", title: "Determinants", stage: "PYQ 15", completed: true },
  { number: "05", title: "Continuity and Differentiability", stage: "Setup 3" },
  { number: "06", title: "Application of Derivatives", stage: "Setup 3" },
];

export default function ChapterLibrary() {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <h2 className="font-semibold text-[24px] text-primary leading-none">Chapter library</h2>
          <p className="text-muted text-[10px] leading-none mt-1">
            Pick a chapter to start studying
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-button border border-hairline bg-surface px-3 py-1">
          <span className="text-muted text-[11px] font-semibold">06</span>
          <span className="text-muted text-[11px] font-medium">CHAPTERS</span>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {CHAPTERS.map((c) => (
          <ChapterAccordion
            key={c.title}
            chapterNumber={c.number}
            chapterTitle={c.title}
            stage={c.stage}
            completed={c.completed}
          />
        ))}
      </div>
    </section>
  );
}
