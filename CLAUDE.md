# Ecossistema Shemá — Agent Guidelines

This file defines the conventions for LLM agents working in this repository. Follow these instructions exactly as written.

> **Rule zero — the frontend is built from `DS-PROJECT/`.**
> `DS-PROJECT/` is the approved, client-validated design and interaction prototype for this product. Every screen, layout, component, token, flow, label and interaction in the frontend MUST be derived from it. Do not invent screens, do not redesign, do not substitute a different visual language. See §2.

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

**Repos referenced by the plan:**
- Frontend — `shema-console` (React 18 + Vite + Tailwind v4)
- Backend — **`tripod-api`** (`git@github.com:shemaobt/tripod-api.git`) — FastAPI, service-driven. This is an **existing, running backend**, not a greenfield scaffold: the Shemá domain is added *inside* it, reusing its auth, roles, projects, storage and notification infrastructure. See §3.

---

## 2. DS-PROJECT is the design source of truth

`DS-PROJECT/` is a **standalone HTML prototype** (React 18 via UMD + Babel standalone, plain CSS, no build step). It is **not** the production stack and its code must not be copy-pasted wholesale. It **is** the specification for how the product looks and behaves.

### What you MUST take from DS-PROJECT

| Concern | Source in `DS-PROJECT/` |
|---|---|
| Design tokens (colors, type, spacing, radii, shadows, motion) | `design-system/colors_and_type.css` |
| Fonts (Montserrat, Merriweather) | `design-system/fonts/`, `fonts/` |
| Logo, icon marks, pattern tile, photography | `design-system/assets/` |
| Component & page styling | `app.css` (4.2k lines, sectioned by area) |
| App shell, header, hero, sidebar, filters, toolbar | `app.jsx` |
| Project cards — three metaphors | `cards.jsx` |
| Project record: detail + edit, 10 sections | `modals.jsx` |
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
- **Port, don't reinvent.** Translate prototype markup + CSS into React 18 + TypeScript + Tailwind v4 components. The visual result must be indistinguishable from the prototype.
- **CSS variables map 1:1 to Tailwind tokens.** Do not reintroduce raw CSS variables in JSX where a Tailwind token exists. Do not introduce hex values not present in the prototype.
- **Copy is part of the design.** Labels, eyebrows, empty-state text, tooltips and toast messages come from `data.js` (`I18N.pt` / `I18N.en`). Reuse them verbatim as i18n keys.
- **If the prototype and this document disagree, the prototype wins** on visuals; the PRD and Linear issues win on behaviour and business rules. If the prototype has no answer for something the PRD requires, ask before designing it.
- **Do not modify `DS-PROJECT/`** as part of implementation work. It is a read-only reference.

---

## 3. Stack and Build

### Frontend (`shema-console`)

