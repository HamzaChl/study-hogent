import { Blocks } from "../../components/Blocks";
import { Empty, Img, SourceTag } from "../../components/ui";
import type { CourseBundle } from "../../lib/content";
import { useProgress } from "../../lib/progress";

function pageRange(pages: number[]): string {
  if (!pages.length) return "";
  const s = [...pages].sort((a, b) => a - b);
  return s[0] === s.at(-1) ? `p. ${s[0]}` : `p. ${s[0]}–${s.at(-1)}`;
}

export default function ChapterView({ bundle, chapterId }: { bundle: CourseBundle; chapterId: string }) {
  const { get, update } = useProgress();
  const { course, chapters } = bundle;
  const idx = chapters.findIndex((c) => c.id === chapterId);
  const ch = chapters[idx];
  const base = `#/course/${course.id}`;
  if (!ch) return <Empty>Dit hoofdstuk bestaat niet.</Empty>;

  const done = get(course.id).completed.includes(ch.id);
  const prev = chapters[idx - 1];
  const next = chapters[idx + 1];
  const lecture = bundle.lectureOf.get(ch.id);
  const topics = course.official.parts.flatMap((p) => p.topics.filter((t) => ch.topicIds.includes(t.id)).map((t) => `Deel ${p.number} · ${t.number} ${t.title}`));
  const toggle = () =>
    update(course.id, (p) => ({ ...p, completed: done ? p.completed.filter((x) => x !== ch.id) : [...p.completed, ch.id] }));

  return (
    <div className="grid gap-x-14 pt-8 lg:grid-cols-[220px_1fr]">
      {/* Inhoudstafel */}
      <aside className="hidden lg:block">
        <div className="sticky top-8">
          <a href={`${base}/study`} className="meta link-u">← Inhoud</a>
          <ol className="mt-6 border-t border-ink">
            {chapters.map((c) => {
              const d = get(course.id).completed.includes(c.id);
              return (
                <li key={c.id} className="border-b border-line">
                  <a href={`${base}/study/${c.id}`} aria-current={c.id === ch.id ? "page" : undefined} className={`flex items-baseline justify-between gap-3 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] hover:bg-haze ${c.id === ch.id ? "text-ink" : "text-mute"}`}>
                    <span>
                      {c.number} — {c.title}
                    </span>
                    {d && <span aria-label="voltooid">●</span>}
                  </a>
                </li>
              );
            })}
          </ol>
        </div>
      </aside>

      <article className="min-w-0">
        <a href={`${base}/study`} className="meta link-u lg:hidden">← Inhoud</a>

        <header className="mt-6 lg:mt-0">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {lecture && <SourceTag kind="lecture">{`${lecture.id.replace("les", "Les ")} · ${pageRange(ch.source.pages)}`}</SourceTag>}
            {topics.map((t) => (
              <SourceTag key={t} kind="official">{t}</SourceTag>
            ))}
          </div>
          <div className="mt-6 flex items-end gap-5 border-b border-ink pb-6 sm:gap-8">
            <span className="text-[96px] font-extrabold leading-[0.78] tracking-[-0.06em] tabular-nums sm:text-[180px]">{ch.number}</span>
            <div className="min-w-0 pb-1">
              <h1 className="break-words text-[40px] font-extrabold uppercase leading-[0.85] tracking-[-0.045em] sm:text-[80px]">{ch.title}</h1>
            </div>
          </div>
          <p className="mt-5 text-[13px] font-bold uppercase tracking-[0.1em]">{ch.kicker}</p>
        </header>

        {ch.cover && (
          <div className="mt-10 overflow-hidden border border-line bg-haze">
            <Img courseId={course.id} src={ch.cover} alt={ch.title} tone="hover-color" className="mx-auto max-h-[440px] w-auto object-contain" />
          </div>
        )}

        <p className="mt-10 max-w-[60ch] text-[20px] leading-[1.55] tracking-[-0.01em] sm:text-[23px]">{ch.intro}</p>

        {ch.sections.map((s, i) => (
          <section key={i} className="mt-16">
            <div className="flex items-baseline gap-4 border-t border-ink pt-5">
              <span className="text-[11px] font-semibold tabular-nums text-mute">
                {ch.number}.{i + 1}
              </span>
              <h2 className="text-[26px] font-extrabold uppercase leading-[0.95] tracking-[-0.03em] sm:text-[38px]">{s.heading}</h2>
            </div>
            <div className="mt-8">
              <Blocks blocks={s.blocks} courseId={course.id} />
            </div>
          </section>
        ))}

        <section className="mt-20 border border-ink p-6 sm:p-10">
          <h2 className="meta font-bold">Samenvatting</h2>
          <ul className="mt-5">
            {ch.summary.map((s, i) => (
              <li key={i} className="grid grid-cols-[28px_1fr] gap-2 border-t border-line py-3 text-[15px] leading-relaxed">
                <span className="tabular-nums text-mute">{String(i + 1).padStart(2, "0")}</span>
                {s}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={toggle} className={done ? "btn-line" : "btn-solid"} aria-pressed={done}>
              {done ? "● Voltooid — ongedaan maken" : "Markeren als voltooid"}
            </button>
            <a href={`${base}/flashcards?chapter=${ch.id}`} className="btn-quiet">Flashcards</a>
            <a href={`${base}/practice?chapter=${ch.id}`} className="btn-quiet">Oefenen</a>
          </div>
        </section>

        <nav className="mt-16 grid grid-cols-2 border-t border-ink" aria-label="Hoofdstukken">
          {prev ? (
            <a href={`${base}/study/${prev.id}`} className="group py-6 pr-4">
              <span className="meta-mute">← Vorige</span>
              <span className="mt-2 block text-[15px] font-bold uppercase sm:text-[20px]"><span className="link-u group-hover:bg-[length:100%_1px]">{prev.number} {prev.title}</span></span>
            </a>
          ) : <span />}
          {next ? (
            <a href={`${base}/study/${next.id}`} className="group border-l border-line py-6 pl-4 text-right">
              <span className="meta-mute">Volgende →</span>
              <span className="mt-2 block text-[15px] font-bold uppercase sm:text-[20px]"><span className="link-u group-hover:bg-[length:100%_1px]">{next.number} {next.title}</span></span>
            </a>
          ) : (
            <a href={`${base}/exam`} className="group border-l border-line py-6 pl-4 text-right">
              <span className="meta-mute">Volgende →</span>
              <span className="mt-2 block text-[15px] font-bold uppercase sm:text-[20px]"><span className="link-u group-hover:bg-[length:100%_1px]">Examensimulatie</span></span>
            </a>
          )}
        </nav>
      </article>
    </div>
  );
}
