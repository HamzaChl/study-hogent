import { useMemo, useState } from "react";
import { Empty, Img, SourceTag } from "../../components/ui";
import type { CourseBundle } from "../../lib/content";
import { useProgress } from "../../lib/progress";
import type { Practice as Q } from "../../lib/schema";
import { keywordHits, norm, shuffle } from "../../lib/text";

const TYPE_LABEL: Record<Q["type"], string> = {
  mc: "Meerkeuze",
  tf: "Juist / onjuist",
  definition: "Definitie",
  match: "Koppelen",
  open: "Kort antwoord",
};

export default function Practice({ bundle, params }: { bundle: CourseBundle; params: URLSearchParams }) {
  const { get, update } = useProgress();
  const courseId = bundle.course.id;
  const record = get(courseId).practice;
  const startQ = params.get("q");

  const [chapter, setChapter] = useState(params.get("chapter") ?? "all");
  const [mode, setMode] = useState<"all" | "retry">("all");
  const [session, setSession] = useState<Q[]>(() => initial());
  const [idx, setIdx] = useState(0);
  const [result, setResult] = useState<boolean | null>(null);
  const [sessionResults, setSessionResults] = useState<Record<string, boolean>>({});

  function initial(): Q[] {
    const qs = bundle.practice.filter((q) => (params.get("chapter") ? q.chapterId === params.get("chapter") : true));
    if (startQ) {
      const q = qs.find((x) => x.id === startQ);
      if (q) return [q, ...qs.filter((x) => x !== q)];
    }
    return qs;
  }

  const wrongIds = useMemo(() => Object.entries(record).filter(([, r]) => !r.correct).map(([id]) => id), [record]);

  const start = (ch: string, m: "all" | "retry", sh = false) => {
    let qs = bundle.practice.filter((q) => ch === "all" || q.chapterId === ch);
    if (m === "retry") qs = qs.filter((q) => wrongIds.includes(q.id));
    setSession(sh ? shuffle(qs) : qs);
    setIdx(0);
    setResult(null);
    setSessionResults({});
  };

  const answer = (q: Q, correct: boolean) => {
    setResult(correct);
    setSessionResults((r) => ({ ...r, [q.id]: correct }));
    update(courseId, (p) => {
      const prev = p.practice[q.id];
      return { ...p, practice: { ...p.practice, [q.id]: { attempts: (prev?.attempts ?? 0) + 1, correct, everCorrect: !!prev?.everCorrect || correct } } };
    });
  };
  const next = () => {
    setResult(null);
    setIdx((i) => i + 1);
  };

  const answered = bundle.practice.filter((q) => record[q.id]);
  const accuracy = answered.length ? answered.filter((q) => record[q.id].correct).length / answered.length : null;
  const q = session[idx];
  const done = session.length > 0 && idx >= session.length;
  const chapterOf = (id: string) => bundle.chapters.find((c) => c.id === id);
  const chaptersWithQ = bundle.chapters.filter((c) => bundle.practice.some((x) => x.chapterId === c.id));

  return (
    <div className="pt-10">
      <dl className="grid grid-cols-3 border-y border-ink">
        {[
          ["Beantwoord", `${answered.length} / ${bundle.practice.length}`],
          ["Nauwkeurigheid", accuracy === null ? "—" : `${Math.round(accuracy * 100)}%`],
          ["Opnieuw te proberen", String(wrongIds.length)],
        ].map(([k, v]) => (
          <div key={k} className="border-line py-4 pr-3 [&:not(:last-child)]:border-r [&:not(:first-child)]:pl-4">
            <dt className="meta-mute text-[10px]">{k}</dt>
            <dd className="mt-1 text-[24px] font-extrabold tabular-nums tracking-[-0.03em] sm:text-[32px]">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col gap-4 border-b border-line py-6 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Hoofdstuk">
          <button className={`pill ${chapter === "all" && mode === "all" ? "pill-active" : "hover:border-ink"}`} onClick={() => { setChapter("all"); setMode("all"); start("all", "all"); }}>Alle</button>
          {chaptersWithQ.map((c) => (
            <button key={c.id} className={`pill ${chapter === c.id && mode === "all" ? "pill-active" : "hover:border-ink"}`} onClick={() => { setChapter(c.id); setMode("all"); start(c.id, "all"); }}>
              {c.number} {c.title}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button className="pill hover:border-ink" onClick={() => start(chapter, mode, true)}>Schudden</button>
          <button className={`pill ${mode === "retry" ? "pill-active" : "hover:border-ink"}`} disabled={!wrongIds.length} onClick={() => { setMode("retry"); start(chapter, "retry"); }}>
            Foute opnieuw proberen ({wrongIds.length})
          </button>
        </div>
      </div>

      {session.length === 0 ? (
        <div className="mt-8"><Empty>{mode === "retry" ? "Geen foute antwoorden om opnieuw te proberen. Goed bezig." : "Geen oefeningen in deze selectie."}</Empty></div>
      ) : done ? (
        <SessionEnd results={sessionResults} session={session} onRetry={() => { setMode("retry"); start(chapter, "retry"); }} onRestart={() => start(chapter, mode)} />
      ) : (
        q && (
          <article className="mt-8 border border-ink p-6 sm:p-10" key={`${q.id}-${idx}`}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
              <span className="meta tabular-nums">
                Vraag {String(idx + 1).padStart(2, "0")} / {String(session.length).padStart(2, "0")} · {TYPE_LABEL[q.type]}
              </span>
              <SourceTag kind="ai">{chapterOf(q.chapterId)?.title}</SourceTag>
            </div>
            <div className="pt-8">
              <QuestionView q={q} courseId={courseId} locked={result !== null} onAnswer={(c) => answer(q, c)} />
            </div>

            {result !== null && (
              <div className="page-fade mt-10 border-t border-ink pt-6">
                <p className="text-[13px] font-extrabold uppercase tracking-[0.1em]">{result ? "● Juist antwoord" : "○ Fout antwoord"}</p>
                <p className="mt-3 max-w-[68ch] text-[15px] leading-relaxed">{q.explanation}</p>
                <p className="mt-4 meta-mute">
                  Bron: Les 02{q.page ? ` · p. ${q.page}` : ""} ·{" "}
                  <a className="link-u text-ink" href={`#/course/${courseId}/study/${q.chapterId}`}>
                    Les {chapterOf(q.chapterId)?.number} {chapterOf(q.chapterId)?.title}
                  </a>
                </p>
                <button className="btn-solid mt-8" onClick={next} autoFocus>
                  {idx + 1 < session.length ? "Volgende vraag →" : "Resultaten bekijken"}
                </button>
              </div>
            )}
          </article>
        )
      )}
    </div>
  );
}

function SessionEnd({ results, session, onRetry, onRestart }: { results: Record<string, boolean>; session: Q[]; onRetry: () => void; onRestart: () => void }) {
  const good = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  const wrong = session.filter((q) => results[q.id] === false);
  return (
    <div className="mt-8 border border-ink px-6 py-12 sm:px-12">
      <p className="meta-mute">Reeks voltooid</p>
      <p className="mt-4 text-[64px] font-extrabold leading-none tracking-[-0.05em] tabular-nums sm:text-[96px]">
        {good}<span className="text-line">/{total}</span>
      </p>
      <p className="mt-2 meta">Juist</p>
      {wrong.length > 0 && (
        <ul className="mt-8 border-t border-line">
          {wrong.map((q) => (
            <li key={q.id} className="border-b border-line py-3 text-[14px]">
              {q.type === "tf" ? q.statement : q.type === "definition" ? q.definition : q.prompt}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-8 flex flex-wrap gap-3">
        {wrong.length > 0 && <button className="btn-solid" onClick={onRetry}>Foute opnieuw proberen</button>}
        <button className="btn-line" onClick={onRestart}>Opnieuw beginnen</button>
      </div>
    </div>
  );
}

/* ───────── Vraagtypes ───────── */

function QuestionView({ q, courseId, locked, onAnswer }: { q: Q; courseId: string; locked: boolean; onAnswer: (c: boolean) => void }) {
  switch (q.type) {
    case "mc":
      return <Choice prompt={q.prompt} image={q.image} courseId={courseId} options={q.options} answer={q.answer} locked={locked} onAnswer={onAnswer} />;
    case "tf":
      return <Choice prompt={q.statement} courseId={courseId} options={["Juist", "Onjuist"]} answer={q.answer ? 0 : 1} locked={locked} onAnswer={onAnswer} />;
    case "definition":
      return <Definition q={q} locked={locked} onAnswer={onAnswer} />;
    case "match":
      return <Match q={q} locked={locked} onAnswer={onAnswer} />;
    case "open":
      return <Open q={q} locked={locked} onAnswer={onAnswer} />;
  }
}

const Prompt = ({ children }: { children: React.ReactNode }) => <h3 className="text-[22px] font-bold leading-[1.2] tracking-[-0.02em] sm:text-[30px]">{children}</h3>;

function Choice({ prompt, image, courseId, options, answer, locked, onAnswer }: { prompt: string; image?: string; courseId: string; options: string[]; answer: number; locked: boolean; onAnswer: (c: boolean) => void }) {
  const [chosen, setChosen] = useState<number | null>(null);
  return (
    <div>
      <Prompt>{prompt}</Prompt>
      {image && (
        <div className="mt-6 max-w-md border border-line bg-haze">
          <Img courseId={courseId} src={image} alt="Afbeelding bij de vraag" tone="color" className="mx-auto max-h-80 w-auto object-contain" />
        </div>
      )}
      <ol className="mt-8 border-t border-line">
        {options.map((o, i) => {
          const isAnswer = i === answer;
          const isChosen = i === chosen;
          let state = "hover:bg-haze";
          if (locked) state = isAnswer ? "bg-ink text-paper" : isChosen ? "line-through decoration-1 text-mute" : "text-mute";
          return (
            <li key={i} className="border-b border-line">
              <button
                disabled={locked}
                onClick={() => {
                  setChosen(i);
                  onAnswer(i === answer);
                }}
                className={`grid w-full grid-cols-[36px_1fr_auto] items-baseline gap-3 px-3 py-4 text-left text-[15.5px] transition-colors ${state}`}
              >
                <span className="text-[11px] font-semibold">{String.fromCharCode(65 + i)}</span>
                <span>{o}</span>
                {locked && (isAnswer ? <span className="meta">Juist</span> : isChosen ? <span className="meta">Jouw antwoord</span> : <span />)}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Definition({ q, locked, onAnswer }: { q: Extract<Q, { type: "definition" }>; locked: boolean; onAnswer: (c: boolean) => void }) {
  const [v, setV] = useState("");
  const check = (giveUp = false) => onAnswer(!giveUp && q.accepted.some((a) => norm(a) === norm(v)));
  return (
    <div>
      <p className="meta-mute">Welk begrip hoort bij deze omschrijving?</p>
      <Prompt>“{q.definition}”</Prompt>
      <form className="mt-8" onSubmit={(e) => { e.preventDefault(); if (v.trim()) check(); }}>
        <input value={v} onChange={(e) => setV(e.target.value)} disabled={locked} placeholder="Typ het begrip…" className="w-full border-0 border-b border-ink bg-transparent pb-2 text-[22px] font-semibold outline-none placeholder:text-line" aria-label="Jouw antwoord" />
        {!locked && (
          <div className="mt-6 flex flex-wrap gap-3">
            <button className="btn-solid" disabled={!v.trim()}>Controleren</button>
            <button type="button" className="btn-quiet" onClick={() => check(true)}>Ik weet het niet</button>
          </div>
        )}
      </form>
      {locked && <p className="mt-4 text-[15px]">Juist antwoord: <strong>{q.accepted[0]}</strong></p>}
    </div>
  );
}

function Match({ q, locked, onAnswer }: { q: Extract<Q, { type: "match" }>; locked: boolean; onAnswer: (c: boolean) => void }) {
  const rights = useMemo(() => shuffle(q.pairs.map((p) => p[1])), [q]);
  const [sel, setSel] = useState<string[]>(() => q.pairs.map(() => ""));
  const complete = sel.every(Boolean);
  return (
    <div>
      <Prompt>{q.prompt}</Prompt>
      <ul className="mt-8 border-t border-line">
        {q.pairs.map(([left, right], i) => {
          const ok = sel[i] === right;
          return (
            <li key={left} className="grid gap-2 border-b border-line py-4 sm:grid-cols-[1fr_1fr_auto] sm:items-center sm:gap-6">
              <span className="text-[15.5px] font-semibold">{left}</span>
              <select
                value={sel[i]}
                disabled={locked}
                onChange={(e) => setSel((s) => s.map((x, j) => (j === i ? e.target.value : x)))}
                className="h-11 w-full rounded-none border border-line bg-paper px-3 text-[14.5px] outline-none focus:border-ink"
                aria-label={`Koppeling voor ${left}`}
              >
                <option value="">Kies…</option>
                {rights.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              {locked && <span className="meta text-[10px]">{ok ? "● Juist" : `○ ${right}`}</span>}
            </li>
          );
        })}
      </ul>
      {!locked && (
        <button className="btn-solid mt-6" disabled={!complete} onClick={() => onAnswer(q.pairs.every(([, r], i) => sel[i] === r))}>
          Controleren
        </button>
      )}
    </div>
  );
}

function Open({ q, locked, onAnswer }: { q: Extract<Q, { type: "open" }>; locked: boolean; onAnswer: (c: boolean) => void }) {
  const [v, setV] = useState("");
  const [revealed, setRevealed] = useState(false);
  const hits = keywordHits(v, q.keywords);
  return (
    <div>
      <Prompt>{q.prompt}</Prompt>
      <textarea value={v} onChange={(e) => setV(e.target.value)} disabled={revealed} rows={5} placeholder="Schrijf je antwoord in je eigen woorden…" className="mt-8 w-full resize-y border border-line bg-paper p-4 text-[15.5px] leading-relaxed outline-none focus:border-ink" aria-label="Jouw antwoord" />
      {!revealed ? (
        <button className="btn-solid mt-4" disabled={!v.trim()} onClick={() => setRevealed(true)}>Toon modelantwoord</button>
      ) : (
        <div className="page-fade mt-6">
          <p className="meta font-bold">Modelantwoord</p>
          <p className="mt-2 max-w-[68ch] text-[15.5px] leading-relaxed">{q.model}</p>
          <p className="mt-4 meta-mute">Kernbegrippen in jouw antwoord</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {q.keywords.map((k) => (
              <li key={k} className={`pill ${hits.hit.includes(k) ? "pill-active" : "text-mute"}`}>{k}</li>
            ))}
          </ul>
          {!locked && (
            <>
              <p className="mt-6 text-[13px] text-mute">Vergelijk zelf: was je antwoord volledig en correct?</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <button className="btn-solid" onClick={() => onAnswer(true)}>Juist</button>
                <button className="btn-line" onClick={() => onAnswer(false)}>Niet (helemaal) juist</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
