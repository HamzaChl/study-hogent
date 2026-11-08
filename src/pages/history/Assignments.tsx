import { useEffect, useRef, useState } from "react";
import { SourceTag } from "../../components/ui";
import type { CourseBundle } from "../../lib/content";
import { deleteFile, getFile, saveImage } from "../../lib/files";
import { emptyDrawing, emptyWalk, useProgress, type Drawing, type Walk } from "../../lib/progress";
import { norm } from "../../lib/text";

const pad = (n: number) => String(n).padStart(2, "0");

export default function Assignments({ bundle }: { bundle: CourseBundle }) {
  const { get, update } = useProgress();
  const courseId = bundle.course.id;
  const p = get(courseId);
  const drawings = Array.from({ length: 10 }, (_, i) => p.drawings[i] ?? emptyDrawing());
  const walks = Array.from({ length: 3 }, (_, i) => p.walks[i] ?? emptyWalk());
  const assessment = bundle.course.official.assessment ?? [];
  const crit = (id: string) => assessment.find((a) => a.id === id);

  const setDrawing = (i: number, patch: Partial<Drawing>) =>
    update(courseId, (pp) => {
      const list = Array.from({ length: 10 }, (_, j) => pp.drawings[j] ?? emptyDrawing());
      list[i] = { ...list[i], ...patch };
      return { ...pp, drawings: list };
    });
  const setWalk = (i: number, patch: Partial<Walk>) =>
    update(courseId, (pp) => {
      const list = Array.from({ length: 3 }, (_, j) => pp.walks[j] ?? emptyWalk());
      list[i] = { ...list[i], ...patch };
      return { ...pp, walks: list };
    });

  const drawingsDone = drawings.filter((d) => d.done).length;
  const walksDone = walks.filter((w) => w.done).length;
  const periods = drawings.map((d) => norm(d.period)).filter(Boolean);
  const distinctPeriods = new Set(periods).size;

  return (
    <div className="pt-10">
      <p className="max-w-[68ch] text-[13px] leading-relaxed text-mute">
        {bundle.course.official.notes?.[0]} Je gegevens worden lokaal bewaard; geüploade afbeeldingen blijven op dit toestel en zitten niet in de back-up van de voortgang.
      </p>

      {/* TEKENKUNDIG ONDERZOEK */}
      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-4 border-t border-ink pt-6">
          <div>
            <p className="meta-mute">{crit("tekeningen")?.weight}% van de punten</p>
            <h2 className="mt-2 text-[34px] font-extrabold uppercase leading-none tracking-[-0.04em] sm:text-[56px]">Tekenkundig onderzoek</h2>
          </div>
          <SourceTag kind="official">BaMaFlex</SourceTag>
        </div>
        <p className="mt-4 max-w-[68ch] text-[14px] leading-relaxed text-[#444]">{crit("tekeningen")?.note}</p>
        <Criteria items={crit("tekeningen")?.criteria ?? []} />

        <Progress label={`${drawingsDone} van de 10 tekeningen voltooid`} value={drawingsDone / 10} />
        <p className={`mt-2 text-[12px] ${distinctPeriods < periods.length ? "font-semibold text-ink" : "text-mute"}`}>
          {periods.length} periodes ingevuld · {distinctPeriods} verschillend
          {distinctPeriods < periods.length ? " — let op: de opdracht vraagt 10 verschillende periodes." : ""}
        </p>

        <div className="mt-8 grid grid-cols-1 border-l border-t border-line md:grid-cols-2 xl:grid-cols-3">
          {drawings.map((d, i) => (
            <DrawingCard key={i} index={i} d={d} courseId={courseId} onChange={(patch) => setDrawing(i, patch)} />
          ))}
        </div>
      </section>

      {/* OBSERVATIEWANDELINGEN */}
      <section className="mt-24">
        <div className="flex flex-wrap items-end justify-between gap-4 border-t border-ink pt-6">
          <div>
            <p className="meta-mute">{crit("wandelingen")?.weight}% van de punten</p>
            <h2 className="mt-2 text-[34px] font-extrabold uppercase leading-none tracking-[-0.04em] sm:text-[56px]">Observatiewandelingen</h2>
          </div>
          <SourceTag kind="official">BaMaFlex</SourceTag>
        </div>
        <p className="mt-4 max-w-[68ch] text-[14px] leading-relaxed text-[#444]">
          {crit("wandelingen")?.note} De thema’s, routes en gebouwen staan in de studiehandleiding; ze worden hier niet ingevuld.
        </p>
        <Criteria items={crit("wandelingen")?.criteria ?? []} />
        <Progress label={`${walksDone} van de 3 observatiewandelingen voltooid`} value={walksDone / 3} />

        <div className="mt-8 grid grid-cols-1 border-l border-t border-line lg:grid-cols-3">
          {walks.map((w, i) => (
            <WalkCard key={i} index={i} w={w} courseId={courseId} onChange={(patch) => setWalk(i, patch)} />
          ))}
        </div>
      </section>
    </div>
  );
}

