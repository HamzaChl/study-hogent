import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";

/**
 * Flashcards → A4-PDF om dubbelzijdig te printen.
 * Elk blad = een voorzijde (vragen) en een achterzijde (antwoorden). De achterzijde wordt gespiegeld zodat
 * elk antwoord na het omdraaien precies achter zijn vraag valt:
 *  - omslaan langs de lange zijde: kolommen gespiegeld;
 *  - omslaan langs de korte zijde: rijen gespiegeld.
 * De tekstgrootte past zich per kaart aan. Snijlijnen staan enkel op de voorzijde.
 */

export type PdfCard = { id: string; front: string; back: string; label?: string; source?: string; image?: string };
export type PdfLayout = "18" | "10";
export type PdfFlip = "long" | "short";
export type PdfOptions = { layout: PdfLayout; flip: PdfFlip; cutLines: boolean; title: string };
export type PdfAssets = {
  regular: ArrayBuffer | Uint8Array;
  bold: ArrayBuffer | Uint8Array;
  /** Laadt een afbeelding (jpg/png) voor kaarten met beeld; ontbrekende beelden worden overgeslagen. */
  loadImage?: (src: string) => Promise<{ bytes: ArrayBuffer | Uint8Array; type: "jpg" | "png" } | null>;
};

const MM = 72 / 25.4;
const A4 = { w: 210 * MM, h: 297 * MM };
const MARGIN = 10 * MM;
const INK = rgb(0.03, 0.03, 0.03);
const MUTE = rgb(0.47, 0.47, 0.47);
const LINE = rgb(0.8, 0.8, 0.8);

export const GRID: Record<PdfLayout, { cols: number; rows: number }> = { "18": { cols: 3, rows: 6 }, "10": { cols: 2, rows: 5 } };

export function sheetCount(cards: number, layout: PdfLayout) {
  const g = GRID[layout];
  return Math.ceil(cards / (g.cols * g.rows));
}

/** Positie (rij, kolom) van kaart i op de achterzijde, zodat ze na het omdraaien achter de voorzijde valt. */
export function backSlot(row: number, col: number, layout: PdfLayout, flip: PdfFlip) {
  const g = GRID[layout];
  return flip === "long" ? { row, col: g.cols - 1 - col } : { row: g.rows - 1 - row, col };
}

/** Tekst in regels breken binnen een breedte; te lange woorden worden opgesplitst. */
function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (let word of para.split(/\s+/).filter(Boolean)) {
      while (font.widthOfTextAtSize(word, size) > width) {
        // woord breder dan de kaart: hard afbreken
        let cut = word.length - 1;
        while (cut > 1 && font.widthOfTextAtSize(word.slice(0, cut) + "-", size) > width) cut--;
        if (line) lines.push(line), (line = "");
        lines.push(word.slice(0, cut) + "-");
        word = word.slice(cut);
      }
      const test = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) <= width) line = test;
      else {
        if (line) lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines;
}

/** Grootste lettergrootte waarbij de tekst in het vak past. */
function fit(text: string, font: PDFFont, box: { w: number; h: number }, max: number, min: number, leading: number) {
  for (let size = max; size >= min; size -= 0.25) {
    const lines = wrap(text, font, size, box.w);
    if (lines.length * size * leading <= box.h) return { size, lines };
  }
  // Past zelfs niet op de minimale grootte: afkappen met een beletselteken.
  const lines = wrap(text, font, min, box.w);
  const max_ = Math.max(1, Math.floor(box.h / (min * leading)));
  const cut = lines.slice(0, max_);
  if (lines.length > max_) cut[max_ - 1] = cut[max_ - 1].replace(/.{0,2}$/, "…");
  return { size: min, lines: cut };
}

function drawCentered(page: PDFPage, lines: string[], font: PDFFont, size: number, leading: number, box: { x: number; y: number; w: number; h: number }, color = INK) {
  const total = lines.length * size * leading;
  let y = box.y + box.h / 2 + total / 2 - size * 0.8; // y = bovenkant blok, baseline eerste regel
  for (const l of lines) {
    const w = font.widthOfTextAtSize(l, size);
    page.drawText(l, { x: box.x + (box.w - w) / 2, y, size, font, color });
    y -= size * leading;
  }
}

