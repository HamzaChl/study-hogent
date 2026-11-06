import type { Building } from "./schema";
import { shuffle } from "./text";

/**
 * Vragen voor “Herken het gebouw”. Afleiders komen uitsluitend uit ándere gebouwen van het lesmateriaal:
 * er wordt niets verzonnen. Een vraagtype is pas beschikbaar als er minstens 4 verschillende waarden bestaan.
 */
export type RecognitionKind = "gebouw" | "architect" | "stijl" | "eeuw" | "locatie" | "kenmerken";

export const KIND_LABEL: Record<RecognitionKind, string> = {
  gebouw: "Gebouw",
  architect: "Architect",
  stijl: "Stijlperiode",
  eeuw: "Eeuw of periode",
  locatie: "Locatie",
  kenmerken: "Stijlkenmerken",
};

export const KIND_QUESTION: Record<RecognitionKind, string> = {
  gebouw: "Welk gebouw zie je op deze afbeelding?",
  architect: "Wie is de architect van dit gebouw?",
  stijl: "Tot welke stijlperiode behoort dit gebouw?",
  eeuw: "In welke eeuw werd dit gebouw ontworpen?",
  locatie: "Waar bevindt dit gebouw zich?",
  kenmerken: "Welke stijlkenmerken herken je?",
};

const valueOf = (b: Building, k: RecognitionKind): string =>
  k === "gebouw" ? b.name : k === "architect" ? b.architect : k === "stijl" ? b.style : k === "eeuw" ? b.period : k === "locatie" ? b.location : b.features.slice(0, 3).join(" · ");

export const MIN_OPTIONS = 4;

/** Welke vraagtypes kunnen met deze gebouwen eerlijk gesteld worden? */
export function availableKinds(buildings: Building[]): RecognitionKind[] {
  return (Object.keys(KIND_LABEL) as RecognitionKind[]).filter((k) => {
    if (k === "kenmerken") return new Set(buildings.map((b) => b.style)).size >= MIN_OPTIONS;
    return new Set(buildings.map((b) => valueOf(b, k))).size >= MIN_OPTIONS;
  });
}

export type RecognitionQuestion = { building: Building; kind: RecognitionKind; prompt: string; options: string[]; answer: number };

export function makeQuestion(target: Building, kind: RecognitionKind, all: Building[]): RecognitionQuestion | null {
  const correct = valueOf(target, kind);
  // Bij stijlkenmerken: enkel kenmerken van gebouwen uit een ándere stijlperiode als afleider.
  const pool = all.filter((b) => b.id !== target.id && (kind !== "kenmerken" || b.style !== target.style));
  const distractors = shuffle([...new Set(pool.map((b) => valueOf(b, kind)))].filter((v) => v !== correct)).slice(0, MIN_OPTIONS - 1);
  if (distractors.length < MIN_OPTIONS - 1) return null;
  const options = shuffle([correct, ...distractors]);
  return { building: target, kind, prompt: KIND_QUESTION[kind], options, answer: options.indexOf(correct) };
}

export function makeSession(all: Building[], kind: RecognitionKind | "mix", n = 10): RecognitionQuestion[] {
  const kinds = kind === "mix" ? availableKinds(all) : [kind];
  if (!kinds.length) return [];
  const out: RecognitionQuestion[] = [];
  for (const b of shuffle(all)) {
    if (out.length >= n) break;
    for (const k of shuffle(kinds)) {
      const q = makeQuestion(b, k, all);
      if (q) {
        out.push(q);
        break;
      }
    }
  }
  return out;
}
