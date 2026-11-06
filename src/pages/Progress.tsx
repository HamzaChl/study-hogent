import { useRef, useState } from "react";
import { Bar, Empty, FitText, SectionLabel } from "../components/ui";
import { allBundles } from "../lib/content";
import { historyStats, stats, useProgress } from "../lib/progress";
import type { CourseBundle } from "../lib/content";

export default function ProgressPage() {
  const { get, reset, exportJSON, importJSON } = useProgress();
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");
  const bundles = allBundles();

  const doExport = () => {
    const url = URL.createObjectURL(new Blob([exportJSON()], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `study-archive-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg("Back-up gedownload.");
  };
  const doImport = async (f: File) => {
    try {
      const text = await f.text();
      if (!confirm("Huidige voortgang vervangen door deze back-up?")) return;
      importJSON(text);
      setMsg("Voortgang hersteld.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Import mislukt.");
    } finally {
      if (file.current) file.current.value = "";
    }
  };

  return (
    <div className="page-fade">
      <FitText className="mt-8 sm:mt-10">VOORTGANG</FitText>

      {bundles.length === 0 && <div className="mt-12"><Empty>Nog geen beschikbare cursussen.</Empty></div>}

      {bundles.map((b) => {
        if (b.course.layout === "history") return <HistoryProgress key={b.course.id} b={b} />;
        const s = stats(b, get(b.course.id));
        return (
          <section key={b.course.id} className="mt-14">
            <SectionLabel>Cursusvoortgang</SectionLabel>
            <div className="grid gap-10 border-t border-ink pt-8 lg:grid-cols-[1fr_1.2fr]">
              <div>
                <a href={`#/course/${b.course.id}`} className="text-[28px] font-extrabold uppercase tracking-[-0.03em] link-u sm:text-[40px]">{b.course.title}</a>
                <p className="mt-6 text-[96px] font-extrabold leading-[0.85] tracking-[-0.06em] tabular-nums sm:text-[140px]">{Math.round(s.overall * 100)}%</p>
                <p className="mt-3 meta">Voltooid</p>
                <p className="mt-4 max-w-sm text-[12px] leading-relaxed text-mute">Gemiddelde van voltooide lessen, beheerste flashcards en (ooit) juist beantwoorde oefeningen.</p>
              </div>
              <div className="space-y-7">
                <Bar label="Voltooide lessen" value={s.lessonsDone / s.lessonsTotal} detail={`${s.lessonsDone} / ${s.lessonsTotal}`} />
                <Bar label="Beheerste flashcards" value={s.mastered / s.cardsTotal} detail={`${s.mastered} / ${s.cardsTotal}`} />
                <Bar label="Beantwoorde oefeningen" value={s.answered / s.practiceTotal} detail={`${s.answered} / ${s.practiceTotal}`} />
                <Bar label="Nauwkeurigheid oefeningen" value={s.accuracy ?? 0} detail={s.accuracy === null ? "—" : `${Math.round(s.accuracy * 100)}%`} />
                <Bar label="Laatste examensimulatie" value={s.lastExam ? s.lastExam.score / s.lastExam.max : 0} detail={s.lastExam ? `${s.lastExam.score} / ${s.lastExam.max}` : "—"} />
              </div>
            </div>

            <div className="mt-12 grid gap-10 md:grid-cols-2">
              <div>
                <SectionLabel right={<span className="meta-mute">Gesimuleerd — niet officieel</span>}>Examensimulaties</SectionLabel>
                {get(b.course.id).exams.length ? (
                  <ul className="border-t border-ink">
                    {[...get(b.course.id).exams].reverse().map((e) => (
                      <li key={e.date} className="flex justify-between border-b border-line py-3 text-[14px]">
                        <span className="text-mute">{new Date(e.date).toLocaleString("nl-BE", { dateStyle: "medium", timeStyle: "short" })}</span>
                        <span className="font-bold tabular-nums">{e.score} / {e.max}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="border-t border-ink pt-4 text-[14px] text-mute">Nog geen simulaties.</p>
                )}
              </div>
              <div>
                <SectionLabel>Lessen</SectionLabel>
                <ul className="border-t border-ink">
                  {b.chapters.map((c) => (
                    <li key={c.id} className="flex justify-between border-b border-line py-3 text-[14px]">
                      <a className="link-u" href={`#/course/${b.course.id}/study/${c.id}`}>{c.number} — {c.title}</a>
                      <span className="meta">{get(b.course.id).completed.includes(c.id) ? "● Voltooid" : "○"}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {b.quizzes.length > 0 && (
              <div className="mt-12">
                <SectionLabel right={<span className="meta-mute">Oefenscores — geen officiële cijfers</span>}>Quizresultaten</SectionLabel>
                <ul className="border-t border-ink">
                  {b.quizzes.map((q) => {
                    const hist = get(b.course.id).quizzes[q.id] ?? [];
                    const last = hist.at(-1);
                    const best = hist.length ? Math.max(...hist.map((r) => r.correct)) : null;
                    return (
                      <li key={q.id} className="grid gap-1 border-b border-line py-3 text-[14px] sm:grid-cols-[1fr_auto_auto] sm:gap-8">
                        <a className="link-u" href={`#/course/${b.course.id}/quiz/${q.id}`}>{q.title}</a>
                        <span className="text-mute">{hist.length} {hist.length === 1 ? "poging" : "pogingen"} · beste {best !== null ? `${best} / ${q.questions.length}` : "—"}</span>
                        <span className="font-bold tabular-nums">{last ? `laatste ${last.correct} / ${last.total}` : "nog niet gemaakt"}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <div className="mt-8">
              <button className="meta link-u text-mute" onClick={() => confirm(`Alle voortgang voor ${b.course.title} wissen?`) && reset(b.course.id)}>Voortgang van deze cursus wissen</button>
            </div>
          </section>
        );
      })}

      <section className="mt-20">
        <SectionLabel>Back-up</SectionLabel>
        <div className="border-t border-ink pt-6">
          <p className="max-w-xl text-[13px] leading-relaxed text-mute">De voortgang wordt lokaal in deze browser bewaard. Exporteer ze af en toe, of om ze over te zetten naar een ander toestel.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button className="btn-solid" onClick={doExport}>Voortgang exporteren</button>
            <button className="btn-line" onClick={() => file.current?.click()}>Voortgang importeren</button>
            <input ref={file} type="file" accept="application/json,.json" className="hidden" onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} />
          </div>
          {msg && <p className="mt-4 text-[13px]" role="status">{msg}</p>}
        </div>
      </section>
    </div>
  );
}

/** Aparte voortgang voor architectuurgeschiedenis (onafhankelijk van Constructie). */
function HistoryProgress({ b }: { b: CourseBundle }) {
  const { get, reset } = useProgress();
  const s = historyStats(b, get(b.course.id));
  return (
    <section className="mt-20">
      <SectionLabel>Studievoortgang</SectionLabel>
      <div className="grid gap-10 border-t border-ink pt-8 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <a href={`#/course/${b.course.id}`} className="text-[28px] font-extrabold uppercase tracking-[-0.03em] link-u sm:text-[40px]">{b.course.title}</a>
          <p className="mt-6 text-[96px] font-extrabold leading-[0.85] tracking-[-0.06em] tabular-nums sm:text-[140px]">{Math.round(s.overall * 100)}%</p>
          <p className="mt-3 meta">Voltooid</p>
          <p className="mt-4 max-w-sm text-[12px] leading-relaxed text-mute">Gemiddelde van de onderdelen die al beschikbaar zijn: opdrachten, en lessen, flashcards en quizzen zodra er lesmateriaal is.</p>
        </div>
        <div className="space-y-7">
          <Bar label="Geleerde hoofdstukken" value={s.lessonsTotal ? s.lessonsDone / s.lessonsTotal : 0} detail={s.lessonsTotal ? `${s.lessonsDone} / ${s.lessonsTotal}` : "nog geen lesmateriaal"} />
          <Bar label="Beheerste flashcards" value={s.cardsTotal ? s.mastered / s.cardsTotal : 0} detail={s.cardsTotal ? `${s.mastered} / ${s.cardsTotal}` : "nog geen lesmateriaal"} />
          <Bar label="Quizresultaten" value={s.quizAvg ?? 0} detail={s.quizAvg === null ? "nog geen quizzen" : `${Math.round(s.quizAvg * 100)}% (beste pogingen)`} />
          <Bar label="Tekeningen voltooid" value={s.drawingsDone / 10} detail={`${s.drawingsDone} / 10`} />
          <Bar label="Observatiewandelingen voltooid" value={s.walksDone / 3} detail={`${s.walksDone} / 3`} />
        </div>
      </div>
      <div className="mt-8 flex flex-wrap gap-6">
        <a href={`#/course/${b.course.id}/opdrachten`} className="meta link-u">Naar de opdrachten →</a>
        <button className="meta link-u text-mute" onClick={() => confirm(`Alle voortgang voor ${b.course.title} wissen?`) && reset(b.course.id)}>Voortgang van deze cursus wissen</button>
      </div>
    </section>
  );
}
