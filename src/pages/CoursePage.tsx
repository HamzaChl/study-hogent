import { HeaderShell } from "../components/Header";
import { FitText } from "../components/ui";
import { catalog, getBundle, type CourseBundle } from "../lib/content";
import { FLASHCARD_CATEGORY_LABEL } from "../lib/schema";
import ChapterView from "./course/Chapter";
import Exam from "./course/Exam";
import Flashcards from "./course/Flashcards";
import Practice from "./course/Practice";
import { QuizOverview, QuizRun } from "./course/Quiz";
import StudyIndex from "./course/StudyIndex";
import Assignments from "./history/Assignments";
import HistoryExam from "./history/HistoryExam";
import HistoryIndex from "./history/HistoryIndex";
import Preview from "./history/Preview";
import Recognition from "./history/Recognition";

type Mode = { key: string; label: string };

const DEFAULT_MODES: Mode[] = [
  { key: "study", label: "Studeren" },
  { key: "flashcards", label: "Flashcards" },
  { key: "practice", label: "Oefenen" },
  { key: "quiz", label: "Quiz" },
  { key: "exam", label: "Examen" },
];

const HISTORY_MODES: Mode[] = [
  { key: "study", label: "Studeren" },
  { key: "herken", label: "Herken het gebouw" },
  { key: "flashcards", label: "Flashcards" },
  { key: "quiz", label: "Quiz" },
  { key: "exam", label: "Examen" },
  { key: "opdrachten", label: "Opdrachten" },
];

const QUIZ_CATEGORIES = [
  "Gebouwen herkennen",
  "Architecten herkennen",
  "Stijlperiodes identificeren",
  "Chronologie",
  "Architecturale terminologie",
  "Historische context",
  "Architecturale kenmerken",
  "Vergelijking van gebouwen",
];

export default function CoursePage(props: { courseId: string; mode?: string; chapterId?: string; params: URLSearchParams; onSearch: () => void }) {
  const bundle = getBundle(props.courseId);

  if (!bundle) {
    const c = catalog.find((x) => x.id === props.courseId);
    return (
      <>
        <HeaderShell left={<a href="#/" className="meta link-u">← Alle cursussen</a>} right={null} />
        <FitText className="mt-10">{c ? c.title.toUpperCase() : "NIET GEVONDEN"}</FitText>
        <p className="mt-10 max-w-md text-sm text-mute">{c ? "Binnenkort beschikbaar. Nieuw studiemateriaal volgt binnenkort." : "Deze cursus bestaat niet."}</p>
      </>
    );
  }

  const { course } = bundle;
  const history = course.layout === "history";
  const modes = history ? HISTORY_MODES : DEFAULT_MODES;
  const mode = modes.some((m) => m.key === props.mode) ? props.mode! : "study";
  const base = `#/course/${course.id}`;
  const inChapter = mode === "study" && props.chapterId;
  const inQuiz = mode === "quiz" && props.chapterId;

  return (
    <>
      <HeaderShell
        left={
          <a href="#/" className="meta link-u">
            ← Alle cursussen
          </a>
        }
        right={
          <nav aria-label="Leermodi" className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:gap-x-7">
            {modes.map((m, i) => (
              <span key={m.key} className="flex items-center gap-x-4 sm:gap-x-7">
                {i > 0 && <span aria-hidden className={`hidden text-line ${history ? "xl:inline" : "lg:inline"}`}>—</span>}
                <a href={`${base}/${m.key}`} aria-current={mode === m.key ? "page" : undefined} className={`meta ${mode === m.key ? "border-b border-ink pb-0.5 text-ink" : "link-u text-mute hover:text-ink"}`}>
                  {m.label}
                </a>
              </span>
            ))}
            <button onClick={props.onSearch} className="meta link-u hidden text-mute hover:text-ink md:inline" aria-label="Zoeken">
              Zoeken
            </button>
          </nav>
        }
      />

      {mode !== "study" && !inQuiz && (
        <section className="page-fade mt-8 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
          <div className="min-w-0">
            <p className="meta-mute">
              {course.title} — {course.subtitle}
            </p>
            <h1 className="mt-3 break-words text-[44px] font-extrabold uppercase leading-[0.82] tracking-tightest sm:text-[88px]">{modes.find((m) => m.key === mode)!.label}</h1>
          </div>
          <p className="meta-mute">Cursus {course.number ?? "01"} · 2026–2027</p>
        </section>
      )}

      {mode === "study" && !inChapter && (
        <section className="page-fade">
          <div className="mt-8 space-y-[0.6vw] sm:mt-10">
            {(course.heading ?? [course.title]).map((line) => (
              <FitText key={line} as={line === (course.heading ?? [course.title])[0] ? "h1" : "div"}>{line.toUpperCase()}</FitText>
            ))}
          </div>
          {course.showMeta && <MetaLines bundle={bundle} />}
          <div className="rule mt-8" />
        </section>
      )}

      <div className="page-fade" key={`${mode}-${props.chapterId ?? ""}`}>
        {mode === "study" && (props.chapterId ? <ChapterView bundle={bundle} chapterId={props.chapterId} /> : history ? <HistoryIndex bundle={bundle} /> : <StudyIndex bundle={bundle} />)}
        {mode === "flashcards" &&
          (bundle.flashcards.length || !history ? (
            <Flashcards key={props.params.toString()} bundle={bundle} params={props.params} />
          ) : (
            <Preview
              title="Flashcards architectuurgeschiedenis"
              text="Vraag, begrip of foto op de voorzijde; antwoord en uitleg op de achterzijde. De kaarten worden gemaakt uit het lesmateriaal, verdeeld over vijf categorieën — zodra de lessen geüpload zijn."
              items={Object.values(FLASHCARD_CATEGORY_LABEL)}
            />
          ))}
        {mode === "practice" && <Practice key={props.params.toString()} bundle={bundle} params={props.params} />}
        {mode === "quiz" &&
          (props.chapterId ? (
            <QuizRun bundle={bundle} quizId={props.chapterId} />
          ) : bundle.quizzes.length || !history ? (
            <QuizOverview bundle={bundle} />
          ) : (
            <Preview
              title="Quiz architectuurgeschiedenis"
              text="Dezelfde quizvorm als bij Constructie: één vraag tegelijk, vier antwoorden, directe feedback, uitleg en een resultatenpagina. Vragen worden enkel gemaakt wanneer er voldoende geverifieerd lesmateriaal is."
              items={QUIZ_CATEGORIES}
            />
          ))}
        {mode === "exam" && (history ? <HistoryExam bundle={bundle} /> : <Exam bundle={bundle} />)}
        {mode === "herken" && <Recognition bundle={bundle} />}
        {mode === "opdrachten" && <Assignments bundle={bundle} />}
      </div>
    </>
  );
}

function MetaLines({ bundle }: { bundle: CourseBundle }) {
  const plain = bundle.course.meta.filter((m) => !m.label);
  const labelled = bundle.course.meta.filter((m) => m.label);
  return (
    <div className="mt-8">
      <p className="flex flex-wrap gap-x-6 gap-y-1 text-[12px] font-bold uppercase tracking-[0.1em] sm:text-[13px]">
        {plain.map((m) => (
          <span key={m.value}>{m.value}</span>
        ))}
      </p>
      <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-5">
        {labelled.map((m) => (
          <div key={m.label} className="flex gap-2 text-[11.5px] uppercase tracking-[0.06em]">
            <dt className="text-mute">{m.label} —</dt>
            <dd className="font-semibold">{m.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
