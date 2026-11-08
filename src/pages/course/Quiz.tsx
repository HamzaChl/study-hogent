import { useCallback, useEffect, useMemo, useState } from "react";
import { Empty, SectionLabel, SourceTag } from "../../components/ui";
import type { CourseBundle } from "../../lib/content";
import { useProgress } from "../../lib/progress";
import type { Quiz, QuizQuestion } from "../../lib/schema";
import { shuffle } from "../../lib/text";

/** Gemengde quiz: bij elke poging één willekeurige vraag uit elke quiz, in willekeurige volgorde. */
export const MIX_ID = "mix";
const MIX_TITLE = "Gemengde quiz — alle lessen";
function buildMix(quizzes: Quiz[], courseId: string): Quiz {
  const questions = shuffle(quizzes.filter((q) => q.questions.length).map((q) => shuffle(q.questions)[0]));
  return { id: MIX_ID, courseId, title: MIX_TITLE, description: "", questions };
}

const LETTERS = ["A", "B", "C", "D"];
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
const on20 = (n: number, d: number) => {
  const v = d ? (n / d) * 20 : 0;
  return Number.isInteger(v) ? String(v) : v.toFixed(1).replace(".", ",");
};
const dateNl = (iso: string) => new Date(iso).toLocaleString("nl-BE", { dateStyle: "medium", timeStyle: "short" });

