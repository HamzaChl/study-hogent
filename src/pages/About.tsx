import { FitText, SectionLabel, SourceTag } from "../components/ui";

export default function About() {
  return (
    <div className="page-fade">
      <FitText className="mt-8 sm:mt-10">OVER</FitText>

      <div className="mt-14 grid gap-12 border-t border-ink pt-10 lg:grid-cols-[1fr_1fr]">
        <p className="text-[26px] font-semibold leading-[1.2] tracking-[-0.02em] sm:text-[34px]">
          Een persoonlijk studiearchief voor de Bachelor Interieurvormgeving aan HOGENT / KASK — lesmateriaal omgezet in lessen, flashcards, oefeningen, quizzen en examentraining.
        </p>
        <div className="space-y-5 text-[14px] leading-relaxed text-[#333]">
          <p>Elke cursus volgt het officiële curriculum. Lessen worden enkel geschreven op basis van geüpload lesmateriaal; onderwerpen zonder materiaal staan op <em>Lesmateriaal nog niet beschikbaar</em> en worden aangevuld zodra nieuwe les-PDF’s worden toegevoegd. Voor ontbrekende lessen wordt niets verzonnen.</p>
          <p>Alle inhoud is in het Nederlands en volgt de terminologie van de docent.</p>
          <p>De voortgang wordt lokaal in deze browser bewaard. Via Voortgang → Voortgang exporteren maak je een back-up.</p>
        </div>
      </div>

      <section className="mt-16">
        <SectionLabel>Drie soorten inhoud</SectionLabel>
        <div className="grid border-l border-t border-line md:grid-cols-3">
          {[
            { kind: "official" as const, title: "Officieel curriculum", text: "Opbouw van de cursus, leerdoelen, studietijd en examenvorm, overgenomen uit de ECTS-fiche in BaMaFlex." },
            { kind: "lecture" as const, title: "Lesmateriaal", text: "Lessen opgebouwd uit de geüploade les-PDF’s. Elke definitie en elk voorbeeld verwijst naar de pagina in de oorspronkelijke slides." },
            { kind: "ai" as const, title: "AI-oefeningen", text: "Flashcards, oefeningen, quizvragen en examensimulaties, opgesteld op basis van het lesmateriaal. Het zijn studiehulpmiddelen — geen echte examenvragen." },
          ].map((c) => (
            <div key={c.kind} className="border-b border-r border-line p-7">
              <SourceTag kind={c.kind} />
              <h3 className="mt-6 text-[20px] font-bold tracking-[-0.02em]">{c.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-mute">{c.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <SectionLabel>Bronnen</SectionLabel>
        <ul className="border-t border-ink text-[14px]">
          <li className="grid gap-1 border-b border-line py-4 sm:grid-cols-[240px_1fr]"><span className="meta-mute">Curriculum</span><span>BaMaFlex — Constructie, Bachelor in de interieurvormgeving, HOGENT, academiejaar 2026-27</span></li>
          <li className="grid gap-1 border-b border-line py-4 sm:grid-cols-[240px_1fr]"><span className="meta-mute">Les 02</span><span>Constructie — Materialen, elementen, structuren (59 pagina’s)</span></li>
          <li className="grid gap-1 border-b border-line py-4 sm:grid-cols-[240px_1fr]"><span className="meta-mute">Afbeeldingen</span><span>Uit de lesslides — enkel voor persoonlijk studiegebruik. Deze website is niet openbaar.</span></li>
        </ul>
      </section>
    </div>
  );
}
