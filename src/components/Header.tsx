import type { ReactNode } from "react";

/** Navigatie zoals in de referentie: merknaam links, kleine links rechts, dunne lijn eronder. */
export function SiteHeader({ active, onSearch }: { active?: "courses" | "about" | "progress"; onSearch: () => void }) {
  const items: { key: "courses" | "about" | "progress"; label: string; href: string }[] = [
    { key: "courses", label: "Cursussen", href: "#/" },
    { key: "about", label: "Over", href: "#/about" },
    { key: "progress", label: "Voortgang", href: "#/progress" },
  ];
  return (
    <HeaderShell
      left={
        <a href="#/" className="text-[13px] font-extrabold uppercase tracking-[0.02em]">
          Studiearchief
        </a>
      }
      right={
        <nav aria-label="Hoofdnavigatie" className="flex items-center gap-x-4 sm:gap-x-8">
          {items.map((it) => (
            <a key={it.key} href={it.href} aria-current={active === it.key ? "page" : undefined} className={`meta link-u ${active === it.key ? "text-ink" : "text-[#333]"}`}>
              {it.label}
            </a>
          ))}
          <span aria-hidden className="hidden text-line sm:inline">—</span>
          <button type="button" onClick={onSearch} className="meta link-u text-[#333]" aria-label="Zoeken (sneltoets /)">
            Zoeken
          </button>
        </nav>
      }
    />
  );
}

export function HeaderShell({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    // relative z-10 : les grands titres FitText (police énorme, interligne serré) débordent vers le haut
    // et recouvraient la nav, la rendant incliquable (ex. page « Over »).
    <header className="relative z-10">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-6">
        {left}
        {right}
      </div>
      <div className="rule-ink" />
    </header>
  );
}
