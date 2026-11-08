import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FlashcardPdfExport from "../../components/FlashcardPdfExport";
import { Empty, Img, SourceTag } from "../../components/ui";
import { FLASHCARD_CATEGORIES, FLASHCARD_CATEGORY_LABEL } from "../../lib/schema";
import type { CourseBundle } from "../../lib/content";
import { useProgress } from "../../lib/progress";
import type { Flashcard } from "../../lib/schema";
import { shuffle } from "../../lib/text";

type Deck = "all" | "review" | "unmastered";

export default function Flashcards({ bundle, params }: { bundle: CourseBundle; params: URLSearchParams }) {
  const { get, update } = useProgress();
  const courseId = bundle.course.id;
  const status = get(courseId).cards;
  const startCard = params.get("card");

  const chaptersWithCards = bundle.chapters.filter((c) => bundle.flashcards.some((f) => f.chapterId === c.id));
  const [chapter, setChapter] = useState<string>(params.get("chapter") ?? "all");
  const [deck, setDeck] = useState<Deck>("all");
  const [shuffled, setShuffled] = useState(false);
  const [category, setCategory] = useState<string>("all");
  const [pdfOpen, setPdfOpen] = useState(false);
  const categories = FLASHCARD_CATEGORIES.filter((c) => bundle.flashcards.some((f) => f.category === c));
  const [queue, setQueue] = useState<Flashcard[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const session = useRef({ known: new Set<string>(), again: new Set<string>(), requeued: new Set<string>() });

  const build = useCallback(
    (ch: string, d: Deck, sh: boolean, cat: string) => {
      const st = get(courseId).cards;
      let cards = bundle.flashcards.filter((f) => (ch === "all" || f.chapterId === ch) && (cat === "all" || f.category === cat));
      if (d === "review") cards = cards.filter((f) => st[f.id] === "review");
      if (d === "unmastered") cards = cards.filter((f) => st[f.id] !== "mastered");
      return sh ? shuffle(cards) : cards;
    },
    [bundle.flashcards, courseId, get],
  );

  const restart = useCallback(
    (ch = chapter, d = deck, sh = shuffled, startAt?: string | null, cat = category) => {
      const q = build(ch, d, sh, cat);
      setQueue(q);
      setIndex(Math.max(0, startAt ? q.findIndex((c) => c.id === startAt) : 0));
      setFlipped(false);
      session.current = { known: new Set(), again: new Set(), requeued: new Set() };
    },
    [build, chapter, deck, shuffled, category],
  );

  // Eerste opbouw (eventueel vanaf een kaart uit de zoekfunctie).
  useEffect(() => {
    restart(chapter, deck, shuffled, startCard);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const card = queue[index];
  const done = queue.length > 0 && index >= queue.length;

  const go = (delta: number) => {
    setFlipped(false);
    setIndex((i) => Math.max(0, Math.min(queue.length, i + delta)));
  };
  const mark = (s: "mastered" | "review") => {
    if (!card) return;
    update(courseId, (p) => ({ ...p, cards: { ...p.cards, [card.id]: s } }));
    if (s === "mastered") {
      session.current.known.add(card.id);
      session.current.again.delete(card.id);
    } else {
      session.current.again.add(card.id);
      // Moeilijke kaart komt nog één keer terug aan het einde van de reeks.
      if (!session.current.requeued.has(card.id)) {
        session.current.requeued.add(card.id);
        setQueue((q) => [...q, card]);
      }
    }
    go(1);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement).tagName) || e.metaKey || e.ctrlKey) return;
      if (done || !card) return;
      if (e.key === " ") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key.toLowerCase() === "k") mark("mastered");
      else if (e.key.toLowerCase() === "h") mark("review");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const counts = useMemo(() => {
    const cards = bundle.flashcards.filter((f) => chapter === "all" || f.chapterId === chapter);
    return {
      total: cards.length,
      mastered: cards.filter((f) => status[f.id] === "mastered").length,
      review: cards.filter((f) => status[f.id] === "review").length,
    };
  }, [bundle.flashcards, chapter, status]);

  const chapterOf = (id: string) => bundle.chapters.find((c) => c.id === id);

  return (
    <div className="pt-10">
      {/* Filters */}
      <div className="flex flex-col gap-4 border-b border-line pb-6 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Hoofdstuk">
          <button className={`pill ${chapter === "all" ? "pill-active" : "hover:border-ink"}`} aria-pressed={chapter === "all"} onClick={() => { setChapter("all"); restart("all"); }}>Alle</button>
          {chaptersWithCards.map((c) => {
            // Groen zodra elke kaart van het hoofdstuk als "beheerst" gemarkeerd is.
            const complete = bundle.flashcards.filter((f) => f.chapterId === c.id).every((f) => status[f.id] === "mastered");
            const active = chapter === c.id;
            const tone = complete
              ? active
                ? "border-ok bg-ok text-paper"
                : "border-ok-line bg-ok-soft text-ok-ink hover:border-ok"
              : active
                ? "pill-active"
                : "hover:border-ink";
            return (
              <button key={c.id} className={`pill ${tone}`} aria-pressed={active} onClick={() => { setChapter(c.id); restart(c.id); }} title={complete ? "Volledig gekend" : undefined}>
                {complete && <span aria-hidden className="mr-1">✓</span>}
                {c.number} {c.title}
                {complete && <span className="sr-only"> — volledig gekend</span>}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Selectie">
          {([["all", "Alle kaarten"], ["unmastered", "Niet beheerst"], ["review", `Te herhalen (${counts.review})`]] as [Deck, string][]).map(([d, l]) => (
            <button key={d} className={`pill ${deck === d ? "pill-active" : "hover:border-ink"}`} aria-pressed={deck === d} onClick={() => { setDeck(d); restart(chapter, d); }}>
              {l}
            </button>
          ))}
          <button className={`pill ${shuffled ? "pill-active" : "hover:border-ink"}`} aria-pressed={shuffled} onClick={() => { setShuffled(!shuffled); restart(chapter, deck, !shuffled); }}>
            Schudden
          </button>
        </div>
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-b border-line py-4" role="group" aria-label="Categorie">
          <button className={`pill ${category === "all" ? "pill-active" : "hover:border-ink"}`} onClick={() => { setCategory("all"); restart(chapter, deck, shuffled, null, "all"); }}>Alle categorieën</button>
          {categories.map((c) => (
            <button key={c} className={`pill ${category === c ? "pill-active" : "hover:border-ink"}`} onClick={() => { setCategory(c); restart(chapter, deck, shuffled, null, c); }}>
              {FLASHCARD_CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 py-5">
        <SourceTag kind="ai">op basis van Les 02</SourceTag>
        <span className="flex items-center gap-5">
          <span className="meta tabular-nums">
            {counts.mastered} / {counts.total} beheerst
          </span>
          <button type="button" onClick={() => setPdfOpen((o) => !o)} aria-expanded={pdfOpen} className="pill hover:border-ink">
            PDF A4 ↓
          </button>
        </span>
      </div>

      {pdfOpen && <FlashcardPdfExport bundle={bundle} selection={build(chapter, deck, false, category)} onClose={() => setPdfOpen(false)} />}

      {queue.length === 0 ? (
        <Empty>
          {deck === "review" ? "Geen kaarten om te herhalen in deze selectie." : deck === "unmastered" ? "Alle kaarten in deze selectie zijn beheerst." : "Geen kaarten."}
        </Empty>
      ) : done ? (
        <div className="border border-ink px-6 py-14 text-center sm:px-14">
          <p className="meta-mute">Reeks voltooid</p>
          <p className="mt-4 text-[56px] font-extrabold leading-none tracking-[-0.05em] sm:text-[88px]">{session.current.known.size}</p>
          <p className="mt-2 meta">kaarten gekend in deze reeks</p>
          <p className="mt-6 text-sm text-mute">{session.current.again.size} {session.current.again.size === 1 ? "kaart" : "kaarten"} om te herhalen.</p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {counts.review > 0 && (
              <button className="btn-solid" onClick={() => { setDeck("review"); restart(chapter, "review"); }}>
                Moeilijke kaarten herhalen ({counts.review})
              </button>
            )}
            <button className="btn-line" onClick={() => restart()}>Opnieuw beginnen</button>
          </div>
        </div>
      ) : (
        card && (
          <>
            <div className="mb-3 flex items-center justify-between">
              <span className="meta tabular-nums">
                {String(index + 1).padStart(2, "0")} / {String(queue.length).padStart(2, "0")}
              </span>
              <span className="meta-mute">
                {status[card.id] === "mastered" ? "● Beheerst" : status[card.id] === "review" ? "◐ Te herhalen" : "○ Nieuw"}
              </span>
            </div>

            <div className="flip">
              <button
                type="button"
                onClick={() => setFlipped((f) => !f)}
                aria-label={flipped ? "Toon de vraag" : "Toon het antwoord"}
                className={`flip-inner grid w-full text-left ${flipped ? "is-flipped" : ""}`}
              >
                <Face label="Vraag" sub={chapterOf(card.chapterId)?.title} hidden={flipped}>
                  {card.image && <Img courseId={courseId} src={card.image} alt="Afbeelding bij de vraag" className="mx-auto mb-6 max-h-56 w-auto object-contain" />}
                  <p className="text-[26px] font-bold leading-[1.15] tracking-[-0.025em] sm:text-[40px]">{card.front}</p>
                </Face>
                <Face label="Antwoord" sub={card.page ? `Les 02 · p. ${card.page}` : undefined} back hidden={!flipped}>
                  <p className="text-[19px] font-medium leading-[1.4] tracking-[-0.01em] sm:text-[27px]">{card.back}</p>
                </Face>
              </button>
            </div>
            <p className="mt-3 text-center meta-mute">Tik op de kaart om te draaien</p>

            <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button className="btn-quiet" onClick={() => go(-1)} disabled={index === 0}>← Vorige</button>
              <button className="btn-quiet sm:order-last" onClick={() => go(1)}>Volgende →</button>
              <button className="btn-line" onClick={() => mark("review")}>Opnieuw herhalen</button>
              <button className="btn-solid" onClick={() => mark("mastered")}>Ik ken dit</button>
            </div>
            <p className="mt-4 hidden text-center meta-mute sm:block">Spatie = draaien · ← → = navigeren · K = ik ken dit · H = opnieuw herhalen</p>
          </>
        )
      )}
    </div>
  );
}

function Face({ label, sub, back, hidden, children }: { label: string; sub?: string; back?: boolean; hidden: boolean; children: React.ReactNode }) {
  return (
    <div className={`flip-face col-start-1 row-start-1 flex min-h-[340px] flex-col border border-ink bg-paper p-6 sm:min-h-[420px] sm:p-10 ${back ? "flip-back" : ""}`} aria-hidden={hidden}>
      <div className="flex justify-between">
        <span className="meta font-bold">{label}</span>
        {sub && <span className="meta-mute">{sub}</span>}
      </div>
      <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">{children}</div>
    </div>
  );
}