function Criteria({ items }: { items: string[] }) {
  return (
    <details className="group mt-5 max-w-3xl border-y border-line">
      <summary className="flex cursor-pointer list-none items-center justify-between py-3 [&::-webkit-details-marker]:hidden">
        <span className="meta">Beoordelingscriteria</span>
        <span className="meta-mute transition-transform group-open:rotate-45" aria-hidden>+</span>
      </summary>
      <ol className="pb-4">
        {items.map((c, i) => (
          <li key={c} className="grid grid-cols-[28px_1fr] gap-2 border-t border-line py-2.5 text-[13.5px]">
            <span className="tabular-nums text-mute">{i + 1}</span>
            {c}
          </li>
        ))}
      </ol>
    </details>
  );
}

function Progress({ label, value }: { label: string; value: number }) {
  return (
    <div className="mt-8">
      <p className="text-[13px] font-extrabold uppercase tracking-[0.08em]">{label}</p>
      <div className="mt-3 h-1 w-full max-w-xl overflow-hidden rounded-full bg-ok-soft">
        <div className="h-full rounded-full bg-ok transition-[width] duration-500" style={{ width: `${Math.round(value * 100)}%` }} />
      </div>
    </div>
  );
}

const field = "w-full border-0 border-b border-line bg-transparent py-2 text-[14.5px] outline-none placeholder:text-[#b5b5b5] focus:border-ink";
const Label = ({ children }: { children: React.ReactNode }) => <span className="meta-mute text-[10px]">{children}</span>;

function DrawingCard({ index, d, courseId, onChange }: { index: number; d: Drawing; courseId: string; onChange: (p: Partial<Drawing>) => void }) {
  const missing = [!d.building && "gebouw", !d.period && "periode", !d.source && "bron", d.keywords.filter((k) => k.trim()).length < 5 && "5 kernwoorden", !d.fileKey && "tekening"].filter(Boolean) as string[];
  return (
    <article className={`flex flex-col border-b border-r border-line p-6 ${d.done ? "bg-haze/60" : ""}`}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold tabular-nums">{pad(index + 1)} / 10</span>
        <span className={`pill ${d.done ? "pill-active" : ""}`}>{d.done ? "Voltooid" : "Open"}</span>
      </div>
      <Upload className="mt-5" fileKey={d.fileKey} storageKey={`${courseId}:drawing:${index}`} label="Tekening uploaden" onChange={(fileKey) => onChange({ fileKey })} />
      <label className="mt-5 block"><Label>Gebouw</Label><input className={field} value={d.building} onChange={(e) => onChange({ building: e.target.value })} placeholder="Naam van het gebouw" /></label>
      <label className="mt-3 block"><Label>Periode</Label><input className={field} value={d.period} onChange={(e) => onChange({ period: e.target.value })} placeholder="Architectuurperiode" /></label>
      <label className="mt-3 block"><Label>Bron</Label><input className={field} value={d.source} onChange={(e) => onChange({ source: e.target.value })} placeholder="Boek, databank, URL… (correcte bronvermelding)" /></label>
      <fieldset className="mt-4">
        <legend><Label>Vijf kernwoorden</Label></legend>
        <div className="mt-1 grid grid-cols-2 gap-x-3">
          {d.keywords.map((k, j) => (
            <input key={j} className={field} value={k} placeholder={`${j + 1}.`} aria-label={`Kernwoord ${j + 1}`} onChange={(e) => onChange({ keywords: d.keywords.map((x, n) => (n === j ? e.target.value : x)) })} />
          ))}
        </div>
      </fieldset>
      <div className="mt-auto pt-6">
        {!d.done && missing.length > 0 && <p className="mb-3 text-[11.5px] text-mute">Nog in te vullen: {missing.join(", ")}</p>}
        <button className={d.done ? "btn-line w-full" : "btn-solid w-full"} onClick={() => onChange({ done: !d.done })} aria-pressed={d.done}>
          {d.done ? "● Voltooid — ongedaan maken" : "Markeren als voltooid"}
        </button>
      </div>
    </article>
  );
}

