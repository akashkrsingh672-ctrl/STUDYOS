import type {
  ChapterSeed,
  SubjectName,
  SubjectSeed,
  MarksLevel,
} from "./types";
import cbsedatabase from "../../cbsedatabaseprefetch.json" with { type: "json" };

interface JsonChapter {
  chapter_number: number;
  chapter_title: string;
  unit?: string;
  marks?: number | null;
  chapter_marks_estimate?: number | null;
  unit_marks?: number | null;
  question_types?: string[];
  key_topics?: string[];
  difficulty?: string;
  priority?: string;
}

interface JsonSubject {
  name: string;
  chapters: JsonChapter[];
}

interface JsonData {
  subjects: JsonSubject[];
}

/**
 * Curriculum taken from cbsedatabaseprefetch.json (chapter names, order, marks,
 * difficulty, priority, key topics and question types).
 * PYQ set categories are kept from the Figma design since the JSON has no PYQ data.
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

/** Resolve the displayable marks value for a chapter (may be null). */
function resolveMarks(raw: JsonChapter): number | null {
  return raw.marks ?? raw.chapter_marks_estimate ?? raw.unit_marks ?? null;
}

/** Build a ChapterSeed from a JSON chapter record. */
function chapterFromJson(raw: JsonChapter): ChapterSeed {
  const title = raw.chapter_title;
  return {
    id: chapterId(title),
    index: raw.chapter_number < 10 ? `0${raw.chapter_number}` : String(raw.chapter_number),
    title,
    chapterNumber: raw.chapter_number,
    unit: raw.unit ?? "",
    marks: resolveMarks(raw),
    chapterMarksEstimate: raw.chapter_marks_estimate ?? null,
    unitMarks: raw.unit_marks ?? null,
    questionTypes: raw.question_types ?? [],
    keyTopics: raw.key_topics ?? [],
    difficulty: (raw.difficulty ?? "Medium") as "High" | "Medium" | "Low",
    priority: (raw.priority ?? "P2") as "P1" | "P2" | "P3",
    pyqs: PYQ_TEMPLATE.map((pyq) => ({ ...pyq })),
  };
}

/** Subject-level metadata (index + detail kept from the Figma design). */
const SUBJECT_META: Record<string, { index: string; detail: string }> = {
  Physics: { index: "01", detail: "Mechanics · Thermodynamics · Waves" },
  Chemistry: { index: "02", detail: "Organic · Inorganic · Physical" },
  Mathematics: { index: "03", detail: "Calculus · Algebra · Geometry" },
};

function buildSubjects(): SubjectSeed[] {
  const data = cbsedatabase as JsonData;
  const byName: Record<string, ChapterSeed[]> = {};

  for (const subj of data.subjects) {
    const meta = SUBJECT_META[subj.name];
    if (!meta) continue;
    byName[subj.name] = subj.chapters.map((raw) => chapterFromJson(raw));
  }

  return ["Physics", "Chemistry", "Mathematics"].map((name) => ({
    name: name as SubjectName,
    index: SUBJECT_META[name]?.index ?? "00",
    detail: SUBJECT_META[name]?.detail ?? "",
    chapters: byName[name] ?? [],
  }));
}

export const SUBJECTS: SubjectSeed[] = buildSubjects();

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

/** Sort chapters by priority (P1 → P2 → P3), stable by chapter number. */
export function sortByPriority(chapters: ChapterSeed[]): ChapterSeed[] {
  const priorityOrder: Record<string, number> = { P1: 0, P2: 1, P3: 2 };
  return [...chapters].sort((a, b) => {
    const pa = priorityOrder[a.priority] ?? 99;
    const pb = priorityOrder[b.priority] ?? 99;
    if (pa !== pb) return pa - pb;
    return a.chapterNumber - b.chapterNumber;
  });
}

/**
 * Categorize chapters into High / Medium / Low based on their marks numbers,
 * computed separately per subject using tertiles of the mark values.
 * Returns a map of chapter id → marks level. Chapters with no marks are omitted.
 */
export function categorizeByMarks(chapters: ChapterSeed[]): Map<string, MarksLevel> {
  const result = new Map<string, MarksLevel>();

  const withMarks = chapters.filter((c) => {
    const m = c.marks ?? c.chapterMarksEstimate ?? c.unitMarks;
    return m != null && m > 0;
  });

  if (withMarks.length === 0) return result;

  const sorted = [...withMarks].sort((a, b) => {
    const ma = a.marks ?? a.chapterMarksEstimate ?? a.unitMarks!;
    const mb = b.marks ?? b.chapterMarksEstimate ?? b.unitMarks!;
    return ma - mb;
  });

  const n = sorted.length;
  const third = Math.ceil(n / 3);

  for (let i = 0; i < n; i++) {
    let level: MarksLevel;
    if (i < third) level = "Low";
    else if (i < 2 * third) level = "Medium";
    else level = "High";
    result.set(sorted[i].id, level);
  }

  return result;
}
