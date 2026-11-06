import { SectionLabel, SourceTag } from "../../components/ui";
import type { CourseBundle } from "../../lib/content";
import { useProgress } from "../../lib/progress";
import { availableKinds } from "../../lib/recognition";

/** Examenvoorbereiding architectuurgeschiedenis: officiële evaluatie + oefenvormen per competentie. */
export default function HistoryExam({ bundle }: { bundle: CourseBundle }) {
  const { get } = useProgress();
  const { course } = bundle;
  const base = `#/course/${course.id}`;
  const p = get(course.id);
  const assessment = course.official.assessment ?? [];
  const exam = assessment.find((a) => a.id === "examen");
  const recognitionReady = availableKinds(bundle.buildings).length > 0;
  const drawingsDone = p.drawings.filter((d) => d.done).length;
  const walksDone = p.walks.filter((w) => w.done).length;

  const competences = [
    {
      title: "Architectuurhistorisch inzicht",
      text: "Architecten en gebouwen situeren in de tijd en in hun socio-culturele context, ontwerpen vergelijken en koppelen aan een stijlperiode.",
      train: [
        { label: "Herken het gebouw — stijlperiode / eeuw", href: `${base}/herken`, ready: recognitionReady },
        { label: "Quiz — chronologie, historische context", href: `${base}/quiz`, ready: bundle.quizzes.length > 0 },
      ],
    },
    {
      title: "Basisvocabularium",
      text: "Architecturale terminologie herkennen en correct gebruiken om gebouwen en gebouwdelen te omschrijven.",
      train: [
        { label: "Flashcards — architecturale begrippen", href: `${base}/flashcards`, ready: bundle.flashcards.some((f) => f.category === "begrippen") },
        { label: "Quiz — terminologie", href: `${base}/quiz`, ready: bundle.quizzes.length > 0 },
      ],
    },
    {
      title: "Referentiekader — basiskennis",
      text: "Sleutelwerken herkennen op foto: naam van het gebouw, architect, eeuw, locatie en stijlperiode.",
      train: [
        { label: "Herken het gebouw", href: `${base}/herken`, ready: recognitionReady },
        { label: "Flashcards — gebouwen, architecten", href: `${base}/flashcards`, ready: bundle.flashcards.some((f) => f.category === "gebouwen" || f.category === "architecten") },
      ],
    },
    {
      title: "Referentiekader — inzicht",
      text: "De historische context, architecturale kenmerken, ontwerpkeuzes en constructiemethode toelichten en linken aan de stijlperiode en architectuurstromingen.",
      train: [
        { label: "Studeren — architecturale analyse", href: `${base}/study`, ready: bundle.chapters.length > 0 },
        { label: "Quiz — kenmerken, vergelijking van gebouwen", href: `${base}/quiz`, ready: bundle.quizzes.length > 0 },
      ],
    },
  ];

  return (
    <div className="pt-10">
      {/* Officiële evaluatie */}
      <SectionLabel right={<SourceTag kind="official">BaMaFlex</SourceTag>}>Officiële evaluatie</SectionLabel>
      <div className="grid border-l border-t border-line md:grid-cols-3">
        {assessment.map((a) => (
          <div key={a.id} className="flex flex-col border-b border-r border-line p-6 sm:p-8">
            <p className="text-[64px] font-extrabold leading-none tracking-[-0.05em] tabular-nums">{a.weight}%</p>
            <h3 className="mt-4 text-[18px] font-bold uppercase">{a.title}</h3>
            {a.note && <p className="mt-2 text-[13px] leading-relaxed text-mute">{a.note}</p>}
            <div className="mt-auto pt-6">
              {a.id === "tekeningen" && <a href={`${base}/opdrachten`} className="meta link-u">{drawingsDone} van de 10 tekeningen voltooid →</a>}
              {a.id === "wandelingen" && <a href={`${base}/opdrachten`} className="meta link-u">{walksDone} van de 3 wandelingen voltooid →</a>}
              {a.id === "examen" && <span className="meta-mute">Gequoteerd op 20</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Schriftelijk examen: competenties */}
      <section className="mt-16">
        <div className="flex flex-wrap items-end justify-between gap-4 border-t border-ink pt-6">
          <h2 className="text-[34px] font-extrabold uppercase leading-none tracking-[-0.04em] sm:text-[56px]">Schriftelijk examen</h2>
          <span className="meta-mute">{exam?.weight}% · {exam?.note}</span>
        </div>
        <div className="mt-8 border-t border-line">
          {competences.map((c, i) => (
            <div key={c.title} className="grid gap-3 border-b border-line py-7 md:grid-cols-[64px_1fr_1fr] md:gap-8">
              <span className="text-[13px] font-extrabold tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3 className="text-[18px] font-bold uppercase">{c.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-[#444]">{c.text}</p>
              </div>
              <ul>
                <li className="meta-mute text-[10px]">Oefenen met</li>
                {c.train.map((t) => (
                  <li key={t.label} className="flex items-baseline justify-between gap-3 border-b border-line py-2.5 text-[13.5px]">
                    {t.ready ? <a href={t.href} className="link-u">{t.label}</a> : <span className="text-mute">{t.label}</span>}
                    <span className="shrink-0 text-[11px] text-mute">{t.ready ? "●" : "binnenkort"}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Oefenexamen */}
      <section className="mt-16 border border-dashed border-line px-6 py-10 sm:px-12">
        <p className="meta-mute">Oefenexamen</p>
        <h2 className="mt-3 text-[26px] font-extrabold uppercase tracking-[-0.03em] sm:text-[38px]">Oefenexamen architectuurgeschiedenis</h2>
        <p className="mt-4 max-w-[64ch] text-[14px] leading-relaxed text-[#444]">
          Een oefenexamen wordt samengesteld uit vragen over de vier competenties hierboven, telkens op basis van het lesmateriaal. Zolang er geen lessen zijn
          geüpload, worden er geen vragen verzonnen.
        </p>
        <p className="mt-4 max-w-[64ch] text-[12.5px] leading-relaxed text-mute">
          Een oefenexamen is een studiehulpmiddel: het is geen officieel examen, de vragen zijn geen echte examenvragen en de score is geen officieel cijfer.
        </p>
        <p className="mt-6 meta-mute">Lesmateriaal nog niet beschikbaar.</p>
      </section>
    </div>
  );
}
