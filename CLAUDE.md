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
- **If the prototype and this document disagree, the prototype wins** on visuals; the PRD and Linear issues win on behaviour and scope. Where a question is scope dressed as visuals, it is a gate — see §5.1 (Coral).
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
- **State**: **Zustand** for cross-page state; **React Context** for auth, theme and UI state
- **HTTP**: Axios — a single client in `src/services/api.ts` with JWT auth interceptors
- **Icons**: lucide-react, outline only (the prototype's inline SVGs are lucide-style at `strokeWidth 1.75`)
- **Toasts**: sonner
- **i18n**: i18next, PT/EN toggle, keys ported from `DS-PROJECT/data.js`
- **Utilities**: `cva`, `clsx`, `tailwind-merge`; use `cn()` from `src/utils/cn.ts`
- **Maps**: react-leaflet + leaflet (Atlas view)

Do not introduce Redux, MobX, or a second styling system.

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
- Every filter option shows its **count**. Options with count 0 are hidden; presets with count 0 are disabled. The counting logic already exists in `Sidebar` as a single pass — port it.
- **Toolbar**: result count + **metaphor pill** + sort (deadline, name, progress, team, health).
- **Card metaphors** (`cards.jsx`): `CardAtlas` (wide horizontal logbook entry), `CardDiario` (field-journal page with washi tape), `CardCoral` (arc/wave shapes).
- **Atlas** additionally renders the rotating night globe with photo medallions above the grid.
- Pagination: 30 items, *Mostrar mais* +30.

**Resolved in FE-15 ([OBT-360](https://linear.app/shema-obt/issue/OBT-360)), 09/aug/2026 — Levi Gomes.** Three decisions the card views forced:

- **The Diário card carries the three progress counts, which the prototype's `CardDiario` does not.** `cards.jsx` shows only `{percent}%` in the journal footer; FE-15's issue states the product rule — *"translated / community-checked / mentor-approved is a pipeline… never collapse them into a single percentage"* — and its Definition of Done demands the three counts separate. Per §2 the prototype wins on visuals but the issue wins on behaviour, so the footer gained the Atlas card's `translated/total` head and its `N checado · N aprovado` marks line, in the Diário's own type scale. Nothing else was added.
- **The card list obeys FE-14's sensitive-country display rule, by reference.** Both cards read `getLocationDisplay` from `src/utils/region.ts` — the single owner — so a `sensitiveCountry` project shows its region name where the location goes, never the country or place. **Known gap, not fixed here:** the rule redacts the *location field only*; the team/base name still renders verbatim, and two of the three seed values name a place (`YWAM Egypt`, `YWAM Morelia`). Redacting it is a second rule, which belongs to the open client gate on what *devida cautela* means per output (§6.1) — do not invent it screen by screen.
- **The Diário's washi tape is telha by default, and that is not decoration.** `app.css` paints `.diario-tape` telha and overrides it only for `priority-warning`, `-completed` and `-default` — so roughly half the board is telha, which §7.1's *"telha only for CTAs and active states"* would forbid. §2 settles it: the tape is a visual, the prototype wins, and the rule keeps describing controls. Same shape as FE-14's border conflict.
- **Where the prototype's copy is a string operation, FE-15 used real keys.** `cards.jsx` builds the Coral labels by slicing translated strings (`t.d_p_translated.split(' ')[0]`), which reads *"Já"* in PT and turns *"Mentor-approved"* into *"Mentor"* in EN. The short forms are now catalogue keys (`d_p_*_short`), and *Mostrar mais* — hardcoded in the prototype — is `load_more`.

> ⚠️ **Two views or three? — client gate, FE-17 ([OBT-362](https://linear.app/shema-obt/issue/OBT-362)).** The prototype implements three metaphors; the PRD v1.1 revision history records a client decision that *"list views reduced to Atlas and Journal."* This is scope dressed as a visual, so §2's "prototype wins on visuals" does not settle it. Do not finish or delete Coral before the answer lands — and record the decision, its date and its author here when it does.

### 5.2 Cadastro do projeto — the living record

Ten numbered sections, in this order, in both the detail modal and the edit form (`modals.jsx`):

1. **Identidade** — language name/code, bridge language, vitality, location, speakers, coords, **sensitive-country flag**
2. **Equipe** — base, leader, mentor, translators, technical reviewers, partner org, contact
3. **Objetivo** — objective(s), translation type, scope details
4. **Recursos Financeiros**
5. **Progresso** — per book / story / other, rolled up into translated / community-checked / approved / total units, with `progressHistory`
6. **Saúde da Equipe** — the 4 dimensions + notes + prayer requests + pastoral-intervention flag
7. **Necessidades** — `needsItems[]` with category, urgency, status, `prayerShared`, `prayerAnswered`
8. **Fotos / Vídeos** — signed upload, per-item authorization
9. **Notas**
10. **Materiais Traduzidos**

The tab shell must support **partial save (draft)** — a coordinator must never lose work mid-form.

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
  - `attention` — critical health **or** critical staleness **or** an unfulfilled high-urgency need
  - `prayer` — has a need with `prayerShared`
  - `celebrate` — completed **or** has a `prayerAnswered` need
  - `recent` — updated within 30 days
- **Need categories**: financial, training, equipment, volunteers, material, security, connectivity, logistics, documentation

### 6.1 Sensitive countries — a safety property, not a feature

`sensitiveCountry` projects must be handled with **devida cautela in every output path**: the map, exports (JSON/CSV/TXT/HTML/PDF), the prayer wall, the ETEN report and notifications.

Treat it as a cross-cutting invariant: any new output surface must go through the same redaction rule. It is scheduled deliberately **early in the backend wave** (BE-04, [OBT-393](https://linear.app/shema-obt/issue/OBT-393)), before anything that emits data, and enforced in `tripod-api`'s service layer so it holds for every consumer, not only the console.

> ⚠️ What "devida cautela" means per output is a **client gate**.

### 6.2 Consent

Prayer requests and needs are shared **only** with the field leader's explicit authorization. When consent is withdrawn, previously shared text is cleared, not merely hidden. Media items carry per-item authorization.

The guarantee to test: **an unauthorized prayer request is absent from all four output paths.**

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
- Foreground — `fg` (= verde), `fg-strong` (= preto), `fg-muted` (`#5A5A3E`), `fg-subtle` (`#8A8970`), `on-dark`/`on-brand` (= branco), `link` (= telha)
- Accent states — `accent-hover` `#A23E00`, `accent-press` `#872F00`, `accent-soft` `#F2D8C2`
- Lines — `line` (verde @16%), `line-strong` (verde @32%), `line-on-dark` (branco @18%)

Rules:
- **Telha is exclusive to CTAs, primary actions and active states.** Never decorative.
- **White is reserved for elevated surfaces** — always via `bg-elevated`, never a hardcoded `bg-white`.
- **No generic greys.** Use the earthy Shemá palette.
- No arbitrary hex values in JSX. Extend the theme instead.

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

---

## 10. Delivery plan (Linear)

Team `OBT`. Every issue follows: **Goal / Read these first / Context & specs / Scope (files this issue may touch) / Definition of Done / Out of scope**, and every Scope section repeats *do not touch `DS-PROJECT/`*.

**Labels:** `Essential` · `Nice-to-have` (mirroring the PRD priority column) · `needs-client-decision`.

### Two waves

**Wave 1 — the frontend, against fixtures.** The whole product, clickable on a real URL, before any backend exists. This is the point: twelve screens settle the questions the PRD left open, and the types they grow become the contract wave 2 implements.

| Milestone | Issues | What it is |
|---|---|---|
| **F1 · Base do front** | FE-01…07 | Scaffold, tokens + fonts, UI primitives, style constants, **fixture layer**, AppShell + 6 routes + mocked session, i18n from `data.js` |
| **F2 · Projetos** | FE-10…17 | Sidebar (search, chips, detailed filters), Time por região, Atlas, Diário/Coral, saved views |
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
| Coral: two list views or three? | FE-17 · [OBT-362](https://linear.app/shema-obt/issue/OBT-362) | FE-15, and §5.1 of this file |
| What "devida cautela" means per output | — | BE-04 and every output surface |

### Stale references you will encounter

The Linear project description body, the B1 milestone description and the *"Working plan — two developers in parallel"* document predate the current backlog. When they conflict with this section, **this section and the issues themselves win**:

| Stale wording | Current reality |
|---|---|
| repo `shema-console` | this repo, `shemaobt/project-management-ecosystem` |
| repo `shema-backend`, "FastAPI scaffold", "build the backend" | the **existing** `shemaobt/tripod-api`; Shemá is a module inside it, already scaffolded |
| epics `SHM-01…13`, issues `OBT-266`…`OBT-346` | `FE-*` / `BE-*` / `INT-*` / `GATE-*`, issues `OBT-348`…`OBT-417` |
| milestones "1 Fundação … 5 Prestação de contas" | F1…F5 (wave 1), B1…B2 (wave 2) |

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
- [ ] `bg-elevated` for cards/modals/inputs; `bg-canvas` for pages; `bg-muted` for subtle fills. Never `bg-white`.
- [ ] Cards have **no borders** — shadow only.
- [ ] Montserrat for UI, Merriweather for long-form/quotes.
- [ ] Functional components, under 300 lines, split by responsibility.
- [ ] Tailwind only; `cn()` for merging; `cva` for variants; centralized constants in `src/styles/`.
- [ ] Dark mode verified; global `*:focus-visible` outline used, no ring utilities.
- [ ] Screens read the **fixture layer**, not a hand-rolled local copy (wave 1).
- [ ] PT/EN strings both present, keys ported from `data.js`.
- [ ] Guided empty states, InfoTooltips, live counts.

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
