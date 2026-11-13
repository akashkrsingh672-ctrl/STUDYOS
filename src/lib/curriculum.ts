import type { ChapterSeed, SubjectName, SubjectSeed } from "./types";

/**
 * Curriculum taken from the Figma design (chapter names, order and the PYQ set
 * categories of the "ChapterAccordionStudyFlow" component).
 */
const PYQ_TEMPLATE = [
  { id: "m1", label: "1 marker questions", defaultTotal: 8 },
  { id: "m3", label: "3 marker questions", defaultTotal: 6 },
  { id: "m5", label: "5 marker questions", defaultTotal: 4 },
  { id: "cb", label: "4 mark case-based questions", defaultTotal: 3 },
];

/** Default planned lectures per chapter (matches the design's preset "3"). */
export const DEFAULT_CHAPTER_LECTURES = 3;

export function chapterId(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function chapter(index: number, title: string): ChapterSeed {
  return {
    id: chapterId(title),
    index: index < 10 ? `0${index}` : String(index),
    title,
    pyqs: PYQ_TEMPLATE.map((pyq) => ({ ...pyq })),
  };
}

function subject(
  name: SubjectName,
  index: string,
  detail: string,
  titles: string[],
): SubjectSeed {
  return {
    name,
    index,
    detail,
    chapters: titles.map((title, position) => chapter(position + 1, title)),
  };
}

export const SUBJECTS: SubjectSeed[] = [
  subject("Physics", "01", "Mechanics · Thermodynamics · Waves", [
    "Electric Charges and Fields",
    "Electrostatic Potential and Capacitance",
    "Current Electricity",
    "Moving Charges and Magnetism",
  ]),
  subject("Chemistry", "02", "Organic · Inorganic · Physical", [
    "Solutions",
    "Electrochemistry",
    "Chemical Kinetics",
    "The d- and f-Block Elements",
  ]),
  subject("Mathematics", "03", "Calculus · Algebra · Geometry", [
    "Relations and Functions",
    "Inverse Trigonometric Functions",
    "Matrices",
    "Determinants",
  ]),
];

export const SUBJECT_NAMES: SubjectName[] = SUBJECTS.map((item) => item.name);

export function subjectSeed(name: SubjectName): SubjectSeed {
  const found = SUBJECTS.find((item) => item.name === name);
  return found ?? SUBJECTS[0];
}

export function chaptersOf(name: SubjectName): ChapterSeed[] {
  return subjectSeed(name).chapters;
}

export function findChapter(
  name: SubjectName,
  id: string,
): ChapterSeed | undefined {
  return chaptersOf(name).find((item) => item.id === id);
}