/** Overzicht: #/course/<id>/quiz */
export function QuizOverview({ bundle }: { bundle: CourseBundle }) {
  const { get } = useProgress();
  const results = get(bundle.course.id).quizzes;
  if (!bundle.quizzes.length) return <div className="pt-10"><Empty>Nog geen quizzen voor deze cursus.</Empty></div>;

  const mixHist = results[MIX_ID] ?? [];
  const mixLast = mixHist.at(-1);
  const titleOf = (id: string) => (id === MIX_ID ? MIX_TITLE : bundle.quizzes.find((q) => q.id === id)?.title ?? id);

  return (
    <div className="pt-10">
      {bundle.quizzes.length > 1 && (
        <article className="mb-8 flex flex-col gap-6 border border-ink p-7 sm:flex-row sm:items-end sm:justify-between sm:p-9">
          <div>
            <span className="pill">{bundle.quizzes.length} vragen · willekeurig</span>
            <h2 className="mt-6 text-[26px] font-bold leading-tight tracking-[-0.02em] sm:text-[32px]">{MIX_TITLE}</h2>
            <p className="mt-3 max-w-[60ch] text-[13.5px] leading-relaxed text-mute">
              Bij elke poging één willekeurige vraag uit elk van de {bundle.quizzes.length} quizzen, in een willekeurige volgorde. Elke keer een andere reeks.
            </p>
            <p className="mt-4 text-[11px]"><span className="font-bold">Laatste</span> {mixLast ? `${mixLast.correct} / ${mixLast.total}` : "—"}</p>
          </div>
          <a href={`#/course/${bundle.course.id}/quiz/${MIX_ID}`} className="btn-solid self-start sm:self-auto">
            {mixHist.length ? "Nieuwe reeks →" : "Gemengde quiz starten →"}
          </a>
        </article>
      )}

      <div className="grid border-l border-t border-line md:grid-cols-2">
        {bundle.quizzes.map((q, i) => {
          const hist = results[q.id] ?? [];
          const last = hist.at(-1);
          const best = hist.length ? Math.max(...hist.map((r) => r.correct)) : null;
          return (
            <article key={q.id} className="flex flex-col border-b border-r border-line p-7 sm:p-9">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium">{String(i + 1).padStart(2, "0")} / {String(bundle.quizzes.length).padStart(2, "0")}</span>
                <span className="pill">{q.questions.length} vragen</span>
              </div>
              <h2 className="mt-8 text-[26px] font-bold leading-tight tracking-[-0.02em] sm:text-[32px]">{q.title}</h2>
              <p className="mt-3 text-[13.5px] leading-relaxed text-mute">{q.description}</p>
              <dl className="mt-8 flex flex-wrap gap-x-6 gap-y-1 text-[11px]">
                <div className="flex gap-1.5"><dt className="font-bold">Niveau</dt><dd>gemiddeld</dd></div>
                <div className="flex gap-1.5"><dt className="font-bold">Laatste</dt><dd>{last ? `${last.correct} / ${last.total}` : "—"}</dd></div>
                <div className="flex gap-1.5"><dt className="font-bold">Beste</dt><dd>{best !== null ? `${best} / ${q.questions.length}` : "—"}</dd></div>
              </dl>
              <a href={`#/course/${bundle.course.id}/quiz/${q.id}`} className="btn-solid mt-8 self-start">
                {hist.length ? "Opnieuw maken →" : "Quiz starten →"}
              </a>
            </article>
          );
        })}
      </div>

      {Object.values(results).some((h) => h.length) && (
        <section className="mt-14">
          <SectionLabel right={<span className="meta-mute">Oefenscores — geen officiële cijfers</span>}>Eerdere resultaten</SectionLabel>
          <ul className="border-t border-ink">
            {Object.entries(results).flatMap(([id, h]) => h.map((r) => ({ id, r }))).sort((a, b) => b.r.date.localeCompare(a.r.date)).slice(0, 10).map(({ id, r }) => (
              <li key={id + r.date} className="grid grid-cols-[1fr_auto] gap-4 border-b border-line py-3 text-[14px] sm:grid-cols-[1fr_auto_auto]">
                <span>{titleOf(id)}</span>
                <span className="hidden text-mute sm:inline">{dateNl(r.date)}</span>
                <span className="font-bold tabular-nums">{r.correct} / {r.total}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** Eén quiz afnemen: #/course/<id>/quiz/<quizId> */
export function QuizRun({ bundle, quizId }: { bundle: CourseBundle; quizId: string }) {
  const [runKey, setRunKey] = useState(0);
  // De gemengde quiz krijgt bij elke nieuwe poging (runKey) een nieuwe reeks.
  const quiz = useMemo(
    () => (quizId === MIX_ID ? buildMix(bundle.quizzes, bundle.course.id) : bundle.quizzes.find((q) => q.id === quizId)),
    [quizId, bundle, runKey],
  );
  if (!quiz) return <div className="pt-10"><Empty>Deze quiz bestaat niet.</Empty></div>;
  return <Run key={runKey} bundle={bundle} quiz={quiz} onRetry={() => { setRunKey((k) => k + 1); window.scrollTo(0, 0); }} />;
}

function Run({ bundle, quiz, onRetry }: { bundle: CourseBundle; quiz: Quiz; onRetry: () => void }) {
  const { update } = useProgress();
  const courseId = bundle.course.id;
  const n = quiz.questions.length;
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => quiz.questions.map(() => null));
  const [finished, setFinished] = useState(false);

  const q = quiz.questions[idx];
  const chosen = answers[idx];
  const locked = chosen !== null;

  const choose = useCallback(
    (i: number) => {
      if (locked || finished) return; // eenmaal gekozen = gevalideerd; niet meer te wijzigen
      setAnswers((a) => a.map((x, j) => (j === idx ? i : x)));
    },
    [idx, locked, finished],
  );

  const next = useCallback(() => {
    if (!locked) return;
    if (idx + 1 < n) {
      setIdx(idx + 1);
      window.scrollTo(0, 0);
      return;
    }
    const final = answers as number[];
    const correct = quiz.questions.filter((qq, i) => final[i] === qq.answer).length;
    update(courseId, (p) => ({
      ...p,
      quizzes: { ...p.quizzes, [quiz.id]: [...(p.quizzes[quiz.id] ?? []), { date: new Date().toISOString(), correct, total: n, answers: final }] },
    }));
    setFinished(true);
    window.scrollTo(0, 0);
  }, [locked, idx, n, answers, quiz, courseId, update]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (finished || e.metaKey || e.ctrlKey || /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement).tagName)) return;
      const k = e.key.toUpperCase();
      const i = ["1", "2", "3", "4"].indexOf(k) >= 0 ? Number(k) - 1 : LETTERS.indexOf(k);
      if (i >= 0 && i < q.options.length) choose(i);
      else if (e.key === "Enter" && locked) {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finished, q, choose, next, locked]);

  if (finished) return <Results bundle={bundle} quiz={quiz} answers={answers as number[]} onRetry={onRetry} />;

  const isRight = chosen === q.answer;
  const progress = ((idx + 1) / n) * 100;

  return (
    <div className="quiz mx-auto max-w-[880px] pt-8 sm:pt-12">
      <div className="flex items-center justify-between gap-4">
        <a href={`#/course/${courseId}/quiz`} className="text-[13px] font-semibold text-[#3a3a3a] hover:text-ink">
          ← Terug naar quiz
        </a>
        <span className="rounded-full border border-[#d9d9d9] bg-white px-3.5 py-1.5 text-[12px] font-semibold tabular-nums text-[#333]" aria-live="polite">
          Vraag {idx + 1} van {n}
        </span>
      </div>

      <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-[#ececec]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} aria-label="Voortgang van de quiz">
        <div className="h-full rounded-full bg-ok transition-[width] duration-500 ease-out" style={{ width: `${progress}%` }} />
      </div>

      <section className="mt-8 rounded-2xl border border-ok-line bg-[#fafafa] p-4 sm:p-10">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-md bg-[#e6e6e6] px-2.5 py-1 text-[12px] font-medium text-[#333]">Meerkeuze</span>
          <span className="rounded-md border border-[#e3e3e3] bg-white px-2.5 py-1 text-[12px] font-medium text-[#333]">{q.difficulty[0].toUpperCase() + q.difficulty.slice(1)}</span>
          <span className="rounded-md border border-[#e3e3e3] bg-white px-2.5 py-1 text-[12px] font-medium text-ok-ink">Interieurvormgeving / {q.course}</span>
        </div>

        <h1 className="mt-5 text-[20px] font-semibold leading-[1.35] tracking-[-0.01em] text-[#151515] sm:text-[26px]">{q.question}</h1>
        <div className="mt-6 h-px bg-[#e6e6e6]" />

        <ul className="mt-6 space-y-3" role="radiogroup" aria-label="Antwoordmogelijkheden">
          {q.options.map((opt, i) => {
            const isChosen = chosen === i;
            const isAnswer = i === q.answer;
            let cls = "border-[#e2e2e2] bg-white hover:border-ok/60 hover:bg-[#fbfefc]";
            let dot = "border-[#cfcfcf] text-[#444]";
            if (locked) {
              if (isAnswer) {
                cls = "border-ok-line bg-ok-soft text-ok-ink";
                dot = "border-ok bg-ok text-white";
              } else if (isChosen) {
                cls = "border-bad-line bg-bad-soft text-bad-ink";
                dot = "border-bad bg-bad text-white";
              } else {
                cls = "border-[#ececec] bg-white text-[#8a8a8a]";
                dot = "border-[#e0e0e0] text-[#aaa]";
              }
            }
            return (
              <li key={i}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={isChosen}
                  disabled={locked}
                  onClick={() => choose(i)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-4 sm:gap-4 text-left text-[15.5px] leading-snug transition-colors duration-150 sm:px-5 sm:py-5 sm:text-[17px] ${cls} ${locked ? "cursor-default" : "cursor-pointer"}`}
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[13px] font-semibold ${dot}`}>{LETTERS[i]}</span>
                  <span className="flex-1">{opt}</span>
                  {locked && isAnswer && <Check />}
                  {locked && isChosen && !isAnswer && <Cross />}
                </button>
              </li>
            );
          })}
        </ul>

        {locked && (
          <div className="page-fade mt-6" role="status">
            <p className={`flex items-center gap-2 text-[15px] font-semibold ${isRight ? "text-ok-ink" : "text-bad-ink"}`}>
              {isRight ? <Check /> : <Cross />}
              {isRight ? "Juist antwoord!" : "Fout antwoord"}
            </p>
            <p className="mt-3 text-[14.5px] italic leading-relaxed text-[#555] sm:text-[15px]">Uitleg: {q.explanation}</p>
            <Source q={q} />
          </div>
        )}
      </section>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={next}
          disabled={!locked}
          className="inline-flex h-12 items-center justify-center rounded-xl bg-[#151515] px-6 text-[13px] font-semibold uppercase tracking-[0.06em] text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-25 max-sm:w-full"
        >
          {idx + 1 < n ? "Volgende vraag →" : "Resultaten bekijken →"}
        </button>
      </div>
      {!locked && <p className="mt-3 text-right text-[12px] text-mute">Kies een antwoord om verder te gaan.</p>}
    </div>
  );
}

function Results({ bundle, quiz, answers, onRetry }: { bundle: CourseBundle; quiz: Quiz; answers: number[]; onRetry: () => void }) {
  const n = quiz.questions.length;
  const good = quiz.questions.filter((q, i) => answers[i] === q.answer).length;
  const stats = [
    { label: "Juiste antwoorden", value: `${good} / ${n}` },
    { label: "Foute antwoorden", value: String(n - good) },
    { label: "Slaagpercentage", value: `${pct(good, n)}%` },
    { label: "Oefenscore", value: `${on20(good, n)} / 20` },
  ];

  return (
    <div className="quiz mx-auto max-w-[880px] pt-8 sm:pt-12">
      <a href={`#/course/${bundle.course.id}/quiz`} className="text-[13px] font-semibold text-[#3a3a3a] hover:text-ink">← Terug naar quiz</a>

      <section className="mt-8 rounded-2xl border border-ok-line bg-[#fafafa] p-6 sm:p-10">
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-mute">{quiz.title}</p>
        <h1 className="mt-3 text-[44px] font-extrabold uppercase leading-none tracking-[-0.04em] sm:text-[72px]">Resultaten</h1>
        <p className="mt-5 text-[17px] text-[#333] sm:text-[19px]">
          Je hebt <strong>{good} van de {n}</strong> vragen correct beantwoord.
        </p>

        <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-[#ececec]" aria-hidden>
          <div className="h-full rounded-full bg-ok" style={{ width: `${pct(good, n)}%` }} />
        </div>

        <dl className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-[#e6e6e6] bg-white p-4 sm:p-5">
              <dt className="text-[12px] font-medium text-mute">{s.label}</dt>
              <dd className="mt-1 text-[26px] font-bold tabular-nums tracking-[-0.02em] sm:text-[30px]">{s.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-[12.5px] text-mute">De score op 20 is enkel een oefenscore, geen officieel examencijfer.</p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button onClick={onRetry} className="inline-flex h-12 items-center justify-center rounded-xl bg-[#151515] px-6 text-[13px] font-semibold uppercase tracking-[0.06em] text-white hover:opacity-85">
            Opnieuw proberen
          </button>
          <a href={`#/course/${bundle.course.id}`} className="inline-flex h-12 items-center justify-center rounded-xl border border-[#d9d9d9] bg-white px-6 text-[13px] font-semibold uppercase tracking-[0.06em] text-[#222] hover:border-[#999]">
            Terug naar cursus
          </a>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-[13px] font-bold uppercase tracking-[0.08em]">Overzicht van je antwoorden</h2>
        <ol className="mt-4 space-y-4">
          {quiz.questions.map((q, i) => {
            const ok = answers[i] === q.answer;
            return (
              <li key={q.id} className={`rounded-2xl border bg-white p-5 sm:p-7 ${ok ? "border-ok-line" : "border-bad-line"}`}>
                <div className="flex items-start justify-between gap-4">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-mute">Vraag {i + 1}</p>
                  <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ${ok ? "bg-ok-soft text-ok-ink" : "bg-bad-soft text-bad-ink"}`}>
                    {ok ? <Check /> : <Cross />} {ok ? "Juist" : "Fout"}
                  </span>
                </div>
                <p className="mt-2 text-[17px] font-semibold leading-snug text-[#151515]">{q.question}</p>
                <dl className="mt-4 space-y-2 text-[14.5px]">
                  <div className={`rounded-lg px-3 py-2 ${ok ? "bg-ok-soft text-ok-ink" : "bg-bad-soft text-bad-ink"}`}>
                    <dt className="inline font-semibold">Jouw antwoord: </dt>
                    <dd className="inline">{LETTERS[answers[i]]}. {q.options[answers[i]]}</dd>
                  </div>
                  {!ok && (
                    <div className="rounded-lg bg-ok-soft px-3 py-2 text-ok-ink">
                      <dt className="inline font-semibold">Juist antwoord: </dt>
                      <dd className="inline">{LETTERS[q.answer]}. {q.options[q.answer]}</dd>
                    </div>
                  )}
                </dl>
                <p className="mt-3 text-[14px] italic leading-relaxed text-[#555]">Uitleg: {q.explanation}</p>
                <Source q={q} />
              </li>
            );
          })}
        </ol>
      </section>

      <div className="mt-8 flex justify-start">
        <SourceTag kind="ai">vragenreeks aangeleverd, vertaald naar het Nederlands</SourceTag>
      </div>
    </div>
  );
}

function Source({ q }: { q: QuizQuestion }) {
  if (!q.source) return null;
  const p = q.source.pages;
  return (
    <p className="mt-2 text-[12px] text-mute">
      Bron: {q.source.lecture.replace("les", "Les ")} · p. {p.length > 1 ? `${p[0]}–${p[p.length - 1]}` : p[0]}
      {q.source.note ? ` — ${q.source.note}` : ""}
    </p>
  );
}

const Check = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="juist" className="shrink-0 text-ok">
    <circle cx="12" cy="12" r="9.5" />
    <path d="m8 12.5 2.6 2.6L16.5 9.5" />
  </svg>
);
const Cross = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-label="fout" className="shrink-0 text-bad">
    <circle cx="12" cy="12" r="9.5" />
    <path d="m9 9 6 6M15 9l-6 6" />
  </svg>
);
