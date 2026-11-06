/** Controleert alle gepubliceerde inhoud tegen het schema (npm run validate-content). */
import fs from "node:fs";
import path from "node:path";
import { CatalogSchema, CourseSchema, LectureSchema, QuizSchema } from "../src/lib/schema.ts";

let errors = 0;
const fail = (f: string, issues: { path: PropertyKey[]; message: string }[]) => {
  errors++;
  console.error(`✗ ${f}`);
  for (const i of issues) console.error(`  - ${i.path.join(".")} : ${i.message}`);
};
const read = (f: string) => JSON.parse(fs.readFileSync(f, "utf8"));

const cat = CatalogSchema.safeParse(read("content/catalog.json"));
if (!cat.success) fail("content/catalog.json", cat.error.issues);
else console.log(`✓ content/catalog.json : ${cat.data.courses.length} cursussen`);

for (const dir of fs.readdirSync("content")) {
  const courseFile = path.join("content", dir, "course.json");
  if (!fs.existsSync(courseFile)) continue;
  const c = CourseSchema.safeParse(read(courseFile));
  if (!c.success) { fail(courseFile, c.error.issues); continue; }
  const topicIds = new Set([...c.data.official.parts.flatMap((p) => p.topics.map((t) => t.id)), ...(c.data.provisional?.sections.map((x) => x.id) ?? [])]);
  console.log(`✓ ${courseFile} : ${topicIds.size} curriculumtopics${c.data.layout === "history" ? " (voorlopige tijdlijn)" : ""}`);
  if (fs.existsSync(path.join("content", dir, "lectures")) && !fs.readdirSync(path.join("content", dir, "lectures")).some((f) => f.endsWith(".json") && !f.endsWith(".draft.json")))
    console.log(`  · nog geen lesmateriaal voor ${dir}`);

  const lecDir = path.join("content", dir, "lectures");
  for (const f of fs.existsSync(lecDir) ? fs.readdirSync(lecDir) : []) {
    if (!f.endsWith(".json") || f.endsWith(".draft.json")) continue;
    const file = path.join(lecDir, f);
    const l = LectureSchema.safeParse(read(file));
    if (!l.success) { fail(file, l.error.issues); continue; }
    const L = l.data;
    const chapterIds = new Set(L.chapters.map((x) => x.id));
    const warn = (m: string) => console.warn(`⚠ ${file} : ${m}`);
    for (const t of [...L.covers, ...L.chapters.flatMap((x) => x.topicIds)]) if (!topicIds.has(t)) warn(`onbekend curriculumtopic ${t}`);
    for (const x of [...L.flashcards, ...L.practice, ...L.exam]) if (!chapterIds.has(x.chapterId)) warn(`${x.id} verwijst naar onbekend hoofdstuk ${x.chapterId}`);
    for (const x of [...L.practice, ...L.exam]) if ("answer" in x && typeof x.answer === "number" && "options" in x && x.answer >= x.options.length) warn(`${x.id}: answer buiten bereik`);
    for (const x of [...L.flashcards, ...L.practice, ...L.exam]) if (x.page && x.page > L.pages) warn(`${x.id}: pagina ${x.page} > ${L.pages}`);
    const ids = [...L.flashcards, ...L.practice, ...L.exam].map((x) => x.id);
    const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (dup.length) warn(`dubbele ids: ${dup.join(", ")}`);
    // Afbeeldingen aanwezig?
    const imgs = JSON.stringify(L).match(/img\/[\w.-]+\.(?:jpg|png|webp)/g) ?? [];
    const missing = [...new Set(imgs)].filter((s) => !fs.existsSync(path.join("public", "content", dir, s)));
    if (missing.length) warn(`${missing.length} afbeelding(en) ontbreken lokaal (npm run extract-images): ${missing.slice(0, 5).join(", ")}…`);
    const bIds = L.buildings.map((x) => x.id);
    if (new Set(bIds).size !== bIds.length) warn("dubbele gebouw-ids");
    if (L.buildings.length && L.buildings.length < 4) warn(`slechts ${L.buildings.length} gebouwen: “Herken het gebouw” heeft er minstens 4 nodig`);
    const exam = { mc: L.exam.filter((x) => x.type === "mc").length, open: L.exam.filter((x) => x.type === "open").length, drawing: L.exam.filter((x) => x.type === "drawing").length };
    console.log(`✓ ${file} : ${L.chapters.length} lessen, ${L.flashcards.length} flashcards, ${L.practice.length} oefeningen, examen ${JSON.stringify(exam)}, ${L.buildings.length} gebouwen`);
  }
}
for (const dir of fs.readdirSync("content")) {
  const qDir = path.join("content", dir, "quizzes");
  if (!fs.existsSync(qDir)) continue;
  for (const f of fs.readdirSync(qDir)) {
    if (!f.endsWith(".json") || f.endsWith(".draft.json")) continue;
    const file = path.join(qDir, f);
    const q = QuizSchema.safeParse(read(file));
    if (!q.success) { fail(file, q.error.issues); continue; }
    const ids = q.data.questions.map((x) => x.id);
    if (new Set(ids).size !== ids.length) console.warn(`⚠ ${file} : dubbele vraag-ids`);
    console.log(`✓ ${file} : ${q.data.questions.length} vragen, sleutel ${q.data.questions.map((x) => "ABCD"[x.answer]).join("")}`);
  }
}
process.exit(errors ? 1 : 0);
