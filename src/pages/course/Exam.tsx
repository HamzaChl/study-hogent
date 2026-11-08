import { useMemo, useState } from "react";
import { FitText, Img, SectionLabel, SourceTag } from "../../components/ui";
import { chapterCode, lectureLabel, type CourseBundle } from "../../lib/content";
import { useProgress } from "../../lib/progress";
import type { ExamQuestion } from "../../lib/schema";
import { keywordHits, shuffle } from "../../lib/text";

/** Puntenverdeling van DEZE simulatie — niet de officiële verdeling (die is niet bekend). */
const PLAN = { mc: { count: 10, points: 1 }, open: { count: 3, points: 2 }, drawing: { count: 2, points: 2 } } as const;
const MAX = 20;

type Phase = "intro" | "sheet" | "result";

export default function Exam({ bundle }: { bundle: CourseBundle }) {
  const { get, update } = useProgress();
  const courseId = bundle.course.id;
  const [phase, setPhase] = useState<Phase>("intro");
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [openScores, setOpenScores] = useState<Record<string, number>>({});
  const [stamp, setStamp] = useState("");

  const pts = (q: ExamQuestion) => PLAN[q.type].points;
  const history = get(courseId).exams;

  const begin = () => {
    const by = (t: ExamQuestion["type"]) => shuffle(bundle.exam.filter((q) => q.type === t)).slice(0, PLAN[t].count);
    setQuestions([...by("mc"), ...by("open"), ...by("drawing")]);
    setAnswers({});
    setOpenScores({});
    setPhase("sheet");
    window.scrollTo(0, 0);
  };

  const scoreOf = (q: ExamQuestion, scores = openScores) =>
    q.type === "mc" ? (answers[q.id] !== undefined && Number(answers[q.id]) === q.answer ? pts(q) : 0) : scores[q.id] ?? 0;

  const summarize = (scores: Record<string, number>) => {
    const total = questions.reduce((n, q) => n + scoreOf(q, scores), 0);
    const byChapter = new Map<string, { got: number; max: number }>();
    for (const q of questions) {
      const c = byChapter.get(q.chapterId) ?? { got: 0, max: 0 };
      c.got += scoreOf(q, scores);
      c.max += pts(q);
      byChapter.set(q.chapterId, c);
    }
    const weak = [...byChapter.entries()].filter(([, v]) => v.got / v.max < 0.7).map(([k]) => k);
    return { total, weak, byChapter };
  };

  const submit = () => {
    const unanswered = questions.filter((q) => !answers[q.id]?.trim()).length;
    if (unanswered && !confirm(`${unanswered} vraag/vragen zijn nog niet beantwoord. Toch indienen?`)) return;
    // Voorlopige score voor open vragen op basis van kernbegrippen; de student kan die daarna bijstellen.
    const provisional: Record<string, number> = {};
    for (const q of questions) {
      if (q.type === "mc") continue;
      const { hit } = keywordHits(answers[q.id] ?? "", q.keywords);
      const r = hit.length / q.keywords.length;
      provisional[q.id] = r >= 0.75 ? pts(q) : r >= 0.35 ? pts(q) / 2 : 0;
    }
    setOpenScores(provisional);
    const s = summarize(provisional);
    const date = new Date().toISOString();
    setStamp(date);
    update(courseId, (p) => ({ ...p, exams: [...p.exams, { date, score: s.total, max: MAX, weakChapters: s.weak }] }));
    setPhase("result");
    window.scrollTo(0, 0);
  };

  const adjust = (id: string, v: number) => {
    const next = { ...openScores, [id]: v };
    setOpenScores(next);
    const s = summarize(next);
    update(courseId, (p) => ({ ...p, exams: p.exams.map((e) => (e.date === stamp ? { ...e, score: s.total, weakChapters: s.weak } : e)) }));
  };

  const result = useMemo(() => (phase === "result" ? summarize(openScores) : null), [phase, openScores]); // eslint-disable-line react-hooks/exhaustive-deps
  const chapterOf = (id: string) => bundle.chapters.find((c) => c.id === id);

  if (phase === "intro") {
    return (
      <div className="pt-12">
        <div className="border border-ink p-6 sm:p-12">
          <p className="meta-mute">Examensimulatie</p>
          <FitText as="h2" className="mt-6">CONSTRUCTIE</FitText>
          <p className="mt-5 meta">2026–2027</p>

          <div className="mt-12 grid gap-12 md:grid-cols-2">
            <div>
              <SectionLabel right={<SourceTag kind="official" />}>Officieel examenformat</SectionLabel>
              <ul className="border-t border-ink">
                {bundle.course.official.evaluation.slice(0, 4).map((e) => (
                  <li key={e} className="flex gap-4 border-b border-line py-3 text-[14px]"><span className="text-mute">—</span>{e}</li>
                ))}
              </ul>
            </div>
            <div>
              <SectionLabel right={<SourceTag kind="ai" />}>Deze simulatie</SectionLabel>
              <ul className="border-t border-ink text-[14px]">
                <li className="flex justify-between border-b border-line py-3"><span>{PLAN.mc.count} gesloten vragen (meerkeuze)</span><span className="tabular-nums">{PLAN.mc.count * PLAN.mc.points} pt</span></li>
                <li className="flex justify-between border-b border-line py-3"><span>{PLAN.open.count} open vragen</span><span className="tabular-nums">{PLAN.open.count * PLAN.open.points} pt</span></li>
                <li className="flex justify-between border-b border-line py-3"><span>{PLAN.drawing.count} tekeningen bespreken</span><span className="tabular-nums">{PLAN.drawing.count * PLAN.drawing.points} pt</span></li>
                <li className="flex justify-between py-3 font-bold"><span>Totaal</span><span className="tabular-nums">{MAX} pt</span></li>
              </ul>
              <p className="mt-2 text-[12px] leading-relaxed text-mute">Deze puntenverdeling is enkel die van de simulatie; de officiële verdeling en examenduur zijn niet bekend.</p>
            </div>
          </div>

          <div className="mt-10 space-y-3 border-t border-line pt-6 text-[12.5px] leading-relaxed text-mute">
            <p>De vragen zijn oefenvragen, door AI opgesteld op basis van het lesmateriaal ({bundle.lectures.map((l) => l.id.replace("les", "Les ")).join(", ")}). Het zijn geen echte examenvragen.</p>
            <p>Het officiële examen omvat de bespreking van constructieve detailtekeningen. De tekenvragen hier gebruiken tekeningen en beelden uit de lesslides.</p>
            <p>Werk zoals op het examen: gesloten boek, zonder notities. Antwoorden worden pas na het indienen getoond.</p>
          </div>

          <button className="btn-solid mt-10" onClick={begin}>Oefenexamen starten</button>
        </div>

        {history.length > 0 && (
          <div className="mt-14">
            <SectionLabel>Eerdere simulaties</SectionLabel>
            <ul className="border-t border-ink">
              {[...history].reverse().slice(0, 8).map((e) => (
                <li key={e.date} className="flex justify-between border-b border-line py-3 text-[14px]">
                  <span className="text-mute">{new Date(e.date).toLocaleDateString("nl-BE", { day: "2-digit", month: "long", year: "numeric" })}</span>
                  <span className="font-bold tabular-nums">{fmt(e.score)} / {e.max}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 meta-mute">Gesimuleerde scores — geen officiële cijfers</p>
          </div>
        )}
      </div>
    );
  }

  if (phase === "sheet") {
    const answeredCount = questions.filter((q) => answers[q.id]?.trim()).length;
    return (
      <div className="pt-10">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ink bg-paper py-4">
          <span className="meta font-bold">Examensimulatie — Constructie</span>
          <span className="meta tabular-nums">{answeredCount} / {questions.length} beantwoord</span>
        </div>
        <ol>
          {questions.map((q, i) => (
            <li key={q.id} className="border-b border-line py-10">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-[13px] font-extrabold tabular-nums">Vraag {i + 1}</span>
                <span className="meta-mute">{pts(q)} pt · {q.type === "mc" ? "gesloten" : q.type === "open" ? "open" : "tekening"}</span>
              </div>
              <p className="mt-4 max-w-[70ch] text-[19px] font-semibold leading-snug tracking-[-0.01em] sm:text-[22px]">{q.prompt}</p>
              {q.type === "drawing" && (
                <figure className="mt-6 max-w-2xl">
                  <div className="border border-line bg-haze"><Img courseId={courseId} src={q.image} alt={q.imageCaption} tone="color" className="mx-auto max-h-[420px] w-auto object-contain" /></div>
                  <figcaption className="mt-2 text-[12px] text-mute">{q.imageCaption}</figcaption>
                </figure>
              )}
              {q.type === "mc" ? (
                <div className="mt-6 border-t border-line" role="radiogroup" aria-label={`Vraag ${i + 1}`}>
                  {q.options.map((o, j) => (
                    <label key={j} className="flex cursor-pointer items-baseline gap-4 border-b border-line px-2 py-3.5 text-[15.5px] hover:bg-haze">
                      <input type="radio" name={q.id} className="accent-[#080808]" checked={answers[q.id] === String(j)} onChange={() => setAnswers((a) => ({ ...a, [q.id]: String(j) }))} />
                      <span className="w-5 text-[11px] font-semibold">{String.fromCharCode(65 + j)}</span>
                      {o}
                    </label>
                  ))}
                </div>
              ) : (
                <textarea rows={q.type === "drawing" ? 6 : 5} value={answers[q.id] ?? ""} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} className="mt-6 w-full resize-y border border-line p-4 text-[15.5px] leading-relaxed outline-none focus:border-ink" placeholder="Jouw antwoord…" aria-label={`Antwoord op vraag ${i + 1}`} />
              )}
            </li>
          ))}
        </ol>
        <div className="mt-10 flex flex-wrap gap-3">
          <button className="btn-solid" onClick={submit}>Examen indienen</button>
          <button className="btn-quiet" onClick={() => confirm("Simulatie stoppen? Je antwoorden gaan verloren.") && setPhase("intro")}>Annuleren</button>
        </div>
      </div>
    );
  }

  // Resultaat
  const r = result!;
  return (
    <div className="pt-10">
      <div className="border border-ink p-6 sm:p-12">
        <p className="meta-mute">Resultaat</p>
        <p className="mt-4 text-[96px] font-extrabold leading-[0.85] tracking-[-0.06em] tabular-nums sm:text-[180px]">
          {fmt(r.total)}<span className="text-line">/{MAX}</span>
        </p>
        <p className="mt-6 inline-block border border-ink px-3 py-1.5 meta font-bold">Gesimuleerde score — geen officieel cijfer</p>
        <p className="mt-6 max-w-[64ch] text-[13px] leading-relaxed text-mute">
          Gesloten vragen worden automatisch verbeterd. Open vragen en tekeningen krijgen een voorlopige score op basis van de kernbegrippen in je antwoord; vergelijk met het modelantwoord en pas de score per vraag eerlijk aan.
        </p>

        <div className="mt-10">
          <SectionLabel>Te herhalen onderwerpen</SectionLabel>
          {r.weak.length ? (
            <ul className="border-t border-ink">
              {r.weak.map((id) => {
                const c = chapterOf(id);
                const v = r.byChapter.get(id)!;
                return (
                  <li key={id} className="flex items-baseline justify-between border-b border-line py-3">
                    <a href={`#/course/${courseId}/study/${id}`} className="text-[15px] font-bold uppercase link-u">{c && chapterCode(bundle, c)} {c?.title} →</a>
                    <span className="meta tabular-nums">{fmt(v.got)} / {v.max} pt</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="border-t border-ink pt-4 text-[14px]">Geen zwakke onderdelen in deze simulatie.</p>
          )}
        </div>
      </div>

      <ol className="mt-6">
        {questions.map((q, i) => {
          const got = scoreOf(q);
          const max = pts(q);
          return (
            <li key={q.id} className="border-b border-line py-10">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-[13px] font-extrabold tabular-nums">Vraag {i + 1}</span>
                <span className="meta tabular-nums">{fmt(got)} / {max} pt</span>
              </div>
              <p className="mt-3 max-w-[70ch] text-[18px] font-semibold leading-snug">{q.prompt}</p>
              {q.type === "mc" ? (
                <div className="mt-4 space-y-1 text-[14.5px]">
                  <p>
                    <span className="meta-mute mr-2">Jouw antwoord</span>
                    {answers[q.id] !== undefined ? <span className={got ? "" : "line-through"}>{q.options[Number(answers[q.id])]}</span> : <em className="text-mute">niet beantwoord</em>}
                  </p>
                  {!got && <p><span className="meta-mute mr-2">Juist antwoord</span><strong>{q.options[q.answer]}</strong></p>}
                </div>
              ) : (
                <div className="mt-4 grid gap-6 md:grid-cols-2">
                  <div>
                    <p className="meta-mute">Jouw antwoord</p>
                    <p className="mt-2 whitespace-pre-wrap text-[14.5px] leading-relaxed">{answers[q.id]?.trim() || <em className="text-mute">niet beantwoord</em>}</p>
                  </div>
                  <div>
                    <p className="meta-mute">Modelantwoord</p>
                    <p className="mt-2 text-[14.5px] leading-relaxed">{q.model}</p>
                    <ul className="mt-3 flex flex-wrap gap-1.5">
                      {q.keywords.map((k) => (
                        <li key={k} className={`pill ${keywordHits(answers[q.id] ?? "", [k]).hit.length ? "pill-active" : "text-mute"}`}>{k}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="md:col-span-2">
                    <span className="meta-mute mr-3">Score aanpassen</span>
                    {[0, max / 2, max].map((v) => (
                      <button key={v} onClick={() => adjust(q.id, v)} aria-pressed={got === v} className={`pill mr-1.5 ${got === v ? "pill-active" : "hover:border-ink"}`}>{fmt(v)} pt</button>
                    ))}
                  </div>
                </div>
              )}
              <p className="mt-4 max-w-[70ch] text-[13.5px] leading-relaxed text-[#444]">{q.explanation}</p>
              <p className="mt-2 meta-mute">
                Bron: {lectureLabel(bundle, q.chapterId)}{q.page ? ` · p. ${q.page}` : ""} · <a className="link-u text-ink" href={`#/course/${courseId}/study/${q.chapterId}`}>{chapterOf(q.chapterId)?.number} {chapterOf(q.chapterId)?.title}</a>
              </p>
            </li>
          );
        })}
      </ol>

      <div className="mt-10 flex flex-wrap gap-3">
        <button className="btn-solid" onClick={begin}>Nieuwe simulatie</button>
        <button className="btn-quiet" onClick={() => setPhase("intro")}>Terug</button>
      </div>
    </div>
  );
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ","));
