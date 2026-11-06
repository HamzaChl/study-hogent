/**
 * Nieuw lesmateriaal (PDF) → concept-bestand voor een cursus.
 *
 *   npm run ingest -- <pdf> <courseId> <lectureId>
 *   bv. npm run ingest -- sources/les03.pdf constructie les03
 *
 * 1. Leest het officiële curriculum (content/<cursus>/course.json) en het bestaande lesmateriaal,
 *    zodat de nieuwe les aan de juiste curriculumtopics gekoppeld wordt zonder te overlappen.
 * 2. Stuurt de PDF naar Claude met de opdracht: lessen, flashcards, oefeningen en examenvragen,
 *    uitsluitend op basis van de PDF, met paginaverwijzingen.
 * 3. Valideert met zod en schrijft content/<cursus>/lectures/<lectureId>.draft.json.
 * 4. NALEZEN IS VERPLICHT. Daarna hernoemen naar .json → de app laadt het automatisch,
 *    en de gedekte curriculumtopics worden “beschikbaar”.
 * Afbeeldingen: npm run extract-images -- <pdf> <courseId> <prefix>
 */
import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs";
import path from "node:path";
import { CourseSchema, LectureSchema } from "../src/lib/schema.ts";

const [pdf, courseId, lectureId] = process.argv.slice(2);
if (!pdf || !courseId || !lectureId) {
  console.error("Gebruik: npm run ingest -- <pdf> <courseId> <lectureId>");
  process.exit(1);
}

const course = CourseSchema.parse(JSON.parse(fs.readFileSync(path.join("content", courseId, "course.json"), "utf8")));
const lecDir = path.join("content", courseId, "lectures");
const existing = (fs.existsSync(lecDir) ? fs.readdirSync(lecDir) : [])
  .filter((f) => f.endsWith(".json") && !f.endsWith(".draft.json"))
  .map((f) => LectureSchema.parse(JSON.parse(fs.readFileSync(path.join(lecDir, f), "utf8"))));

const history = course.layout === "history";
const curriculum = (history
  ? [`Voorlopige chronologische tijdlijn (géén officiële hoofdstukken; vervang/herschik volgens de les):\n${(course.provisional?.sections ?? []).map((x) => `  ${x.id}: ${x.title}`).join("\n")}`]
  : []
).join("") + course.official.parts
  .map((p) => `Part ${p.number} — ${p.title}\n${p.topics.map((t) => `  ${t.id}: ${t.title}`).join("\n")}`)
  .join("\n");
const already = existing.map((l) => `- ${l.id} (${l.title}): hoofdstukken ${l.chapters.map((c) => `${c.number} ${c.title} [${c.topicIds.join(",")}]`).join("; ")}`).join("\n") || "(nog geen)";
const nextNumber = existing.reduce((n, l) => n + l.chapters.length, 0) + 1;
const schemaTs = fs.readFileSync("src/lib/schema.ts", "utf8");

