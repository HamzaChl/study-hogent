import type { ReactNode } from "react";

/** Toont hoe een modus eruit zal zien zolang er geen lesmateriaal is — zonder vragen te verzinnen. */
export default function Preview({ title, text, items, children }: { title: string; text: string; items?: string[]; children?: ReactNode }) {
  return (
    <div className="pt-10">
      <div className="border border-dashed border-line px-6 py-10 sm:px-12">
        <p className="meta-mute">Voorbeeldweergave</p>
        <h2 className="mt-3 text-[26px] font-extrabold uppercase tracking-[-0.03em] sm:text-[38px]">{title}</h2>
        <p className="mt-4 max-w-[64ch] text-[14px] leading-relaxed text-[#444]">{text}</p>
        {items && (
          <ul className="mt-8 grid border-l border-t border-line sm:grid-cols-2 lg:grid-cols-4">
            {items.map((it, i) => (
              <li key={it} className="border-b border-r border-line p-4">
                <span className="text-[11px] font-semibold tabular-nums text-mute">{String(i + 1).padStart(2, "0")}</span>
                <span className="mt-2 block text-[13px] font-bold uppercase">{it}</span>
              </li>
            ))}
          </ul>
        )}
        {children}
        <p className="mt-8 meta-mute">Lesmateriaal nog niet beschikbaar.</p>
      </div>
    </div>
  );
}
