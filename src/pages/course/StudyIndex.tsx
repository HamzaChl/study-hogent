import { chapterCode, chaptersByLecture, lectureTitle, type CourseBundle } from "../../lib/content";
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
          <span className="meta tabular-nums text-ok-ink">{percent}% voltooid</span>
          <div className="h-1 max-w-xs flex-1 overflow-hidden rounded-full bg-ok-soft" aria-hidden>
            <div className="h-full rounded-full bg-ok transition-[width] duration-500" style={{ width: `${percent}%` }} />
          </div>
        </div>
        {nextChapter && (
          <a href={`${base}/study/${nextChapter.id}`} className="btn-solid">
            {p.completed.length ? "Verder studeren" : "Beginnen"} → {chapterCode(bundle, nextChapter)} {nextChapter.title}
          </a>
        )}
      </div>

      {/* Hoofdstukken, gegroepeerd per les. Standaard open; elke les kan dichtgeklapt worden. */}
      <div className="border-t border-ink">
        {chaptersByLecture(bundle).map(({ lecture, chapters: lchs }) => {
          const doneCount = lchs.filter((c) => p.completed.includes(c.id)).length;
          const complete = doneCount === lchs.length;
          return (
            <details key={lecture.id} open className="group/les border-b border-line">
              <summary className="grid cursor-pointer list-none grid-cols-[56px_1fr_auto] items-baseline gap-4 py-6 transition-colors hover:bg-haze sm:grid-cols-[110px_1fr_auto] sm:py-7 [&::-webkit-details-marker]:hidden">
                <span>
                  <span className="meta-mute block">Les</span>
                  <span className="text-[28px] font-extrabold tabular-nums tracking-[-0.04em] sm:text-[44px]">{lecture.id.replace("les", "")}</span>
                </span>
                <span>
                  <span className="block text-[18px] font-bold uppercase sm:text-[26px]">{lectureTitle(lecture)}</span>
                  <span className="mt-1 block text-[13px] text-mute">
                    {lchs.length} {lchs.length === 1 ? "hoofdstuk" : "hoofdstukken"}
                  </span>
                </span>
                <span className="flex items-center gap-4">
                  <span className={`meta tabular-nums text-[10px] ${complete ? "text-ok-ink" : doneCount ? "text-ink" : "text-mute"}`}>
                    {complete ? "● Voltooid" : `${doneCount} / ${lchs.length}`}
                  </span>
                  <span className="meta-mute transition-transform duration-200 group-open/les:rotate-45" aria-hidden>+</span>
                </span>
              </summary>
              <ol className="mb-4 ml-[56px] border-t border-line sm:ml-[110px]">
                {lchs.map((ch) => {
                  const done = p.completed.includes(ch.id);
                  return (
                    <li key={ch.id} className="border-b border-line last:border-b-0">
                      <a href={`${base}/study/${ch.id}`} className="group grid grid-cols-[40px_1fr_auto] items-baseline gap-4 py-4 pl-2 transition-colors hover:bg-haze sm:grid-cols-[64px_1fr_auto]">
                        <span className="text-[18px] font-extrabold tabular-nums tracking-[-0.03em] sm:text-[24px]">{ch.number}</span>
                        <span>
                          <span className="block text-[15px] font-bold uppercase sm:text-[18px]">
                            <span className="link-u group-hover:bg-[length:100%_1px]">{ch.title}</span>
                          </span>
                          <span className="mt-0.5 block text-[12.5px] text-mute">{ch.kicker}</span>
                        </span>
                        <span className={`meta pr-2 text-[10px] ${done ? "text-ink" : "text-line"}`}>{done ? "● Voltooid" : "→"}</span>
                      </a>
                    </li>
                  );
                })}
              </ol>
            </details>
          );
        })}
      </div>

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
