# Ecossistema Shemá — Agent Guidelines

This file defines the conventions for LLM agents working in this repository. Follow these instructions exactly as written.

> **Rule zero — the frontend is built from `DS-PROJECT/`.**
> `DS-PROJECT/` is the approved, client-validated design and interaction prototype for this product. Every screen, layout, component, token, flow, label and interaction in the frontend MUST be derived from it. Do not invent screens, do not redesign, do not substitute a different visual language. See §2.

> **Rule one — no backend is being built.**
> `tripod-api` exists, runs, and already contains a scaffolded **Shemá module**. Every backend need in this project is an addition *inside* that module. Any plan, issue or document that says "build a backend", "scaffold FastAPI" or names a repo called `shema-backend` is stale wording for *extend `tripod-api`*. See §3.2.

---

## 1. What this project is

The **Shemá Ecosystem** platform — project management for a network of multimodal Bible-translation projects run by YWAM/JOCUM field teams across ~7 regions (127 languages in the seed data).

It is not a generic PM tool. The product exists to answer four questions about every field project:

1. **Where is it?** — identity, region, language, team (the living map)
2. **How is it progressing?** — translated / community-checked / approved units, per book or story
3. **How is the team?** — emotional, relational, spiritual and physical health
4. **What does it need?** — financial, training, equipment, prayer

Everything else (Rhythm, Prayer, ETEN, Forms, Team) is a loop that keeps those four answers current.