export async function buildFlashcardPdf(cards: PdfCard[], opts: PdfOptions, assets: PdfAssets): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(`${opts.title} — flashcards`);
  doc.setCreator("Studiearchief");
  const regular = await doc.embedFont(assets.regular, { subset: true });
  const bold = await doc.embedFont(assets.bold, { subset: true });

  const g = GRID[opts.layout];
  const cw = (A4.w - 2 * MARGIN) / g.cols;
  const ch = (A4.h - 2 * MARGIN) / g.rows;
  const pad = (opts.layout === "18" ? 3.5 : 5) * MM;
  const metaSize = opts.layout === "18" ? 5.5 : 6.5;
  const qMax = opts.layout === "18" ? 12 : 15;
  const aMax = opts.layout === "18" ? 9.5 : 11.5;
  const perSheet = g.cols * g.rows;
  const sheets = Math.max(1, Math.ceil(cards.length / perSheet));

  const images = new Map<string, PDFImage | null>();
  const imageFor = async (src?: string) => {
    if (!src || !assets.loadImage) return null;
    if (!images.has(src)) {
      try {
        const r = await assets.loadImage(src);
        images.set(src, r ? (r.type === "png" ? await doc.embedPng(r.bytes) : await doc.embedJpg(r.bytes)) : null);
      } catch {
        images.set(src, null);
      }
    }
    return images.get(src) ?? null;
  };

  // Linksonder van een kaartvak (pdf-coördinaten: oorsprong linksonder).
  const slotXY = (row: number, col: number) => ({ x: MARGIN + col * cw, y: A4.h - MARGIN - (row + 1) * ch });

  const footer = (page: PDFPage, text: string) => {
    page.drawText(text, { x: MARGIN, y: MARGIN / 2 - 2, size: 6, font: regular, color: MUTE });
  };

  for (let s = 0; s < sheets; s++) {
    const batch = cards.slice(s * perSheet, (s + 1) * perSheet);
    const front = doc.addPage([A4.w, A4.h]);
    const back = doc.addPage([A4.w, A4.h]);

    // Snijlijnen (enkel voorzijde): fijne lijnen over het raster + snijtekens in de marges.
    if (opts.cutLines) {
      const top = A4.h - MARGIN;
      const bottom = MARGIN;
      for (let c = 0; c <= g.cols; c++) {
        const x = MARGIN + c * cw;
        front.drawLine({ start: { x, y: bottom }, end: { x, y: top }, thickness: 0.3, color: LINE, dashArray: [2, 2] });
        front.drawLine({ start: { x, y: top + 2 * MM }, end: { x, y: top + 6 * MM }, thickness: 0.4, color: MUTE });
        front.drawLine({ start: { x, y: bottom - 6 * MM }, end: { x, y: bottom - 2 * MM }, thickness: 0.4, color: MUTE });
      }
      for (let r = 0; r <= g.rows; r++) {
        const y = A4.h - MARGIN - r * ch;
        front.drawLine({ start: { x: MARGIN, y }, end: { x: A4.w - MARGIN, y }, thickness: 0.3, color: LINE, dashArray: [2, 2] });
        front.drawLine({ start: { x: MARGIN - 6 * MM, y }, end: { x: MARGIN - 2 * MM, y }, thickness: 0.4, color: MUTE });
        front.drawLine({ start: { x: A4.w - MARGIN + 2 * MM, y }, end: { x: A4.w - MARGIN + 6 * MM, y }, thickness: 0.4, color: MUTE });
      }
    }

    for (let i = 0; i < batch.length; i++) {
      const card = batch[i];
      const n = s * perSheet + i + 1;
      const row = Math.floor(i / g.cols);
      const col = i % g.cols;

      // ── Voorzijde: vraag ──
      const f = slotXY(row, col);
      const inner = { x: f.x + pad, y: f.y + pad, w: cw - 2 * pad, h: ch - 2 * pad };
      const metaY = inner.y + inner.h - metaSize;
      if (card.label) front.drawText(fitLabel(card.label.toUpperCase(), regular, metaSize, inner.w * 0.75), { x: inner.x, y: metaY, size: metaSize, font: regular, color: MUTE });
      const num = String(n).padStart(2, "0");
      front.drawText(num, { x: inner.x + inner.w - regular.widthOfTextAtSize(num, metaSize), y: metaY, size: metaSize, font: regular, color: MUTE });

      let qBox = { x: inner.x, y: inner.y, w: inner.w, h: inner.h - metaSize * 2 };
      const img = await imageFor(card.image);
      if (img) {
        const maxH = qBox.h * 0.55;
        const sc = Math.min(qBox.w / img.width, maxH / img.height);
        const iw = img.width * sc;
        const ih = img.height * sc;
        front.drawImage(img, { x: qBox.x + (qBox.w - iw) / 2, y: qBox.y + qBox.h - ih, width: iw, height: ih });
        qBox = { ...qBox, h: qBox.h - ih - 2 * MM };
      }
      const q = fit(card.front, bold, qBox, qMax, 6.5, 1.22);
      drawCentered(front, q.lines, bold, q.size, 1.22, qBox);

      // ── Achterzijde: antwoord, gespiegeld ──
      const bs = backSlot(row, col, opts.layout, opts.flip);
      const b = slotXY(bs.row, bs.col);
      const bin = { x: b.x + pad, y: b.y + pad, w: cw - 2 * pad, h: ch - 2 * pad };
      const bMetaY = bin.y + bin.h - metaSize;
      back.drawText("ANTWOORD", { x: bin.x, y: bMetaY, size: metaSize, font: bold, color: MUTE });
      back.drawText(num, { x: bin.x + bin.w - regular.widthOfTextAtSize(num, metaSize), y: bMetaY, size: metaSize, font: regular, color: MUTE });
      if (card.source) back.drawText(fitLabel(card.source, regular, metaSize, bin.w), { x: bin.x, y: bin.y, size: metaSize, font: regular, color: MUTE });
      const aBox = { x: bin.x, y: bin.y + metaSize * 1.8, w: bin.w, h: bin.h - metaSize * 3.8 };
      const a = fit(card.back, regular, aBox, aMax, 5.5, 1.28);
      drawCentered(back, a.lines, regular, a.size, 1.28, aBox);
    }

    footer(front, `${opts.title} — flashcards · blad ${s + 1}/${sheets} · VOORZIJDE (vragen) · print op 100%, dubbelzijdig, omslaan langs de ${opts.flip === "long" ? "lange" : "korte"} zijde`);
    footer(back, `${opts.title} — flashcards · blad ${s + 1}/${sheets} · ACHTERZIJDE (antwoorden)`);
  }

  return doc.save();
}

function fitLabel(text: string, font: PDFFont, size: number, width: number) {
  if (font.widthOfTextAtSize(text, size) <= width) return text;
  let t = text;
  while (t.length > 1 && font.widthOfTextAtSize(t + "…", size) > width) t = t.slice(0, -1);
  return t + "…";
}
