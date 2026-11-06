import type { CourseBundle } from "../../lib/content";
import { stats, useProgress } from "../../lib/progress";

/** Eenvoudige startpagina van een cursus: voortgang in één regel, de hoofdstukken, en het curriculum ingeklapt. */
export default function StudyIndex({ bundle }: { bundle: CourseBundle }) {
  const { get } = useProgress();
  const { course, chapters } = bundle;
  const p = get(course.id);
  const s = stats(bundle, p);
  const base = `#/course/${course.id}`;
  const off = course.official;
  const percent = Math.round(s.overall * 100);
  const nextChapter = chapters.find((c) => !p.completed.includes(c.id)) ?? chapters[0];

  return (
    <div>
      {/* Voortgang in één regel */}
      <div className="flex flex-wrap items-center justify-between gap-4 py-6">
        <div className="flex min-w-[200px] flex-1 items-center gap-4">
          <span className="meta tabular-nums">{percent}% voltooid</span>
          <div className="h-px max-w-xs flex-1 bg-line" aria-hidden>
            <div className="h-px bg-ink transition-[width] duration-500" style={{ width: `${percent}%` }} />
          </div>
        </div>
        {nextChapter && (
          <a href={`${base}/study/${nextChapter.id}`} className="btn-solid">
            {p.completed.length ? "Verder studeren" : "Beginnen"} → {nextChapter.number} {nextChapter.title}
          </a>
        )}
      </div>

      {/* Hoofdstukken */}
      <ol className="border-t border-ink">
        {chapters.map((ch) => {
          const done = p.completed.includes(ch.id);
          return (
            <li key={ch.id} className="border-b border-line">
              <a href={`${base}/study/${ch.id}`} className="group grid grid-cols-[56px_1fr_auto] items-baseline gap-4 py-6 transition-colors hover:bg-haze sm:grid-cols-[110px_1fr_auto] sm:py-8">
                <span className="text-[28px] font-extrabold tabular-nums tracking-[-0.04em] sm:text-[44px]">{ch.number}</span>
                <span>
                  <span className="block text-[18px] font-bold uppercase sm:text-[26px]">
                    <span className="link-u group-hover:bg-[length:100%_1px]">{ch.title}</span>
                  </span>
                  <span className="mt-1 block text-[13px] text-mute">{ch.kicker}</span>
                </span>
                <span className={`meta text-[10px] ${done ? "text-ink" : "text-line"}`}>{done ? "● Voltooid" : "→"}</span>
              </a>
            </li>
          );
        })}
      </ol>

      {/* Officieel curriculum: standaard ingeklapt */}
      <details className="group mt-16 border-y border-line">
        <summary className="flex cursor-pointer list-none items-center justify-between py-5 [&::-webkit-details-marker]:hidden">
          <span className="meta font-bold">Officieel curriculum &amp; examen</span>
          <span className="meta-mute transition-transform duration-200 group-open:rotate-45" aria-hidden>+</span>
        </summary>

        <div className="pb-10">
          <p className="max-w-2xl text-[13px] leading-relaxed text-mute">
            Volgens BaMaFlex 2026–27 · {off.studyTime.total} u studietijd ({off.studyTime.lectures} u hoorcollege, {off.studyTime.selfStudy} u zelfstudie).
          </p>

          <div className="mt-8 grid gap-10 md:grid-cols-3">
            {off.parts.map((part) => (
              <div key={part.id}>
                <p className="meta-mute">Deel {part.number}</p>
                <h3 className="mt-1 border-b border-ink pb-3 text-[15px] font-bold uppercase">{part.title}</h3>
                <ul>
                  {part.topics.map((t) => {
                    const chs = bundle.topicChapters.get(t.id);
                    return (
                      <li key={t.id} className="flex items-baseline justify-between gap-3 border-b border-line py-2.5 text-[13.5px]">
                        {chs ? (
                          <a href={`${base}/study/${chs[0].id}`} className="font-medium link-u">{t.title}</a>
                        ) : (
                          <span className="text-mute">{t.title}</span>
                        )}
                        <span className="shrink-0 text-[11px] text-mute">{chs ? "●" : "binnenkort"}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[12px] text-mute">● beschikbaar · “binnenkort” = lesmateriaal nog niet beschikbaar</p>

          <div className="mt-10">
            <p className="meta font-bold">Examen</p>
            <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-[#333]">{off.evaluation.slice(0, 4).join(" ")}</p>
          </div>
        </div>
      </details>
    </div>
  );
}