**Source of truth for scope:** the Linear project [Project management (Ecossistema SHEMA)](https://linear.app/shema-obt/project/project-managementecossistema-shema-bec344a3cf31/overview), team `OBT`, and the attached **PRD v1.1 (jul/2026)** (`prd-ecossistema-shema.pdf` / `prd-ecosystem-shema-en.pdf`, in the project's *Docs* document).

### The two repos

| | Repo | Role |
|---|---|---|
| Frontend | **`shemaobt/project-management-ecosystem`** — *this repo* | The console. Holds the Vite app scaffolded in FE-01; wave 1 builds the product here. `DS-PROJECT/` is a **local-only** reference, not versioned here — see §2. |
| Backend | **`shemaobt/tripod-api`** | Existing, running FastAPI service. Shemá is a **module inside it**, already scaffolded. |

> ⚠️ Older Linear text (the project description body, the B1 milestone, the "Working plan" document) still names a frontend repo `shema-console` and a backend repo `shema-backend`. **Both names are stale.** The frontend is this repo — issue FE-01 ([OBT-348](https://linear.app/shema-obt/issue/OBT-348)) states it directly. The backend is `tripod-api` — issue BE-01 ([OBT-390](https://linear.app/shema-obt/issue/OBT-390)) states it directly: *"Shemá is a module inside it (`/api/shema`, `app/services/shema/`), not a new service."*

---

## 2. DS-PROJECT is the design source of truth

`DS-PROJECT/` is a **standalone HTML prototype** (React 18 via UMD + Babel standalone, plain CSS, no build step). It is **not** the production stack and its code must not be copy-pasted wholesale. It **is** the specification for how the product looks and behaves.

It is **not versioned in this repo** (`.gitignore`). Get the design package from the Linear project's *Docs* document, under **Arquivos do Design**, and unzip it into `DS-PROJECT/` at the repo root. It stays read-only — see the last bullet of this section.

### Two references — do not confuse them

- **`DS-PROJECT/` is the design authority.** What the product looks like and how it behaves. When it and any other source disagree about appearance, the prototype wins.
- **`shemaobt/meaning-map-ui` is the engineering reference only.** Dependency versions, `src/` layout, the `cn()` + Radix + `cva` pattern, ESLint config, Dockerfile / nginx / Cloud Run wiring. **It says nothing about how this product looks.** Never copy its screens, its components' appearance, or its visual decisions.

### What you MUST take from DS-PROJECT

| Concern | Source in `DS-PROJECT/` |
|---|---|
| Design tokens (colors, type, spacing, radii, shadows, motion) | `design-system/colors_and_type.css` |
| Fonts (Montserrat, Merriweather) | `design-system/fonts/`, `fonts/` |
| Logo, icon marks, pattern tile, photography | `design-system/assets/` |
| Component & page styling | `app.css` (4.2k lines, sectioned by area) |
| App shell, header, hero, sidebar, filters, toolbar | `app.jsx` |
| Project cards — the list metaphors | `cards.jsx` |
| Project record: detail + edit, 10 sections | `modals.jsx` |
| Approved option vocabularies (`TRANSLATION_TYPES`, `FINANCIAL_RESOURCES`, `OBJECTIVES`, `NEED_CATEGORIES`) | `modals.jsx` — port verbatim, do not re-derive from the PRD |
| Health assessment wizard (4 dimensions) | `health-modal.jsx` |
| Rhythm / meetings cascade | `ritmo.jsx` |
| ETEN annual credit report | `eten.jsx` |
| Prayer wall | `oracao.jsx` |
| Intercessor network | `intercessores.jsx` |
| Forms hub (generate / send / receive) | `forms-hub.jsx`, `forms-variations.jsx` |
| Team org chart (roles per region) | `equipe.jsx` |
| Atlas map / night globe | `worldmap.jsx`, `globe.jsx`, `continents.js`, `coords.js` |
| Notifications + bell | `notifications.jsx` |
| Domain model, helpers, PT/EN strings | `data.js`, `projects.js` |
| Full-page reference renders (PT + EN) | the `*.html` presentation decks at the root of `DS-PROJECT/` |
| Approved screenshots | `deck-assets/`, `_*.png`, `check*.png` |

### How to work with it

- **Before building any screen**, open the corresponding `DS-PROJECT` file (and its `.html` presentation, if one exists) and read it. Match structure, hierarchy, spacing, wording and states.
- **Port, don't reinvent.** Translate prototype markup + CSS into React + TypeScript + Tailwind v4 components. The visual result must be indistinguishable from the prototype.
- **Port the logic too, where it exists.** `Sidebar` already computes every facet count in a single pass; `modals.jsx` already holds the approved option lists; `data.js` already implements the domain derivations. Port them rather than rewriting from the PRD.
- **CSS variables map 1:1 to Tailwind tokens.** Do not reintroduce raw CSS variables in JSX where a Tailwind token exists. Do not introduce hex values not present in the prototype.
- **Copy is part of the design.** Labels, eyebrows, empty-state text, tooltips and toast messages come from `data.js` (`I18N.pt` / `I18N.en`). Reuse them verbatim as i18n keys.
- **If the prototype and this document disagree, the prototype wins** on visuals; the PRD and Linear issues win on behaviour and scope. Where a question is scope dressed as visuals, it is a gate — the worked example is Coral, raised and answered in §5.1.
- **Do not modify `DS-PROJECT/`** as part of implementation work. It is a read-only reference, and every issue's Scope section repeats it.

---

## 3. Stack and Build

### 3.1 Frontend (this repo)

- **Framework**: React **19.2** — pinned in FE-01
- **Language**: TypeScript **5.9**
- **Build / dev**: Vite **7** (`@vitejs/plugin-react`, `@tailwindcss/vite`)
- **Routing**: react-router-dom v7 (`BrowserRouter`, routes declared in `App.tsx`)
- **Styling**: **Tailwind CSS v4 only** — no CSS-in-JS, no styled-components, no SASS
- **UI primitives**: Radix UI via shadcn-style components in `src/components/ui/`
  - **An ARIA role is a contract, and only the primitive keeps it. Never write `role="radio"` · `role="radiogroup"` · `role="checkbox"` · `role="switch"` · `role="tablist"` · `aria-checked` by hand on a screen** — those roles promise a keyboard contract (single tab stop, arrow keys moving the selection) that a `<button>` with `aria-checked` does not deliver, and a screen reader announces the promise either way. Single choice goes through `ui/RadioGroup` — `RadioField` for a labelled dot, `Radio` inside your own card, `RadioButton` for a segmented control that carries its own fill. Fixed in FE-46 ([OBT-423](https://linear.app/shema-obt/issue/OBT-423)), 12/aug/2026 — Daniel Oliveira, after FE-25 shipped a hand-rolled group where Tab walked 16 stops and the arrow keys did nothing. `src/components/ui/__tests__/primitives.test.ts` fails the build if it comes back.
  - **Radix reads `value=""` as "nothing selected"**, so a vocabulary with an empty member needs a sentinel at the boundary: `"na"` in, `""` out. `IdentidadeForm` does it for vitality and `RatingChoice` for the health ratings — reuse that, do not invent a second convention.
- **State**: **Zustand** for cross-page state; **React Context** for auth, theme and UI state
- **HTTP**: Axios — a single client in `src/services/api.ts` with JWT auth interceptors
- **Icons**: lucide-react, outline only (the prototype's inline SVGs are lucide-style at `strokeWidth 1.75`)
- **Toasts**: sonner
- **i18n**: i18next, PT/EN toggle, keys ported from `DS-PROJECT/data.js`
- **Utilities**: `cva`, `clsx`, `tailwind-merge`; use `cn()` from `src/utils/cn.ts`
- **Maps**: react-leaflet + leaflet — **not used by the Atlas; see the FE-14 decision below.** The dependency stays pinned (FE-01) for possible future geographic needs; removing it is a wave-2 cleanup call.

Do not introduce Redux, MobX, or a second styling system.

**Resolved in FE-14 ([OBT-359](https://linear.app/shema-obt/issue/OBT-359)), 07/aug/2026 — Levi Gomes.** The Atlas map is the prototype's **hand-drawn SVG night globe** (`globe.jsx` + `continents.js`), not a react-leaflet tile map:

- **Rule zero**: the approved Atlas visual is the night globe with medallions; a tile map cannot reproduce it.
- **Privacy**: tile servers are a third-party request from every user's browser — the user's IP plus the tiles they load reveal which regions they are inspecting. For a product used by teams in sensitive countries, the SVG's zero external requests is the safe position, and it needs no tile licence.
- The flat `WorldMap` (`worldmap.jsx`) is loaded but never mounted by the composed prototype — only the `Globe` ships. Its overlap-spread logic (grouping markers by screen cell and pushing them apart) was ported into the globe's marker layer as the clustering mechanism.
- Doc conflict, resolved per §2 (prototype wins on visuals): the prototype's `.card-atlas` list row carries a hairline `--line` border and gains its shadow only on hover, so the ported Atlas card does too. §7.3's "cards have no borders — shadow only" describes the elevated content cards, not the Projetos list rows.

**Resolved in FE-01 ([OBT-348](https://linear.app/shema-obt/issue/OBT-348)), 30/jul/2026 — Levi Gomes.** Two questions this section left open are now closed:

- **React major: 19.2**, aligning with milestone F1 and the house frontend `meaning-map-ui` (React 19.2 / TS 5.9 / Vite 7). React 18 was stale wording and no longer appears here.
- **Repo name**: the frontend is this repo, `shemaobt/project-management-ecosystem`. `shema-console` is stale everywhere it appears (§10).

FE-01 pinned the whole stack in `package.json` so no later wave-1 issue has to choose a version: React 19.2 · react-dom 19.2 · TypeScript 5.9 · Vite 7 · Tailwind 4.3 · react-router-dom 7 · Zustand 5 · Axios 1.19 · i18next 25 + react-i18next 16 · lucide-react · sonner 2 · `cva` / `clsx` / `tailwind-merge` · react-leaflet 5 + leaflet 1.9 · `@radix-ui/react-slot` (the remaining Radix primitives are added by FE-03, one per component that needs it).

### 3.2 Backend — the Shemá module inside `tripod-api`

**Local reference checkout:** `/home/levig/tripod-api-main/tripod-api` (branch `main`).
Its own `CLAUDE.md` at the repo root is authoritative for backend conventions — read it before writing backend code. Where it and this section disagree, `tripod-api/CLAUDE.md` wins.

> Other local checkouts of the same repo exist (`/home/levig/backend-tripod/tripod-api`, `/home/levig/tripod-console/tripod-back/tripod-api`, the latter on a feature branch). Use the `main` checkout above unless told otherwise.

#### The module already exists

Scaffolded by commit `dd6bac4` *(feat(OBT-266): scaffold the Shemá module — api → services → models)*:

```text
app/api/shema/          # router, registered in app/main.py at prefix /api/shema
app/services/shema/     # business logic + all data access
app/models/shema.py     # Pydantic schemas
```

**Never create a second Shemá service, app or repo.** New endpoints are added under `/api/shema`; new logic goes in `app/services/shema/`.

#### Stack and runtime

- **FastAPI** + Uvicorn (dev) / Gunicorn (prod)
- **Python packaging**: `uv` (`pyproject.toml` + `uv.lock`) — `uv add`, `uv sync`, `uv run`
- **Database**: PostgreSQL (Neon) via **SQLAlchemy 2 async engine + `asyncpg`** — async end-to-end
- **Migrations**: Alembic (`alembic/versions`)
- **Schemas**: Pydantic v2
- **Auth**: JWT (`python-jose`) + passlib (`pbkdf2_sha256`)
- **Secrets**: GCP Secret Manager — never committed `.env` files
- **Commands run inside Docker Compose**, not on the host

Do not introduce an alternative framework, ORM or migration tool.

#### Layering — these are hard rules

```text
app/
├── main.py          # routers registered here
├── api/             # HTTP access layer ONLY
├── core/            # config, DB session, auth deps, exceptions
├── db/models/       # SQLAlchemy tables only
├── models/          # Pydantic request/response schemas + DTOs
├── services/        # business logic AND all data access
└── utils/
```

- **Zero database access in `app/api/`.** No `db.execute()`, `db.add()`, `db.commit()`, `select()`, or any SQLAlchemy query in a router. No importing SQLAlchemy models or query constructs in routers — `AsyncSession` for dependency injection is the only exception.
- **Every query lives in `app/services/`.** If a router needs data, add a service function.
- **Services never import `fastapi.HTTPException`.** They raise business exceptions from `app/core/exceptions.py`; routers (or the global handlers) map them to status codes. Available: `NotFoundError`, `ConflictError`, `AuthorizationError`, `AuthenticationError`, `RoleError`, `ValidationError`, `InvalidTokenError`, `UpstreamServiceError`.
- Routers do input parsing, service calls and exception mapping — nothing else.
- Use the injected `AsyncSession` from `get_db`; never create ad-hoc engines or sessions.
- Every schema change ships as an Alembic migration. No manual DDL. Two migrations authored the same day create a multi-head that only fails at deploy — check the chain before opening a PR.
- Services stay function-oriented and composable — one file per operation, as `app/services/project/` does.

#### What already exists — reuse it, do not rebuild it

**The single largest risk in wave 2 is rebuilding what exists.** Before writing anything, check what `tripod-api` already provides:

| Need | Already in `tripod-api` |
|---|---|
| JWT auth, current-user dependency, platform-admin guard | `app/core/auth_middleware.py`, `app/api/auth.py`, `app/services/auth/` |
| Roles, role grant/revoke, app-scoped role resolution | `app/services/authorization/`, `app/api/roles.py` |
| Scope helpers (managed orgs) | `app/core/org_scope.py`, `app/core/access_control.py` |
| Projects + per-user / per-org access grants | `app/db/models/project.py`, `app/services/project/`, `app/api/projects/` |
| Organizations, languages, phases, places | `app/services/org/`, `language/`, `phase/`, `app/api/places.py` |
| Media upload + signed URLs | `app/services/storage/upload.py`, `app/api/uploads.py` |
| Notifications | `app/db/models/notification.py`, `app/services/notifications/`, `app/api/notifications.py` |
| Content translation helpers | `app/services/i18n/` |

**BE-01 ([OBT-390](https://linear.app/shema-obt/issue/OBT-390)) is the audit that turns this table into decisions** — a reuse / extend / not-applicable verdict per capability, *based on reading the code*, reviewed by a `tripod-api` maintainer before implementation starts. It is the first backend issue and it blocks the rest of B1.

> ⚠️ **The hardest boundary question is the project entity.** `tripod-api` has projects; Shemá has projects; they are probably not the same projects. Whether Shemá extends the existing entity or introduces its own related one is decided in BE-01. Getting it wrong is a migration, not a refactor.

> ⚠️ `tripod-api` also contains a `project_health` module (`app/api/project_health/`, `app/services/project_health/` — interviews, prompts, agents, voice, reports). It is **not** the same instrument as Shemá's *Avaliação de Saúde* (a 4-dimension assessment filled in-app by an OBT Lab mentor). Read the existing module before assuming either reuse or duplication, and do not conflate the two data models.

#### Shemá-specific backend requirements

- Auth is **by role and by region**. A regional role-holder sees and edits their region; global roles see everything. The existing org-scope helpers are the pattern to follow, not necessarily the exact mechanism.
- All endpoints require `Authorization: Bearer <token>` except login and the public leader link.
- The Monthly Pulse import must be **idempotent and transactional** — a double import is a no-op.
- Sensitive-country redaction (§6.1) and consent (§6.2) are enforced **in services**, on every output path. A frontend-only rule is not a rule.
- **BE-16 converts the Notion export's `DD/MM/YYYY` dates on import and stores real `date` columns** — never the raw string. The frontend's `toIsoDate` (§4.1) is the reference implementation, and the rule it encodes is that the export is unambiguously day-first. Storing the text as it comes moves a parsing bug into the database.
- **The ETEN credit is a stored number, not a derived one** (§4.1). BE-11 persists `EtenCreditEntry` (`project_id`, `year`, `credits`, `source`) with `source = 'manual'` while GATE-01 is open; the automated counting, once decided, writes rows with `source = 'calculated'` against the same table.

---

## 4. Frontend project structure

```
src/
├── App.tsx                 # BrowserRouter, Toaster, ThemeProvider, AuthProvider
├── main.tsx
├── index.css               # Tailwind v4 @theme — Shemá tokens ported from DS-PROJECT
├── components/
│   ├── common/             # LoadingSpinner, EmptyState, ConfirmDialog, ErrorBoundary,
│   │                       # InfoTooltip, FilterBar, ImageUpload, StatCard, ...
│   ├── layout/             # AppShell, AppHeader (TopBar), TopNav, Sidebar
│   ├── pages/              # One folder per area — see §5
│   └── ui/                 # Radix + cva primitives (Button, Card, Dialog, Input, ...)
├── contexts/               # AuthContext, ThemeContext
├── stores/                 # Zustand: filters/savedViews, regions/team, notifications, ...
├── hooks/
├── services/               # api.ts — single Axios client, namespaced APIs
├── fixtures/               # wave 1 data layer — see §4.1
├── types/                  # TS interfaces (project, region, role, meeting, prayer, eten, ...)
├── constants/              # token keys, region list, status/health enums
├── utils/                  # cn.ts, format.ts, progress.ts, health.ts
├── i18n/                   # pt.ts / en.ts — ported from DS-PROJECT/data.js
└── styles/                 # centralized Tailwind class constants (cards, badges, layout, states)
```

### 4.1 The fixture layer — how wave 1 works

**Wave 1 ships the whole frontend with no backend and no API calls.** The 127 projects in `DS-PROJECT/projects.js` and the `SHEMA` helpers in `DS-PROJECT/data.js` become a **typed fixture module** that every screen reads from.

- Every screen reads through the *same* fixture module. That is what makes wave-2 integration mechanical and reversible one screen at a time.
- Types grown against fixtures are the input to the data contract (§10, FE-44) — they are not throwaway.
- `vite.config.ts` carries the `/api` dev proxy from day one, **wired but unused**, so wave 2 changes no config. Its target is `VITE_API_PROXY_TARGET` (default `http://localhost:8000`, where `tripod-api` runs locally); `.env.example` documents it.
- Auth in wave 1 is a **mocked session** in `AppShell`.

**Built in FE-05 ([OBT-352](https://linear.app/shema-obt/issue/OBT-352)), 30/jul/2026 — Levi Gomes.** The layer exists; these are its rules:

- **One entry point: `src/fixtures` (the index).** It exposes `projectsAPI`, `regionsAPI`, `meetingsAPI`, `prayerAPI`, `intercessorsAPI`, `etenAPI`, `geoAPI` — namespaces that mirror §8's Axios client — and every method is `async`. Screens `await` them exactly as they will `await` the API in wave 2. Deep imports (`fixtures/projects`, `fixtures/data/*.json`) are **blocked by ESLint** for `components/`, `contexts/`, `hooks/`, `stores/` and `services/`.
- **The data is verbatim.** `src/fixtures/data/projects.json` is the Notion export as it is — empty fields, mixed casing, `Waima’a`, `Ngäbere`. Every read hands out a `structuredClone`, so a screen cannot corrupt the shared record.
- **Every derivation is a pure function of `(project, now)`** in `src/utils/` — `getProjectStatus`, `getProgress`, `rollUpProgress`, `getOverallHealth`, `healthScore`, `getPriority`, `getStaleStatus`, `getDaysSinceUpdate`, `getDeadlineInfo`, `isRecentlyUpdated`, `matchesPreset`, `getRegion`. No hidden clock: `now` defaults to `new Date()` and is injected in tests. `tripod-api` has to reproduce these exactly, so they are pinned by `src/utils/__tests__/dataJsParity.json` — the output of the prototype's own `data.js` over all 127 records at the reference date `2026-05-14`. **Changing a derivation means regenerating that file, never hand-editing it: `npm run fixtures:parity`** (and `npm run fixtures:import` re-imports `projects.json` / `continents.json` from a fresh design package). Both scripts need `DS-PROJECT/` unzipped at the repo root and read it without writing to it.
- **The Notion export writes dates as `DD/MM/YYYY`; the fixture converts them at the boundary.** Decided 30/jul/2026 by Levi Gomes. The export's format is provably `DD/MM/YYYY` — of the 70 dates it carries, 60 have a first component above 12 and none have a second one, so the reading is unambiguous. `src/fixtures/normalize.ts` (`toIsoDate`) converts `startDate`, `deadline`, `lastUpdated`, `healthAssessmentDate` and every `progressHistory[].date` before the seeds run; anything that is not an export date passes through untouched. `data/projects.json` stays byte-identical to the export — the conversion happens on load, never on the file.
  - **This is a deliberate divergence from the prototype**, the only one. Left unconverted, the dates are unparseable: the prototype reads staleness as `em-dia` for all of them and the `recent` preset matches nothing. Converted, 7 projects correctly surface as `critico` at the reference date. `src/utils/__tests__/parity.test.ts` pins both sides — the helpers still reproduce `data.js` exactly over the raw export, and a second test asserts the conversion changes staleness *only* for the 8 records the export dated, leaving status, health, progress and region identical.
  - **BE-16 must reproduce the same conversion** when it migrates the 127 projects, and store real `date` columns rather than text. `toIsoDate` is the reference implementation. A migration that inserts `13/04/2024` into a text column moves the bug into the database, where the fix costs a migration instead of a function.
- **The ETEN credit is a typed-in number, never a calculation.** Decided 30/jul/2026 by Levi Gomes: until GATE-01 ([OBT-387](https://linear.app/shema-obt/issue/OBT-387)) closes, the credit of a project in a year is **entered by hand** and stored as an `EtenCreditEntry` (`projectId` · `year` · `credits` · `source`). `etenAPI.report(year)` reads the ledger and returns `credits: null` where nobody informed a value — it derives nothing from `progressHistory`. When the gate closes and the counting is automated, the automation writes entries with `source: "calculated"`; that field is the seam, so no screen changes.

#### 4.1.1 Reads come from the fixture module; wave-1 writes live in a store

FE-05 shipped **reads only** — deliberately, since no screen writes yet. This is the rule for when they do, so the four writing screens (FE-20…28, FE-31, FE-32/33, FE-37) do not each invent their own. Decided 30/jul/2026 by Levi Gomes.

- **The fixture module never mutates.** It hands out a `structuredClone` on every read and holds no edited state. Do not add save/update methods to it in wave 1.
- **One Zustand store per domain owns the mutated copy** — `projectsStore`, `rhythmStore`, `prayerStore`, as each issue's Scope already names. The store **hydrates once** from the fixture namespace (`projectsAPI.list()`, `meetingsAPI.log()`, …) and from then on it is the single source of truth for that domain. Screens read the store, not the fixture, after hydration.
- **Never two owners of the same collection.** A screen that edits a project edits it in `projectsStore`; a screen that lists projects lists them from the same store. Re-reading the fixture after a write would silently resurrect the original record.
- **`persist` where the prototype persists** (§8) — the prototype keeps projects, the meeting log, intercessors and saved views in localStorage. Wave 1 matches that; nothing else is persisted.
- **Drafts are not writes.** Unconfirmed input — FE-20's partial record — is UI state in the record store, separate from the confirmed collection. Only an explicit save touches the domain data.
- **`projectsStore` exists since FE-20** (`shema-projects-v1`). It hydrates once from `projectsAPI.list()` and from then on owns the collection: `ProjetosPage` lists from it and the record saves into it, so a project created in the record shows up in the list without re-reading the fixture. `saveProject` upserts by id — it is the only operation that touches confirmed data.
  - **`PROJECTS_VERSION` is the invalidation lever, and it is not optional.** Because `hydrated` is persisted alongside the records, a browser that opened the app once would otherwise keep that copy forever — `npm run fixtures:import` and any change to the record's shape would never reach it. Bumping the version makes `migrate` drop the stored copy so the next `hydrate()` re-reads the fixture. **FE-21…28 bump it when they change the shape of a project.** The bump discards locally saved edits; in wave 1, against fixtures, that is the right trade — the alternative is a frozen copy that fails silently.
- **In wave 2 the store is the write seam and the fixture module the read seam.** `hydrate()` becomes the API call and each mutation method becomes a `POST`/`PATCH` in `services/api.ts`. That is why the store must expose *operations* (`saveProject`, `logMeeting`, `markPrayerAnswered`) rather than a bare `setState` — an operation maps to an endpoint, a `setState` does not. FE-44 freezes those operations alongside the read contracts.

### Component rules

- **Functional components only.** No class components.
- **Target under 300 lines** per component file; over 400 lines it almost certainly needs splitting.
- Split by responsibility; co-locate sub-components with their parent page folder.
- Extract any UI pattern that appears twice into `components/common/` or `components/ui/`.
- Keep state local; lift to Zustand only when shared across routes.

> `DS-PROJECT/modals.jsx` is 1,525 lines. Porting the project record is a **port *and* a decomposition** — one folder, one component per tab. That decomposition is what makes the ten tabs parallelisable.

---

## 5. Product areas (the six tabs)

The app shell is: **TopBar → Hero (6 indicators) → TopNav (6 areas) → area content**, exactly as in `DS-PROJECT/app.jsx`.

| Tab | PT / EN | Prototype file | Wave 1 | Wave 2 |
|---|---|---|---|---|
| Projetos | Projects | `app.jsx`, `cards.jsx`, `globe.jsx`, `worldmap.jsx` | FE-10…17 | BE-05, INT-02 |
| Ritmo | Rhythm | `ritmo.jsx` | FE-31 | BE-10, INT-07 |
| Oração | Prayer | `oracao.jsx`, `intercessores.jsx` | FE-32, FE-33 | BE-09, INT-06 |
| ETEN | ETEN | `eten.jsx` | FE-34 | BE-11, INT-08 |
| Formulários | Forms | `forms-hub.jsx`, `health-modal.jsx`, `modals.jsx` | FE-35, FE-37 | BE-12, INT-09 |
| Equipe | Team | `equipe.jsx` | FE-36 | BE-13, INT-10 |

Plus the project record (`modals.jsx`) as FE-20…28 / BE-06 / INT-03, and Início (hero + indicators) as FE-30.

### 5.1 Projetos — the living map

- **Sidebar** (sticky top block): search → current-user identity → **4 combinable preset chips** (`attention` / `prayer` / `celebrate` / `recent`) → live `Mostrando X de N` + *Limpar tudo*.
- Then: **Saved views** → **Time por região** (region cards showing the 3 role-holders, clicking filters by continent) → **active filter chips** → **primary filter sections** (Status, Base, Saúde) → **Mais filtros** (País, Objetivo, Tipo de Tradução, ETEN, País sensível, Recursos, % Progresso, Vitalidade, Necessidades, Mídia, Atualização).
- Every filter option shows its **count**; presets with count 0 are disabled. The counting logic already exists in `Sidebar` as a single pass — port it.
  - **Zero-count options stay visible and clearly unavailable (dimmed/disabled) — they are never hidden.** Decided in FE-12 ([OBT-357](https://linear.app/shema-obt/issue/OBT-357), Henok Teixeira, 29/jul/2026; recorded here 07/aug/2026): a count of zero is information, hiding the option makes the panel jump as filters change and hides that a category exists. This deliberately diverges from the prototype's `Section`, which drops zero-count entries — an earlier revision of this bullet repeated the prototype's behaviour and is superseded. An **active** option whose count drops to zero stays clickable.
- **Toolbar**: result count + **metaphor pill** + sort (deadline, name, progress, team, health).
- **Card metaphors** (`cards.jsx`): `CardAtlas` (wide horizontal logbook entry) and `CardDiario` (field-journal page with washi tape). The prototype's third card, `CardCoral`, does not ship — its concentric progress rings were absorbed into the Diário's footer as `ProgressRings`. See the FE-17 decision below.
- **Atlas** additionally renders the rotating night globe with photo medallions above the grid.
- Pagination: 30 items, *Mostrar mais* +30.

> **Sensitive countries on the map — decided in FE-14 ([OBT-359](https://linear.app/shema-obt/issue/OBT-359)), 07/aug/2026 — Levi Gomes, pending client confirmation (`needs-client-decision`).** A `sensitiveCountry` project is **never plotted at its true coordinates**: the Atlas places it at its **region's centroid** (`REGION_CENTROIDS` in `src/constants/geo.ts`), its marker carries a dashed "approximate" ring, and a visible overlay on the globe counts how many projects are being withheld — a silently incomplete map is its own hazard, so the reduction is always announced. The same rule redacts the *displayed location*: cards, tooltips and the medallion show the region name, never the country or place. The single owner of the rule is `getMapPlacement` / `getLocationDisplay` in `src/utils/region.ts` — any view that renders position or location (FE-15's cards included) must go through it, never reimplement it. Reduced precision was chosen over omission (the map must show exactly what the filters return) and over role-gating (wave 1 has only a mocked session). Tests in `src/components/pages/projetos/Atlas/__tests__/` pin the guarantee.
>
**Resolved in FE-15 ([OBT-360](https://linear.app/shema-obt/issue/OBT-360)), 09/aug/2026 — Levi Gomes.** Three decisions the card views forced:

- **The Diário card carries the three progress counts, which the prototype's `CardDiario` does not.** `cards.jsx` shows only `{percent}%` in the journal footer; FE-15's issue states the product rule — *"translated / community-checked / mentor-approved is a pipeline… never collapse them into a single percentage"* — and its Definition of Done demands the three counts separate. Per §2 the prototype wins on visuals but the issue wins on behaviour, so the footer gained the Atlas card's `translated/total` head and its `N checado · N aprovado` marks line, in the Diário's own type scale. Nothing else was added.
- **The card list obeys FE-14's sensitive-country display rule, by reference.** Both cards read `getLocationDisplay` from `src/utils/region.ts` — the single owner — so a `sensitiveCountry` project shows its region name where the location goes, never the country or place. **Known gap, not fixed here:** the rule redacts the *location field only*; the team/base name still renders verbatim, and two of the three seed values name a place (`YWAM Egypt`, `YWAM Morelia`). Redacting it is a second rule, which belongs to the open client gate on what *devida cautela* means per output (§6.1) — do not invent it screen by screen.
- **The Diário's washi tape is telha by default, and that is not decoration.** `app.css` paints `.diario-tape` telha and overrides it only for `priority-warning`, `-completed` and `-default` — so roughly half the board is telha, which §7.1's *"telha only for CTAs and active states"* would forbid. §2 settles it: the tape is a visual, the prototype wins, and the rule keeps describing controls. Same shape as FE-14's border conflict.
- **Where the prototype's copy is a string operation, FE-15 used real keys.** `cards.jsx` builds the Coral labels by slicing translated strings (`t.d_p_translated.split(' ')[0]`), which reads *"Já"* in PT and turns *"Mentor-approved"* into *"Mentor"* in EN. The short forms are now catalogue keys (`d_p_*_short`) — they survived Coral's retirement and serve the Diário's footer and ring caption — and *Mostrar mais*, hardcoded in the prototype, is `load_more`.

**Two views, and the Coral graphic lives inside one of them — decided in FE-17 ([OBT-362](https://linear.app/shema-obt/issue/OBT-362)), 11/aug/2026 — Karina Marinho.** The gate is closed. The product ships **Atlas and Diário**, matching PRD v1.1 (`RF-PRJ-06`, *"Atlas (mapa) e Diário"*, Essencial; the word "Coral" appears nowhere in the 32-page document). But the client asked to keep the Coral card's **concentric progress rings** — translated / community-checked / mentor-approved drawn as three arcs over the total — because reading the pipeline proportionally is easier than reading it as numbers. So Coral was retired as a *tab* and its graphic moved into the Diário's footer.

- **The rings are `src/components/pages/projetos/ProgressRings.tsx`** — one owner, fed by `getUnitShare` in `card.ts`. The Diário's linear progress bar was replaced by it; the three counts stay as text beside it, per the never-collapse-the-pipeline rule.
- **The counts carry their arc's colour as a marker**, the way the Coral's stat block did — outer telha, middle `azul-ink`, inner verde-claro. Without it the reader sees three arcs and cannot tell which is *checado* and which is *aprovado*. The colour is a convenience, never the only channel: every number is also written out beside its label, so nothing here is colour-only.
- **This hybrid does not exist in `DS-PROJECT/`.** §2 cannot settle its layout because the prototype has no such card — the authority here is the client, who is also the prototype's author. Do not "correct" the Diário back to `cards.jsx`.
- **`normaliseMetaphor` in `src/constants/metaphors.ts` is the single owner of the retirement.** Three surfaces persisted `"coral"` — the `prefsStore` (`shema-prefs-v1`), each saved view's `state.metaphor` (FE-16), and shared URLs carrying `?view=coral`. All three route through it and land on the Diário, which is where the graphic went. Without it the metaphor `switch` in `ProjetosPage` falls through and the results area renders blank; `prefsStore` carries `version: 1` and a `migrate` for exactly this.

### 5.2 Cadastro do projeto — the living record

Ten numbered sections, in this order, in both the detail modal and the edit form (`modals.jsx`):

1. **Identidade** — language name/code, bridge language, vitality, location, speakers, coords, **sensitive-country flag**. Built in FE-21. Three rules the field data forces: a **language name is never normalised** — not trimmed, not title-cased, not transliterated (the fixtures carry `Embera Dobida` with a non-breaking space and names that legitimately start lowercase, like `purépecha de capacuaro`); the **ISO code is checked, never refused** — `isIsoShape` only raises a hint, because the real export carries `?`, `N/A`, `jaa-b` and `not iso language`, and refusing them would make an existing record uneditable; and **`[0, 0]` means "no coordinate", not a place in the Gulf of Guinea** — `hasPlottableCoords` in `src/utils/identity.ts` is the single owner of that reading and `getMapPlacement` consults it.
2. **Equipe** — base, leader, mentor, translators, technical reviewers, partner org, contact. Built in FE-22. Two kinds of people live here and conflating them breaks PRD §3: the **project's own people** are edited on the tab, while the **region's three roles are read, never copied** — `resolveProjectRoles` in `src/utils/region.ts` derives them from the org chart and `RolesPanel` renders them with no input at all, so a name typed here is structurally impossible. The prototype's edit form has text inputs for those three (`regionalCoordinator`, `obtLabPerson`, `resourceCirclePerson`); this is the §2 case where the issue wins on model and the prototype wins only on layout, and those three `Project` fields stay empty on purpose — `fixtures.test.ts` asserts it. Two more rules the field data forces: **`team` and `ywamBase` are one concept with two names** (JOCUM is the Portuguese for YWAM; all 127 fixtures carry the same string in both, so the tab shows one input and writes both — two inputs would let them drift); and **multi-value people stay in one string field**, split on `,` and `;` only — `Pati & Marcos` and `Rodolfo / Debora` are how the export records one contact, and splitting on `&` or `/` would invent people who do not exist.
3. **Objetivo** — objective(s), translation type, scope details
4. **Recursos Financeiros**
5. **Progresso** — per book / story / other, rolled up into translated / community-checked / approved / total units, with `progressHistory`. Built in FE-24 ([OBT-367](https://linear.app/shema-obt/issue/OBT-367)), 12/aug/2026 — Levi Gomes. Four rules: **every save runs through `applyProgressUpdate`** (`src/utils/progress.ts`) — it rolls the tables into the aggregates and appends the history entry, and it is a pure function of `(previous, next, date, source?)` so the wave-2 Pulse import calls the same seam — `source` carries §6's entry provenance (`fromField` is the submitter's name, a string, as the prototype's import writes it at `app.jsx:909`; `formType` the form kind), in-app saves pass none, exactly like the prototype's `handleSave`; **each history entry snapshots the unit tables**, and `progressAsOf` is the point-in-time reader — any candidate ETEN credit definition stays computable from year-end snapshots, and nothing here derives a credit (GATE-01 untouched); **a decrease is announced, never silent** — the edit form names the falling counts before save (`decreasedCounts`) and the history renders negative deltas in telha; and **a table with recorded rows stays visible even when the scope no longer selects it** (`visibleSections`) — the rows keep counting into the roll-up, so hiding them would let the form lie about what save does. This last rule deliberately extends the prototype's objective-driven switch, the same three-surfaces-agree shape as FE-23's Recursos fix. Two decisions from the PR #23 review (12/aug/2026 — Levi Gomes): **the roll-up reads only the tables that can express counts** — book and other rows; a story row has no translated/checked/approved columns, so a story-only table leaves the aggregates untouched instead of zeroing them (deliberate divergence from `data.js`'s `rollUpProgress`, which includes story rows in `items` and would overwrite the aggregates with zeros the form has no column to restore — a faithfully ported destructive quirk is still destructive, and behaviour is where the issue wins over the prototype); and **the save stamps the coordinator's local day** (`toLocalIsoDate` in `src/utils/format.ts`), never `toISOString()`'s UTC day — in UTC-3 a save after 21:00 would land on tomorrow's date, and on 31/dez in the next *year*, which is exactly the year-end reconstruction `progressAsOf` exists for. Two more from the PR #26 review (12/aug/2026 — Levi Gomes): **read mode shows what save would write** — the aggregate override `applyProgressUpdate` did inline is now `withRolledAggregates` (`src/utils/progress.ts`), and `ProgressoView` runs the materialized draft through it, so a draft kept by FE-20 can never render a header that contradicts its own table; and **a stored status outside the prototype's three edit cards stays expressible** — `modals.jsx:947-949` offers only `em-andamento` / `pausado` / `planejado`, but the fixtures hold `concluido`, `cancelado` and `desconhecido`, so `statusOptionsFor` appends the *saved* status (`draft.saved`, the anchor — never the draft value, or the way back would vanish on the first click) as a fourth card labeled by the banner vocabulary. Same shape as the roll-up divergence above: a faithfully ported quirk that silently loses data is still a bug.
6. **Saúde da Equipe** — the 4 dimensions + notes + prayer requests + pastoral-intervention flag. Built in FE-25. Three rules: **the flat `health*` fields are the projection of the newest entry in `healthHistory`, never a second truth** — `recordAssessment` in `src/utils/health.ts` is the only writer, it appends and re-projects in one step, and it carries a pre-history record into the history before appending so a first new assessment cannot erase what the flat fields already held. FE-37's wizard writes through it rather than opening its own store. **An unassessed dimension is `""`, and `""` is not `boa`** — all 127 fixtures arrive with every dimension empty, so "not assessed" is the dominant state, not an edge case; `getOverallHealth` returns `na` and the copy says the team has not been heard yet rather than that it is well. **Critical is a call for care** — the tab carries pastoral copy for `critica` and `atencao`, and the rating is legible without colour through `HEALTH_SYMBOLS` (`✓ ! × –`) plus the label, never the fill alone.
7. **Necessidades** — `needsItems[]` with category, urgency, status, `prayerShared`, `prayerAnswered`. Built in FE-26. Three rules: **the lifecycle has four states, not three** — the prototype offers `open` · `in-progress` · `fulfilled`, and FE-26 adds **`dropped`** ("no longer needed"), because a request that stopped mattering has to leave the open list *without being deleted* — deleting it loses the history a region is judged by, and leaving it open teaches the field that filling the form changes nothing. **`isOpenNeed` in `src/utils/needs.ts` is the single owner of "still outstanding"** — `open` or `in-progress` — and every consumer reads it, including the `attention` preset and the sidebar facet; a predicate written as `status !== "fulfilled"` is a bug the moment a fifth state exists. **Urgency is not health**: they never share a vocabulary, `getOverallHealth` never reads `needsItems`, and a test asserts the health facet counts do not move when urgency changes. Aggregation for Rhythm (FE-31) is `aggregateNeeds`, a derivation over the projects by region and by period — never a second store; the period cut reads `submittedAt`, so an undated need counts in the total and not in the window.
8. **Fotos / Vídeos** — signed upload, per-item authorization. Built in FE-27 ([OBT-370](https://linear.app/shema-obt/issue/OBT-370)), 12/aug/2026 — Levi Gomes. The parallel arrays the prototype kept (`mediaPhotoCaptions` / `mediaPhotoAuth`) became one collection, `mediaPhotos: MediaPhoto[]` — one owner per item — and `PROJECTS_VERSION` bumped per §4.1.1. Four rules: **the default is not authorized** — `isMediaAuthorized` accepts only an explicit `authorization.granted === true`, so an item with no recorded decision behaves exactly as a refused one; this deliberately inverts the prototype's default-checked toggle (`modals.jsx:1082`), behaviour being where the issue wins. **Every decision carries its evidence** — `makeMediaAuthorization` records who (the session user) and when (`toLocalIsoDate`), shown beside the status in both modes; a decision whose item loses its image or content is reset to undecided (`withPhotoImage`, `withVideoUrl`, `prunePhotoAuthorization`), because the consent belonged to that photo, not to the slot. **The sharing rule has one owner** — `getShareableMedia` / `canShareMedia` in `src/utils/media.ts` compose the per-item flag with §6.1's `sensitiveCountry` and the most restrictive rule wins: an authorized item of a flagged project reaches `coordenacao` but never `publico`. No sharing surface exists in wave 1; every future one (exports, prayer wall, ETEN report, notifications — BE-04) must consult these predicates, never re-derive them. **Videos are items too** — they carry the same per-item authorization the prototype only gave photos. Storage sits behind `src/services/mediaStorage.ts` (the accept list and 1200px downscale ported from `image-slot.js`); wave 2 swaps that one module for the signed-URL upload, nothing else.
9. **Notas**
10. **Materiais Traduzidos**

The tab shell must support **partial save (draft)** — a coordinator must never lose work mid-form.

**Built in FE-20 ([OBT-363](https://linear.app/shema-obt/issue/OBT-363)), 11/aug/2026 — Daniel Oliveira.** The shell is `src/components/pages/ficha/`. Four decisions the eight tab issues inherit; do not re-litigate them per tab.

- **Detail and edit are one component with a `mode` flag**, not the prototype's two. `modals.jsx` writes the same ten sections twice — `DetailModal` (550 lines) and `EditModal` (420) — which is exactly where drift lives: a field added to one and forgotten in the other. One file per tab receives `{ mode, draft }` and decides how to render each field. Ten files instead of twenty, and no way for the two modes to disagree about which fields exist. Mode rides the URL as `?modo=ver|editar`; a new record is always `editar`.
- **Tabs are a route segment, not component state:** `/ficha/:recordId/:tab`. The id in the URL (`identidade`, `equipe`, `objetivo`, `recursos`, `progresso`, `saude`, `necessidades`, `midia`, `notas`, `materiais`) is **not translatable** — the label is, via `TAB_LABEL_KEYS`. `src/constants/recordTabs.ts` owns the order, the numbering and the marker colours. An unknown tab redirects to Identidade rather than rendering nothing.
- **The draft autosaves; loss is impossible rather than warned.** Every keystroke lands in `recordStore` (`shema-record-drafts-v1`), keyed by record id, so switching tabs, closing the modal or reloading all keep the input. That is the stronger half of the issue's "impossible or explicitly warned". Discarding is explicit and confirmed by a toast. **`useDraft(recordId)` is the seam every tab uses** — `values`, `set(field, value)`, `missing`, `hasChanges`, `discard`.
- **One validator, live indication, a single point of refusal.** `missingRequired` in `recordStore` is the only place that decides what is missing — no tab writes its own check. It is *read* continuously, which is deliberate: the tab chips carry a dot, the footer names what is still missing and Save stays disabled, so the coordinator sees the gap while filling rather than discovering it at the end. What happens **only at one moment** is the *refusal*: `save()` is the sole place that can reject the promotion, and a blocked save navigates to the field via `REQUIRED_FIELD_TAB` instead of describing it. The four are `languageName`, `bridgeLanguage`, `team` and `objective` — the prototype's own four, from `EditModal.handleSave`.

### 5.3 Formulários — the field's voice

Two distinct instruments. Do not merge them.

- **Pulso Mensal** — the console **generates a self-contained offline HTML form** per project (5 questions), the leader fills it on a phone with no connectivity, returns a `.json` (typically over WhatsApp), and the console **receives** it via an **idempotent, transactional import**. Received submissions are archived byte-identically. Prayer/needs ingestion is **consent-gated**: when the leader opts out of sharing, the shared prayer text is cleared.
- **Avaliação de Saúde** — filled **in-app** by the OBT Lab mentor during an online meeting. A 4-dimension wizard (`health-modal.jsx`) with guiding questions:

  | Dimension | Question |
  |---|---|
  | Emocional | Como vocês estão sentindo o coração? |
  | Relacional | Como estão as relações entre vocês? |
  | Espiritual | Como está o caminhar com Deus? |
  | Física | Como está a saúde física? |

  Each dimension scores `boa` / `atencao` / `critica`, plus notes, prayer requests and a pastoral-intervention hook into the prayer wall.

- **Link do líder** — a generated public intake form for registering a brand-new project (`generateIntakeFormHTML`).

> The offline artifact is the project's highest technical risk: an unknown Android phone, no connectivity, and a file round trip through WhatsApp. Prove it on a real device early, not when you reach it.

### 5.4 Ritmo — the listening cascade

Five meetings, each with a cadence, a scope and the roles that attend (`ritmo.jsx`):

| Meeting | Cadence | Scope | Feeds |
|---|---|---|---|
| `monthly_regional` | monthly | region | Pulso (readiness `X/Y`) |
| `monthly_prayer` | monthly | region | prayer |
| `obtlab_team` | quarterly | region | health (readiness `X/Y`) |
| `quarterly_regional` | quarterly | region | trends |
| `annual_celebration` | annual | global | year |

Each meeting+region+period has a status: `done` / `pending` / `overdue` / `new`. Registering a meeting recalculates the next occurrence and appends to the history.

> ⚠️ The final meeting set (Prayer Pulse vs. Governance) is a **client gate** — GATE-02 ([OBT-388](https://linear.app/shema-obt/issue/OBT-388)).

### 5.5 Oração

Prayer wall compiled from every project's shared requests, with indicators and continent filter; intercessor CRUD by country; mark-answered (green highlight); share + export TXT/CSV/JSON. Requests arrive automatically from the Pulse and Health forms — **only when consent was given**.

### 5.6 ETEN

Annual credit report: yearly snapshot, credit calculation from the **delta** between snapshots, report by year, Shemá-branded PDF + CSV export, and the ETEN page (year selector, indicators, table, outputs).

> ⚠️ The credit counting method is a **client gate** (Youngshin) — GATE-01 ([OBT-387](https://linear.app/shema-obt/issue/OBT-387)). Do not implement a calculation before it is fixed.

### 5.7 Equipe — the living org chart

**One source of truth** for who holds which role in which region. Three roles per region:

| Key | Label (PT) | Responsibility |
|---|---|---|
| `coordinator` | Administrador | Finanças e comunicação estratégica com as equipes de campo |
| `obtLab` | Operacional de Línguas | Progresso da tradução, treinamentos e workshops |
| `resourceCircle` | Intercessor | Pedidos de oração, ora e compartilha com a rede |

Regions: `south-america`, `north-america`, `africa`, `asia`, `oceania` (Pacífico), `europe`, `other` (América Central).

**Everything else consumes this by reference** — the project record's Team tab, the sidebar's *Time por região*, and the Rhythm cards. Never duplicate role-holder names into another model.

---

## 6. Domain rules

Ported from `DS-PROJECT/data.js` — these are the canonical enums and derivations.

- **Project status**: `nao-iniciado` · `em-andamento` · `final` · `concluido` · `pausado` · `cancelado` · `planejado` · `desconhecido`
- **Health**: `boa` · `atencao` · `critica` · `na` — overall health is the worst of the four dimensions
- **Staleness**: `em-dia` · `atencao` · `critico`, derived from days since the last progress update (**60-day rule**)
- **Progress**: `bookProgress` / `storyProgress` / `otherProgress` roll up into `translatedUnits`, `communityCheckedUnits`, `approvedUnits`, `totalUnits`. Every change appends to `progressHistory` with the previous values and the source (`fromField`, `formType`).
- **Presets** (combinable booleans):
  - `attention` — critical health **or** critical staleness **or** a high-urgency need that is still open (`isOpenNeed`, i.e. `open` or `in-progress` — a `dropped` need must not hold a project here, same as a fulfilled one)
  - `prayer` — has a need with `prayerShared`
  - `celebrate` — completed **or** has a `prayerAnswered` need
  - `recent` — updated within 30 days
- **Need categories**: financial, training, equipment, volunteers, material, security, connectivity, logistics, documentation

### 6.1 Sensitive countries — a safety property, not a feature

`sensitiveCountry` projects must be handled with **devida cautela in every output path**: the map, exports (JSON/CSV/TXT/HTML/PDF), the prayer wall, the ETEN report and notifications.

Treat it as a cross-cutting invariant: any new output surface must go through the same redaction rule. It is scheduled deliberately **early in the backend wave** (BE-04, [OBT-393](https://linear.app/shema-obt/issue/OBT-393)), before anything that emits data, and enforced in `tripod-api`'s service layer so it holds for every consumer, not only the console.

> ⚠️ What "devida cautela" means per output is a **client gate**.

**The flag is entered in FE-21 ([OBT-364](https://linear.app/shema-obt/issue/OBT-364)), 11/aug/2026 — Daniel Oliveira**, in the record's Identity tab (`ficha/tabs/identidade/SensitiveFlag.tsx`). Two rules that hold wherever it is shown:

- **Ticking it states its own consequence, in plain words.** The panel lists what changes *today* (the Atlas plots at the region centroid and announces the withholding; cards and tooltips show the region in place of country and place) and, explicitly, **what does not yet** — exports, prayer wall, ETEN report and notifications land in wave 2 (BE-04). A checkbox that silently promises protection it does not deliver is worse than no checkbox: it invites someone to publish believing the system is guarding them.
- **The record itself shows the truth.** Redaction belongs to output paths, not to the editing surface — the coordinator filling the record is the person who needs the real country. The Identity tab therefore renders `location` verbatim with a *"país sensível"* badge beside it, exactly as the prototype's `DetailModal` does. Do not route the record through `getLocationDisplay`.

**Personal contact details carry the flag with them (FE-22).** `teamLeaderContact`, `mentorContact` and `teamContact` belong to a person who may be in a sensitive country, so the Team tab renders them verbatim — same reason as above — and, when the flag is on, states that they are personal data while pointing at the Identity tab for what the flag protects **today**. It does not restate the promise: one owner for that sentence, so wave 2 cannot leave a stale copy behind. Any new output surface that emits a contact must go through the same gate as `location`.

### 6.2 Consent

Prayer requests and needs are shared **only** with the field leader's explicit authorization. When consent is withdrawn, previously shared text is cleared, not merely hidden. Media items carry per-item authorization.

The guarantee to test: **an unauthorized prayer request is absent from all four output paths.**

**Consent is entered in FE-25 ([OBT-368](https://linear.app/shema-obt/issue/OBT-368)), 12/aug/2026 — Daniel Oliveira.** Until then `buildPrayerRequests` pushed `project.prayerRequests` onto the wall with no gate at all, while the needs beside it were already gated by `prayerShared`. Three rules now hold:

- **It is a visibility level, not a published boolean.** `PrayerVisibility` is `coordenacao` · `rede` (`src/constants/prayer.ts`). `coordenacao` is a real destination — the request reaches the people who follow up and support — not a queue for something unpublished. A team in trouble that has not consented to being shared still gets help.
- **Absence of consent is not consent.** `prayerVisibility` is optional on `Project`, and `getPrayerVisibility` reads a missing value as `coordenacao`. Nothing has to be written for a request to stay private; something has to be written for it to travel. `prayerSeed.json` leaves two entries without the field on purpose, so the fixture exercises the default.
- **The gate is `reachesPrayerWall`, and it has one owner.** Any new surface that emits prayer text must call it. Of the four output paths only the wall exists in wave 1; exports, ETEN report and notifications land in wave 2 (BE-04) and must consult the same predicate. The **project card and the record are not output paths** — they are coordination surfaces, and `coordenacao` means coordination sees it, exactly as §6.1 keeps `location` readable on the record it is entered on.

**"Cleared, not merely hidden" is about the shared copy, not the record.** Withdrawing consent must not leave a copy anywhere downstream — and in wave 1 there is nothing to clear, because the wall is **derived, not stored**: `buildPrayerRequests` recomputes from the projects on every call, so moving a request back to `coordenacao` removes it from the next query with no cleanup step. That is the property to preserve, and it is tested. What withdrawal does **not** do is delete the text from the record: coordination is a destination, not a wastebasket, and a team that withdrew permission to be shared still needs the people supporting it to know what they are carrying. Wave 2 changes the cost, not the rule — once BE-04 stores requests server-side, a withheld request must be **deleted from that store**, never flagged and retained, and a filter over a cached list is not compliance.

---

## 7. Design System (Shemá)

All visual decisions MUST follow these tokens, taken verbatim from `DS-PROJECT/design-system/colors_and_type.css`. Do not override, reinterpret or invent.

### 7.1 Palette

| Brand token | Hex | Usage |
|---|---|---|
| `branco` | `#F6F5EB` | page background |
| `areia` | `#C5C29F` | sand — calm neutrals, borders |
| `azul` | `#89AAA3` | sage blue — supporting accent |
| `telha` | `#BE4A01` | terracotta — **CTAs and active states only** |
| `verde-claro` | `#777D45` | olive — primary brand green, success |
| `verde` | `#3F3E20` | deep olive — body text, dark surfaces |
| `preto` | `#0A0703` | warm near-black — headings |

**Semantic layer (prefer this in code):**

- Backgrounds — `canvas` (= branco), `elevated` (`#FFFFFF`), `muted` (`#ECEADF`), `quiet` (= areia), `inverse` (= verde), `brand`/`accent` (= telha)
- Foreground — `fg` (= verde), `fg-strong` (= preto), `fg-muted` (`#5A5A3E`), `fg-subtle` (`#8A8970`), `on-dark`/`on-brand` (= branco), `on-light` (= verde), `link` (= telha)
- Accent states — `accent-hover` `#A23E00`, `accent-press` `#872F00`, `accent-soft` `#F2D8C2`
- Lines — `line` (verde @16%), `line-strong` (verde @32%), `line-on-dark` (branco @18%)
- **Ink weights** — a palette colour that has to carry *small text* on a light surface has a darker sibling at the same hue: `azul-ink` `#406560` for azul (the prototype's own value in `.tag.azul` and `.need-status-tag.status-in-progress`), `status-attention-fg` `#8B6018` and `deadline-soon` `#A06C12` for the amber. They are the same series, not new colours — surfaces and *decorative* strokes keep the base token, text takes the ink. `src/styles/__tests__/tokens.test.ts` pins the hue relationship and the contrast that justifies each one; **do not add a sixth value to a family without it.**
  - **A stroke that carries data is not a decorative stroke.** The middle arc of `ProgressRings` is `stroke-azul-ink`, not `stroke-azul`, because the base fails WCAG 1.4.11's 3:1 for meaningful graphical objects on every surface we have — 2.52 on `elevated`, 2.40 on `paper`. It was `stroke-azul` in the prototype's Coral card and stayed wrong through FE-15; FE-17 fixed it when the graphic moved into the Diário. The other two arcs keep their base tokens, which pass. The test pins all three against `paper`, the surface the rings actually live on.

Rules:
- **Telha is exclusive to CTAs, primary actions and active states.** Never decorative.
- **White is reserved for elevated surfaces** — always via `bg-elevated`, never a hardcoded `bg-white`.
- **No generic greys.** Use the earthy Shemá palette.
- No arbitrary hex values in JSX. Extend the theme instead.

**Resolved in FE-19 ([OBT-421](https://linear.app/shema-obt/issue/OBT-421)), 10/aug/2026 — Levi Gomes.** "Prefer the semantic layer" was advice, and the repo had been ignoring it since FE-03: 62 places painted **ink** with a brand token — 22 in the merged base, 23 more arriving with FE-14, 17 with FE-15. It is invisible today — `--fg` *is* `--shema-verde` — and it is the bug §7.4 is built to avoid, since only the semantic names get reassigned when the dark palette lands. It is now a rule with a guard.

- **Ink comes from the semantic tier. `text-verde` · `text-branco` · `text-preto` are blocked** by `no-restricted-syntax` in `eslint.config.js` (the `BRAND_INK` selector), across all of `src/`, **with no exemption list** — the `/design-system` showcase never painted ink with a brand token, so there is nothing to carve out.
- **The semantic name follows the surface, not the pixel**: `text-fg` (`text-fg-strong` for headings) over canvas, `bg-elevated` and `bg-muted`; `text-on-brand` over a brand fill (telha, verde-claro); `text-on-dark` over `bg-inverse`, the topbar and a saturated status fill; `text-on-light` over `bg-status-na`. Every substitution resolves to the same hex it replaced, and `src/styles/__tests__/semanticInk.test.ts` pins that against `index.css` — a repaint fails the test, not a review.
- **`text-verde-claro` is not ink in that sense** and stays: it is the brand green and the success foreground, and the semantic tier has no counterpart for it. The rule's negative lookahead exists for exactly this.
- **`__tests__` is outside the corpus of every styling rule** (`NOT_SHIPPED_STYLING`). A test that proves the guard catches a violation has to be able to write one, and a test asserting `#3F3E20` is the point of the test. The scope is asserted by the test that depends on it.
- **Where one class paints several fills, the ink is named once and everything inside inherits it.** The toaster is the case: sonner composes `classNames.toast` + `classNames.default` + `classNames[type]`, and `default` applies to *every* toast, so a per-type ink would compete with the base one and Tailwind's emission order — not the source — would pick the winner. `TOAST_CLASSNAMES` therefore carries a single `text-on-dark` on the `toast` slot and `text-current/80` on the description. Making the distinction expressible is [OBT-422](https://linear.app/shema-obt/issue/OBT-422), which fixes the same defect on the fills, where it already renders wrong.
- **Two gaps stay open, deliberately.** Fills, borders and veils — `bg-verde/8`, `bg-branco/20`, `border-verde/18`, `border-branco/[0.22]` — keep their brand tokens: §7.1 reserves brand for fills, and whether a wash of the ink colour flips with the theme is part of §7.4's undecided palette. And **`text-areia` has no semantic replacement at all**: the muted ink on the dark topbar and in `DialogDescription` would need an `on-dark-muted` token that `design-system/colors_and_type.css` does not define. Inventing it is a brand-owner decision, so it ships with the dark palette or not at all.

### 7.2 Typography

- **Montserrat** — the entire interface (UI, buttons, nav, labels, headings). Weights 400/500/600/700/900.
- **Merriweather** — long-form text, pull quotes and the italic display voice only. Weights 300/400/700.
- Scale (px): display 88 · h1 56 · h2 40 · h3 28 · h4 22 · lead 20 · body 16 · small 14 · micro 12 · eyebrow 13
- Rhythm: `lh-tight` 1.05 · `lh-snug` 1.2 · `lh-body` 1.55 · `lh-loose` 1.7
- Tracking: eyebrow `0.14em` uppercase; buttons `0.04em`; headings slightly negative (`-0.01em` h1, `-0.005em` h2)
- **Eyebrow** pattern: 13px, weight 600, uppercase, `0.14em`, `fg-muted` — used above every section title.

### 7.3 Spacing, radii, shadows, motion

- **Base unit 4px.** Scale: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128
- **Radii**: xs 4 · sm 8 · md 14 · lg 22 · xl 32 · pill 999 — generous curves matching the wordmark
- **Shadows** (warm, low): `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-card` (`0 2px 6px rgba(63,62,32,.08)`)
- **Cards**: `bg-elevated`, **no borders** — depth comes from shadow only
- **Motion**: `--ease-out` `cubic-bezier(.2,.8,.25,1)`, `--ease-in` `cubic-bezier(.5,0,.8,.3)`; durations 140ms / 220ms / 380ms. Gentle, **never bouncy**.
- **Layout**: `--container-max` 1200px, `--container-narrow` 760px, `--container-pad` `clamp(20px, 4vw, 56px)`

### 7.4 Dark mode

Tailwind v4 `@custom-variant dark`; all overrides live in `@layer base { .dark { ... } }` using the same token names so token-based styling adapts automatically. The Atlas night globe is dark by design in both themes.

**Raised in FE-02 ([OBT-349](https://linear.app/shema-obt/issue/OBT-349)), 30/jul/2026 — open, pending design.** `DS-PROJECT/design-system/colors_and_type.css` defines **light surfaces only**, and `app.css` has no `.dark` block or `prefers-color-scheme` query anywhere. The prototype's only dark surfaces are `--bg-inverse` (verde) and `.surface-black` (preto) — enough for the topbar, not for a full theme: `--bg-elevated`, `--bg-muted`, `--fg-muted` and `--fg-subtle` have no dark counterpart in the design authority.

Per §2 the prototype wins on visuals, so a dark palette is a **design deliverable, not an engineering choice**. FE-02 therefore shipped the mechanism and not the palette:

- `@custom-variant dark (&:where(.dark, .dark *))` is declared in `src/index.css`.
- The semantic tier is defined as `var()` indirections over the raw tokens (not `@theme inline`), so a later `.dark` block only has to reassign `--bg`, `--fg`, `--line`, … and every component follows without a code change.
- **No `.dark` overrides exist yet, and no component should ship `dark:` utilities** until the palette lands here.

Unblocking it needs the seven dark values from the brand owner (or an explicit "derive them"). Record the decision, its date and its author here when it lands.

**FE-19 ([OBT-421](https://linear.app/shema-obt/issue/OBT-421)) adds one value to that ask: a muted ink for dark surfaces.** §7.1's sweep moved every brand ink token to the semantic tier except `text-areia` — the topbar tagline and `DialogDescription` — because `on-dark` is solid branco and nothing quieter exists. It travels with the palette, not before it.

### 7.5 Focus

Define a single global `*:focus-visible` outline using the telha focus ring. Components must **not** add `focus:ring-*` utilities.

---

## 8. State, API and Auth

### State

- **Zustand** — cross-page state: filters + saved views, regions/team org chart cache, notifications, onboarding dismissals. One store per domain, `persist` middleware where the prototype persists to localStorage.
- **In wave 1 the store is also where writes live** — it hydrates once from the fixture module and owns the mutated copy from then on. The rules, and why the fixture module stays read-only, are in §4.1.1.
- **React Context** — `AuthContext` (user, roles, region scope) and `ThemeContext` (light/dark/system).
- **Local state** — forms, modals, table filters. Do not lift unless shared across routes.

### API

**Wave 1 makes no API calls** — every screen reads the fixture layer (§4.1). The Axios client and the `/api` dev proxy are wired but unused; that seam is what wave 2 plugs into.

From wave 2 on, all backend calls target **`tripod-api`** and go through a single Axios instance in `src/services/api.ts`, with namespaced APIs (`authAPI`, `projectsAPI`, `regionsAPI`, `meetingsAPI`, `prayerAPI`, `etenAPI`, `formsAPI`, `mediaAPI`). Add new methods to the right namespace — never create a second client or duplicate auth handling.

- Dev: Vite proxy `/api` → `http://localhost:8000`
- Prod: `BACKEND_URL` injected at container entrypoint
- Keep TypeScript types aligned with the Pydantic schemas in `tripod-api`'s `app/models/`. `tripod-api` produces its own OpenAPI from FastAPI — read the schema rather than inferring shapes from a sample response.
- Before adding an endpoint, check whether `tripod-api` already exposes one (§3.2 reuse table).

### Auth

- Wave 1: a **mocked session** in `AppShell`. No real login.
- Wave 2: JWT access + refresh in localStorage; request interceptor attaches the bearer token; a 401 triggers refresh-and-retry, and on refresh failure clears tokens and redirects to `/login`.
- Authorization is **by role and by region**. A regional role-holder sees and edits their region; global roles see everything.
- A simplified **leader link token** grants access to the public intake form only.
- The frontend never *enforces* authorization — it only reflects it. Every rule is enforced in `tripod-api`'s service layer; hiding a control in the UI is presentation, not security.

---

## 9. UX principles

- **Lightweight and uncluttered.** Generous whitespace. The prototype's density is the target — do not compress it.
- **Contextual guidance, not tutorials.** `InfoTooltip` `(i)` next to section headers and non-obvious fields. No multi-step onboarding wizards, no blocking modals.
- **Guided empty states.** Every empty section explains the concept and offers the action, never "No data found".
- **Live counts everywhere.** Filters, presets and result rows always show how many.
- **PT/EN parity.** Every string goes through i18n. The prototype ships both — keep them in sync.
- **The field comes first.** Anything a field leader touches must survive no connectivity, an old phone, and a round trip through WhatsApp.

**Resolved in FE-18 ([OBT-420](https://linear.app/shema-obt/issue/OBT-420)), 09/aug/2026 — Levi Gomes.** PT/EN parity is enforced by two guards that see different things, and both must stay green:

- `shema/no-hardcoded-copy` (`eslint.config.js`) reads JSX. It runs on `src/components/**/*.tsx` **and** `src/contexts/**/*.tsx`, and treats a prop as user-facing when it is named `title` · `placeholder` · `alt` · `aria-label` · `aria-description` · `label` · `message`, or when its name ends in `Label` · `Message` · `Title` · `Text` · `Description` · `Placeholder`. Copy reaching a component through a custom prop is no longer invisible to it.
- `src/i18n/__tests__/copyLeak.test.ts` reads the source text and the rendered output. It fails when a PT catalogue value whose EN counterpart differs appears as a literal in the **shipped** source under `src/components/**` or `src/contexts/**`, and it renders the nav and the six area placeholders in EN to assert no Portuguese survives. A vocabulary that never reaches JSX — `SESSION_ROLE_LABEL_KEYS`, a plain `Record` — is only caught by this one. Files under `__tests__/` are outside its corpus: a parity test asserting `"Administrador"` is the point of the test, not a leak.
- **Two exemptions remain, both narrow and named in the config**: the four `design-system/` showcase files (untranslated by design; translating or gating that route is its own issue) and `src/components/layout/RoleSwitcher.tsx`. The dev session overlay was extracted out of `AppShell` precisely so the exemption could name one dev-only file instead of the shell — it renders under `import.meta.env.DEV` only, and its role chips and identity line still go through `t()`. `eslint.config.js` is the single owner of both lists; the test imports them rather than restating them, and deliberately keeps scanning the dev overlay that lint skips.
- **A handful of keys do not come from `data.js`** — the prototype has no equivalent: `nav_areas` (the nav landmark's `aria-label`), `empty_soon` (the placeholder's closing line, worded to match `toast_pending`) and, since FE-23 ([OBT-366](https://linear.app/shema-obt/issue/OBT-366)), `f_phase_remove` (the phase editor's remove button — the prototype's `×` carries no name, and every state needs both channels). FE-24 ([OBT-367](https://linear.app/shema-obt/issue/OBT-367)) adds four: `row_remove` (the progress tables' `×` — its `title="Remover"` is the prototype's, the EN half is ours), `story_record_status` (the story row's status select carries no name), `progress_no_scope_hint` (the tab's guided empty state, §9) and `progress_decrease_warn` (OBT-367's decrease-must-be-visible rule). §13's "keys ported from `data.js`" is the rule; these are the recorded exceptions. Keys the prototype writes as inline locale ternaries instead of `I18N` entries (FE-23's `f_financial_other`, `placeholder_objective_notes`, …) are not exceptions — the values are the prototype's own, per FE-15's precedent.
- **The session's role vocabulary is the org chart's**, per §5.7: `SESSION_ROLE_LABEL_KEYS` reads its label keys from `ROLE_DEFINITIONS` in `src/constants/roles.ts` rather than restating them. When no one holds the role, `resolvePersonaName` returns `null` and the view renders `sb_no_coordinator` — "— a definir" is chrome, not a name, and never sits in the session model.

---

## 10. Delivery plan (Linear)

Team `OBT`. Every issue follows: **Goal / Read these first / Context & specs / Scope (files this issue may touch) / Definition of Done / Out of scope**, and every Scope section repeats *do not touch `DS-PROJECT/`*.

**Labels:** `Essential` · `Nice-to-have` (mirroring the PRD priority column) · `needs-client-decision`.

### Two waves

**Wave 1 — the frontend, against fixtures.** The whole product, clickable on a real URL, before any backend exists. This is the point: twelve screens settle the questions the PRD left open, and the types they grow become the contract wave 2 implements.

| Milestone | Issues | What it is |
|---|---|---|
| **F1 · Base do front** | FE-01…07 | Scaffold, tokens + fonts, UI primitives, style constants, **fixture layer**, AppShell + 6 routes + mocked session, i18n from `data.js` |
| **F2 · Projetos** | FE-10…17 | Sidebar (search, chips, detailed filters), Time por região, Atlas, Diário, saved views |
| **F3 · Ficha do projeto** | FE-20…28 | Record shell (modal, 10 tabs, draft) then one issue per tab |
| **F4 · Demais áreas** | FE-30…39 | Início, Ritmo, Oração, Intercessores, ETEN, Formulários, Equipe, Health wizard, notifications, header modals |
| **F5 · Deploy no Cloud Run** | FE-40…44 | CI (lint + `tsc -b`), Dockerfile + nginx + entrypoint, Cloud Run via Artifact Registry, a11y/responsive pass, **freeze the data contracts** |

**Wave 2 — the backend and integration.**

| Milestone | Issues | What it is |
|---|---|---|
| **B1 · Backend** | GATE-01…03, BE-01…16 | **BE-01 audits `tripod-api` first**, then the Shemá model + migrations, roles/region scope, sensitive-country rule, and one issue per area. BE-16 migrates the 127 projects from the Notion export. |
| **B2 · Integração por tela** | INT-01…12 | Swap the fixture layer for the real API **one screen at a time**, reversible per screen, fixtures kept behind a flag for local dev. INT-12 closes with a privacy and production-readiness review. |

### Rules of engagement

- **Contracts before implementation.** No screen is built against a hand-written type; no endpoint is implemented before its shape is agreed. FE-44 ([OBT-386](https://linear.app/shema-obt/issue/OBT-386)) is where wave 1's types become wave 2's written contract — including the privacy rules, stated as *server-side* requirements.
- **Watch the shared files.** `src/components/ui/**`, the i18n catalogues, and on the backend the Alembic chain, are where two people collide.
- **Do not skip the Definition of Done checkboxes.** Several encode the actual product guarantee — the byte-identical archive round trip, the double-import no-op, the unauthorized prayer request absent from all four output paths. Those tests *are* the requirement.

### ⚠️ Open client gates

Do not freeze the corresponding contracts before these are answered. They cost about a day of team effort but an unknown number of weeks of someone else's calendar — send them early.

| Gate | Issue | Blocks |
|---|---|---|
| ETEN credit counting method (Youngshin) | GATE-01 · [OBT-387](https://linear.app/shema-obt/issue/OBT-387) | BE-11, INT-08 |
| Final meeting set — Prayer Pulse vs. Governance | GATE-02 · [OBT-388](https://linear.app/shema-obt/issue/OBT-388) | BE-10, FE-31 |
| Monthly Pulse file format (`.html` / `.json`) | GATE-03 · [OBT-389](https://linear.app/shema-obt/issue/OBT-389) | the Pulse epic — the riskiest work |
| What "devida cautela" means per output | — | BE-04 and every output surface |

### Stale references you will encounter

The Linear project description body, the B1 milestone description and the *"Working plan — two developers in parallel"* document predate the current backlog. When they conflict with this section, **this section and the issues themselves win**:

| Stale wording | Current reality |
|---|---|
| repo `shema-console` | this repo, `shemaobt/project-management-ecosystem` |
| repo `shema-backend`, "FastAPI scaffold", "build the backend" | the **existing** `shemaobt/tripod-api`; Shemá is a module inside it, already scaffolded |
| epics `SHM-01…13`, issues `OBT-266`…`OBT-346` | `FE-*` / `BE-*` / `INT-*` / `GATE-*`, issues `OBT-348`…`OBT-417` |
| milestones "1 Fundação … 5 Prestação de contas" | F1…F5 (wave 1), B1…B2 (wave 2) |
| `cards.jsx` implements `CardCoral`, and `app.jsx` switches `metaphor` across three values | the product ships **two** views; Coral's rings live in the Diário's footer (§5.1, FE-17). The prototype was not updated — it is the client's file, and FE-15's scope forbids touching `DS-PROJECT/` |

---

## 11. Code style

- **No comments for "what".** Names and structure carry the meaning; comment only non-obvious "why".
- **No module-level description comments.** File name and location convey purpose.
- **TypeScript**: explicit types for props, API payloads and store shapes. Avoid `any` where a real type exists.
- **Python**: strong typing on public functions; explicit Pydantic models over bare `dict`; concise docstrings on public service functions.
- **File names**: PascalCase for React components (`ProjetosPage.tsx`), camelCase for utilities, hooks and stores (`api.ts`, `cn.ts`), snake_case one-operation-per-file in `tripod-api` services (`create_project.py`).
- Domain vocabulary stays in Portuguese where the product uses it (Ritmo, Pulso, Oração, Equipe, telha, verde) — do not anglicize identifiers that map to UI concepts the client names in Portuguese.

---

## 12. Git workflow

When the user says the code is ready or asks for a PR:

1. Create a branch from HEAD using the issue's `gitBranchName` from Linear (e.g. `levigft/obt-348-fe-01-scaffold-do-app-em-project-management-ecosystem`).
2. Commit in small, scoped commits — one logical change each.
3. Push with `-u`.
4. Open a PR against `main` via `gh pr create`, title under 70 chars, body with `## Summary` and `## Test plan`.
5. Return the PR URL.

Reference the Linear issue ID (`OBT-###`) in the branch name and PR body. Never force-push or amend published commits.

---

## 13. Checklist

### Frontend

- [ ] **Every screen is derived from `DS-PROJECT/`** — file opened and matched before implementing.
- [ ] `DS-PROJECT/` was not modified — verified in the diff.
- [ ] `meaning-map-ui` consulted for engineering patterns only, never for appearance.
- [ ] Stack only: React, TypeScript, Vite, Tailwind v4, Zustand, Context, Axios, Radix/shadcn primitives, lucide-react, sonner, i18next, react-leaflet.
- [ ] Tokens exactly as in `design-system/colors_and_type.css`; no stray hex; telha reserved for CTAs and active states.
- [ ] Ink from the semantic tier, named after the surface it sits on — `text-fg` / `text-fg-strong` / `text-on-brand` / `text-on-dark` / `text-on-light`, never `text-verde` / `text-branco` / `text-preto` (§7.1).
- [ ] **A new token is named after the fact it carries, and the name survives being read out of context.** When the same concept is drawn in two channels (a ring and its label, a badge and its text), both go through tokens whose names say they are the same series — an ink weight (§7.1), not a second colour with a screen's name on it. New value in a family ⇒ hue and reason pinned in `src/styles/__tests__/tokens.test.ts`.
- [ ] `bg-elevated` for cards/modals/inputs; `bg-canvas` for pages; `bg-muted` for subtle fills. Never `bg-white`.
- [ ] Cards have **no borders** — shadow only.
- [ ] Montserrat for UI, Merriweather for long-form/quotes.
- [ ] Functional components, under 300 lines, split by responsibility.
- [ ] Tailwind only; `cn()` for merging; `cva` for variants; centralized constants in `src/styles/`.
- [ ] Dark mode verified; global `*:focus-visible` outline used, no ring utilities.
- [ ] Screens read the **fixture layer**, not a hand-rolled local copy (wave 1).
- [ ] PT/EN strings both present, keys ported from `data.js`.
- [ ] Guided empty states, InfoTooltips, live counts.

#### Before opening the PR — what review keeps catching

Wave 1's reviews (PRs #10–#16) return to the same handful of defects, listed here with the PR that raised each. Run it against the diff before asking for eyes:

**Design system**

- [ ] **No raw colour where a token exists — including alphas.** A hex lint only catches `#BE4A01`; `rgba(190,74,1,.25)` is the same colour spelled by hand. Palette colours take the Tailwind alpha modifier (`border-telha/25`, `stroke-verde/10`); a value that is genuinely new becomes a token in `index.css`, named per §7.1. *(#11, #14)*
- [ ] **Semantic tier before brand token.** `text-fg-strong` / `text-fg` / `text-on-brand`, not `text-preto` / `text-verde` / `text-branco`. §7.4 built dark mode as `var()` indirections over the semantic names, so a brand token will not follow a `.dark` palette when it lands. Brand tokens stay only where the colour *is* the brand and must not flip — the washi tape, the accent fills. *(#10)*
- [ ] **Every state combination has an exit.** Active × disabled, filter × selection, empty × required: a control that can enter a state it cannot leave is a bug even when the current data never produces it. Check the hover/variant cascade too — an `active` fill must survive `:hover`. *(#11)*
- [ ] **Every state is on both channels.** What colour or shape says, text says too — `title`, `aria-label` or an `sr-only` span — and what text says, the visual carries. A dashed "approximate" ring whose tooltip never mentions approximation is half a feature. *(#14)*

**Numbers and data**

- [ ] **A count never promises results a click will not return.** The facet count and the filter predicate answer the same question: if the filter is `.some(...)` over needs, the count is projects, not need items. *(#10)*
- [ ] **Displayed counts and labels implement the *product's* definition.** "Regiões" counts the 7 regions the org chart uses, not the distinct country strings the reference implementation happened to split on. When the label and the computation disagree, the label wins and the computation changes. *(#14)*
- [ ] **Buckets and limits are exercised.** Ranges must not overlap at their seams — a project at exactly 25% belongs to one bucket. Test the exact edge, zero, and the empty list. *(#10)*
- [ ] **No escape hatch that breaks a stated invariant.** A `null`/fallback branch excused by "no fixture has this case today" is a broken invariant with a delivery date. Prefer total functions. *(#14)*

**Structure**

- [ ] **One owner per collection and per fact.** Before loading, look for who already loads it; before adding a list, look for who already exports it. Two guards that must agree by hand (a lint config and a test) are one owner too many. *(#13, #15)*
- [ ] **Reuse before creating.** A component that already exists in `common/` or `ui/` is consumed, never re-made locally; if it lacks the variant you need, the variant goes into the shared component. *(#10)*
- [ ] **No `as`, `as never` or `any` at a typed seam**, and no union left inferred as `string`. A cast to a string map throws away every relation the file exists to encode — carry the relation in the type instead. *(#12, #14)*
- [ ] **Each catalogue speaks its own language, and both are complete.** A PT entry holding the prototype's English string is a defect regardless of provenance. *(#14)*
- [ ] **Tests pin behaviour, not formatting**, and a guard's own scope is asserted — a walk that also sweeps `__tests__` reports the PT/EN parity tests as leaks. *(#13, #15)*
- [ ] **A doc line the diff contradicts is reconciled in the same PR.** §2 says which source wins; silence is not a resolution. *(#12)*

### Backend (`tripod-api`)

- [ ] `tripod-api/CLAUDE.md` read before writing backend code.
- [ ] Work lands **inside the existing Shemá module** (`app/api/shema/`, `app/services/shema/`) — no new service, no new repo.
- [ ] Checked whether the capability **already exists** before building it (§3.2 reuse table); BE-01's verdict respected.
- [ ] `app/api/` stays thin — **zero database access in routers**, no SQLAlchemy imports beyond `AsyncSession`.
- [ ] All queries in `app/services/`; services raise from `app/core/exceptions.py` and never import `HTTPException`.
- [ ] Async end-to-end, session injected via `get_db`.
- [ ] Schema change ships with an Alembic migration; migration chain has a single head.
- [ ] Secrets via GCP Secret Manager; commands run inside Docker Compose.
- [ ] Shemá's health assessment kept distinct from the existing `project_health` module.

### Cross-cutting

- [ ] Role **and region** authorization enforced in services, not just hidden in the UI.
- [ ] Sensitive-country rule applied to every new output surface, enforced backend-side.
- [ ] Consent respected for prayer, needs and media — unauthorized requests absent from **all four** output paths.
- [ ] Team roles resolved **by reference** to the Equipe org chart — never duplicated.
- [ ] No client-gated contract frozen before its Linear issue is answered.
