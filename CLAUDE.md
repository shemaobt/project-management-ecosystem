# Ecossistema Shemá — Agent Guidelines

This file is the **working guide** for LLM agents in this repository: how to build here, what owns what, which guards
must stay green. Follow it exactly as written.

**It does not describe the product.** What the PME does — every business rule, who may do what, what a sensitive project
shows to whom — lives in [`docs/PRD.md`](docs/PRD.md), written from the code. When this file needs a product rule, it
links to it (`RN-PME-nnn`). If the two ever disagree about behaviour, the PRD wins, and the code wins over both.

> **Rule zero — the frontend is built from `DS-PROJECT/`.**
> `DS-PROJECT/` is the approved, client-validated design prototype. Every screen, layout, component, token, label and
> interaction is derived from it. Do not invent screens, do not redesign, do not substitute a visual language. See §2.

> **Rule one — no backend is being built.**
> `shemaobt/shema-api` exists and runs; Shemá is a **module inside it**, on its `dev` branch. Every backend need is an
> addition inside that module. See §3.2.

> **Rule two — a change of behaviour changes the PRD in the same PR.**
> Add, edit or retire the `RN-PME-nnn` it touches (numbers are never reused), and move anything the client has not
> decided to the PRD's "Para a Karina validar". Do not write business rules back into this file.

---

## 1. What this project is

