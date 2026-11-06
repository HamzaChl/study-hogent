import type { Block } from "../lib/schema";
import { Img } from "./ui";

const Page = ({ n }: { n?: number }) => (n ? <span className="meta-mute text-[10px] tabular-nums">P. {n}</span> : null);

export function Blocks({ blocks, courseId }: { blocks: Block[]; courseId: string }) {
  return (
    <div className="space-y-8">
      {blocks.map((b, i) => (
        <BlockView key={i} b={b} courseId={courseId} />
      ))}
    </div>
  );
}

function BlockView({ b, courseId }: { b: Block; courseId: string }) {
  switch (b.type) {
    case "p":
      return <p className="max-w-[68ch] text-[15.5px] leading-[1.75] text-[#2a2a2a]">{b.text}</p>;
    case "quote":
      return (
        <figure className="border-y border-ink py-8">
          <blockquote className="text-[22px] font-semibold leading-[1.3] tracking-[-0.015em] sm:text-[28px]">{b.text}</blockquote>
          {b.cite && <figcaption className="mt-5 meta-mute">{b.cite}</figcaption>}
        </figure>
      );
    case "definition":
      return (
        <div className="grid gap-2 border-t border-line pt-4 sm:grid-cols-[220px_1fr_auto] sm:gap-8">
          <dt className="text-[12px] font-bold uppercase tracking-[0.06em]">{b.term}</dt>
          <dd className="text-[15.5px] leading-[1.65]">{b.text}</dd>
          <Page n={b.page} />
        </div>
      );
    case "list":
      return (
        <ul className="max-w-[68ch] border-t border-line">
          {b.items.map((it, i) => (
            <li key={i} className="flex gap-4 border-b border-line py-3 text-[15px]">
              <span className="text-mute">—</span>
              {it}
            </li>
          ))}
        </ul>
      );
    case "table":
      return (
        <figure>
          {(b.caption || b.page) && (
            <figcaption className="mb-3 flex justify-between">
              <span className="meta font-bold">{b.caption}</span>
              <Page n={b.page} />
            </figcaption>
          )}
          <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[420px] border-collapse text-left text-[14px]">
              <thead>
                <tr className="border-y border-ink">
                  {b.headers.map((h, i) => (
                    <th key={i} className="py-3 pr-4 text-[10.5px] font-bold uppercase tracking-meta">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.rows.map((r, i) => (
                  <tr key={i} className="border-b border-line align-top">
                    {r.map((c, j) => (
                      <td key={j} className={`py-3 pr-4 ${j === 0 ? "font-semibold" : ""} ${/^[A-Z]{3,}$/.test(c) ? "font-extrabold tracking-[0.04em]" : ""}`}>
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </figure>
      );
    case "figure":
      return (
        <figure className={b.wide ? "" : "max-w-2xl"}>
          <div className="overflow-hidden border border-line bg-haze">
            <Img courseId={courseId} src={b.src} alt={b.caption} tone="hover-color" className="mx-auto max-h-[560px] w-auto object-contain" />
          </div>
          <figcaption className="mt-3 flex justify-between gap-6 text-[12px] text-mute">
            <span>{b.caption}</span>
            <Page n={b.page} />
          </figcaption>
        </figure>
      );
    case "gallery":
      return (
        <div className="grid grid-cols-1 border-l border-t border-line sm:grid-cols-2 lg:grid-cols-3">
          {b.items.map((it, i) => (
            <figure key={i} className="group flex flex-col border-b border-r border-line p-5">
              <div className="aspect-square overflow-hidden bg-haze">
                <Img courseId={courseId} src={it.src} alt={it.caption ?? it.title} tone="hover-color" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
              </div>
              <figcaption className="mt-4 flex flex-1 flex-col">
                <span className="text-[15px] font-bold leading-snug">{it.title}</span>
                {it.caption && <span className="mt-1 text-[12.5px] leading-relaxed text-mute">{it.caption}</span>}
                <span className="mt-auto pt-3">
                  <Page n={it.page} />
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      );
    case "note":
      return (
        <aside className="max-w-[68ch] border-l-2 border-ink pl-5 text-[14px] leading-relaxed text-[#333]">
          <span className="meta mr-2 font-bold">NB</span>
          {b.text}
        </aside>
      );
    case "missing":
      return (
        <aside className="border border-dashed border-line px-6 py-8">
          <p className="meta font-bold">Lesmateriaal nog niet beschikbaar</p>
          <p className="mt-2 max-w-[60ch] text-[13px] text-mute">{b.text}</p>
        </aside>
      );
  }
}
