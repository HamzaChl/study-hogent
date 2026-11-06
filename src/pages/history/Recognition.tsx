import { useMemo, useState } from "react";
import { Img } from "../../components/ui";
import type { CourseBundle } from "../../lib/content";
import { useProgress } from "../../lib/progress";
import { availableKinds, KIND_LABEL, KIND_QUESTION, makeSession, type RecognitionKind } from "../../lib/recognition";

const LETTERS = ["A", "B", "C", "D"];
const REVEAL = ["Naam van het gebouw", "Architect", "Eeuw of periode", "Locatie", "Stijlperiode", "Belangrijkste stijlkenmerken"];

export default function Recognition({ bundle }: { bundle: CourseBundle }) {
  const { buildings, course } = bundle;
  const kinds = useMemo(() => availableKinds(buildings), [buildings]);
  if (kinds.length === 0) return <RecognitionPreview count={buildings.length} />;
  return <Session key={course.id} bundle={bundle} kinds={kinds} />;
}

function RecognitionPreview({ count }: { count: number }) {
  return (
    <div className="pt-10">
      <p className="max-w-[64ch] text-[14px] leading-relaxed text-[#444]">
        Op het examen moet je sleutelwerken herkennen op foto: naam van het gebouw, ontwerper, eeuw, plaats en stijlperiode. Deze modus traint precies dat, met
        de gebouwen uit de lessen. Zodra er lesmateriaal met gebouwen is toegevoegd (minstens vier), verschijnen hier automatisch de oefeningen.
      </p>
      <div className="mt-8 grid gap-0 border border-dashed border-line lg:grid-cols-[1.3fr_1fr]">
        <div className="flex aspect-[4/3] items-center justify-center bg-haze">
          <span className="meta-mute">Nog geen beeldmateriaal</span>
        </div>
        <div className="p-6 sm:p-8">
          <p className="meta-mute">Voorbeeldweergave</p>
          <p className="mt-3 text-[22px] font-bold leading-tight tracking-[-0.02em]">{KIND_QUESTION.gebouw}</p>
          <ol className="mt-6 border-t border-line">
            {LETTERS.map((l) => (
              <li key={l} className="flex items-center gap-4 border-b border-line py-3 text-[14px] text-line">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-line text-[12px] font-semibold">{l}</span>
                ———
              </li>
            ))}
          </ol>
          <p className="mt-6 meta-mute">Na je antwoord zie je</p>
          <p className="mt-2 text-[13px] text-mute">{REVEAL.join(" · ")}</p>
        </div>
      </div>
      <div className="mt-8">
        <p className="meta font-bold">Soorten vragen</p>
        <ul className="mt-3 border-t border-line">
          {(Object.keys(KIND_QUESTION) as RecognitionKind[]).map((k) => (
            <li key={k} className="grid grid-cols-[140px_1fr] gap-4 border-b border-line py-2.5 text-[14px]">
              <span className="meta-mute pt-0.5">{KIND_LABEL[k]}</span>
              {KIND_QUESTION[k]}
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-6 meta-mute">Lesmateriaal nog niet beschikbaar · {count} gebouwen in het lesmateriaal · er worden geen vragen verzonnen</p>
    </div>
  );
}

function Session({ bundle, kinds }: { bundle: CourseBundle; kinds: RecognitionKind[] }) {
  const { update } = useProgress();
  const courseId = bundle.course.id;
  const [kind, setKind] = useState<RecognitionKind | "mix">("mix");
  const [round, setRound] = useState(0);
  const questions = useMemo(() => makeSession(bundle.buildings, kind), [bundle.buildings, kind, round]); // eslint-disable-line react-hooks/exhaustive-deps
  const [idx, setIdx] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [score, setScore] = useState(0);

  const restart = (k: RecognitionKind | "mix" = kind) => {
    setKind(k);
    setRound((r) => r + 1);
    setIdx(0);
    setChosen(null);
    setScore(0);
  };

  const q = questions[idx];
  const done = idx >= questions.length;

  const choose = (i: number) => {
    if (chosen !== null || !q) return;
    setChosen(i);
    const ok = i === q.answer;
    if (ok) setScore((s) => s + 1);
    update(courseId, (p) => {
      const r = p.recognition[q.building.id] ?? { seen: 0, correct: 0 };
      return { ...p, recognition: { ...p.recognition, [q.building.id]: { seen: r.seen + 1, correct: r.correct + (ok ? 1 : 0) } } };
    });
  };

  return (
    <div className="pt-10">
      <div className="flex flex-wrap gap-1.5 border-b border-line pb-6" role="group" aria-label="Soort vraag">
        <button className={`pill ${kind === "mix" ? "pill-active" : "hover:border-ink"}`} onClick={() => restart("mix")}>Alles gemengd</button>
        {kinds.map((k) => (
          <button key={k} className={`pill ${kind === k ? "pill-active" : "hover:border-ink"}`} onClick={() => restart(k)}>{KIND_LABEL[k]}</button>
        ))}
      </div>

      {done ? (
        <div className="mt-8 border border-ink px-6 py-12 text-center">
          <p className="meta-mute">Reeks voltooid</p>
          <p className="mt-4 text-[64px] font-extrabold leading-none tracking-[-0.05em] tabular-nums">{score}<span className="text-line">/{questions.length}</span></p>
          <button className="btn-solid mt-8" onClick={() => restart()}>Nieuwe reeks</button>
        </div>
      ) : (
        q && (
          <article className="mt-8">
            <div className="flex items-center justify-between">
              <span className="meta tabular-nums">Vraag {idx + 1} van {questions.length}</span>
              <span className="meta-mute">{KIND_LABEL[q.kind]}</span>
            </div>
            <figure className="mt-4 overflow-hidden border border-line bg-haze">
              <Img courseId={courseId} src={q.building.image} alt="Gebouw om te herkennen" tone={chosen === null ? "mono" : "color"} className="mx-auto max-h-[62vh] w-auto object-contain" />
            </figure>
            <h2 className="mt-6 text-[22px] font-bold leading-tight tracking-[-0.02em] sm:text-[30px]">{q.prompt}</h2>
            <ul className="mt-6 space-y-2">
              {q.options.map((o, i) => {
                let cls = "border-line hover:border-ink";
                if (chosen !== null) cls = i === q.answer ? "border-ok-line bg-ok-soft text-ok-ink" : i === chosen ? "border-bad-line bg-bad-soft text-bad-ink" : "border-line text-mute";
                return (
                  <li key={i}>
                    <button disabled={chosen !== null} onClick={() => choose(i)} className={`flex w-full items-center gap-4 border px-4 py-4 text-left text-[15.5px] transition-colors ${cls}`}>
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current text-[12px] font-semibold">{LETTERS[i]}</span>
                      {o}
                    </button>
                  </li>
                );
              })}
            </ul>

            {chosen !== null && (
              <div className="page-fade mt-8 border-t border-ink pt-6">
                <p className={`text-[14px] font-semibold ${chosen === q.answer ? "text-ok-ink" : "text-bad-ink"}`}>{chosen === q.answer ? "Juist antwoord!" : "Fout antwoord"}</p>
                <dl className="mt-5 grid gap-x-8 sm:grid-cols-2">
                  {[
                    ["Naam van het gebouw", q.building.name],
                    ["Architect", q.building.architect],
                    ["Eeuw of periode", q.building.period],
                    ["Locatie", q.building.location],
                    ["Stijlperiode", q.building.style],
                    ["Belangrijkste stijlkenmerken", q.building.features.join(", ")],
                  ].map(([k, v]) => (
                    <div key={k} className="border-b border-line py-3">
                      <dt className="meta-mute text-[10px]">{k}</dt>
                      <dd className="mt-1 text-[15px] font-medium">{v}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-5 max-w-[68ch] text-[14.5px] leading-relaxed text-[#333]">{q.building.explanation}</p>
                {q.building.page && <p className="mt-2 meta-mute">Bron: lesmateriaal · p. {q.building.page}</p>}
                <button className="btn-solid mt-8" onClick={() => { setChosen(null); setIdx((i) => i + 1); }}>
                  {idx + 1 < questions.length ? "Volgende vraag →" : "Resultaten bekijken →"}
                </button>
              </div>
            )}
          </article>
        )
      )}
    </div>
  );
}