const instructions = `Je bent een didactisch assistent voor de 1ste Bachelor Interieurvormgeving (HOGENT / KASK).
Bijgevoegd: een nieuwe PDF met lesmateriaal voor de cursus "${course.title}".

OFFICIEEL CURRICULUM (BaMaFlex) — topic-ids:
${curriculum}

REEDS BESCHIKBAAR LESMATERIAAL:
${already}

OPDRACHT
Maak één JSON-object dat exact voldoet aan LectureSchema uit dit zod-schema:
${schemaTs}

met "id": "${lectureId}", "courseId": "${courseId}", "file": "${path.basename(pdf)}", "pages": <aantal pagina's van de PDF>.

Regels:
- Alle inhoud in het NEDERLANDS, met de terminologie van de docent.
- Gebruik UITSLUITEND informatie uit de PDF. Verzin niets. Wat de PDF niet uitlegt, laat je weg of markeer je met een blok {"type":"missing"}.
- "covers" en elk "topicIds": enkel topic-ids uit het curriculum die deze PDF echt behandelt.
- Hoofdstukken nummeren vanaf "${String(nextNumber).padStart(2, "0")}"; ids uniek t.o.v. het bestaande materiaal.
- Elk hoofdstuk: intro, secties met blokken (definities met "page", tabellen, opsommingen), samenvatting, "source" met paginanummers.
- Afbeeldingen: verwijs als "img/${lectureId}-pNN-K.jpg" (NN = pagina) enkel waar een beeld op die pagina staat; die bestanden worden apart uitgepakt.
- Flashcards (één idee per kaart), oefeningen (mix van mc, tf, definition, match, open; altijd met uitleg en "page"),
  examenvragen (mc, open, en "drawing" enkel als de PDF geschikte tekeningen bevat).
- Ids: flashcards "${lectureId}-fNN", oefeningen "${lectureId}-prNN", examen "${lectureId}-eNN" / "-oNN" / "-dNN".
${history ? `
Architectuurgeschiedenis — extra regels:
- Koppel elk hoofdstuk via "topicIds" aan de best passende tijdlijn-id(s) hierboven. Klopt de tijdlijn niet met de les, meld dat bovenaan in een blok {"type":"note"}.
- Elk hoofdstuk heeft exact deze secties, in deze volgorde: "Historische context", "Stijlkenmerken", "Belangrijke architecten", "Sleutelwerken" (blok "gallery" met de gebouwen), "Architecturale analyse", "Samenvatting".
- Vul "buildings" met ELK gebouw dat in de PDF met beeld voorkomt: name, architect, period (eeuw/periode), location, style, features (3–5 stijlkenmerken), explanation, image ("img/${lectureId}-pNN-K.jpg"), page. Ontbreekt een gegeven in de PDF, schrijf dan "niet vermeld in de les" — verzin niets.
- Geef elke flashcard een "category": architecten | gebouwen | stijlperiodes | begrippen | context.` : ""}
Antwoord enkel met de JSON.`;

const client = new Anthropic();
console.log("… Claude genereert het concept (dit kan enkele minuten duren)");
let message: Anthropic.Beta.BetaMessage;
try {
  const stream = client.beta.messages.stream({
    model: "claude-opus-5-5",
    max_tokens: 64000,
    output_config: { effort: "high" },
    // Bij een weigering door een veiligheidsfilter probeert de API automatisch een terugvalmodel.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    messages: [
      {
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: fs.readFileSync(pdf).toString("base64") } },
          { type: "text", text: instructions },
        ],
      },
    ],
  });
  message = await stream.finalMessage();
} catch (error) {
  if (error instanceof Anthropic.AuthenticationError) console.error("Ongeldige of ontbrekende API-sleutel (ANTHROPIC_API_KEY of `ant auth login`).");
  else if (error instanceof Anthropic.RateLimitError) console.error("Rate limit bereikt — probeer later opnieuw.");
  else if (error instanceof Anthropic.APIError) console.error(`API-fout ${error.status}:`, error.message);
  else console.error(error);
  process.exit(1);
}

if (message.stop_reason === "refusal") {
  console.error("Het model weigerde de aanvraag:", message.stop_details);
  process.exit(1);
}
if (message.stop_reason === "max_tokens") console.warn("⚠ Uitvoer afgekapt (max_tokens): het concept is mogelijk onvolledig.");

const raw = message.content
  .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
  .map((b) => b.text)
  .join("")
  .trim()
  .replace(/^```(?:json)?\s*/i, "")
  .replace(/```\s*$/, "");

fs.mkdirSync(lecDir, { recursive: true });
const out = path.join(lecDir, `${lectureId}.draft.json`);
let json: unknown;
try {
  json = JSON.parse(raw);
} catch {
  fs.writeFileSync(out.replace(".draft.json", ".invalid.draft.json"), raw);
  console.error("✗ Geen geldige JSON; ruwe uitvoer bewaard ter inspectie.");
  process.exit(1);
}
fs.writeFileSync(out, JSON.stringify(json, null, 2) + "\n");
const parsed = LectureSchema.safeParse(json);
if (!parsed.success) {
  console.error(`✗ Concept geschreven naar ${out}, maar het voldoet niet aan het schema:`);
  for (const i of parsed.error.issues) console.error(`  - ${i.path.join(".")} : ${i.message}`);
  process.exit(1);
}
const L = parsed.data;
console.log(`✓ ${out}: ${L.chapters.length} hoofdstukken, ${L.flashcards.length} flashcards, ${L.practice.length} oefeningen, ${L.exam.length} examenvragen`);
console.log(`  Dekt: ${L.covers.join(", ") || "—"}`);
console.log("→ Nalezen, corrigeren, dan hernoemen naar .json en `npm run validate-content`.");
