/**
 * Rotating morale quotes. Shown in the sidebar "Study reminder" card and in the
 * celebration card when every item for a day is checked off.
 */
export interface Quote {
  text: string;
  author: string;
}

export const QUOTES: Quote[] = [
  { text: "Small daily increments beat rare bursts of brilliance.", author: "Study Loop" },
  { text: "Finish the chapter you started before you start another.", author: "The Study Loop" },
  { text: "A ticked checklist is proof, not promise.", author: "StudyOS" },
  { text: "Practice reveals what revision hides.", author: "StudyOS" },
  { text: "Discipline is choosing the lecture over the excuse.", author: "StudyOS" },
  { text: "One more PYQ set today is one less panic in March.", author: "StudyOS" },
  { text: "Consistency compounds faster than talent.", author: "StudyOS" },
  { text: "You do not need motivation, you need the next tick.", author: "StudyOS" },
];

/** Stable, day-indexed rotation so the quote does not flicker on re-render. */
export function quoteForIndex(index: number): Quote {
  if (!Number.isFinite(index) || index < 0) return QUOTES[0];
  return QUOTES[Math.floor(index) % QUOTES.length];
}

export function quoteForDate(dateKey: string, fallback = 0): Quote {
  if (!dateKey) return quoteForIndex(fallback);
  let hash = 0;
  for (let i = 0; i < dateKey.length; i += 1) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) % 100000;
  }
  return quoteForIndex(hash);
}