The **PME** is the console of the Shemá Ecosystem: it follows the Bible-translation projects that YWAM/JOCUM field teams
run in seven regions. It is not a generic PM tool; it keeps four answers current for every project — where it is, how it
progresses, how the team is, what it needs. The audience, the roles and every area are in the PRD
([§1](docs/PRD.md#sec-1), [§2](docs/PRD.md#sec-2), [§3](docs/PRD.md#sec-3)).

| Document | What it owns |
|---|---|
| [`docs/PRD.md`](docs/PRD.md) | What the product does: rules, role × action matrix, life cycles, privacy, open questions for the client |
| `CLAUDE.md` (this file) | How to work in this repository |
| [`docs/data-contracts.md`](docs/data-contracts.md) | The shape of what travels between the console and `shema-api` |
| [`docs/integracao-pme-rrf.md`](docs/integracao-pme-rrf.md) | The flows that cross the PME and the resource-request form (blocks INT-A…INT-H) |
| [`docs/deploy.md`](docs/deploy.md) · [`docs/runbook.md`](docs/runbook.md) | Deploy, rollback, operations |
| [`docs/a11y-followups.md`](docs/a11y-followups.md) | Accessibility gaps that are known and open |
| [`docs/pulso-offline/desenho.md`](docs/pulso-offline/desenho.md) | The design of the Monthly Pulse offline file |

### The two repos

| | Repo | Role |
|---|---|---|
| Frontend | **`shemaobt/project-management-ecosystem`** — this repo | The console (Vite app). `DS-PROJECT/` is a local-only reference, not versioned here. |
| Backend | **`shemaobt/shema-api`** (formerly `tripod-api`) | Existing FastAPI service. Shemá is a module inside it, on **`origin/dev`**. |

Names you will still meet in Linear and in old documents, and what they mean now: `shema-console` is this repo;
`shema-backend`, "build the backend" and "scaffold FastAPI" mean *extend `shema-api`*; `tripod-api` is `shema-api`.

---

## 2. DS-PROJECT is the design source of truth

`DS-PROJECT/` is a standalone HTML prototype (React 18 UMD + Babel standalone, plain CSS, no build). It is **not** the
production stack and must not be copy-pasted wholesale. It **is** the specification for how the product looks.

It is not versioned here (`.gitignore`). Get the design package from the Linear project's *Docs* document, under
**Arquivos do Design**, and unzip it into `DS-PROJECT/` at the repo root. It is read-only.

### Two references — do not confuse them

- **`DS-PROJECT/` is the design authority.** When it and any other source disagree about appearance, it wins.
- **`shemaobt/meaning-map-ui` is the engineering reference only**: dependency versions, `src/` layout, the `cn()` + Radix +
  `cva` pattern, ESLint config, Dockerfile / nginx / Cloud Run wiring. Never copy its screens or its visual decisions.

### What to take from DS-PROJECT

| Concern | Source in `DS-PROJECT/` |
|---|---|
| Design tokens | `design-system/colors_and_type.css` |
| Fonts (Montserrat, Merriweather) | `design-system/fonts/`, `fonts/` |
| Logo, marks, pattern tile, photography | `design-system/assets/` |
| Component and page styling | `app.css` (sectioned by area) |
| Shell, header, hero, sidebar, filters, toolbar | `app.jsx` |
| Project cards | `cards.jsx` |
| Project record (detail + edit) | `modals.jsx` — including the option vocabularies, ported verbatim |
| Health assessment wizard | `health-modal.jsx` |
| Rhythm · ETEN · Prayer wall · Intercessors | `ritmo.jsx` · `eten.jsx` · `oracao.jsx` · `intercessores.jsx` |
| Forms hub | `forms-hub.jsx`, `forms-variations.jsx` |
| Team org chart | `equipe.jsx` |
| Night globe | `globe.jsx`, `continents.js`, `coords.js` (`worldmap.jsx` is never mounted) |
| Notifications | `notifications.jsx` |
| Domain helpers and PT/EN strings | `data.js`, `projects.js` |
| Full-page reference renders, screenshots | the `*.html` decks at the root, `deck-assets/`, `_*.png` |

### How to work with it

- **Before building a screen**, open the corresponding prototype file (and its `.html` deck) and read it. Match structure,
  hierarchy, spacing, wording and states.
- **Port, don't reinvent**: translate markup + CSS into React + TypeScript + Tailwind v4. Port the logic too where it
  exists.
- **CSS variables map 1:1 to Tailwind tokens.** No raw CSS variables in JSX where a token exists; no hex value absent from
  the prototype.
- **Copy is part of the design**: labels, eyebrows, empty states, tooltips and toasts the prototype already writes come from `DS-PROJECT/data.js` (`I18N.pt` / `I18N.en`), reused verbatim under the same key in the two catalogues (§9). A key the prototype does not have is new copy and goes to the PRD's "Para a Karina validar".
- **The prototype wins on visuals; the PRD wins on behaviour.** Many screens deliberately diverge from the prototype's
  behaviour (the Diário's progress rings, zero-count filter options, the globe as an illustration, the whole Acesso area,
  which the prototype does not draw). Where the prototype shows something the PRD does not describe, ask before porting it.
- **A ported value can still fail.** A colour pair, a string or a quirk copied from the prototype passes the same checks
  as new code (§7.1, §13).
- **Do not modify `DS-PROJECT/`.**

---

## 3. Stack and Build

### 3.1 Frontend (this repo)

- **React 19.2 · TypeScript 5.9 · Vite 7** (`@vitejs/plugin-react`, `@tailwindcss/vite`). Versions are pinned by
  `package-lock.json`; do not bump a major in passing.
- **Routing**: react-router-dom v7, `BrowserRouter`, every route declared in `src/App.tsx`.
- **Styling**: **Tailwind CSS v4 only** — no CSS-in-JS, no SASS. Tokens in `src/index.css` (`@theme`).
- **UI primitives**: Radix via shadcn-style components in `src/components/ui/`.
- **State**: Zustand for cross-page state; React Context for auth and theme (§8).
- **HTTP**: Axios, one client, in `src/services/api/` (§8).
- **Icons**: lucide-react, outline, `strokeWidth 1.75`. **Toasts**: sonner. **i18n**: i18next (§9).
- **Utilities**: `cva`, `clsx`, `tailwind-merge`; merge classes with `cn()` from `src/utils/cn.ts`.
- **Maps**: the Atlas is a hand-drawn SVG globe (`src/components/pages/projetos/Atlas/`), never a tile map — a tile server
  would see which regions each user inspects. `react-leaflet` and `leaflet` are still in `package.json` and are not
  imported by any screen.

Do not introduce Redux, MobX, a second styling system or a second HTTP client.

**Radix rules that cost a review each:**

- **An ARIA role is a contract, and only the primitive keeps it.** Never hand-write `role="radio"`, `role="radiogroup"`,
  `role="checkbox"`, `role="switch"`, `role="tablist"` or `aria-checked` on a screen. Single choice goes through
  `ui/RadioGroup` (`RadioField`, `Radio`, `RadioButton`) even when it does not look like a radio — three mutually
  exclusive pills are a `RadioGroup`, not three buttons with `aria-pressed`. `src/components/ui/__tests__/primitives.test.ts`
  fails the build otherwise.
- **`RadioGroup` finishes the arrow move Radix starts.** Radix checks an item only if the arrow is still down when focus
  lands; `RadioGroup` completes it once, so a short key press or a test driver still changes the selection. Arrows only —
  Home and End move focus without checking. Do not remove that code on a Radix upgrade without re-running
  `ui/__tests__/radioGroupArrows.test.ts`.
- **Radix reads `value=""` as "nothing selected".** A vocabulary with an empty member uses the sentinel `"na"` at the
  boundary (`"na"` in, `""` out), as `IdentidadeForm` and `RatingChoice` do. Do not invent a second convention.
- **`Checkbox` and `Radio` require a `label`** (it becomes the `aria-label`); the type refuses a bare one.

**Commands**

```bash
npm run dev            # Vite; /api proxied to VITE_API_PROXY_TARGET (default http://localhost:8000)
npm run lint           # eslint . --max-warnings 0
npx tsc -b             # type check (also the first half of `npm run build`)
npm test               # vitest run — the whole suite
npm run build          # tsc -b && vite build — a server build, without fixture data
npm run check:bundle   # proves no fixture project reached dist/assets
```

Before a PR: `npm run lint && npx tsc -b && npm test`. CI (`.github/workflows/lint.yml`) runs lint, `tsc -b`, the build
and `check:bundle` on every pull request; **it does not run the test suite**, so a green CI is not a green `npm test`.
`joaozinho-review.yml` is the automated reviewer; `deploy.yml` builds and deploys on a merge to `main`.

Other scripts: `npm run fixtures:import` and `fixtures:parity` (both need `DS-PROJECT/` unzipped), `npm run emit:regions`
and `emit:sensitive-names` (§8, "files that cross repositories"), `node scripts/contraste.mjs` (contrast matrix; add
`--escuro` for the dark palette).

**Tests that drive a real browser** (`src/__tests__/headlessChrome.ts`, `src/__tests__/shellProbe.ts`) skip when no Chrome
is found. Point `SHEMA_CHROME` at one, or install `chrome-headless-shell` under `~/.cache/ms-playwright`; where the system
lacks `libasound.so.2`, `LD_LIBRARY_PATH` must reach one. A skipped browser test proves nothing — say so in the PR if you
could not run it.

### 3.2 Backend — the Shemá module inside `shema-api`

`shema-api`'s own `CLAUDE.md` is authoritative for backend conventions. Read it before writing backend code; where it and
this section disagree, it wins.

- **What counts is `origin/dev`.** The module is not on `main`. Start from `origin/dev` in a worktree of your own; a PR
  targets `dev`.
- **Never create a second Shemá service, app or repo.** Endpoints go under `/api/shema` (`app/api/shema/`), logic in
  `app/services/shema/` (one operation per file), schemas in `app/models/shema*.py`, design decisions in `docs/shema.md`.
- **Layering is a hard rule**: zero database access in `app/api/`; every query in `app/services/`; services raise the
  business exceptions of `app/core/exceptions.py` and never import `HTTPException`; async end to end with the injected
  `AsyncSession`; every schema change ships as an Alembic migration with a single head.
- **Reuse before building**: auth, roles, scope helpers, projects, storage, notifications and i18n helpers already exist in
  the platform. Check before writing.
- **Shemá's Health Assessment is not the platform's `project_health` module.** Do not conflate the two models.
- **Every privacy and permission rule is enforced in services**, on every output path. A frontend-only rule is not a rule
  ([PRD §5](docs/PRD.md#sec-5)).
- Stack: FastAPI, `uv`, PostgreSQL via SQLAlchemy 2 async + `asyncpg`, Alembic, Pydantic v2, secrets in GCP Secret Manager,
  commands inside Docker Compose.

---

## 4. Frontend project structure

```
src/
├── App.tsx                 # every route; providers; the toaster
├── main.tsx · index.css    # Tailwind v4 @theme — the Shemá tokens (§7)
├── components/
│   ├── common/             # shared pieces: ConfirmDialog, EmptyState, InfoTooltip, OneTimeLink, OutcomePanel,
│   │                       # PhotoByLink, ProjectsUnread, StatusBadge, ImageUpload, LoadingSpinner…
│   ├── layout/             # AppShell, AppHeader, TopNav, SessionGate, NotificationBell, RoleSwitcher (dev only)
│   ├── pages/              # one folder per area, named in the product's Portuguese (§5)
│   └── ui/                 # Radix + cva primitives
├── contexts/               # AuthContext (+ ApiAuthProvider, MockAuthProvider, apiSession.ts), ThemeContext
├── stores/                 # Zustand, one store per domain; hydration.ts, sessionWipe.ts
├── hooks/                  # useProjectListRead, usePublishedHeight, useResourceForm, useReadsNetwork, useReviewsPrayer
├── services/               # api/ — the one Axios client and the fixture/API switch; pulseFile.ts; mediaStorage.ts
├── fixtures/               # the test double of the API (§4.1)
├── types/ · constants/     # wire types and vocabularies
├── utils/                  # pure functions: access, region, recordAccess, progress, health, cadence, format…
├── i18n/                   # index.ts and locales/pt-BR.json, locales/en.json
├── styles/                 # centralised Tailwind class constants (cards, badges, layout, states, touch)
└── __tests__/              # shared test harness (headless Chrome, shell probe) and the deploy test
scripts/                    # check-bundle, contraste, emit-regions, emit-sensitive-names, generate-parity, import-fixture-data
```

Page folders carry the product's own lowercase Portuguese names (`inicio`, `projetos`, `ficha`, `ritmo`, `oracao`,
`intercessores`, `eten`, `formularios`, `avaliacao`, `intake`, `equipe`, `notificacoes`, `dados`, `acesso`, `convite`,
`senha`, `entrar`). An issue's Scope may spell a folder in English; the repo's naming wins.

### 4.1 The fixture layer is a test double, not a data source

- **Nothing imports `src/fixtures` except the API layer.** Screens, stores, hooks and contexts import the namespaces of `src/services/api`; ESLint refuses any import of `src/fixtures` there (`READS_THROUGH_THE_API_LAYER` in `eslint.config.js`), and inside `src/services/` it refuses a deep import — the API layer reads the double through `src/fixtures` (the index) only.
- **`INTEGRATED` in `src/services/api/source.ts` says, per namespace, real client or double.** Every namespace is `api`
  except `projects`, whose plain `list`/`get` no server route answers; against the server the whole list is read through
  the browse (`loadProjectList` in `src/stores/projectsStore.ts`).
- **`VITE_DATA_SOURCE=fixtures`** forces every namespace to the double: local work with no backend, and what the suite
  runs on. `=api` forces the API. Any other value is ignored.
- **Some features have no double on purpose** — their API export is `null` in fixture mode and the screen draws nothing or says it needs the server: `accessAPI`, `passwordAPI`, `prayerPulseAPI`, `prayerReviewAPI`, `resourceRequestsAPI`, `pulseReturnAPI`, and the export half of `transferAPI`. Two `null` exports keep a local path: `notificationsAPI` (the bell derives its list from the fixture projects, `utils/notifications.ts`) and `transferAPI`'s import (applied locally by `projectsStore.importProjects`). Do not write a double that pretends.
- **The double reproduces the server, including its refusals and reductions** (`src/fixtures/reader.ts` is the only copy of
  the per-reader rule; `src/fixtures/session.ts` holds the mock personas). When the server's rule changes, the double
  follows it — never the other way round.
- **Fixture data is verbatim and never mutated.** `src/fixtures/data/projects.json` is the Notion export as it is; every
  read hands out a `structuredClone`. The export writes dates as `DD/MM/YYYY` and `src/fixtures/normalize.ts` (`toIsoDate`)
  converts them on load.
- **Derivations are pure functions of `(project, now)`** in `src/utils/`, pinned by `src/utils/__tests__/dataJsParity.json`.
  Changing one means regenerating that file with `npm run fixtures:parity`, never hand-editing it.
- **A server build carries none of the fixture data.** `vite.config.ts` swaps the two data files for empty stand-ins
  (`src/fixtures/data/withheld/`) in every build that is not explicitly `VITE_DATA_SOURCE=fixtures`, and
  `npm run check:bundle` fails if a fixture id or a sensitive base reaches `dist/assets`
  ([RN-PME-329](docs/PRD.md#rn-pme-329)).

#### 4.1.1 Stores

- **One Zustand store per domain owns the collection it read**; never two owners of the same collection.
- **A store exposes operations** (`saveProject`, `logMeeting`, `applySubmission`), not a bare `setState` — an operation
  maps to an endpoint.
- **Background reads go through `hydrateOnce`** (`src/stores/hydration.ts`): concurrent callers share one request, a
  failure is classified and announced once, and `hydrated` stays false so no screen renders an empty list as the truth
  ([RN-PME-016](docs/PRD.md#rn-pme-016)).
- **The project list is read once and again after a write.** Every write this console makes to the server's projects
  calls `projectsStore.invalidate()`; screens read through `useProjectListRead()`. `reload()` and `invalidate()` also tell
  the Projetos browses to ask again (`onListReread`). The Início passes `{ everyVisit: true }`.
- **Persist only what must survive a reload, and never what the server owns.** Persist only what must survive a reload. The record, the submissions, the meeting log, the prayer wall and (against the server) the project list are never stored. Read data that is cached — the org chart and its change trail (`shema-regions-v1`), the intercessor network (`sessionStorage`) — leaves with the session; drafts and preferences are the rest, and every key is accounted for in `src/stores/__tests__/sessionWipe.test.ts` (§8).
- **A persisted store has a version, and the version is the invalidation lever** (`PROJECTS_VERSION`,
  `INTERCESSORS_VERSION`, `SUBMISSIONS_VERSION`): bump it when the shape changes, or an old browser keeps the old copy.
- **A draft is not a write.** Only a save the server accepted consumes a draft.

### Component rules

- Functional components only. Target under 300 lines; over 400 it needs splitting.
- Split by responsibility; co-locate sub-components with the page folder.
- A UI pattern that appears twice is extracted into `components/common/` or `components/ui/`. Before creating, look for
  the one that exists; if it lacks a variant, the variant goes into the shared component.
- Keep state local; lift to Zustand only when shared across routes.
- **The suite has no DOM renderer.** Tests render with `renderToStaticMarkup`, which reads a Zustand store's *initial*
  state. So a connected page is split into a store-wired component and a presentational one that takes props
  (`InicioView`, `EquipeView`, `NotificationsPanelBody`, the dialogs' `*Body`), and state machines are pure reducers
  (`apiSessionReducer`, `personReducer`) or plain modules outside React (`leaderLinkList.ts`, `requestList.ts`). Follow
  that shape; do not add a DOM test library.

---

## 5. Product areas — where the rules live and who owns the code

The rules of each area are in the PRD. This table is the map from an area to its rules and to the **single owners** in
code: the one function or file that decides a fact. Call the owner; never re-derive what it decides.

| § | Area | Rules | Single owners in code |
|---|---|---|---|
| 5.1 | Projetos | [PRD §3.4](docs/PRD.md#sec-3-4) | `useProjectBrowse` (the page's two reads); `filtersStore` (`activeFilterKeys`, `narrowsList`); `encodeAddress` / `encodeView` / `withPlacesKept` in `utils/filterSerialisation.ts`; `GATED_FACETS`; `fitOpenSections`; `normaliseMetaphor`; `OpenableCard` + `cardSummary`; `ProgressRings`; `Atlas/projection.ts` (`groupWithin`, `spreadOffsets`) |
| 5.2 | Ficha do projeto | [PRD §3.5](docs/PRD.md#sec-3-5) | `useDraft` (the seam every tab uses); `recordStore` (`missingRequired`, drafts); `projectRecordStore` (one record, its version, the last save); `recordDiff.changedFields`; `constants/recordFields.ts` (`TAB_FIELDS`, `SERVER_WRITABLE`, `PENDING_WRITE`, the coordination-only sets); `utils/recordAccess.ts`; `constants/recordTabs.ts`; `ficha/saveReport.ts` (`conflictSentence`); `utils/progress.ts`; `utils/health.ts` (`recordAssessment`); `utils/needs.ts` (`isOpenNeed`); `utils/media.ts`; `utils/identity.ts` |
| 5.3 | Formulários | [PRD §3.6](docs/PRD.md#sec-3-6) | `formsStore`; `utils/forms.ts` (`readsReporting`); `utils/rhythm.ts` (`hasReported`, `indexPulses`); `assessmentStore`; `utils/assessment.ts`; `constants/healthQuestions.ts`; `utils/intake.ts` (`tooLongKey`, `answerLength`); `common/PhotoByLink` |
| 5.4 | Ritmo | [PRD §3.7](docs/PRD.md#sec-3-7) | `utils/cadence.ts` (periods, never `new Date(string)`); `constants/meetings.ts` (`RITMO_MEETINGS`, `RITMO_ENCOUNTERS`, `BRIDGE_PEOPLE`); `rhythmStore`; `ritmo/reach.ts`; `utils/annualReport.ts` |
| 5.5 | Oração | [PRD §3.8](docs/PRD.md#sec-3-8) | `utils/prayer.ts` (`buildPrayerRequests`, `reachesPrayerWall` — the fixture path); `oracao/pulseFile.ts`; `hooks/useReviewsPrayer.ts` |
| 5.6 | ETEN | [PRD §3.10](docs/PRD.md#sec-3-10) | The server computes every figure. `utils/etenCredits.ts` is the fixture double and follows the server; `eten/evidence.ts` owns the provenance sentences. The screen imports neither `accountFor` nor `buildEtenReport`. |
| 5.7 | Equipe | [PRD §3.11](docs/PRD.md#sec-3-11) | `regionsStore`; `utils/region.ts` (`resolveRegionRoles`, `resolveProjectRoles`); `utils/team.ts`; `constants/roles.ts` (`ROLE_DEFINITIONS`); `constants/team.ts` |
| 5.8 | Início | [PRD §3.3](docs/PRD.md#sec-3-3) | `utils/indicators.ts` (`INDICATORS`: label ↔ filter ↔ destination) |
| 5.9 | Notificações | [PRD §3.12](docs/PRD.md#sec-3-12) | `notificacoes/useNotifications.ts`; `utils/servedNotices.ts`; `constants/notifications.ts`; `utils/notifications.ts` (the fixture path) |
| 5.10 | Dados do cabeçalho | [PRD §3.13](docs/PRD.md#sec-3-13) | `services/pulseFile.ts` (the one reader of a returned Pulse file); `dados/receivePulse.ts`; `dados/leaderLinkList.ts`; `utils/export.ts` (download and import parsing — the export itself is the server's) |
| 5.11 | PME ↔ Formulário de Recursos | [PRD §6](docs/PRD.md#sec-6) · [`docs/integracao-pme-rrf.md`](docs/integracao-pme-rrf.md) | — |
| 5.12 | Acesso and `/convite` | [PRD §3.14](docs/PRD.md#sec-3-14) | `utils/access.ts`; `constants/access.ts`; `acesso/personState.ts`; `acesso/refusal.ts`; `acesso/pending.ts`; `acesso/sensitiveList.ts`; `common/OneTimeLink` |
| 5.13 | Formulário de Recursos dentro do PME | [PRD §3.15](docs/PRD.md#sec-3-15) | `hooks/useResourceForm.ts`; `utils/requests.ts` (`openResourceForm`, `startPermission`); `ficha/pedidos/requestList.ts`; `services/api/resourceRequests.ts` |
| — | Sessão, entrada e senha | [PRD §3.1](docs/PRD.md#sec-3-1) | §8 |
| — | Casca do app | [PRD §3.2](docs/PRD.md#sec-3-2) | `layout/AppHeader.tsx`; `layout/TopNav.tsx`; `layout/sessionSurface.ts` |
| — | Rede de intercessores | [PRD §3.9](docs/PRD.md#sec-3-9) | `prayerStore`; `utils/intercessors.ts`; `constants/countries.ts`; `utils/countries.ts` |

Rules of this table:

- **Team roles are read by reference** to the org chart (`regionsStore`), never copied into another model. A stamped name
  in an accountability record (who authorized a photo, who changed a seat) is a snapshot and is correct.
- **The intercessor network and the org chart never share a model.** `networkSeparation.test.ts` fails on an import that
  crosses them.
- **Screens under `ficha/` never compute status, health or staleness**: they read the server's `derived`
  (`ficha/__tests__/serverDerivations.test.ts`).
- **A screen that fetches a short-lived link keeps it in component state and nowhere else** — no store, cache, storage or
  log (`mediaPhotoLink.test.ts` sweeps the source).
- **A one-time secret lives in one type and is read only by the components that show it once**: `inviteUrl` (`SentInvite`) by `InvitesSection` and `PendingProjects` (`acessoOwners.test.ts`); a request link's `token` and `code` (`IssuedRequestLink`) by `RequestLinkDialog` (`requestLink.test.ts`). None of them reaches a store or web storage.
- **A ficha tab is one entry that takes `{ mode, draft }`** (`RecordTabProps`) and picks its `*Form` or `*View`; never a second component that restates the tab's fields. The tab is a route segment (`/ficha/:recordId/:tab`), its id is never translated (the label is `TAB_LABEL_KEYS`), and the mode rides the address as `?modo=ver|editar` (`recordMode.ts`). Every tab reads and writes through `useDraft`, and `missingRequired` is the only validator.
- **A field the ficha sends must be in `SERVER_WRITABLE`.** The record's `PATCH` body forbids unknown keys, so one extra field is a 422 on the whole save; a field the server does not take yet goes in `PENDING_WRITE`, and a new field reaches the save only after it is in both the server's model and this set. The save is one request carrying the diff (`changedFields`), never one per tab.
- **The Health Assessment flow produces no file and prints no raw language name**: `avaliacao/__tests__/wizard.test.ts` fails on `createObjectURL`, `new Blob(`, a `download` attribute or an import of `utils/export` anywhere under the flow, and on `languageName` read outside `getLanguageNameDisplay`.
- **A returned Pulse is sent as the bytes the file carried.** `services/pulseFile.ts` hands over the embedded block as text and `pulseReturnAPI.fileSubmission` disables axios's request transform: the server archives those bytes and hashes them for idempotency, so a re-serialised or trimmed body is a different submission.

---

## 6. Domain invariants for whoever writes code

The domain rules are in the PRD: vocabularies and life cycles in [§4](docs/PRD.md#sec-4), privacy in
[§5](docs/PRD.md#sec-5). What follows is what a change must not break.

### 6.1 Sensitive projects — a safety property, not a feature

Product rules: [RN-PME-311](docs/PRD.md#rn-pme-311) to [RN-PME-323](docs/PRD.md#rn-pme-323).

- **The server decides who reads what; the console never does.** A card and a record carry `readAs`; an unknown value
  fails closed (`readReadAs`).
- **Every surface that renders a place, a base or a language name goes through the owners in `src/utils/region.ts`**:
  `getLocationDisplay`, `getLeavingLocation` (what leaves the system), `getMapPlacement`, `getLanguageNameDisplay`. A new
  screen uses them from its first line; never print `languageName`, `location` or `team` of a server-read project raw.
- **Whether a field may be written is `mayWrite` in `src/utils/recordAccess.ts`**, over the sets in
  `constants/recordFields.ts`. Reading is not `mayWrite`: views ask `readsFreeText`.
- **A blank the server withheld is said as withheld**, never as "no data" (`CoordinationOnlyNote`).
- **Any new output surface** — an export, a file, a notice, a public page — is withheld by the flag for every reader and is
  enforced in `shema-api`.
- **A page address never carries a place** (`encodeAddress`).

### 6.2 Consent

Product rules: [RN-PME-325](docs/PRD.md#rn-pme-325) to [RN-PME-327](docs/PRD.md#rn-pme-327),
[RN-PME-198](docs/PRD.md#rn-pme-198), [RN-PME-124](docs/PRD.md#rn-pme-124).

- **The prayer-consent control is one component, `PrayerConsent`**, reused by the record, the health wizard and the leader's
  page. Do not restate it.
- **Raw prayer fields are read only by the files on the allowlist** in `src/utils/__tests__/prayer.test.ts`; any other
  surface gets prayer text already gated.
- **The console never guesses a consent**: for the record's prayer request it sends the visibility only when the control
  moved. A need is different: the ficha sends each need whole, `prayerShared` included, on every save
  ([RN-PME-327](docs/PRD.md#rn-pme-327)).
- **Absence of a decision is "not authorized"**, for prayer and for media.

### 6.3 The intercessor network

Product rules: [PRD §3.9](docs/PRD.md#sec-3-9). The list type carries no contact (`IntercessorEntry`); a contact is one
person, one explicit action. The list lives in `sessionStorage`. Removal erases — no tombstone, no flag.

---

## 7. Design System (Shemá)

Tokens are taken from `DS-PROJECT/design-system/colors_and_type.css` and live in `src/index.css`. Do not override,
reinterpret or invent.

### 7.1 Palette

| Brand token | Hex | Usage |
|---|---|---|
| `branco` | `#F6F5EB` | page background |
| `areia` | `#C5C29F` | sand — calm neutrals, borders |
| `azul` | `#89AAA3` | sage blue — supporting accent |
| `telha` | `#BE4A01` | terracotta — **CTAs and active states only** |
| `verde-claro` | `#777D45` | olive — brand green, success |
| `verde` | `#3F3E20` | deep olive — body text, dark surfaces |
| `preto` | `#0A0703` | warm near-black — headings |

**Semantic layer — use this in code:**

- Backgrounds: `canvas` (= branco), `elevated` (`#FFFFFF`), `muted` (`#ECEADF`), `quiet` (= areia), `inverse` (= verde),
  `brand` (= telha).
- Foreground: `fg` (= verde), `fg-strong` (= preto), `fg-muted` (`#5A5A3E`), `fg-subtle` (`#6A6956`), `on-dark` /
  `on-brand` (= branco), `on-dark-muted` (= areia), `on-light` (= verde), `link` (= telha).
- Accent states: `accent-hover` `#A23E00`, `accent-press` `#872F00`, `accent-soft` `#F2D8C2`.
- Lines: `line` (verde @16%), `line-strong` (@32%), `line-on-dark` (branco @18%).
- **Ink weights** — a colour that carries small text on a light surface has a darker sibling of the same hue: `azul-ink`
  `#406560`, `verde-claro-ink` `#6B713E`, `status-attention-fg` `#8B6018`, `deadline-soon` `#A06C12`, and, for text over
  its own translucent wash, `status-good-ink` `#5B5F35` and `status-attention-ink` `#7E5716`. `urgent` `#B03A1A` /
  `urgent-soft` `#F4D8D2` are the urgent voice, deeper than telha.
- **Fill names for a saturated fill that must not flip in the dark theme**: `bg-brand`, `bg-azul-fill`,
  `bg-verde-claro-fill`, `bg-attention-fill`, `bg-subtle-fill`.

Rules:

- **Telha is for CTAs, primary actions and active states.** Never decorative. (The Diário's washi tape is the prototype's
  own exception.)
- **White only via `bg-elevated`**, never `bg-white`. **No generic greys.** **No arbitrary hex in JSX** — extend the theme.
- **Ink comes from the semantic tier, named after the surface it sits on**: `text-fg` / `text-fg-strong` over canvas,
  `elevated` and `muted`; `text-on-brand` over a brand fill; `text-on-dark` (or `text-on-dark-muted`) over `bg-inverse`
  and the night globe; `text-on-light` over `bg-status-na`. `text-verde`, `text-branco` and `text-preto` are blocked by
  ESLint (`BRAND_INK`), with no exemption list. `text-verde-claro` stays: it is the brand green.
- **A wash or border of the ink colour is named after the ink** (`bg-fg/8`, `border-fg/18`), so it flips with it.
- **A new value in a colour family needs its hue and its reason pinned** in `src/styles/__tests__/tokens.test.ts`. Do not
  add a value without it.
- **Legibility is measured, not assumed.** Small text needs 4.5:1 on **every** surface it renders on; a stroke or glyph
  that carries data needs 3:1. A pill on a translucent wash is measured as what it paints over each surface. When a base
  token fails, move the text — and the fill under it, when the fill is what fails — to the ink sibling; never invent a
  colour. `node scripts/contraste.mjs` prints the matrix.
- **Never veil ink** (`/80`, `opacity-60`) on something that carries text or a glyph: it is an unrecorded contrast change.
- **Never put `telha` ink on an `accent-soft` fill** (3.69:1); use `accent-press`. `tokens.test.ts` fails on the pair in one
  class string; a fill on a parent with the ink on a child is not caught, so check it by eye.
- **Every state is on both channels**: what colour says, text or a glyph says too. `HEALTH_SYMBOLS` and `PRIORITY_SYMBOLS`
  in `src/constants/status.ts` own the glyphs; `glyphDot` in `common/StatusBadge.tsx` owns the shape.
- **Where one class paints several fills, the neutral ink sits on the base and each variant overrides by `data-…:`**, never
  by emission order — the toaster is the worked case (`TOAST_CLASSNAMES`, the toast block of `semanticInk.test.ts`).
- `__tests__` is outside the corpus of every styling rule (`NOT_SHIPPED_STYLING`).

### 7.2 Typography

- **Montserrat** — the whole interface. Weights 400/500/600/700/900.
- **Merriweather** — long-form text, pull quotes and the italic display voice. Weights 300/400/700.
- Scale (px): display 88 · h1 56 · h2 40 · h3 28 · h4 22 · lead 20 · body 16 · small 14 · micro 12 · eyebrow 13 · tag 11.
  **The four display sizes are fluid** (`clamp`), and the number is the ceiling; floors are 44 · 32 · 26 · 22.
- Rhythm: `lh-tight` 1.05 · `lh-snug` 1.2 · `lh-body` 1.55 · `lh-loose` 1.7.
- Tracking: eyebrow `0.14em` uppercase; buttons `0.04em`; headings slightly negative.
- **Eyebrow**: 13px, weight 600, uppercase, `0.14em`, `fg-muted`.
- **Headings: one outline per area, a single `h1`, never skipping a level.** `text-eyebrow` is a class, not a role: a
  section title is a heading and keeps the eyebrow's look; a kicker above a title stays a `<p>`. Retagging never changes
  the visual. `src/components/pages/__tests__/headingOutline.test.ts` renders each area it lists and fails on a second
  `h1` or a jump. Known gap: the ficha is outside that test and jumps from `h1` to `h3`.
- **A page's width is the prototype's.** Containers: `wide` 1500 · `max` 1200 · `mural` 1080 · `reading` 920 · `narrow` 760
  · `modal` 900; `--container-pad` is `clamp(20px, 4vw, 56px)`. Do not round a page to the nearest container to satisfy a
  guard; name the width.
- `src/components/layout/__tests__/acessibilidade.test.ts` fails when a page wrapper pins `max-w-` in pixels instead of a `--container-*` token, when a page container pads in pixels instead of `--container-pad` (the Início alone is exempt, `HERO_ALIGNED`, because it aligns with the `Hero`'s pixel padding), when a display size stops being a `clamp`, or when a screen mounts a Radix dialog's content outside `src/components/ui/`.

### 7.3 Spacing, radii, shadows, motion

- **Base unit 4px.** Scale: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128.
- **Radii**: xs 4 · sm 8 · md 14 · lg 22 · xl 32 · pill 999.
- **Shadows** (warm, low): `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-card`.
- **Cards**: `bg-elevated`, depth from shadow, **no border** — except where the prototype draws a hairline (the Projetos
  list row, the Ritmo meeting card). Check `app.css` before adding a third.
- **Motion**: `--ease-out` `cubic-bezier(.2,.8,.25,1)`, `--ease-in` `cubic-bezier(.5,0,.8,.3)`; 140 / 220 / 380ms. Gentle,
  never bouncy.
- **Reduced motion has one owner**: the `@media (prefers-reduced-motion: reduce)` block at the end of `src/index.css`,
  outside every `@layer`. What displaces goes, what fades stays. No component is edited for it. Motion driven by
  JavaScript reads `prefersReducedMotion()` (`src/utils/motion.ts`). `src/styles/__tests__/reducedMotion.test.ts` fails on
  an animation, a hover displacement or an inline transition the block does not cover.

### 7.4 Dark mode

- `@custom-variant dark` in `src/index.css`; the `.dark` block reassigns the `--color-*` names the utilities read. **No
  component ships `dark:` utilities** (`src/styles/__tests__/darkPalette.test.ts`).
- The night globe is light in both themes: its stage carries `.tema-claro`.
- **The theme is a choice, never inherited from the system** ([RN-PME-028](docs/PRD.md#rn-pme-028)). The stored choice
  reaches the first paint through a classic inline script in `index.html`, which mirrors `loadStoredTheme`;
  `src/contexts/__tests__/themeFirstPaint.test.ts` keeps the two in step and names the hash to admit if a CSP is ever
  added.
- The dark palette is ours, not client-approved. `node scripts/contraste.mjs --escuro` measures it.

### 7.5 Focus, targets and overflow

- **One global `*:focus-visible` outline.** Components do not add `focus:ring-*`.
- **`<main>` is the content anchor** (`CONTENT_ANCHOR_ID` in `src/utils/focus.ts`), and the first focusable node is the
  skip link.
- **Focus never lands on `<body>`.** When a dialog closes by unmounting its trigger, `DialogContent` and `SheetContent`
  run `scheduleFocusRescue()`. The ficha returns focus to the card that opened it (`returnFocusState`, `focusCardOf`), and
  entering edit mode focuses the first field (`focusFirstField`). A control that removes itself hands focus to its
  successor.
- **A disabled primary action stays in the tab order**: `aria-disabled`, described by the reason, not `disabled`.
- **A scroll container whose children are not focusable is a named, focusable region** (`ui/Table` requires the name).
- **Targets are 24×24 CSS px** (`TOUCH_TARGET_PX`). Grow the reach, never the drawn pixel, with `touchTargetPseudo` or
  `touchTargetInline` from `src/styles/touch.ts`; do not repeat the trick by hand.
- **A control that carries an `sr-only` child is itself positioned** (`relative`), or the document grows sideways
  (`src/styles/__tests__/scrollClipping.test.ts`).
- **A `Select` list is capped at the width the screen leaves.** **A grid item that must truncate starts its track at
  zero** (`grid-cols-1`), not `min-w-0`.
- **The header is sticky only where it fits** and publishes its height as `--header-height` (`usePublishedHeight`);
  anything that sticks below it reads that variable, never a pixel.
- **The globe's SVG is `aria-hidden` and holds nothing focusable**; its controls live outside it, in the tab order, with
  names.

---

## 8. State, API and Auth

### State

- **Zustand**, one store per domain: `projectsStore`, `projectRecordStore`, `recordStore`, `filtersStore`,
  `savedViewsStore`, `prefsStore`, `formsStore`, `assessmentStore`, `rhythmStore`, `regionsStore`, `prayerStore`,
  `notificationStore`. Rules in §4.1.1.
- **React Context**: `AuthContext` (the session) and `ThemeContext`.
- **What a session leaves in the browser goes with it** ([RN-PME-010](docs/PRD.md#rn-pme-010) to
  [RN-PME-013](docs/PRD.md#rn-pme-013)). `src/stores/sessionWipe.ts` owns it. **Every `shema-*` key the code writes either
  leaves with the session or is kept for a reason written beside it** — `sessionWipe.test.ts` sweeps them, so a new
  persisted key fails the suite until it is placed. A wipe resets memory first and removes the key second.

### API

All backend calls go through the one Axios instance in `src/services/api/`. Screens and stores import its namespaces, never
`src/fixtures` (§4.1). Add a method to the right namespace; never create a second client or a second auth path.

- **Dev**: Vite proxies `/api` to `VITE_API_PROXY_TARGET`; the client's prefix is `VITE_API_BASE_URL` (default `/api`).
  **Prod**: nginx forwards `/api` to `BACKEND_URL`, which the container requires at start. Nothing under `VITE_*` is a
  secret. Details in [`docs/deploy.md`](docs/deploy.md).
- **The interface is enforced by the compiler**: `index.ts` picks with `pick<typeof fixture.xAPI>(…)`, so the real client
  and the double carry the same methods.
- **The wire is the type, verbatim** — `/api/shema/*` answers camelCase and `src/types/` is that shape. Three places are
  snake_case and each has one named mapping or is typed as it comes: `/api/auth/*`, the two invitation doors, and
  `/api/resource-requests/*` (`src/types/request.ts`).
- **Keep the types aligned with the Pydantic schemas**; read `shema-api`'s OpenAPI rather than inferring from a sample.
  Before adding an endpoint, check whether one exists.
- **A failure has ten readings and one owner**: `toApiFailure` and `failureMessage` in `errors.ts`
  ([RN-PME-014](docs/PRD.md#rn-pme-014), [RN-PME-015](docs/PRD.md#rn-pme-015)). Nobody writes a second sentence, except
  the surfaces that own their reading of a status: sign-in (`entrar/message.ts`), `/convite` (`convite/message.ts`),
  `/acesso` (`acesso/refusal.ts`) and the ficha's save (`ficha/saveReport.ts`).
- **Reading a failure as "the network" takes positive evidence** (`isAxiosError`); anything else is `unexpected`. A test
  double must be as strict as the real error.
- **A vocabulary the console does not know fails closed** (`readSession`, `readReadAs`): never narrow silently.
- **A write that quotes a version sends `If-Match`**, and a `409` has one reader (`readConflict`) and one sentence
  (`conflictSentence`). Nothing retries a conflict by itself.
- **A request whose answer may arrive late is ticketed**: only the latest read lands, and a write that answers supersedes a
  read in the air (`leaderLinkList.ts`, `personState.ts`, `requestList.ts`, the ETEN page). Copy that shape for any list
  that can be re-asked.
- **What signs a guest in goes out on bare Axios**: `accessAPI.join` (sign-up or sign-in, accept, sign-out) and `passwordAPI`, so a guest pair never lands in `tokens.ts` and a refused reset token (401) cannot start a refresh or fire a session event. The intake page, the exit page and the invitation lookup use the session's client.

**Files that cross repositories.** `shema-api` vendors these files byte for byte; the copy is never seen by a test, so a change here is re-emitted and re-vendored in the same pair of PRs:

| Emitted by | File | Change procedure |
|---|---|---|
| `npm run emit:regions` | `src/utils/__tests__/countryRegion.json` (from `COUNTRY_REGION` and `COUNTRY_SYNONYMS`) | change the tables, re-emit, re-vendor in `shema-api` |
| `npm run emit:sensitive-names` | `src/utils/__tests__/sensitiveProjectNames.json` (from `getLanguageNameDisplay` and the catalogues) | change `sensitive_project_named` or a `continent_*` label, re-emit, re-vendor |
| `npm run fixtures:parity` | `src/utils/__tests__/dataJsParity.json` | change a derivation, regenerate, re-vendor as `tests/test_shema/dataJsParity.json` |
| `npm run fixtures:import` | `src/fixtures/data/projects.json` | re-import from a fresh design package, re-vendor as `tests/test_shema/shemaProjectsExport.json` |
| no emitter | `src/types/project.ts` → `tests/test_shema/projectContract.json` | a key added or removed is re-vendored by hand, or `test_record_shape.py` holds the old contract |
| no emitter | `src/constants/bible.ts` → `tests/test_shema/bibleBooks.json` | same, for `test_books.py` |

**Checking against a running `shema-api`**: `SHEMA_LIVE_API=http://localhost:8101 npx vitest run
src/services/api/__tests__/live.test.ts` (skipped otherwise). The API does not boot against an empty SQLite file (its startup reads `bible_books`, and no migration runs under SQLite): use the Postgres recipe in that repository's `RUNNING-LOCALLY.md`, or, for a read-only probe, `Base.metadata.create_all` over a throwaway SQLite file plus `scripts/seed_apps_roles.py` and `scripts/grant_app_role.py`.

### Auth

Product rules: [PRD §3.1](docs/PRD.md#sec-3-1) and [§2](docs/PRD.md#sec-2).

- **The frontend never enforces authorization; it reflects it.** Every control asks a predicate of
  `src/utils/access.ts` — one per server guard, named after what the server admits. Do not write a role literal on a
  screen. When a server guard changes, its predicate changes with it, and the PRD's matrix in the same PR.
- **A control the server would answer with 403 is not drawn** — and check **every door** to the action (the header, the
  page, the direct address), not only the main one.
- **Two providers fill one context**: `ApiAuthProvider` (real) and `MockAuthProvider` (fixtures, with the dev
  `RoleSwitcher`), picked by `resolveSource("session")`. No consumer knows which it has.
- **No token is written to any web storage.** `src/services/api/tokens.ts` holds both in module memory; a test walks the
  API layer for `localStorage`, `sessionStorage`, `indexedDB` and `document.cookie`.
- **A 401 refreshes once and retries once**; the refresh goes out on a bare Axios call.
- **Expiry never navigates and never unmounts the work.** The session status machine is the pure reducer
  `apiSessionReducer` (`src/contexts/apiSession.ts`); only `anonymous` carries no session. Change it there and in
  `apiSession.test.ts`, not in the provider.
- **The session carries every role** (`roles`); `role` is the first and is kept for screens that read one. Guards read
  `roles`.
- **`writeRegionScope` absent is not `null`**: absent is a server from before the field (nothing hidden, nothing newly
  allowed); `null` is every region, which the server answers to the installation admin alone.

### Deploy

`.github/workflows/deploy.yml` builds on a merge to `main`, pushes to Artifact Registry and deploys the Cloud Run service
`project-management-ecosystem`. The service is public (`--allow-unauthenticated`); who gets in is the app's own sign-in.
The image is addressed by commit SHA, `latest` is never deployed, and a rollback is a redeploy of an existing tag. The
secret is mounted, not passed as an environment variable. `src/__tests__/deploy.test.ts` pins the workflow against the
files it must agree with — run it before merging a change to `deploy.yml`. The runbook is [`docs/deploy.md`](docs/deploy.md).

---

## 9. UX and copy

- **Lightweight and uncluttered.** The prototype's density is the target.
- **Contextual guidance, not tutorials**: `InfoTooltip` beside a non-obvious field. No onboarding wizards.
- **Guided empty states**: explain the concept and offer the action, never "No data found".
- **Not-read is not empty, and loading is not zero.** A list that could not be read says so with a retry; a count that is
  not known renders "—".
- **A count never promises results a click will not return.**
- **Copy says what holds today.** A sentence that promises what no code delivers is a defect, even when ported.
- **The field comes first**: what a field leader touches must survive an old phone and a bad connection.

**PT/EN parity is enforced by two guards**, and both stay green:

- `shema/no-hardcoded-copy` (`eslint.config.js`) reads JSX in `src/components/**` and `src/contexts/**`: text children and
  user-facing props (`title`, `placeholder`, `alt`, `aria-label`, `label`, `message`, and any prop ending in `Label`,
  `Message`, `Title`, `Text`, `Description`, `Placeholder`).
- `src/i18n/__tests__/copyLeak.test.ts` reads the shipped source and a rendered output for Portuguese that survived in
  English.
- Two exemptions, both named in the config: the `design-system/` showcase and `layout/RoleSwitcher.tsx` (dev only).

Rules for copy:

- Every string goes through i18n. The catalogues are `src/i18n/locales/pt-BR.json` and `en.json`; **each speaks its own
  language and both are complete**.
- Reuse a key before adding one; a vocabulary has one owner (`STATUS_LABEL_KEYS`, `ROLE_DEFINITIONS`,
  `SESSION_ROLE_LABEL_KEYS`…). A label that names a role interpolates it from its owner.
- Plurals use the `_one` / `_other` pair. A sentence is a key, never a concatenation or a slice of another string.
- **No `forms_*`, `receive_*` or `intake_*` value names a file extension** (`formsRender.test.ts`).
- New copy the client has not approved is listed in the PRD's "Para a Karina validar".

---

## 10. Where the plan lives

Scope and issues are in Linear: team `OBT`, project *Project management (Ecossistema SHEMA)*. Every issue follows **Goal /
Read these first / Context & specs / Scope / Definition of Done / Out of scope**, and every Scope repeats *do not touch
`DS-PROJECT/`*. Do not skip a Definition of Done checkbox: several encode the product guarantee itself.

What the client has decided is in the PRD's rules; what she has not is in its section 9. Do not decide in silence what is
the client's.

---

## 11. Code style

- **No comments for "what".** Comment only a non-obvious "why". No module-level description comments.
- **TypeScript**: explicit types for props, API payloads and store shapes. No `as`, `as never` or `any` at a typed seam,
  and no union left inferred as `string`.
- **Total functions.** No `null` or fallback branch excused by "no fixture has this case today".
- **Python** (in `shema-api`): typed public functions, Pydantic models over bare `dict`.
- **File names**: PascalCase for React components, camelCase for utilities, hooks and stores, snake_case one operation per
  file in `shema-api` services.
- **Domain vocabulary stays in Portuguese** where the product uses it (Ritmo, Pulso, Oração, Equipe, ficha, telha, verde).
- **Dates are read by field, never through `new Date(string)`** (`parseIsoDate` in `utils/cadence.ts`, `utcDay` and
  `toLocalIsoDate` in `utils/format.ts`): a date parsed as UTC midnight lands on the previous day west of Greenwich.

---

## 12. Git workflow

When the user says the code is ready or asks for a PR:

1. Branch from HEAD with the issue's `gitBranchName` from Linear.
2. Small, scoped commits — one logical change each.
3. Push with `-u`.
4. Open a PR against `main` with `gh pr create`: title under 70 characters, body with `## Summary` and `## Test plan`.
5. Return the PR URL.

Reference the Linear issue (`OBT-###`) in the branch name and the PR body. Never force-push or amend published commits.

---

## 13. Checklist

### Before opening a PR

- [ ] `npm run lint && npx tsc -b && npm test` are green, and any browser test that skipped is named in the PR.
- [ ] The screen was derived from `DS-PROJECT/`, which the diff does not touch.
- [ ] **A change of behaviour changed `docs/PRD.md`** — the rule, the matrix cell, the life cycle — in the same PR.
- [ ] Stack only (§3.1). Tailwind only; `cn()`; `cva`; centralised constants in `src/styles/`.
- [ ] Tokens as in §7; no raw colour, including a hand-written `rgba()` of a palette colour; ink from the semantic tier.
- [ ] `bg-elevated` for cards, modals and inputs; `bg-canvas` for pages; `bg-muted` for subtle fills.
- [ ] Functional components under 300 lines; one owner per collection and per fact; reuse before creating.
- [ ] Reads through `src/services/api`, never `src/fixtures`.
- [ ] PT and EN both present; no hardcoded copy.
- [ ] Guided empty states; not-read is not empty.
- [ ] Both themes look right; the global focus outline is used.

### What review keeps catching

- [ ] **Every state combination has an exit**: active × disabled, filter × selection, empty × required.
- [ ] **Every state is on both channels**: colour and text.
- [ ] **A count and its filter answer the same question**; buckets do not overlap at their seams; zero, the exact edge and
  the empty list are exercised.
- [ ] **A label implements the product's definition.** When the label and the computation disagree, fix the computation —
  or raise it to the PRD.
- [ ] **Every door to an action asks the same guard.**
- [ ] **"The screen hides it and the server refuses it" holds only when both use the same criterion.**
- [ ] **A test pins behaviour, not formatting**, and it was seen to fail against the defect. A guard's own scope is
  asserted.
- [ ] **Ported code and ported copy pass the same checks as new code.**
- [ ] **A document line the diff contradicts is reconciled in the same PR.**

### Backend (`shema-api`)

- [ ] Its `CLAUDE.md` was read; work starts from `origin/dev` and lands inside the Shemá module.
- [ ] The capability does not already exist.
- [ ] No database access in routers; queries in services; services raise business exceptions.
- [ ] Async end to end; a schema change ships with a migration; the chain has one head.
- [ ] Role **and** region authorization, the sensitive-project reduction and consent are enforced in services, on every
  output path.

---

## 14. Known pitfalls the code still has

Things that will surprise you. Each is recorded in the PRD (section 8, or a question in section 9); do not "fix" one in
passing — it is a product decision or a change with a blast radius.

- **Three record tabs keep what is typed in the browser only** (Saúde's readings, Fotos / Vídeos, Materiais): the server's
  write does not carry them (`PENDING_WRITE`). `src/services/mediaStorage.ts` stores those files locally.
- **The ficha's status picker offers three statuses** (plus the saved one); the `PATCH` accepts all eight, but nothing on
  screen offers `concluido` or `cancelado`, so in practice they arrive by import.
- **`last_updated` is stamped by nothing**, so the *Recentes* shortcut reflects imports only.
- **No screen generates the Monthly Pulse offline file**, although the console reads and applies one.
- **Nothing sends to the intercessor network**, so no exit link is ever issued and `lastSentAt` is never written.
- **Notification channels and the daily digest only record the choice.**
- **An account that is only a project member sees the six areas and gets a 403 in each.**
- **The region `other` is labelled "América Central" and also receives every place the tables do not recognise.**
- **`projectsAPI` (`list`/`get`) and `etenAPI.credits` and `authAPI.me` are declared and called by no screen.**
- **Two screens still compute on the client over the server's cards**: the Ritmo readiness and the annual report.
- **Some copy still says "onda 2"** for things that exist, or that have no date.
- **`role_coordinator` is labelled "Administrador" and `role_admin` "Admin da plataforma"**; `role_resource` is
  "Intercessor" while the people of the prayer network are also intercessors. Use the PRD's glossary in prose.
- **The front names the health readers `HEALTH_AUDIENCE`; `shema-api` uses that name for the health writers** and calls the
  readers `HEALTH_READERS`.
