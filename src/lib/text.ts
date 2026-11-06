/** Vergelijken zonder hoofdletters, accenten of leestekens. */
export function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Welke trefwoorden komen voor in een open antwoord? (ruw, enkel als hulp bij zelfevaluatie) */
export function keywordHits(answer: string, keywords: string[]): { hit: string[]; miss: string[] } {
  const a = norm(answer);
  const hit: string[] = [];
  const miss: string[] = [];
  for (const k of keywords) {
    const stem = norm(k).split(" ").map((w) => (w.length > 6 ? w.slice(0, w.length - 2) : w));
    (stem.every((w) => a.includes(w)) ? hit : miss).push(k);
  }
  return { hit, miss };
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
