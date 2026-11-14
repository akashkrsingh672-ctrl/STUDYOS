import type { SubjectName } from "./types";

interface PreloadEntry {
  chaptername: string;
  subject: string;
  "lecture count": number | null;
}

import preloadData from "../../preloadlect.json" with { type: "json" };

const preloadRaw: PreloadEntry[] = preloadData as unknown as PreloadEntry[];

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\.\.\./g, "")                         // remove trailing ...
    .replace(/\bby\s+deepak\s+bhatt\s+sir\b/g, "")   // remove "by Deepak Bhatt Sir"
    .replace(/\([^)]*\)/g, "")                        // remove parenthetical content
    .replace(/[&]/g, "and")                           // replace & with and
    .replace(/[^a-z0-9\s]/g, "")                      // remove remaining punctuation
    .replace(/\s+/g, " ")                             // collapse whitespace
    .trim();
}

// Aliases for cbs chapter titles that don't normalize-match preloadlect titles
// (key = normalized cbs title, value = normalized preloadlect title)
const TITLE_ALIASES: Record<string, string> = {
  "applications of derivatives": "application of derivatives",
  "alcohols phenols and ethers": "alcohol phenol and ethers",
};

// Build lookup: subject → normalized preloadlect title → lecture count (non-null only)
const preloadBySubject: Record<SubjectName, Map<string, number>> = {
  Physics: new Map(),
  Chemistry: new Map(),
  Mathematics: new Map(),
} as Record<SubjectName, Map<string, number>>;

for (const entry of preloadRaw) {
  const count = entry["lecture count"];
  if (count == null) continue;
  const subject = entry.subject as SubjectName;
  const normalized = normalizeTitle(entry.chaptername);
  if (normalized && subject in preloadBySubject) {
    preloadBySubject[subject].set(normalized, count);
  }
}

/**
 * Looks up the preloaded lecture count for a chapter from preloadlect.json.
 * Returns null if no preloaded value exists (caller uses DEFAULT_CHAPTER_LECTURES).
 */
export function getPreloadedLectures(
  subject: SubjectName,
  chapterTitle: string,
): number | null {
  const subjectMap = preloadBySubject[subject];
  if (!subjectMap) return null;

  let normalized = normalizeTitle(chapterTitle);
  if (!normalized) return null;

  // Apply alias if present
  if (TITLE_ALIASES[normalized]) {
    normalized = TITLE_ALIASES[normalized];
  }

  // Direct match
  if (subjectMap.has(normalized)) {
    return subjectMap.get(normalized)!;
  }

  // Prefix/contain match (handles truncated preloadlect titles like "Inverse Trigonometric Functio...")
  for (const [preloadNormalized, count] of subjectMap) {
    if (
      normalized.startsWith(preloadNormalized) ||
      preloadNormalized.startsWith(normalized)
    ) {
      return count;
    }
  }

  return null;
}
