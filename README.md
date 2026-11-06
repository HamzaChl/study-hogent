# Study Archive

The interface is entirely in Dutch.

Editorial study platform for the Bachelor Interieurvormgeving (HOGENT / KASK).
React + TypeScript + Tailwind (Vite). Progress is stored in `localStorage`.

## Run locally

```bash
npm install
npm run dev            # → http://localhost:5173
```

On a phone on the same Wi-Fi: `npm run dev -- --host`, then open the “Network” address.

| Command | Purpose |
|---|---|
| `npm run build` | typecheck + static build in `dist/` |
| `npm run preview` | serve `dist/` locally |
| `npm run validate-content` | check all content JSON against the schema |
| `npm run extract-images -- <pdf> <course> [prefix]` | extract slide photos (needs `pip install pymupdf`) |
| `npm run ingest -- <pdf> <course> <lectureId>` | draft a new lecture file from a PDF with Claude |

### Images (not in git)

Slide images belong to KASK/HOGENT and live in `public/content/<course>/img/` (ignored by git).
After a fresh clone, recreate them from the PDF in `/sources/`:

```bash
pip install pymupdf
npm run extract-images -- "sources/2026-27_1IV_CONSTRUCTIE_LES_02_-_Materialen,_elementen,_structuren.pdf" constructie
```

Without them, the app still works and shows a neutral placeholder.

## Content: three layers

| Layer | File | Source |
|---|---|---|
| **Official curriculum** | `content/<course>/course.json` | BaMaFlex (parts, topics, objectives, evaluation, study time) |
| **Lecture material** | `content/<course>/lectures/<id>.json` → `chapters` | uploaded lecture PDF, with page references |
| **AI-generated exercises** | same file → `flashcards`, `practice`, `exam` | written from the lecture material, labelled as such in the UI |

Quiz files (`content/<course>/quizzes/*.json`) contain: `id`, `question`, four `options`, `answer` (index 0–3), `explanation`,
`course`, `difficulty` and an optional `source` (lecture + pages).

`content/catalog.json` holds the five homepage cards. The schema is in `src/lib/schema.ts`.

Each curriculum topic becomes **available** as soon as a lecture chapter lists it in `topicIds`; otherwise
the course page shows *Lesmateriaal nog niet beschikbaar*. Nothing is written for topics without material.

### Adding a new lecture PDF

1. Put the PDF in `/sources/` (ignored by git).
2. `npm run extract-images -- sources/les03.pdf constructie les03-`
3. `npm run ingest -- sources/les03.pdf constructie les03` (needs `ANTHROPIC_API_KEY` or `ant auth login`).
   The script sends the curriculum + existing lectures as context, so it maps the PDF to the right topics,
   continues chapter numbering and avoids duplicates. Output: `content/constructie/lectures/les03.draft.json`.
4. **Review the draft**, then rename it to `les03.json`, and run `npm run validate-content`.

Drafts (`*.draft.json`) are never loaded by the app.

## Features

- **Home** — giant headline, working ALL / AVAILABLE / COMING SOON filters, 3/2/1-column grid.
- **Study** — chapter index, lessons with definitions, tables, image galleries and page references,
  summary, *Mark as completed*; full official curriculum with availability per topic.
- **Flashcards** — flip (click / space), Previous / Next / I know this / Review again, decks
  *Not mastered* and *To review*, shuffle. Keys: ← → K R.
- **Flashcards → PDF (A4)** — button “PDF A4 ↓”: current selection or all cards, 18 (63×46 mm) or 10 (95×55 mm)
  per sheet, duplex long or short edge (back side mirrored so each answer lands behind its question), optional cut
  marks, auto-fitted text. Generated in the browser with pdf-lib; Inter (OFL, `src/assets/fonts/`) is embedded and
  subsetted, so characters such as ≠ and curly quotes print correctly. Print at 100% scale.
