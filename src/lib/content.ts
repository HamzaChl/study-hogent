import catalogJson from "../../content/catalog.json";
import {
  CatalogSchema,
  CourseSchema,
  LectureSchema,
  QuizSchema,
  type CatalogCourse,
  type Chapter,
  type Course,
  type ExamQuestion,
  type Flashcard,
  type Lecture,
  type Practice,
  type Quiz,
  type Building,
} from "./schema";

/** Alle inhoud wordt bij de build ingeladen. Concepten (*.draft.json) worden nooit geladen. */
const courseFiles = import.meta.glob<unknown>("/content/*/course.json", { eager: true, import: "default" });
const quizFiles = import.meta.glob<unknown>(["/content/*/quizzes/*.json", "!/content/**/*.draft.json"], { eager: true, import: "default" });
const lectureFiles = import.meta.glob<unknown>(["/content/*/lectures/*.json", "!/content/**/*.draft.json"], {
  eager: true,
  import: "default",
});

export type CourseBundle = {
  course: Course;
  lectures: Lecture[];
  chapters: Chapter[];
  flashcards: Flashcard[];
  practice: Practice[];
  exam: ExamQuestion[];
  quizzes: Quiz[];
  buildings: Building[];
  /** topicId → hoofdstukken die het topic behandelen */
  topicChapters: Map<string, Chapter[]>;
  lectureOf: Map<string, Lecture>;
};

export const contentErrors: string[] = [];

function parse<T>(schema: { safeParse: (d: unknown) => { success: true; data: T } | { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } } }, data: unknown, path: string): T | null {
  const r = schema.safeParse(data);
  if (r.success) return r.data;
  contentErrors.push(`${path}: ${r.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
  return null;
}

/** Zichtbare cursussen (cursussen met "hidden": true worden overal weggelaten). */
export const catalog: CatalogCourse[] = (parse(CatalogSchema, catalogJson, "content/catalog.json")?.courses ?? []).filter((c) => !c.hidden);

const bundles = new Map<string, CourseBundle>();
for (const [path, data] of Object.entries(courseFiles)) {
  const course = parse(CourseSchema, data, path);
  if (!course) continue;
  const lectures = Object.entries(lectureFiles)
    .filter(([p]) => p.startsWith(`/content/${course.id}/lectures/`))
    .map(([p, d]) => parse(LectureSchema, d, p))
    .filter((l): l is Lecture => !!l)
    .sort((a, b) => a.id.localeCompare(b.id));

  const chapters = lectures.flatMap((l) => l.chapters);
  const topicChapters = new Map<string, Chapter[]>();
  for (const ch of chapters) for (const t of ch.topicIds) topicChapters.set(t, [...(topicChapters.get(t) ?? []), ch]);
  const lectureOf = new Map<string, Lecture>();
  for (const l of lectures) for (const ch of l.chapters) lectureOf.set(ch.id, l);

  const quizzes = Object.entries(quizFiles)
    .filter(([p]) => p.startsWith(`/content/${course.id}/quizzes/`))
    .map(([p, d]) => parse(QuizSchema, d, p))
    .filter((q): q is Quiz => !!q)
    .sort((a, b) => a.id.localeCompare(b.id));

  bundles.set(course.id, {
    course,
    lectures,
    chapters,
    flashcards: lectures.flatMap((l) => l.flashcards),
    practice: lectures.flatMap((l) => l.practice),
    exam: lectures.flatMap((l) => l.exam),
    quizzes,
    buildings: lectures.flatMap((l) => l.buildings),
    topicChapters,
    lectureOf,
  });
}

if (contentErrors.length) console.warn("[content]", contentErrors);

export const getBundle = (id: string) => bundles.get(id);
export const allBundles = () => [...bundles.values()];

/** Afbeeldingspad uit de inhoud → URL (relatief t.o.v. /content/<cursus>/). */
export function asset(courseId: string, src: string): string {
  if (/^(https?:|data:|\/)/.test(src)) return src;
  return `${import.meta.env.BASE_URL}content/${courseId}/${src.replace(/^\.\//, "")}`;
}

export const pad2 = (n: number) => String(n).padStart(2, "0");
