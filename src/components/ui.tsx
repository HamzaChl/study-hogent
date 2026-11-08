import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { asset } from "../lib/content";

/** Reuzentitel die exact de beschikbare breedte vult (zoals “MAGAZINE” in de referentie). */
export function FitText({ children, className = "", as: Tag = "h1" }: { children: string; className?: string; as?: "h1" | "h2" | "div" }) {
  const box = useRef<HTMLDivElement>(null);
  const probe = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState<number | null>(null);

  useLayoutEffect(() => {
    const fit = () => {
      if (!box.current || !probe.current) return;
      const w = probe.current.getBoundingClientRect().width;
      if (w > 0) setSize((98.6 * box.current.clientWidth) / w);
    };
    fit();
    const ro = new ResizeObserver(fit);
    if (box.current) ro.observe(box.current);
    document.fonts?.ready.then(fit).catch(() => {});
    return () => ro.disconnect();
  }, [children]);

  return (
    <div ref={box} className={`relative w-full overflow-x-clip ${className}`}>
      <span ref={probe} aria-hidden className="pointer-events-none invisible absolute left-0 top-0 whitespace-nowrap font-extrabold tracking-tightest" style={{ fontSize: 100 }}>
        {children}
      </span>
      <Tag
        className="block whitespace-nowrap font-extrabold uppercase leading-[0.78] tracking-tightest text-ink"
        style={{ fontSize: size ?? "18vw", visibility: size ? "visible" : "hidden" }}
      >
        {children}
      </Tag>
    </div>
  );
}

/** Afbeelding met redactionele zwart-witbehandeling en een nette terugval als het bestand ontbreekt. */
export function Img({ courseId, src, alt, className = "", tone = "mono", raw = false }: { courseId?: string; src: string; alt: string; className?: string; tone?: "mono" | "hover-color" | "color"; raw?: boolean }) {
  const [failed, setFailed] = useState(false);
  const url = raw || !courseId ? `${import.meta.env.BASE_URL}${src}` : asset(courseId, src);
  if (failed) {
    return (
      <div className={`flex items-center justify-center bg-haze p-4 text-center ${className}`} role="img" aria-label={alt}>
        <span className="meta-mute">Beeld niet beschikbaar</span>
      </div>
    );
  }
  const toneCls = tone === "mono" ? "grayscale contrast-[1.15]" : tone === "hover-color" ? "grayscale transition-[filter] duration-500 hover:grayscale-0" : "";
  return <img src={url} alt={alt} loading="lazy" onError={() => setFailed(true)} className={`${toneCls} ${className}`} />;
}

/** Onderscheid tussen de drie soorten inhoud. */
export function SourceTag({ kind, children }: { kind: "official" | "lecture" | "ai"; children?: ReactNode }) {
  const label = { official: "Officieel curriculum", lecture: "Lesmateriaal", ai: "AI-oefening" }[kind];
  return (
    <span className="inline-flex items-center gap-2 meta text-[10px] text-mute">
      <span className={`inline-block h-1.5 w-1.5 ${kind === "official" ? "bg-ink" : kind === "lecture" ? "border border-ink" : "rounded-full border border-mute"}`} aria-hidden />
      {label}
      {children && <span className="text-ink">· {children}</span>}
    </span>
  );
}

export function Bar({ value, label, detail }: { value: number; label: string; detail?: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <span className="meta">{label}</span>
        <span className="meta tabular-nums">{detail ?? `${pct}%`}</span>
      </div>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-ok-soft" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className="h-full rounded-full bg-ok transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-5">
      <h2 className="meta font-bold">{children}</h2>
      {right}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="border border-line px-6 py-10 text-center text-sm text-mute">{children}</p>;
}