- **Framework**: React 18
- **Language**: TypeScript
- **Build / dev**: Vite (`@vitejs/plugin-react`, `@tailwindcss/vite`)
- **Routing**: react-router-dom v7 (`BrowserRouter`, routes declared in `App.tsx`)
- **Styling**: **Tailwind CSS v4 only** — no CSS-in-JS, no styled-components, no SASS
- **UI primitives**: Radix UI via shadcn-style components in `src/components/ui/`
- **State**: **Zustand** for cross-page state; **React Context** for auth, theme and UI state
- **HTTP**: Axios — a single client in `src/services/api.ts` with JWT auth interceptors
- **Icons**: lucide-react, outline only (the prototype's inline SVGs are lucide-style at `strokeWidth 1.75`)
- **Toasts**: sonner
- **Utilities**: `cva`, `clsx`, `tailwind-merge`; use `cn()` from `src/utils/cn.ts`
- **Maps**: react-leaflet + leaflet (Atlas view — SHM-05.6)
- **i18n**: PT/EN toggle, keys ported from `DS-PROJECT/data.js`

Do not introduce Redux, MobX, or a second styling system.

### Backend (`tripod-api`)

**Local reference checkout:** `/home/levig/tripod-api-main/tripod-api` (branch `main`).
Its own `CLAUDE.md` at the repo root is authoritative for backend conventions — read it before writing backend code. This section summarises what matters for the Shemá work; where the two disagree, `tripod-api/CLAUDE.md` wins.

> Other local checkouts of the same repo exist (`/home/levig/backend-tripod/tripod-api`, `/home/levig/tripod-console/tripod-back/tripod-api`, the latter on a feature branch). Use the `main` checkout above as the reference unless told otherwise.

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
- Routers do input parsing, service calls and exception mapping — nothing else. No business rules, no orchestration, no model construction.
- Use the injected `AsyncSession` from `get_db`; never create ad-hoc engines or sessions.
- Every schema change ships as an Alembic migration. No manual DDL.
- One router per domain area, registered in `app/main.py`. Protected routes use the shared dependencies in `app/core/auth_middleware.py` (`get_current_user`, `require_platform_admin`).

#### What already exists — reuse it, do not rebuild it

The Shemá epics are **not** starting from an empty backend. Before writing anything, check what `tripod-api` already provides:

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

Concretely, this reframes two epics:

- **SHM-01 (backend + auth)** is mostly *extension*, not scaffolding — add the Shemá role/region model on top of the existing auth and authorization services rather than standing up a new FastAPI app.
- **SHM-03.4 (media storage + signed URLs)** already has an implementation in `app/services/storage/upload.py`; extend it for per-item authorization instead of writing a second uploader.

> ⚠️ `tripod-api` already contains a `project_health` module (`app/api/project_health/`, `app/services/project_health/` — interviews, prompts, agents, voice, reports). It is **not** the same instrument as Shemá's SHM-08 *Avaliação de Saúde* (a 4-dimension assessment filled in-app by an OBT Lab mentor). Read the existing module before assuming either reuse or duplication, and do not conflate the two data models.

#### Shemá-specific backend requirements

- Auth is **by role and by region** (SHM-01.4). A regional role-holder sees and edits their region; global roles see everything. The existing org-scope helpers are the pattern to follow, not necessarily the exact mechanism.
- All endpoints require `Authorization: Bearer <token>` except login and the public leader link (SHM-01.5).
- The Monthly Pulse import (SHM-07.3) must be **idempotent and transactional**.
- Sensitive-country redaction (§6.1) and consent (§6.2) are enforced **in services**, on every output path — never only in the frontend.

#### Backend code style

- Async end-to-end in API and service paths.
- Strong typing on public functions (params + return type); prefer explicit typed models over bare `dict` when the shape is known.
- Services stay function-oriented and composable — one file per operation, as the existing `app/services/project/` does.
- Concise docstrings on public service functions; no comments that restate the code.

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
├── services/               # api.ts — single Axios client, namespaced APIs
├── types/                  # TS interfaces (project, region, role, meeting, prayer, eten, ...)
├── constants/              # token keys, region list, status/health enums
├── utils/                  # cn.ts, format.ts, progress.ts, health.ts
├── i18n/                   # pt.ts / en.ts — ported from DS-PROJECT/data.js
└── styles/                 # centralized Tailwind class constants (cards, badges, layout, states)
```

### Component rules

- **Functional components only.** No class components.
- **Target under 300 lines** per component file; over 400 lines it almost certainly needs splitting.
- Split by responsibility; co-locate sub-components with their parent page folder.
- Extract any UI pattern that appears twice into `components/common/` or `components/ui/`.
- Keep state local; lift to Zustand only when shared across routes.

---

## 5. Product areas (the six tabs)

The app shell is: **TopBar → Hero (6 indicators) → TopNav (6 areas) → area content**, exactly as in `DS-PROJECT/app.jsx`.

| Tab | PT / EN | Epic | Prototype file |
|---|---|---|---|
| Projetos | Projects | SHM-05 | `app.jsx` (Sidebar/Toolbar), `cards.jsx`, `globe.jsx`, `worldmap.jsx` |
| Ritmo | Rhythm | SHM-09 | `ritmo.jsx` |
| Oração | Prayer | SHM-10 | `oracao.jsx`, `intercessores.jsx` |
| ETEN | ETEN | SHM-11 | `eten.jsx` |
| Formulários | Forms | SHM-07, SHM-08 | `forms-hub.jsx`, `health-modal.jsx`, `modals.jsx` (generators) |
| Equipe | Team | SHM-12 | `equipe.jsx` |

### 5.1 Projetos — the living map (SHM-05)

- **Sidebar** (sticky top block): search → current-user identity → **4 combinable preset chips** (`attention` / `prayer` / `celebrate` / `recent`) → live `Mostrando X de N` + *Limpar tudo*.
- Then: **Saved views** → **Time por região** (region cards showing the 3 role-holders, clicking filters by continent) → **active filter chips** → **primary filter sections** (Status, Base, Saúde) → **Mais filtros** (País, Objetivo, Tipo de Tradução, ETEN, País sensível, Recursos, % Progresso, Vitalidade, Necessidades, Mídia, Atualização).
- Every filter option shows its **count**. Options with count 0 are hidden; presets with count 0 are disabled.
- **Toolbar**: result count + **metaphor pill** (Atlas / Diário / Coral) + sort (deadline, name, progress, team, health).
- **Card metaphors** — all three are required (`cards.jsx`): `CardAtlas` (wide horizontal logbook entry), `CardDiario` (field-journal page with washi tape), `CardCoral` (arc/wave shapes).
- **Atlas** additionally renders the rotating night globe with photo medallions above the grid.
- Pagination: 30 items, *Mostrar mais* +30.

### 5.2 Cadastro do projeto — the living record (SHM-04)

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

Tab shell must support **partial save (draft)** — SHM-04.2.

### 5.3 Formulários — the field's voice (SHM-07, SHM-08)

Two distinct instruments. Do not merge them.

- **Pulso Mensal** (SHM-07) — the console **generates a self-contained offline HTML form** per project (5 questions), the leader fills it on a phone with no connectivity, returns a `.json` (typically over WhatsApp), and the console **receives** it via an **idempotent, transactional import**. Received submissions are archived. Prayer/needs ingestion is **consent-gated**: when the leader opts out of sharing, the shared prayer text is cleared.
- **Avaliação de Saúde** (SHM-08) — filled **in-app** by the OBT Lab mentor during an online meeting. A 4-dimension wizard (`health-modal.jsx`) with guiding questions:

  | Dimension | Question |
  |---|---|
  | Emocional | Como vocês estão sentindo o coração? |
  | Relacional | Como estão as relações entre vocês? |
  | Espiritual | Como está o caminhar com Deus? |
  | Física | Como está a saúde física? |

  Each dimension scores `boa` / `atencao` / `critica`, plus notes, prayer requests and a pastoral-intervention hook into the prayer wall.

- **Link do líder** — a generated public intake form for registering a brand-new project (`generateIntakeFormHTML`).

### 5.4 Ritmo — the listening cascade (SHM-09)

Five meetings, each with a cadence, a scope and the roles that attend (`ritmo.jsx`):

| Meeting | Cadence | Scope | Feeds |
|---|---|---|---|
| `monthly_regional` | monthly | region | Pulso (readiness `X/Y`) |
| `monthly_prayer` | monthly | region | prayer |
| `obtlab_team` | quarterly | region | health (readiness `X/Y`) |
| `quarterly_regional` | quarterly | region | trends |
| `annual_celebration` | annual | global | year |

Each meeting+region+period has a status: `done` / `pending` / `overdue` / `new`. Registering a meeting recalculates the next occurrence and appends to the history.

> ⚠️ The final meeting set (Prayer Pulse vs. Governance) is a **client gate** — [OBT-312](https://linear.app/shema-obt/issue/OBT-312).

### 5.5 Oração (SHM-10)

Prayer wall compiled from every project's shared requests, with indicators and continent filter; intercessor CRUD by country; mark-answered (green highlight); share + export TXT/CSV/JSON. Requests arrive automatically from the Pulse and Health forms — **only when consent was given**.

### 5.6 ETEN (SHM-11)

Annual credit report: yearly snapshot, credit calculation from the **delta** between snapshots, report endpoint by year, Shemá-branded PDF + CSV export, and the ETEN page (year selector, indicators, table, outputs).

> ⚠️ The credit counting method is a **client gate** (Youngshin) — [OBT-322](https://linear.app/shema-obt/issue/OBT-322). Do not implement a calculation before it is fixed.

### 5.7 Equipe — the living org chart (SHM-12)

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
- **Staleness**: `em-dia` · `atencao` · `critico`, derived from days since the last progress update (**60-day rule**, SHM-06.1)
- **Progress**: `bookProgress` / `storyProgress` / `otherProgress` roll up into `translatedUnits`, `communityCheckedUnits`, `approvedUnits`, `totalUnits`. Every change appends to `progressHistory` with the previous values and the source (`fromField`, `formType`).
- **Presets** (combinable booleans):
  - `attention` — critical health **or** critical staleness **or** an unfulfilled high-urgency need
  - `prayer` — has a need with `prayerShared`
  - `celebrate` — completed **or** has a `prayerAnswered` need
  - `recent` — updated within 30 days
- **Need categories**: financial, training, equipment, volunteers, material, security, connectivity, logistics, documentation

### 6.1 Sensitive countries — a safety property, not a feature

`sensitiveCountry` projects must be handled with **devida cautela in every output path**: the map, exports (JSON/CSV/TXT/HTML/PDF), the prayer wall, the ETEN report and notifications.

This is **SHM-13.4** and it is deliberately scheduled in **phase 2**, before the epics that produce outputs. Treat it as a cross-cutting invariant: any new output surface must go through the same redaction rule. Enforce it in `tripod-api`'s service layer so it holds for every consumer, not only the console.

> ⚠️ What "devida cautela" means per output is a **client gate** — [OBT-333](https://linear.app/shema-obt/issue/OBT-333).

### 6.2 Consent

Prayer requests and needs are shared **only** with the field leader's explicit authorization. When consent is withdrawn, previously shared text is cleared, not merely hidden. Media items carry per-item authorization.

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

### 7.5 Focus

Define a single global `*:focus-visible` outline using the telha focus ring. Components must **not** add `focus:ring-*` utilities.

---

## 8. State, API and Auth

### State

- **Zustand** — cross-page state: filters + saved views, regions/team org chart cache, notifications, onboarding dismissals. One store per domain, `persist` middleware where the prototype persists to localStorage.
- **React Context** — `AuthContext` (user, roles, region scope) and `ThemeContext` (light/dark/system).
- **Local state** — forms, modals, table filters. Do not lift unless shared across routes.

### API

All backend calls target **`tripod-api`** and go through a single Axios instance in `src/services/api.ts`, with namespaced APIs (`authAPI`, `projectsAPI`, `regionsAPI`, `meetingsAPI`, `prayerAPI`, `etenAPI`, `formsAPI`, `mediaAPI`). Add new methods to the right namespace — never create a second client or duplicate auth handling.

- Dev: Vite proxy `/api` → the local `tripod-api` container
- Prod: `API_BASE_URL` injected at container entrypoint (SHM-03.3)
- Keep TypeScript request/response types aligned with the Pydantic schemas in `app/models/`. When a payload shape is unclear, read the schema in `tripod-api` rather than inferring it from a sample response.
- Before adding an endpoint, check whether `tripod-api` already exposes one (see the reuse table in §3) — `projects`, `languages`, `organizations`, `roles`, `uploads` and `notifications` already exist.

### Auth

- JWT access + refresh in localStorage; request interceptor attaches the bearer token; a 401 triggers refresh-and-retry, and on refresh failure clears tokens and redirects to `/login`.
- Authorization is **by role and by region** (SHM-01.4). A regional role-holder sees and edits their region; global roles see everything.
- A simplified **leader link token** grants access to the public intake form only (SHM-01.5).
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

Epics `SHM-01…13` are parent issues in Linear team `OBT`; 2–3 day sub-tasks are sub-issues. Every issue follows: **Goal / Context & specs (citing the PRD by § and FR-ID) / Scope / Definition of Done / Out of scope**.

**Labels:** `Essential` · `Nice-to-have` (mirroring the PRD priority column) · `needs-client-decision` (blocked on a client answer).

### Milestones

| # | Milestone | Epics |
|---|---|---|
| 1 | Fundação | SHM-01 (auth + roles/regions **inside `tripod-api`**), SHM-02 (frontend + design system), SHM-03 (infra) |
| 2 | Núcleo | SHM-12 → SHM-04 → SHM-05, SHM-06 (+ SHM-13.4) |
| 3 | Voz do campo | SHM-07, SHM-08 |
| 4 | Escuta e cuidado | SHM-09, SHM-10 |
| 5 | Prestação de contas + transversais | SHM-11, rest of SHM-13 |

Two deliberate re-orderings, both from real dependencies:

- **SHM-12 moved ahead of SHM-04.** SHM-04.4 (Team tab), SHM-05.5 (Team by region) and SHM-09.4 (Rhythm cards) all resolve role-holders from the org chart by reference. Building it later means those three ship against a placeholder and the "single source of truth" becomes a slogan.
- **SHM-13.4 (sensitive-country rule) moved into phase 2.** It is a safety property every output path depends on; any epic that ships an output before it is a hole to hunt down later.

### ⚠️ Open client gates

Do not freeze the corresponding contracts before these are answered:

| Gate | Issue |
|---|---|
| ETEN credit counting method (Youngshin) | [OBT-322](https://linear.app/shema-obt/issue/OBT-322) |
| Final meeting set — Prayer Pulse vs. Governance | [OBT-312](https://linear.app/shema-obt/issue/OBT-312) |
| Monthly Pulse file format (`.html` / `.json`) | [OBT-302](https://linear.app/shema-obt/issue/OBT-302) |
| Hosting / infrastructure | [OBT-336](https://linear.app/shema-obt/issue/OBT-336), [OBT-278](https://linear.app/shema-obt/issue/OBT-278) |
| What "devida cautela" means per output | [OBT-333](https://linear.app/shema-obt/issue/OBT-333) |

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

1. Create a branch from HEAD with the name from linear issue ID.
2. Commit in small, scoped commits — one logical change each.
3. Push with `-u`.
4. Open a PR against `main` via `gh pr create`, title under 70 chars, body with `## Summary` and `## Test plan`.
5. Return the PR URL.

Reference the Linear issue ID (`OBT-###`) in the branch name. Never force-push or amend published commits.

---

## 13. Checklist

### Frontend

- [ ] **Every frontend screen is derived from `DS-PROJECT/`** — file opened and matched before implementing.
- [ ] `DS-PROJECT/` was not modified.
- [ ] Stack only: React 18, TypeScript, Vite, Tailwind v4, Zustand, Context, Axios, Radix/shadcn primitives, lucide-react, sonner, react-leaflet.
- [ ] Tokens exactly as in `design-system/colors_and_type.css`; no stray hex; telha reserved for CTAs and active states.
- [ ] `bg-elevated` for cards/modals/inputs; `bg-canvas` for pages; `bg-muted` for subtle fills. Never `bg-white`.
- [ ] Cards have **no borders** — shadow only.
- [ ] Montserrat for UI, Merriweather for long-form/quotes.
- [ ] Functional components, under 300 lines, split by responsibility.
- [ ] Tailwind only; `cn()` for merging; `cva` for variants; centralized constants in `src/styles/`.
- [ ] Dark mode verified; global `*:focus-visible` outline used, no ring utilities.
- [ ] Zustand for cross-page state, Context for auth/theme, local state otherwise.
- [ ] Single `api.ts` client; JWT interceptors; types aligned with `tripod-api`'s Pydantic schemas.
- [ ] PT/EN strings both present, keys ported from `data.js`.
- [ ] Guided empty states, InfoTooltips, live counts.

### Backend (`tripod-api`)

- [ ] `tripod-api/CLAUDE.md` read before writing backend code.
- [ ] Checked whether the endpoint/service **already exists** before building it (§3 reuse table).
- [ ] `app/api/` stays thin — **zero database access in routers**, no SQLAlchemy imports beyond `AsyncSession`.
- [ ] All queries in `app/services/`; services raise from `app/core/exceptions.py` and never import `HTTPException`.
- [ ] Async end-to-end, session injected via `get_db`.
- [ ] Schema change ships with an Alembic migration.
- [ ] Secrets via GCP Secret Manager; commands run inside Docker Compose.
- [ ] Shemá's SHM-08 health assessment kept distinct from the existing `project_health` module.

### Cross-cutting

- [ ] Role **and region** authorization enforced in services, not just hidden in the UI.
- [ ] Sensitive-country rule applied to every new output surface, enforced backend-side.
- [ ] Consent respected for prayer, needs and media.
- [ ] Team roles resolved **by reference** to the Equipe org chart — never duplicated.
- [ ] No client-gated contract frozen before its Linear issue is answered.
