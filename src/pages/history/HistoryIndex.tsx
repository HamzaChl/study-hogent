import { SectionLabel, SourceTag } from "../../components/ui";
import type { CourseBundle } from "../../lib/content";
import { historyStats, useProgress } from "../../lib/progress";

/** Opbouw van elke les architectuurgeschiedenis (wordt gevuld vanuit het lesmateriaal). */
export const LESSON_TEMPLATE = [
  { title: "Historische context", text: "De periode, haar maatschappij en cultuur." },
  { title: "Stijlkenmerken", text: "De karakteristieke architecturale kenmerken." },
  { title: "Belangrijke architecten", text: "De ontwerpers die in de les aan bod komen." },
  { title: "Sleutelwerken", text: "De gebouwen die je moet herkennen." },
  { title: "Architecturale analyse", text: "Ontwerpkeuzes, ruimtelijke organisatie, constructieprincipes." },
  { title: "Samenvatting", text: "Een beknopt overzicht om te herhalen." },
];

export default function HistoryIndex({ bundle }: { bundle: CourseBundle }) {
  const { get } = useProgress();
  const { course, chapters } = bundle;
  const p = get(course.id);
  const s = historyStats(bundle, p);
  const base = `#/course/${course.id}`;
  const off = course.official;
  const percent = Math.round(s.overall * 100);
  const sections = course.provisional?.sections ?? [];

  return (
    <div>
      {/* Voortgang in één regel */}
      <div className="flex flex-wrap items-center justify-between gap-4 py-6">
        <div className="flex min-w-[200px] flex-1 items-center gap-4">
          <span className="meta tabular-nums text-ok-ink">{percent}% voltooid</span>
          <div className="h-1 max-w-xs flex-1 overflow-hidden rounded-full bg-ok-soft" aria-hidden>
            <div className="h-full rounded-full bg-ok transition-[width] duration-500" style={{ width: `${percent}%` }} />
          </div>
        </div>
        <a href={`${base}/opdrachten`} className="btn-line">Opdrachten → {s.drawingsDone}/10 tekeningen · {s.walksDone}/3 wandelingen</a>
      </div>

      {/* Tijdlijn */}
      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-4 border-t border-ink pt-5">
          <h2 className="meta font-bold">Tijdlijn</h2>
          <span className="meta-mute">Voorlopige indeling</span>
        </div>
        <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-mute">{course.provisional?.note}</p>
        <ol className="mt-6 border-t border-line">
          {sections.map((sec) => {
            const chs = bundle.topicChapters.get(sec.id) ?? [];
            const done = chs.length > 0 && chs.every((c) => p.completed.includes(c.id));
            const inner = (
              <>
                <span className="text-[28px] font-extrabold tabular-nums tracking-[-0.04em] sm:text-[44px]">{sec.number}</span>
                <span>
                  <span className="block text-[18px] font-bold uppercase sm:text-[26px]">
                    <span className={chs.length ? "link-u group-hover:bg-[length:100%_1px]" : ""}>{sec.title}</span>
                  </span>
                  <span className="mt-1 block text-[13px] text-mute">
                    {chs.length ? chs.map((c) => c.title).join(" · ") : "Lesmateriaal nog niet beschikbaar."}
                  </span>
                </span>
                <span className={`meta text-[10px] ${done ? "text-ink" : "text-line"}`}>{done ? "● Voltooid" : chs.length ? "→" : "—"}</span>
              </>
            );
            const cls = "grid grid-cols-[56px_1fr_auto] items-baseline gap-4 py-6 sm:grid-cols-[110px_1fr_auto] sm:py-8";
            return (
              <li key={sec.id} className="border-b border-line">
                {chs.length ? (
                  <a href={`${base}/study/${chs[0].id}`} className={`group ${cls} transition-colors hover:bg-haze`}>{inner}</a>
                ) : (
                  <div className={cls}>{inner}</div>
                )}
              </li>
            );
          })}
        </ol>
        {chapters.length === 0 && (
          <p className="mt-4 text-[12px] text-mute">Er is nog geen lesmateriaal geüpload voor deze cursus. Er worden geen lessen, gebouwen of architecten verzonnen.</p>
        )}
      </section>

      {/* Opbouw van een les */}
      <section className="mt-16">
        <SectionLabel>Opbouw van elke les</SectionLabel>
        <div className="grid grid-cols-1 border-l border-t border-line sm:grid-cols-2 lg:grid-cols-3">
          {LESSON_TEMPLATE.map((t, i) => (
            <div key={t.title} className="border-b border-r border-line p-6">
              <span className="text-[11px] font-semibold tabular-nums text-mute">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-3 text-[16px] font-bold uppercase">{t.title}</h3>
              <p className="mt-1 text-[13px] text-mute">{t.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Officiële doelstellingen */}
      <section className="mt-16">
        <SectionLabel right={<SourceTag kind="official">BaMaFlex 2026–27</SourceTag>}>Doelstellingen</SectionLabel>
        <div className="border-t border-ink">
          {(off.objectiveGroups ?? []).map((g) => (
            <div key={g.number} className="grid gap-4 border-b border-line py-8 md:grid-cols-[200px_1fr] md:gap-10">
              <div>
                <p className="text-[56px] font-extrabold leading-none tracking-[-0.05em]">{g.number}</p>
              </div>
              <div>
                <h3 className="text-[22px] font-extrabold uppercase tracking-[-0.02em] sm:text-[28px]">{g.title}</h3>
                {g.subtitle && <p className="mt-1 meta-mute">{g.subtitle}</p>}
                <p className="mt-3 max-w-[68ch] text-[14px] leading-relaxed text-[#444]">{g.text}</p>
                <ul className="mt-5 border-t border-line">
                  {g.items.map((it) => (
                    <li key={it} className="flex gap-4 border-b border-line py-2.5 text-[14px]">
                      <span className="text-mute">—</span>
                      {it}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ECTS-fiche, ingeklapt */}
      <details className="group mt-16 border-y border-line">
        <summary className="flex cursor-pointer list-none items-center justify-between py-5 [&::-webkit-details-marker]:hidden">
          <span className="meta font-bold">Officiële ECTS-fiche &amp; evaluatie</span>
          <span className="meta-mute transition-transform duration-200 group-open:rotate-45" aria-hidden>+</span>
        </summary>
        <div className="grid gap-10 pb-10 md:grid-cols-2">
          <div className="space-y-3 text-[13.5px] leading-relaxed text-[#333]">
            <p className="text-mute">
              {off.studyTime.total} u studietijd · {off.studyTime.lectures} u hoorcollege · {off.studyTime.selfStudy} u zelfstudie
            </p>
            {off.description.map((d) => (
              <p key={d}>{d}</p>
            ))}
            <p className="text-mute">Studiematerialen: {off.materials}</p>
          </div>
          <div>
            <ul className="border-t border-ink">
              {off.evaluation.map((e) => (
                <li key={e} className="flex gap-4 border-b border-line py-2.5 text-[13.5px]">
                  <span className="text-mute">—</span>
                  {e}
                </li>
              ))}
            </ul>
            {off.notes?.map((n) => (
              <p key={n} className="mt-4 text-[12.5px] text-mute">{n}</p>
            ))}
          </div>
        </div>
      </details>
    </div>
  );
}
