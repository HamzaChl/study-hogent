import { useEffect, useMemo, useRef, useState } from "react";
import { allBundles, catalog, chapterCode } from "../lib/content";
import { norm } from "../lib/text";

type Hit = { kind: string; title: string; snippet: string; href: string };

function buildIndex(): (Hit & { hay: string })[] {
  const out: (Hit & { hay: string })[] = [];
  for (const c of catalog) out.push({ kind: "Cursus", title: c.title, snippet: c.subtitle ?? c.description, href: c.status === "available" ? `#/course/${c.id}` : "#/", hay: norm(`${c.title} ${c.subtitle ?? ""} ${c.description}`) });
  for (const b of allBundles()) {
    const cid = b.course.id;
    for (const ch of b.chapters) {
      const text = ch.sections.flatMap((s) => [s.heading, ...s.blocks.map(blockText)]).join(" ");
      out.push({ kind: "Les", title: `${chapterCode(b, ch)} — ${ch.title}`, snippet: ch.kicker, href: `#/course/${cid}/study/${ch.id}`, hay: norm(`${ch.title} ${ch.kicker} ${ch.intro} ${text} ${ch.summary.join(" ")}`) });
    }
    for (const f of b.flashcards) out.push({ kind: "Flashcard", title: f.front, snippet: f.back, href: `#/course/${cid}/flashcards?card=${f.id}`, hay: norm(`${f.front} ${f.back}`) });
    // Oefeningen, quiz en examens worden bewust niet geïndexeerd: ze moeten willekeurig blijven.
    for (const p of b.course.official.parts)
      for (const t of p.topics) {
        const chs = b.topicChapters.get(t.id);
        out.push({ kind: "Curriculum", title: `Deel ${p.number} · ${t.number} — ${t.title}`, snippet: chs ? `Les ${chs.map((c) => c.number).join(", ")}` : "Lesmateriaal nog niet beschikbaar", href: chs ? `#/course/${cid}/study/${chs[0].id}` : `#/course/${cid}`, hay: norm(`${t.title} ${p.title}`) });
      }
  }
  return out;
}

function blockText(b: { type: string } & Record<string, unknown>): string {
  return Object.values(b)
    .flatMap((v) => (typeof v === "string" ? [v] : Array.isArray(v) ? v.flat(2).map((x) => (typeof x === "string" ? x : typeof x === "object" && x ? Object.values(x).join(" ") : "")) : []))
    .join(" ");
}

export default function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const index = useMemo(buildIndex, []);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => input.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const results = useMemo(() => {
    const terms = norm(q).split(" ").filter((t) => t.length > 1);
    if (!terms.length) return [];
    return index.filter((h) => terms.every((t) => h.hay.includes(t))).slice(0, 40);
  }, [q, index]);

  if (!open) return null;
  return (
    <div className="page-fade fixed inset-0 z-50 overflow-y-auto bg-paper" role="dialog" aria-modal="true" aria-label="Zoeken">
      <div className="mx-auto max-w-page px-5 sm:px-10">
        <div className="flex items-center justify-between py-6">
          <span className="text-[13px] font-extrabold uppercase">Zoeken</span>
          <button onClick={onClose} className="meta link-u">Sluiten ✕</button>
        </div>
        <div className="rule-ink" />
        <input
          ref={input}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Zoek een begrip — kolom, skelet, Farnsworth…"
          className="mt-8 w-full border-0 border-b border-ink bg-transparent pb-3 text-3xl font-bold tracking-[-0.03em] outline-none placeholder:text-line sm:text-5xl"
          aria-label="Zoekterm"
        />
        <p className="mt-4 meta-mute" aria-live="polite">
          {q.trim().length > 1 ? `${results.length} ${results.length === 1 ? "resultaat" : "resultaten"}` : "Lessen · flashcards · curriculum"}
        </p>
        <ul className="mt-6 border-t border-line pb-20">
          {results.map((r, i) => (
            <li key={i} className="border-b border-line">
              <a href={r.href} onClick={onClose} className="grid grid-cols-[96px_1fr] gap-4 py-4 hover:bg-haze sm:grid-cols-[140px_1fr]">
                <span className="meta-mute pt-1">{r.kind}</span>
                <span>
                  <span className="block text-[15px] font-semibold">{r.title}</span>
                  <span className="mt-0.5 block text-[13px] text-mute line-clamp-2">{r.snippet}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
