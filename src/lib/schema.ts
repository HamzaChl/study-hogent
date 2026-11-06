import { z } from "zod";

/**
 * Drie lagen inhoud, altijd uit elkaar gehouden:
 *  1. OFFICIAL CURRICULUM   → content/<cursus>/course.json      (bron: BaMaFlex)
 *  2. LECTURE MATERIAL      → content/<cursus>/lectures/*.json  (bron: geüploade PDF, met paginaverwijzingen)
 *  3. AI-GENERATED EXERCISES→ flashcards / practice / exam in diezelfde lecture-bestanden,
 *                              steeds gelabeld als door AI opgesteld op basis van het lesmateriaal.
 */

/* ───────── Catalogus (homepage) ───────── */

export const CatalogCourseSchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string().optional(),
  category: z.string(),
  status: z.enum(["available", "coming-soon"]),
  description: z.string(),
  image: z.string(),
  imageAlt: z.string(),
  meta: z.array(z.object({ label: z.string(), value: z.string() })),
  /** Tijdelijk verbergen op de homepage (gegevens blijven bewaard). */
  hidden: z.boolean().optional(),
});
export const CatalogSchema = z.object({ courses: z.array(CatalogCourseSchema) });

/* ───────── Officieel curriculum (BaMaFlex) ───────── */

export const TopicSchema = z.object({ id: z.string(), number: z.string(), title: z.string() });
export const PartSchema = z.object({
  id: z.string(),
  number: z.string(),
  title: z.string(),
  topics: z.array(TopicSchema),
});

export const ObjectiveGroupSchema = z.object({
  number: z.string(),
  title: z.string(),
  subtitle: z.string().optional(),
  text: z.string(),
  items: z.array(z.string()),
});

export const AssessmentSchema = z.object({
  id: z.string(),
  title: z.string(),
  weight: z.number(),
  note: z.string().optional(),
  criteria: z.array(z.string()),
});

export const CourseSchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string(),
  /** Cursusnummer zoals op de homepage (standaard "01"). */
  number: z.string().optional(),
  /** Reuzentitel over meerdere regels; standaard de titel. */
  heading: z.array(z.string()).optional(),
  /** Metadata onder de titel tonen (Constructie: nee). */
  showMeta: z.boolean().optional(),
  /** "history" = architectuurgeschiedenis: tijdlijn, herken het gebouw, opdrachten. */
  layout: z.enum(["default", "history"]).optional(),
  meta: z.array(z.object({ label: z.string(), value: z.string() })),
  /** Voorlopige navigatie zolang er geen lesmateriaal is (géén officiële hoofdstukken). */
  provisional: z
    .object({ note: z.string(), sections: z.array(z.object({ id: z.string(), number: z.string(), title: z.string() })) })
    .optional(),
  official: z.object({
    source: z.string(),
    studyTime: z.object({ total: z.number(), lectures: z.number(), selfStudy: z.number() }),
    description: z.array(z.string()),
    parts: z.array(PartSchema),
    objectives: z.array(z.string()),
    evaluation: z.array(z.string()),
    materials: z.string(),
    objectiveGroups: z.array(ObjectiveGroupSchema).optional(),
    assessment: z.array(AssessmentSchema).optional(),
    notes: z.array(z.string()).optional(),
  }),
});

/* ───────── Lesmateriaal (één bestand per geüploade PDF) ───────── */

export const SourceRefSchema = z.object({ lecture: z.string(), pages: z.array(z.number()) });

export const BlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("p"), text: z.string() }),
  z.object({ type: z.literal("quote"), text: z.string(), cite: z.string().optional() }),
  z.object({ type: z.literal("definition"), term: z.string(), text: z.string(), page: z.number().optional() }),
  z.object({ type: z.literal("list"), items: z.array(z.string()) }),
  z.object({ type: z.literal("table"), caption: z.string().optional(), headers: z.array(z.string()), rows: z.array(z.array(z.string())), page: z.number().optional() }),
  z.object({ type: z.literal("figure"), src: z.string(), caption: z.string(), page: z.number().optional(), wide: z.boolean().optional() }),
  z.object({
    type: z.literal("gallery"),
    items: z.array(z.object({ src: z.string(), title: z.string(), caption: z.string().optional(), page: z.number().optional() })),
  }),
  z.object({ type: z.literal("note"), text: z.string() }),
  z.object({ type: z.literal("missing"), text: z.string() }),
]);

export const ChapterSchema = z.object({
  id: z.string(),
  number: z.string(),
  title: z.string(),
  kicker: z.string(),
  /** Curriculumtopics (course.json) die dit hoofdstuk (deels) behandelt. */
  topicIds: z.array(z.string()),
  cover: z.string().optional(),
  intro: z.string(),
  sections: z.array(z.object({ heading: z.string(), blocks: z.array(BlockSchema) })),
  summary: z.array(z.string()),
  source: SourceRefSchema,
});