function WalkCard({ index, w, courseId, onChange }: { index: number; w: Walk; courseId: string; onChange: (p: Partial<Walk>) => void }) {
  return (
    <article className={`flex flex-col border-b border-r border-line p-6 ${w.done ? "bg-haze/60" : ""}`}>
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-extrabold uppercase tracking-[0.06em]">Wandeling {pad(index + 1)}</span>
        <span className={`pill ${w.done ? "pill-active" : ""}`}>{w.done ? "Voltooid" : "Open"}</span>
      </div>
      <label className="mt-5 block"><Label>Thema</Label><input className={field} value={w.theme} onChange={(e) => onChange({ theme: e.target.value })} placeholder="Thema van de wandeling" /></label>
      <label className="mt-3 block"><Label>Bezocht gebouw</Label><input className={field} value={w.building} onChange={(e) => onChange({ building: e.target.value })} placeholder="Hedendaagse realisatie" /></label>
      <label className="mt-3 block"><Label>Locatie</Label><input className={field} value={w.location} onChange={(e) => onChange({ location: e.target.value })} placeholder="Adres of stad" /></label>
      <Upload className="mt-5" fileKey={w.fileKey} storageKey={`${courseId}:walk:${index}`} label="Foto uploaden" onChange={(fileKey) => onChange({ fileKey })} />
      <label className="mt-5 block"><Label>Observaties</Label><textarea rows={4} className={`${field} resize-y`} value={w.observations} onChange={(e) => onChange({ observations: e.target.value })} placeholder="Wat zie je vanuit het thema van de wandeling?" /></label>
      <label className="mt-3 block"><Label>Vergelijking van architecturale kenmerken</Label><textarea rows={4} className={`${field} resize-y`} value={w.comparison} onChange={(e) => onChange({ comparison: e.target.value })} placeholder="Vergelijk met de andere bezochte gebouwen" /></label>
      <div className="mt-auto pt-6">
        <button className={w.done ? "btn-line w-full" : "btn-solid w-full"} onClick={() => onChange({ done: !w.done })} aria-pressed={w.done}>
          {w.done ? "● Voltooid — ongedaan maken" : "Markeren als voltooid"}
        </button>
      </div>
    </article>
  );
}

function Upload({ fileKey, storageKey, label, onChange, className = "" }: { fileKey?: string; storageKey: string; label: string; onChange: (key?: string) => void; className?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    let objectUrl: string | null = null;
    setUrl(null);
    if (fileKey)
      getFile(fileKey)
        .then((b) => {
          if (b && alive) setUrl((objectUrl = URL.createObjectURL(b)));
        })
        .catch(() => {});
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileKey]);

  const pick = async (f: File) => {
    setError("");
    try {
      const key = `${storageKey}:${Date.now()}`;
      await saveImage(key, f);
      if (fileKey) await deleteFile(fileKey).catch(() => {});
      onChange(key);
    } catch {
      setError("Uploaden mislukt: opslag niet beschikbaar in deze browser.");
    }
  };

  return (
    <div className={className}>
      <div className="relative aspect-[4/3] overflow-hidden border border-line bg-haze">
        {url ? (
          <img src={url} alt={label} className="h-full w-full object-contain" />
        ) : (
          <button type="button" onClick={() => input.current?.click()} className="flex h-full w-full items-center justify-center meta-mute hover:text-ink">
            + {label}
          </button>
        )}
      </div>
      {url && (
        <div className="mt-2 flex gap-4">
          <button type="button" className="meta link-u" onClick={() => input.current?.click()}>Vervangen</button>
          <button type="button" className="meta link-u text-mute" onClick={async () => { if (fileKey) await deleteFile(fileKey).catch(() => {}); onChange(undefined); }}>Verwijderen</button>
        </div>
      )}
      {error && <p className="mt-2 text-[12px] text-bad-ink">{error}</p>}
      <input ref={input} type="file" accept="image/*" className="hidden" aria-label={label} onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); e.target.value = ""; }} />
    </div>
  );
}
