import { useState, type ReactNode } from "react";
import { FitText, Img } from "../components/ui";
import { catalog, pad2 } from "../lib/content";
import type { CatalogCourse } from "../lib/schema";

type Filter = "all" | "available" | "coming-soon";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Alle" },
  { key: "available", label: "Beschikbaar" },
  { key: "coming-soon", label: "Binnenkort beschikbaar" },
];

export default function Home() {
  const [filter, setFilter] = useState<Filter>("all");
  const shown = catalog.filter((c) => filter === "all" || c.status === filter);

  return (
    <div className="page-fade">
      <FitText className="mt-8 sm:mt-10">CURSUSSEN</FitText>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 pb-8 sm:mt-14">
        <h2 className="text-[11px] font-bold uppercase tracking-meta">Categorieën</h2>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter cursussen">
          {FILTERS.filter((f) => f.key === "all" || catalog.some((c) => c.status === f.key)).map((f) => (
            <button key={f.key} type="button" onClick={() => setFilter(f.key)} aria-pressed={filter === f.key} className={`pill ${filter === f.key ? "pill-active" : "hover:border-ink"}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 pl-px pt-px md:grid-cols-2 lg:grid-cols-3">
        {shown.map((c) => (
          <CourseCard key={c.id} course={c} index={catalog.indexOf(c)} total={catalog.length} />
        ))}
      </div>
      <p className="mt-6 meta-mute">
        {shown.length} {shown.length === 1 ? "cursus" : "cursussen"}
      </p>
    </div>
  );
}

function CourseCard({ course, index, total }: { course: CatalogCourse; index: number; total: number }) {
  const available = course.status === "available";
  const inner = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-ink">
          {pad2(index + 1)} / {pad2(total)}
        </span>
        <span className="pill">{course.category}</span>
      </div>
      <div className="mt-6 aspect-square overflow-hidden bg-haze">
        <Img src={course.image} alt={course.imageAlt} raw className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]" />
      </div>
      <h3 className="mt-7 text-[22px] font-bold leading-tight tracking-[-0.02em]">
        <span className="bg-[length:0%_2px] bg-left-bottom bg-no-repeat pb-0.5 transition-[background-size] duration-300 [background-image:linear-gradient(#080808,#080808)] group-hover:bg-[length:100%_2px]">
          {course.title}
        </span>
      </h3>
      {course.subtitle && <p className="mt-1 text-[13px] font-medium text-ink">{course.subtitle}</p>}
      <p className="mt-3 text-[12.5px] leading-[1.65] text-mute">{course.description}</p>
      <dl className="mt-auto flex flex-wrap gap-x-5 gap-y-1 pt-8 text-[10.5px]">
        {course.meta.map((m) => (
          <div key={m.label} className="flex gap-1.5">
            <dt className="font-bold">{m.label}</dt>
            <dd className="text-[#444]">{m.value}</dd>
          </div>
        ))}
      </dl>
    </>
  );

  const cls = "-ml-px -mt-px flex flex-col border border-line p-7 sm:p-8";
  return available ? (
    <a href={`#/course/${course.id}`} className={`group ${cls} transition-colors duration-300 hover:bg-haze/60 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink`} aria-label={`${course.title} — ${course.subtitle ?? ""}: open de cursus`}>
      {inner}
    </a>
  ) : (
    <DisabledCard className={cls} label={`${course.title} — cursus nog niet beschikbaar`}>
      {inner}
    </DisabledCard>
  );
}

/** Niet-klikbare kaart: gedempt, met een zwevend label dat de muis volgt. */
function DisabledCard({ className, label, children }: { className: string; label: string; children: ReactNode }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  return (
    <article
      className={`${className} cursor-not-allowed select-none`}
      aria-label={label}
      aria-disabled="true"
      onMouseMove={(e) => setPos({ x: e.clientX, y: e.clientY })}
      onMouseLeave={() => setPos(null)}
    >
      <div className="flex flex-1 flex-col opacity-45 grayscale">{children}</div>
      {pos && (
        <span
          role="tooltip"
          className="pointer-events-none fixed z-50 whitespace-nowrap bg-ink px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-meta text-paper"
          style={{ left: pos.x + 14, top: pos.y + 16 }}
        >
          Cursus nog niet beschikbaar
        </span>
      )}
    </article>
  );
}
