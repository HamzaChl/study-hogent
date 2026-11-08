import { useCallback, useEffect, useState, type RefObject } from "react";

/**
 * Markeerstift voor de studeerpagina's.
 * Markeringen worden getekend met de CSS Custom Highlight API (::highlight(study-mark)),
 * dus de DOM van React wordt nooit aangepast. Opgeslagen als [begin, einde] in de tekst van de container.
 */

export type Span = [number, number];
const NAME = "study-mark";

type HighlightRegistry = { set: (name: string, h: unknown) => void; delete: (name: string) => void };
const registry = (): HighlightRegistry | null => (typeof CSS !== "undefined" && "highlights" in CSS ? (CSS as unknown as { highlights: HighlightRegistry }).highlights : null);
const HighlightCtor = (): (new (...r: Range[]) => unknown) | null => (typeof window !== "undefined" && "Highlight" in window ? (window as unknown as { Highlight: new (...r: Range[]) => unknown }).Highlight : null);
export const highlighterSupported = () => !!registry() && !!HighlightCtor();

function textNodes(root: Node): Text[] {
  const out: Text[] = [];
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) out.push(n as Text);
  return out;
}

/** (node, offset) → positie in de volledige tekst van root. */
function toIndex(root: Node, node: Node, offset: number): number | null {
  if (!root.contains(node)) return null;
  if (node.nodeType !== Node.TEXT_NODE) {
    // offset telt kindknopen: neem de tekst vóór kind[offset]
    const r = document.createRange();
    r.setStart(root, 0);
    r.setEnd(node, offset);
    return r.toString().length;
  }
  let i = 0;
  for (const t of textNodes(root)) {
    if (t === node) return i + offset;
    i += t.length;
  }
  return null;
}

/** Positie → Range over de tekstknopen van root. */
function toRange(root: Node, [start, end]: Span): Range | null {
  const r = document.createRange();
  let i = 0;
  let started = false;
  for (const t of textNodes(root)) {
    const next = i + t.length;
    if (!started && start < next) {
      r.setStart(t, Math.max(0, start - i));
      started = true;
    }
    if (started && end <= next) {
      r.setEnd(t, Math.max(0, end - i));
      return r;
    }
    i = next;
  }
  return null;
}

/** Overlappende of aansluitende stukken samenvoegen. */
function merge(spans: Span[]): Span[] {
  const s = [...spans].sort((a, b) => a[0] - b[0]);
  const out: Span[] = [];
  for (const [a, b] of s) {
    const last = out.at(-1);
    if (last && a <= last[1]) last[1] = Math.max(last[1], b);
    else out.push([a, b]);
  }
  return out;
}

function caretIndex(root: Node, x: number, y: number): number | null {
  const d = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  const pos = d.caretPositionFromPoint?.(x, y);
  if (pos) return toIndex(root, pos.offsetNode, pos.offset);
  const r = d.caretRangeFromPoint?.(x, y);
  return r ? toIndex(root, r.startContainer, r.startOffset) : null;
}

export function Highlighter({ container, spans, onChange, contentKey }: { container: RefObject<HTMLElement | null>; spans: Span[]; onChange: (s: Span[]) => void; contentKey: string }) {
  const [active, setActive] = useState(false);
  const supported = highlighterSupported();

  // Markeringen tekenen (opnieuw bij ander hoofdstuk of andere markeringen).
  useEffect(() => {
    const reg = registry();
    const H = HighlightCtor();
    const root = container.current;
    if (!reg || !H || !root) return;
    const ranges = spans.map((s) => toRange(root, s)).filter((r): r is Range => !!r);
    reg.set(NAME, new H(...ranges));
    return () => reg.delete(NAME);
  }, [spans, container, contentKey]);

  // Visuele staat op de container: gele selectie en tekstcursor.
  useEffect(() => {
    const root = container.current;
    if (!root) return;
    root.classList.toggle("marking", active);
    return () => root.classList.remove("marking");
  }, [active, container, contentKey]);

  const onPointerUp = useCallback(
    (e: PointerEvent) => {
      const root = container.current;
      if (!root) return;
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed && sel.rangeCount) {
        const r = sel.getRangeAt(0);
        const a = toIndex(root, r.startContainer, r.startOffset);
        const b = toIndex(root, r.endContainer, r.endOffset);
        if (a !== null && b !== null && b > a) {
          const text = r.toString();
          // witruimte aan de randen niet mee markeren
          const lead = text.length - text.trimStart().length;
          const trail = text.length - text.trimEnd().length;
          let s = a + lead;
          let t = b - trail;
          // Uitbreiden tot volledige woorden, zodat een half geselecteerd woord helemaal gemarkeerd wordt.
          // Nooit over de grens van een tekstknoop heen (aangrenzende blokken hebben geen spatie ertussen).
          const full = root.textContent ?? "";
          const bounds = new Set<number>();
          let acc = 0;
          for (const n of textNodes(root)) {
            bounds.add(acc);
            acc += n.length;
          }
          bounds.add(acc);
          const isWord = (c: string | undefined) => !!c && /[\p{L}\p{N}'’-]/u.test(c);
          while (s > 0 && !bounds.has(s) && isWord(full[s - 1]) && isWord(full[s])) s--;
          while (t < full.length && !bounds.has(t) && isWord(full[t]) && isWord(full[t - 1])) t++;
          if (t > s) onChange(merge([...spans, [s, t]]));
        }
        sel.removeAllRanges();
        return;
      }
      // Klik op een markering = markering weg.
      const i = caretIndex(root, e.clientX, e.clientY);
      if (i === null) return;
      const hit = spans.find(([s, t]) => i >= s && i < t);
      if (hit) onChange(spans.filter((s) => s !== hit));
    },
    [container, spans, onChange],
  );

  useEffect(() => {
    const root = container.current;
    if (!active || !root) return;
    const up = (e: PointerEvent) => setTimeout(() => onPointerUp(e), 0); // selectie is pas definitief na het event
    root.addEventListener("pointerup", up);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setActive(false);
    window.addEventListener("keydown", esc);
    return () => {
      root.removeEventListener("pointerup", up);
      window.removeEventListener("keydown", esc);
    };
  }, [active, container, onPointerUp]);

  if (!supported) return null;

  return (
    <div className="fixed bottom-5 right-5 z-40 flex items-center gap-2 sm:bottom-8 sm:right-8">
      {active && (
        <span className="page-fade hidden rounded-full border border-line bg-paper px-3 py-1.5 text-[11px] font-medium text-[#333] shadow-sm sm:inline">
          Selecteer tekst om te markeren · klik op een markering om ze te wissen
        </span>
      )}
      {active && spans.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="page-fade rounded-full border border-line bg-paper px-3 py-1.5 text-[11px] font-semibold uppercase tracking-meta text-ink shadow-sm hover:border-ink"
        >
          Alles wissen
        </button>
      )}
      <button
        type="button"
        onClick={() => setActive((a) => !a)}
        aria-pressed={active}
        aria-label={active ? "Markeerstift uitzetten" : "Markeerstift aanzetten"}
        title={active ? "Markeerstift actief (Esc om te stoppen)" : "Markeerstift"}
        className={`flex h-14 w-14 items-center justify-center rounded-full border shadow-md transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
          active ? "border-ink bg-[#FFF35C] text-ink" : "border-line bg-paper text-ink hover:border-ink"
        }`}
      >
        {/* Feutre / markeerstift */}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m9 11-6 6v3h9l3-3" />
          <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" />
        </svg>
      </button>
    </div>
  );
}