export const FLASHCARD_CATEGORIES = ["architecten", "gebouwen", "stijlperiodes", "begrippen", "context"] as const;
export const FLASHCARD_CATEGORY_LABEL: Record<(typeof FLASHCARD_CATEGORIES)[number], string> = {
  architecten: "Architecten",
  gebouwen: "Gebouwen",
  stijlperiodes: "Stijlperiodes",
  begrippen: "Architecturale begrippen",
  context: "Historische context",
};

export const FlashcardSchema = z.object({
  id: z.string(),
  chapterId: z.string(),
  front: z.string(),
  back: z.string(),
  page: z.number().optional(),
  category: z.enum(FLASHCARD_CATEGORIES).optional(),
  image: z.string().optional(),
});

/** Een gebouw uit het lesmateriaal — basis voor “Herken het gebouw”. Enkel gebouwen die in de les voorkomen. */
export const BuildingSchema = z.object({
  id: z.string(),
  chapterId: z.string().optional(),
  name: z.string(),
  architect: z.string(),
  period: z.string(),
  location: z.string(),
  style: z.string(),
  features: z.array(z.string()).min(1),
  explanation: z.string(),
  image: z.string(),
  imageCaption: z.string().optional(),
  page: z.number().optional(),
});

const base = { id: z.string(), chapterId: z.string(), explanation: z.string(), page: z.number().optional() };
export const PracticeSchema = z.discriminatedUnion("type", [
  z.object({ ...base, type: z.literal("mc"), prompt: z.string(), options: z.array(z.string()).min(2), answer: z.number(), image: z.string().optional() }),
  z.object({ ...base, type: z.literal("tf"), statement: z.string(), answer: z.boolean() }),
  z.object({ ...base, type: z.literal("definition"), definition: z.string(), accepted: z.array(z.string()).min(1) }),
  z.object({ ...base, type: z.literal("match"), prompt: z.string(), pairs: z.array(z.tuple([z.string(), z.string()])).min(2) }),
  z.object({ ...base, type: z.literal("open"), prompt: z.string(), model: z.string(), keywords: z.array(z.string()) }),
]);

export const ExamQuestionSchema = z.discriminatedUnion("type", [
  z.object({ ...base, type: z.literal("mc"), prompt: z.string(), options: z.array(z.string()).min(2), answer: z.number() }),
  z.object({ ...base, type: z.literal("open"), prompt: z.string(), model: z.string(), keywords: z.array(z.string()) }),
  z.object({ ...base, type: z.literal("drawing"), prompt: z.string(), image: z.string(), imageCaption: z.string(), model: z.string(), keywords: z.array(z.string()) }),
]);

export const LectureSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  title: z.string(),
  file: z.string(),
  pages: z.number(),
  /** Curriculumtopics die door dit lesmateriaal gedekt worden. */
  covers: z.array(z.string()),
  chapters: z.array(ChapterSchema),
  flashcards: z.array(FlashcardSchema),
  practice: z.array(PracticeSchema),
  exam: z.array(ExamQuestionSchema),
  buildings: z.array(BuildingSchema).default([]),
});

export type CatalogCourse = z.infer<typeof CatalogCourseSchema>;
export type Course = z.infer<typeof CourseSchema>;
export type Part = z.infer<typeof PartSchema>;
export type Topic = z.infer<typeof TopicSchema>;
export type Block = z.infer<typeof BlockSchema>;
export type Chapter = z.infer<typeof ChapterSchema>;
export type Flashcard = z.infer<typeof FlashcardSchema>;
export type Practice = z.infer<typeof PracticeSchema>;
export type ExamQuestion = z.infer<typeof ExamQuestionSchema>;
export type Lecture = z.infer<typeof LectureSchema>;
export type Building = z.infer<typeof BuildingSchema>;
export type ObjectiveGroup = z.infer<typeof ObjectiveGroupSchema>;
export type Assessment = z.infer<typeof AssessmentSchema>;

/* ───────── Quizzen (vaste vragenreeksen, bv. aangeleverd door de docent of de student) ───────── */

export const QuizQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  options: z.array(z.string()).length(4),
  answer: z.number().int().min(0).max(3),
  explanation: z.string(),
  course: z.string(),
  difficulty: z.enum(["makkelijk", "gemiddeld", "moeilijk"]),
  source: z.object({ lecture: z.string(), pages: z.array(z.number()), note: z.string().optional() }).optional(),
  category: z.string().optional(),
  image: z.string().optional(),
});

export const QuizSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  title: z.string(),
  description: z.string(),
  questions: z.array(QuizQuestionSchema).min(1),
});

export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;
export type Quiz = z.infer<typeof QuizSchema>;
