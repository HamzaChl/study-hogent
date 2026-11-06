import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { z } from "zod";
import type { CourseBundle } from "./content";

/** Lokale voortgang (localStorage). Eén object per cursus. */

const ExamResultSchema = z.object({
  date: z.string(),
  score: z.number(),
  max: z.number(),
  weakChapters: z.array(z.string()),
});

const QuizResultSchema = z.object({
  date: z.string(),
  correct: z.number(),
  total: z.number(),
  answers: z.array(z.number()),
});

const DrawingSchema = z.object({
  building: z.string().default(""),
  period: z.string().default(""),
  source: z.string().default(""),
  keywords: z.array(z.string()).default(["", "", "", "", ""]),
  fileKey: z.string().optional(),
  done: z.boolean().default(false),
});

const WalkSchema = z.object({
  theme: z.string().default(""),
  building: z.string().default(""),
  location: z.string().default(""),
  observations: z.string().default(""),
  comparison: z.string().default(""),
  fileKey: z.string().optional(),
  done: z.boolean().default(false),
});

const CourseProgressSchema = z.object({
  completed: z.array(z.string()).default([]),
  cards: z.record(z.string(), z.enum(["mastered", "review"])).default({}),
  practice: z.record(z.string(), z.object({ attempts: z.number(), correct: z.boolean(), everCorrect: z.boolean() })).default({}),
  exams: z.array(ExamResultSchema).default([]),
  quizzes: z.record(z.string(), z.array(QuizResultSchema)).default({}),
  /** Architectuurgeschiedenis: opdrachten en herkenningsoefeningen. */
  drawings: z.array(DrawingSchema).default([]),
  walks: z.array(WalkSchema).default([]),
  recognition: z.record(z.string(), z.object({ seen: z.number(), correct: z.number() })).default({}),
});

const StoreSchema = z.object({
  version: z.literal(1),
  courses: z.record(z.string(), CourseProgressSchema),
});

export type CourseProgress = z.infer<typeof CourseProgressSchema>;
export type ExamResult = z.infer<typeof ExamResultSchema>;
export type QuizResult = z.infer<typeof QuizResultSchema>;
export type Drawing = z.infer<typeof DrawingSchema>;
export type Walk = z.infer<typeof WalkSchema>;
export const emptyDrawing = (): Drawing => DrawingSchema.parse({});
export const emptyWalk = (): Walk => WalkSchema.parse({});
type Store = z.infer<typeof StoreSchema>;

export const STORAGE_KEY = "study-archive:v1";
const empty = (): Store => ({ version: 1, courses: {} });
export const emptyCourse = (): CourseProgress => ({ completed: [], cards: {}, practice: {}, exams: [], quizzes: {}, drawings: [], walks: [], recognition: {} });

function load(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty();
    const r = StoreSchema.safeParse(JSON.parse(raw));
    return r.success ? r.data : empty();
  } catch {
    return empty();
  }
}

function save(s: Store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* opslag niet beschikbaar (privévenster): voortgang blijft enkel in het geheugen */
  }
}

type Ctx = {
  get: (courseId: string) => CourseProgress;
  update: (courseId: string, fn: (p: CourseProgress) => CourseProgress) => void;
  reset: (courseId: string) => void;
  exportJSON: () => string;
  importJSON: (json: string) => void;
};

const ProgressContext = createContext<Ctx | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<Store>(load);
  useEffect(() => save(store), [store]);

  const get = useCallback((id: string) => store.courses[id] ?? emptyCourse(), [store]);
  const update = useCallback((id: string, fn: (p: CourseProgress) => CourseProgress) => {
    setStore((s) => ({ ...s, courses: { ...s.courses, [id]: fn(s.courses[id] ?? emptyCourse()) } }));
  }, []);
  const reset = useCallback((id: string) => {
    setStore((s) => {
      const courses = { ...s.courses };
      delete courses[id];
      return { ...s, courses };
    });
  }, []);
  const exportJSON = useCallback(() => JSON.stringify({ ...store, exportedAt: new Date().toISOString() }, null, 2), [store]);
  const importJSON = useCallback((json: string) => {
    let raw: unknown;
    try {
      raw = JSON.parse(json);
    } catch {
      throw new Error("Dit bestand is geen leesbaar JSON-bestand.");
    }
    const r = StoreSchema.safeParse(raw);
    if (!r.success) throw new Error("Dit bestand is geen geldige voortgangsback-up.");
    setStore(r.data);
  }, []);

  const value = useMemo(() => ({ get, update, reset, exportJSON, importJSON }), [get, update, reset, exportJSON, importJSON]);
  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error("useProgress buiten ProgressProvider");
  return ctx;
}

/** Afgeleide cijfers voor een cursus. */
export function stats(b: CourseBundle, p: CourseProgress) {
  const chapterIds = new Set(b.chapters.map((c) => c.id));
  const cardIds = new Set(b.flashcards.map((c) => c.id));
  const practiceIds = new Set(b.practice.map((q) => q.id));

  const lessonsDone = p.completed.filter((id) => chapterIds.has(id)).length;
  const mastered = Object.entries(p.cards).filter(([id, s]) => s === "mastered" && cardIds.has(id)).length;
  const answered = Object.keys(p.practice).filter((id) => practiceIds.has(id));
  const correctNow = answered.filter((id) => p.practice[id].correct).length;
  const totalAttempts = answered.reduce((n, id) => n + p.practice[id].attempts, 0);
  const everCorrect = answered.filter((id) => p.practice[id].everCorrect).length;

  const part = (n: number, d: number) => (d ? n / d : 0);
  // Cursusvoortgang: gemiddelde van lessen, beheerste kaarten en (ooit) juist beantwoorde oefeningen.
  const overall = (part(lessonsDone, chapterIds.size) + part(mastered, cardIds.size) + part(everCorrect, practiceIds.size)) / 3;

  return {
    lessonsDone,
    lessonsTotal: chapterIds.size,
    mastered,
    cardsTotal: cardIds.size,
    answered: answered.length,
    practiceTotal: practiceIds.size,
    accuracy: answered.length ? correctNow / answered.length : null,
    totalAttempts,
    overall,
    lastExam: p.exams.at(-1) ?? null,
    bestExam: p.exams.length ? Math.max(...p.exams.map((e) => e.score)) : null,
  };
}

/** Voortgang voor architectuurgeschiedenis: enkel onderdelen die bestaan tellen mee. */
export function historyStats(b: CourseBundle, p: CourseProgress) {
  const base = stats(b, p);
  const drawingsDone = p.drawings.filter((d) => d.done).length;
  const walksDone = p.walks.filter((w) => w.done).length;
  const quizBest = b.quizzes.map((q) => {
    const h = p.quizzes[q.id] ?? [];
    return h.length ? Math.max(...h.map((r) => r.correct)) / q.questions.length : 0;
  });
  const parts: number[] = [drawingsDone / 10, walksDone / 3];
  if (base.lessonsTotal) parts.push(base.lessonsDone / base.lessonsTotal);
  if (base.cardsTotal) parts.push(base.mastered / base.cardsTotal);
  if (quizBest.length) parts.push(quizBest.reduce((a, v) => a + v, 0) / quizBest.length);
  return {
    ...base,
    drawingsDone,
    walksDone,
    quizTaken: b.quizzes.filter((q) => (p.quizzes[q.id] ?? []).length).length,
    quizAvg: quizBest.length ? quizBest.reduce((a, v) => a + v, 0) / quizBest.length : null,
    overall: parts.reduce((a, v) => a + v, 0) / parts.length,
  };
}
