import { useState } from "react";
import boldUrl from "../assets/fonts/Inter-Bold.ttf?url";
import regularUrl from "../assets/fonts/Inter-Regular.ttf?url";
import { asset, chapterCode, type CourseBundle } from "../lib/content";
import type { PdfFlip, PdfLayout } from "../lib/flashcardPdf";
import type { Flashcard } from "../lib/schema";

const GRID_INFO: Record<PdfLayout, { perSheet: number; label: string; size: string }> = {
  "18": { perSheet: 18, label: "Compact — 18 per blad", size: "63 × 46 mm" },
  "10": { perSheet: 10, label: "Groot — 10 per blad", size: "95 × 55 mm" },
};

async function loadFont(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`lettertype niet gevonden (${res.status})`);
  return res.arrayBuffer();
}

/** Paneel om flashcards als A4-PDF te exporteren, geoptimaliseerd voor dubbelzijdig printen. */
export default function FlashcardPdfExport({ bundle, selection, onClose }: { bundle: CourseBundle; selection: Flashcard[]; onClose: () => void }) {
  const all = bundle.flashcards;
  const [scope, setScope] = useState<"selection" | "all">(selection.length < all.length ? "selection" : "all");
  const [layout, setLayout] = useState<PdfLayout>("18");
  const [flip, setFlip] = useState<PdfFlip>("long");
  const [cutLines, setCutLines] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const cards = scope === "all" ? all : selection;
  const sheets = Math.max(1, Math.ceil(cards.length / GRID_INFO[layout].perSheet));

  const download = async () => {
    setBusy(true);
    setError("");
    try {
      const [{ buildFlashcardPdf }, regular, bold] = await Promise.all([
        // Eén nieuwe poging: na een update kan de eerste aanvraag van de module mislukken.
        import("../lib/flashcardPdf").catch(() => import("../lib/flashcardPdf")),
        loadFont(regularUrl),
        loadFont(boldUrl),
      ]);
      const chapter = (id: string) => bundle.chapters.find((c) => c.id === id);
      const bytes = await buildFlashcardPdf(
        cards.map((c) => {
          const ch = chapter(c.chapterId);
          const lec = bundle.lectureOf.get(c.chapterId);
          return {
            id: c.id,
            front: c.front,
            back: c.back,
            label: ch ? `${bundle.course.title} · ${chapterCode(bundle, ch)} ${ch.title}` : bundle.course.title,
            source: c.page ? `${lec ? lec.id.replace(/^les/, "Les ") : "Les"} · p. ${c.page}` : undefined,
            image: c.image,
          };
        }),
        { layout, flip, cutLines, title: bundle.course.title },
        {
          regular,
          bold,
          loadImage: async (src) => {
            const res = await fetch(asset(bundle.course.id, src));
            if (!res.ok) return null;
            const type = (res.headers.get("content-type") ?? src).includes("png") ? "png" : "jpg";
            return { bytes: await res.arrayBuffer(), type };
          },
        },
      );
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `flashcards-${bundle.course.id}-A4-${layout}per-blad.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) {
      console.error("[PDF-export]", e);
      const msg = e instanceof Error ? e.message : String(e);
      setError(
        /dynamically imported module|Importing a module script failed|error loading dynamically/i.test(msg)
          ? "De PDF-module kon niet geladen worden. Herlaad de pagina (en herstart `npm run dev` als de website lokaal draait) en probeer opnieuw."
          : `Het PDF-bestand kon niet gemaakt worden. Technische melding: ${msg}`,
      );
    } finally {
      setBusy(false);
    }
  };

  const Option = <T extends string>({ value, current, set, children }: { value: T; current: T; set: (v: T) => void; children: React.ReactNode }) => (
    <button type="button" onClick={() => set(value)} aria-pressed={current === value} className={`pill ${current === value ? "pill-active" : "hover:border-ink"}`}>
      {children}
    </button>
  );

  return (
    <section className="page-fade mb-6 border border-ink p-6 sm:p-8" aria-label="Flashcards exporteren als PDF">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="meta font-bold">PDF exporteren — A4, dubbelzijdig</p>
          <p className="mt-2 max-w-[60ch] text-[13px] leading-relaxed text-mute">
            Voorzijde: vragen. Achterzijde: antwoorden, gespiegeld zodat elk antwoord na het omdraaien precies achter zijn vraag valt. Knip daarna langs de snijlijnen.
          </p>
        </div>
        <button onClick={onClose} className="meta link-u shrink-0">Sluiten ✕</button>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <p className="meta-mute text-[10px]">Kaarten</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Option value="selection" current={scope} set={setScope}>Huidige selectie ({selection.length})</Option>
            <Option value="all" current={scope} set={setScope}>Alle kaarten ({all.length})</Option>
          </div>
        </div>
        <div>
          <p className="meta-mute text-[10px]">Formaat</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(Object.keys(GRID_INFO) as PdfLayout[]).map((l) => (
              <Option key={l} value={l} current={layout} set={setLayout}>{GRID_INFO[l].label}</Option>
            ))}
          </div>
          <p className="mt-1.5 text-[11.5px] text-mute">Kaartformaat {GRID_INFO[layout].size}</p>
        </div>
        <div>
          <p className="meta-mute text-[10px]">Dubbelzijdig omslaan langs</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Option value="long" current={flip} set={setFlip}>Lange zijde (standaard)</Option>
            <Option value="short" current={flip} set={setFlip}>Korte zijde</Option>
          </div>
          <p className="mt-1.5 text-[11.5px] text-mute">Kies dezelfde instelling in het printvenster.</p>
        </div>
        <div>
          <p className="meta-mute text-[10px]">Snijlijnen</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Option value="on" current={cutLines ? "on" : "off"} set={(v) => setCutLines(v === "on")}>Met snijlijnen</Option>
            <Option value="off" current={cutLines ? "on" : "off"} set={(v) => setCutLines(v === "on")}>Zonder</Option>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line pt-6">
        <button className="btn-solid" onClick={download} disabled={busy || cards.length === 0}>
          {busy ? "PDF wordt gemaakt…" : "PDF downloaden ↓"}
        </button>
        <span className="text-[13px] tabular-nums">
          {cards.length} kaarten · {sheets} {sheets === 1 ? "blad" : "bladen"} ({sheets * 2} pagina’s)
        </span>
      </div>
      <p className="mt-4 text-[12px] leading-relaxed text-mute">
        Printen: schaal <strong className="text-ink">100% / werkelijke grootte</strong> (niet “aanpassen aan pagina”), dubbelzijdig, omslaan langs de {flip === "long" ? "lange" : "korte"} zijde.
      </p>
      {error && <p className="mt-3 text-[13px] font-semibold" role="alert">{error}</p>}
    </section>
  );
}