- **Practice** — multiple choice, true/false, definitions, matching, short answers;
  explanation + lecture page after each answer; accuracy tracking; *Retry incorrect*.
- **Quiz** — fixed question sets (`content/<course>/quizzes/*.json`), one question at a time, green progress bar,
  immediate feedback (correct = green, wrong = red), Dutch explanation, results page with review, score /20 (practice only),
  retry; results saved locally. `quiz01` holds the 10 supplied questions, translated to Dutch with the original answer key.
- **Exam** — simulation in the official format (closed and open questions, drawing discussion),
  answers hidden until submission, score /20 labelled *simulated*, mistakes explained, topics to revise.
- **Progress** — lessons, mastered cards, practice answered/accuracy, exam history; export/import/reset.
- **Search** — `/` or SEARCH: lessons, flashcards, exercises, curriculum.

## Course 02 — Geschiedenis en actualiteit van Architectuur

`content/geschiedenis-architectuur/course.json` (`"layout": "history"`) holds the BaMaFlex data: the three objectives,
the assessment (written exam 70%, tekenkundig onderzoek 20%, observatiewandelingen 10%) and a **provisional**
chronological timeline (`provisional.sections`, ids `h01`–`h07`). It is explicitly not the lecturer's chapter list.

No lecture material has been uploaded yet, so every mode shows a preview and invents nothing:

- **Studeren**: timeline. A section becomes clickable once a lecture chapter lists its id in `topicIds`.
  History lessons use the sections *Historische context, Stijlkenmerken, Belangrijke architecten, Sleutelwerken,
  Architecturale analyse, Samenvatting*.
- **Herken het gebouw**: built from `buildings` in the lecture files (name, architect, period, location, style,
  features, explanation, image, page). It needs at least 4 buildings; wrong answers are taken only from other
  buildings in the lectures.
- **Flashcards**: optional `category` (`architecten | gebouwen | stijlperiodes | begrippen | context`) and `image`.
- **Quiz / Examen**: same quiz engine as Constructie; the exam page maps the official criteria to practice modes.
- **Opdrachten**: 10 drawings and 3 walks, saved per course. Uploaded images are stored in IndexedDB on the
  device and are not included in the JSON backup.

`npm run ingest -- <pdf> geschiedenis-architectuur les01` uses the history rules automatically (timeline mapping,
fixed lesson sections, `buildings`, flashcard categories).

## Private deployment (required)

The site must not be public: it contains course images. `index.html` has `noindex, nofollow` and
`public/robots.txt` disallows everything — but that does not block access. Add real protection:

- **Cloudflare Access** (recommended, free up to 50 users): deploy `dist/` on Cloudflare Pages
  (build `npm run build`, output `dist`), then Zero Trust → Access → *self-hosted application* on your
  subdomain, policy *Allow → Emails →* the student's address.
- **HTTP Basic Auth**:
  Apache `.htaccess` — `AuthType Basic` / `AuthName "Study Archive"` / `AuthUserFile /abs/path/.htpasswd` / `Require valid-user`
  (create with `htpasswd -c /abs/path/.htpasswd lyna`, outside the web root);
  Nginx — `auth_basic "Study Archive"; auth_basic_user_file /etc/nginx/.htpasswd;`;
  Vercel — Password Protection; Netlify — `Basic-Auth` in `_headers` (paid plans).

The build uses relative paths, so it works at the root of a subdomain or in a sub-folder.

## Structure

```
content/            catalog.json · <course>/course.json · <course>/lectures/*.json
src/lib/            schema.ts · content.ts · progress.tsx · router.ts · text.ts
src/components/     Header · Blocks · SearchOverlay · ui (FitText, Img, SourceTag, Bar…)
src/pages/          Home · About · Progress · CoursePage
src/pages/course/   StudyIndex · Chapter · Flashcards · Practice · Exam
scripts/            ingest.ts · validate.ts · extract_images.py
```
