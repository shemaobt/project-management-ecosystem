# Shemá — the frozen data contract

**Status:** written by FE-44 ([OBT-386](https://linear.app/shema-obt/issue/OBT-386)) on 11/sep/2026,
against this repository at `85492ef` and against `shemaobt/shema-api` at `origin/main` `f3f02c85`.
**Audience:** whoever implements BE-01…BE-16 and INT-01…INT-12. It is written so you do **not**
have to read this frontend.
**Inputs:** the twelve screens of wave 1, the 127-record Notion export in
`src/fixtures/data/projects.json`, the ten modules under `src/types/`, the derivations under
`src/utils/`, and [`CLAUDE.md`](../CLAUDE.md).

Wave 1 shipped the whole product against fixtures and no API. Every screen settled questions the
PRD left open — which fields are optional in practice, what the empty states are, which shapes the
UI actually needs. This document is that answer, frozen. The types in `src/types/` are what the
compiler enforces; this is what the backend reads.

---

## 0. How to read this

Every statement carries one of four markers. They are the markers of `shema-api`'s
`docs/resource_requests.md`, deliberately, so the two documents read the same way.

| Marker | Meaning |
|---|---|
| **Frozen** | Settled by a built, client-reviewed screen. A later issue that departs says so in its PR and edits this document. |
| **Provisional** | Implemented for convenience, not because anyone decided it. Named so wave 2 does not inherit it by accident. |
| **Open · GATE-0n** | Not decided by the client. Do not guess, and do not freeze a schema around a guess. §11. |
| **Open · BE-01** | An engineering decision this document deliberately leaves to the backend's first issue. §12. |

Three tie-breakers:

- Where this document and [`CLAUDE.md`](../CLAUDE.md) disagree about **what the product's data
  is**, this document wins: it was written last, against the built product. Where they disagree
  about **how this repository is written**, `CLAUDE.md` wins and this document has rotted.
- Where this document and `shema-api`'s `AGENTS.md` / `CONTEXT.md` / `docs/` disagree about **how
  that repository is written**, `shema-api` wins. Nothing here is a backend convention.
- Where a shape here and a `src/types/` module disagree, the module wins and this document has
  rotted — say so rather than working around it.

**This document does not design the backend module.** It says what the data is, what the screens
ask for, and which rules must hold on the server. Module layout, table names, the aggregate split
and the route prefix are BE-01's.

---

## 1. What is frozen, and what is not

**Frozen** — the type modules under `src/types/`, re-exported whole by `src/types/index.ts`.
`src/types/__tests__/contract.test.ts` fails the build when a module is left out of that index, and
when `Project`'s required/optional split stops matching the export (§5.1). There were ten when this
document was written, and one shape that travels on the wire lived outside them and outside that
test — the session's, §9.13 — which §12.3 named with an owner rather than moving here.
**INT-01 closed that item**: `session.ts` is the eleventh module — `SessionRole`, `ShemaSession`,
the account and token pair the platform's auth routes answer, and the `ApiFailure` taxonomy the
client classifies into. That is this document being filled in rather than departed from; nothing
already frozen moved.

**Frozen** — the derivations in `src/utils/`. They are pure functions of `(record, now)` and
`src/utils/__tests__/dataJsParity.json` pins their output over all 127 records at the reference
date `2026-05-14`. A server that computes them differently is wrong, not different (§7).

**Frozen** — the vocabularies in `src/constants/`. They are the client-approved option lists ported
verbatim from the design prototype's `modals.jsx`, not re-derived from the PRD (Appendix A).

**Not frozen, on purpose** — pagination, sorting and filter *transport*. Wave 1 filters in the
browser over the whole collection; §9.1 says why, and when that stops being true.

**Not frozen** — anything behind the three client gates of §11, and the ten questions of §12.

---

## 2. Where the seams are

Wave 1 was built so that integration is mechanical and reversible one screen at a time. Two seams
carry every screen, and wave 2 replaces exactly those two.

**The read seam is `src/fixtures/` (the index).** It exposes `projectsAPI`, `regionsAPI`,
`meetingsAPI`, `prayerAPI`, `intercessorsAPI`, `etenAPI`, `formsAPI` and `geoAPI` — the namespaces
the Axios client of `src/services/api.ts` will carry when INT-01 writes it (B.4), and every method
is already `async`. Screens
`await` them today exactly as they will `await` the API. ESLint blocks deep imports of the fixture
layer from `components/`, `contexts/`, `hooks/`, `stores/` and `services/`, so there is no second
reader to find.

**The write seam is one Zustand store per domain.** Each hydrates once from a fixture namespace and
from then on owns the mutated copy. The stores expose *operations* — `saveProject`, `logMeeting`,
`addIntercessor`, `saveTeams` — rather than a bare setter, because **an operation maps to an
endpoint and a setter does not**. §10 is that mapping, and it is the reason the list is short.

**Drafts are not writes, and are not in this contract.** The record's partial input
(`recordStore`, `shema-record-drafts-v1`) and the health wizard's per-step draft
(`assessmentStore`) live in `localStorage` and are consumed only by an explicit save. Wave 2 may
move them to the server; nothing here requires it. The cost of leaving them client-side is stated
in §12.8.

---

## 3. What `shema-api` already provides — verified

Every path below was read on `origin/main` at `f3f02c85` on 11/sep/2026. The verdict column is
this contract's reading for **Shemá's** needs; BE-01 confirms or overrides it.

| Need | Where it is on `main` | Verdict |
|---|---|---|
| JWT login, refresh, logout, current-user dependency, platform-admin guard | `app/api/auth.py`, `app/core/auth_middleware.py`, `app/services/auth/` (15 one-operation files) | **Reuse whole.** INT-01 targets these routes; Shemá adds no login of its own. |
| App-scoped roles: grant, revoke, check, cached resolution | `app/api/roles.py`, `app/services/authorization/` (10 files), `app/core/access_control.py` (`require_app_access`, `require_role`) | **Reuse the spine, extend the scope.** The grant is `(user, app, role)` — see below. |
| Organization scope (managed orgs) | `app/core/org_scope.py`, `app/db/models/org.py` | **Not applicable as it stands.** A Shemá *region* is not an `organizations` row and nothing in the product scopes by organization. See below. |
| Projects + per-user / per-org access grants + invites | `app/db/models/project.py`, `app/services/project/` (28 files), `app/api/projects/` | **Not shared. No FK.** §4. |
| Languages | `app/db/models/language.py`, `app/api/languages.py`, `app/services/language/` | **Not shared. No FK.** §4. |
| Phases | `app/services/phase/`, `app/api/phases.py`, `app/api/projects/phases.py` | **Not applicable.** Shemá's `ProjectPhase` is a free `{label, scope, date}` typed on the record, not a workflow phase of a translation project. |
| Places (autocomplete, details) | `app/api/places.py` | **Available, unused by wave 1.** The record types `location` as free text and plots from `coords`; nothing calls a geocoder. Do not wire one in as a side effect of BE-06. |
| Media upload | `app/api/uploads.py`, `app/services/storage/upload.py` | **Reuse the module, not the current behaviour.** Three gaps, below. |
| Notifications (per user, per app, read/unread) | `app/db/models/notification.py`, `app/services/notifications/` (9 files), `app/api/notifications.py` | **Reuse the table, not the router.** Gaps below. |
| Content translation helpers | `app/services/i18n/` | **Not applicable.** It is Gemini machine-translation of authored JSON content (`translate_content`, `back_translate_content`). Shemá's PT/EN is an i18next catalogue in this repository. |

### 3.1 Three corrections to the capability table `CLAUDE.md` §3.2 carries

`CLAUDE.md` §3.2 lists these capabilities by path and they are all present. Three of them do less
than the label suggests, and each one costs a wave-2 issue if it is discovered during
implementation instead of now.

**"Media upload + signed URLs" has no signed URL.** `upload_image` is a server-side proxy upload:
it accepts an `UploadFile`, rejects anything outside `{image/jpeg, image/png, image/webp,
image/svg+xml}`, caps at 5 MB, writes to the `tripod-image-uploads` GCS bucket and returns
`https://storage.googleapis.com/tripod-image-uploads/<folder>/<uuid>.<ext>` — a **plain, unsigned
object URL**. Three consequences for Shemá:

1. An unsigned bucket URL is readable by anyone holding the string. §8.3 makes per-item
   authorization a server-side rule; a rule that ends in a public URL enforces nothing. Shemá's
   media needs signed, expiring URLs, or a read endpoint that applies the rule per request.
2. The accept list is **images only**. Wave 1 stores audio and video as project materials
   (`ProjectMaterial.kind` is `text | audio | video`, and the audio's `format` and
   `durationSeconds` are read from the file at import) and stores prayer request audio
   (`prayerRequestsAudio`). None of those pass the current filter.
3. 5 MB is below one field-recorded audio file. Wave 1's own client-side ceiling is not evidence
   — it stores data URLs in `localStorage` — but the server's is a real limit to raise deliberately.

**Notifications are in-app only, and gated on another product's app key.** The table is
`(user_id, app_id, event_type, actor_id, title, body, is_read, created_at)` plus a
meaning-map-specific detail table. Every route in `app/api/notifications.py` carries
`require_app_access("meaning-map-generator")` and reads `get_mm_app_id`. There is no channel
delivery of any kind — no email, no push, no WhatsApp. Wave 1's notification preferences record
exactly those three channels and the screen states in words that delivery is wave 2
(`notif_channels_hint`). BE-15 inherits the table and owns the rest: a Shemá app id, a Shemá
`require_app_access`, and whatever delivery the client actually wants.

**Roles have no region.** The grant is `user_app_roles (user_id, app_id, role_id)` and
`require_role(app_key, role_key)` answers a global yes/no per app. Shemá's authorization is
**by role and by region** — `SessionPersona` is `{role, regionScope}` and a regional holder sees
and edits their region. `organizations` is the only existing scoping dimension and it is the wrong
one: a region is one of seven fixed keys (§5.3), not a tenant with members and a manager. BE-03
either adds a region dimension to the Shemá grant or maps the seven regions onto organization
rows; it is a schema decision, not a wiring one, and §12.2 states what the frontend needs back
either way.

### 3.2 What is not on `main` yet, and where it is

- **There is no Shemá module.** `git ls-tree -r origin/main` finds no `app/api/shema/`, no
  `app/services/shema/` and no `app/models/shema.py`, and neither does `origin/dev`. The commit
  `dd6bac4` that an earlier revision of `CLAUDE.md` §3.2 cited is real and lives on exactly one
  branch — `origin/levigft/obt-266-shm-011-scaffold-fastapi-alembic`, never merged. **Assume nothing of the module is on disk until BE-01 lands** — see Appendix B.1 for
  the reconciliation this document owes that section.
- **The sibling precedent is on `origin/dev`, not on `main`.** `resource_requests` — the Resource
  Circle module — carries 11 routers, 57 one-operation service files (46 in `resource_request/`,
  11 in `resource_request_access/`) and a 1,563-line design document
  (`docs/resource_requests.md`) on `dev`; `main` carries only `app/api/resource_requests/__init__.py`
  and `_deps.py`. `dev` is what deploys to the `tripod-backend-staging` Cloud Run service. BE-01
  writes its delta against that document; it is the closest thing to an audit that exists, and it
  already answers the project/language boundary for a sibling product the same way §4 answers it
  here.
- **Naming is per directory in `shema-api`, and it already cost that module a review.** `app/api/`
  is plural, `app/models/` and `app/db/models/` are singular and mirrored, `app/services/` packages
  are singular. Whatever BE-01 names the module, it names it in three places under three
  conventions. This document prescribes no backend file path for exactly that reason.

---

## 4. The boundary: a `shema-api` project is not a Shemá project

This is the question `CLAUDE.md` §3.2 flags as the hardest, and the evidence settles it.

`shema-api`'s `projects` table is `id, name, description, language_id (FK, RESTRICT), latitude,
longitude, location_display_name, created_at, updated_at` — a translation workspace several products
already point at — on `main`, eleven foreign keys across six model files reference `projects.id`:
the Oral Collector's recordings and storytellers, devices, phases, the Sound Necklace, and its own
access rows — with access granted per user (`project_user_access`), per organization
(`project_organization_access`) and by invite (`project_invites`).

A Shemá project is a 55-field **field-project record** (§5.1): a language, a team and base, an
objective and scope, a unit pipeline with history, a four-dimension team health reading, a needs
list, media with per-item authorization, notes, an ETEN flag. The two overlap on four things — a
name, a language, a coordinate pair and a display location — and on nothing else.

**Verdict: not shared, no FK — Frozen.**

| Existing table | Verdict | Why |
|---|---|---|
| `projects` | **Not shared. No FK.** | Nine columns against 73 fields, overlapping on four. Sharing the row means keeping those four in sync between two products forever, and finding nowhere for the other 69. If the products later need to point at each other, a nullable FK added then is cheap; conflating them now is a migration, not a refactor. |
| `languages` | **Not shared. No FK. The table cannot hold this data.** | `Language.code` is `String(3)`, `unique`. The export carries `jaa-b` (5 chars) and `not iso language` (16), which do not fit; `N/A`, `?`, `LLL` and `Rop`, which are not codes; three empty strings; and **`pah` on five different projects**, which the unique index rejects outright. Widening and de-uniquing that column is a migration against every table that points at it — eight on `main`, the Annotation Studio's seven plus `projects`. `languageName` and `languageCode` stay text on the Shemá record — see §5.1's rule that the code is checked and never refused. |
| `organizations`, `organization_members` | **Not applicable.** | Nothing in the product scopes by organization. The scoping dimension is the region (§5.3). A YWAM/JOCUM base (`team`) is not an `organizations` row today; whoever needs it to be decides that, not this contract. |
| `phases`, `project_phases` | **Not applicable.** | §3's row. |
| `notifications` | **Shared, extended.** | §3.1 and §9.11. |
| `users`, `apps`, `roles`, `user_app_roles`, `refresh_tokens` | **Shared, through the guards only.** | A Shemá service that reaches for `user_app_roles` has reimplemented `require_role` badly. The one thing Shemá owns about identity is the region dimension of §3.1. |

---

## 5. The entities

Every shape below is in `src/types/`. What this section adds is the part a type cannot carry: what
the real data does, which fields are optional *because the export has no column for them*, and
which rules the frontend already enforces.

### 5.1 `Project` — and the 55 + 18 rule

`src/types/project.ts`. **Frozen.**

The interface has **55 required fields and 18 optional ones**, and that is not a style choice:

> **The 55 required fields are exactly the 55 keys of the Notion export, and the 18 optional
> fields are exactly the keys the export does not have.**

`src/types/__tests__/contract.test.ts` pins it in both directions. Add a required field and the
test tells you the 127-record export cannot produce it — which is what BE-16 needs to know before
the migration, not after. The optional eighteen are the fields wave 1's screens introduced:
`healthPhysical`, `healthHistory`, `prayerVisibility`, `prayerRequestsAudio`,
`pastoralInterventionWhen`, `location2`, `portion`, `facilitator`, `teamLeaderContact`,
`mentorContact`, `objectiveNotes`, `financialNotes`, `financialOtherDetails`, `otherProgress`,
`storiesTranslated`, `readyVesselsAudioHours`, `mediaPhotos`, `mediaVideos`.

**Server requirement:** every one of the 18 is nullable in the schema, and absent means absent —
not an empty default. `healthPhysical` is the clearest case: the export has three health dimensions
and the product has four, so a migrated record is *three-quarters assessed at most*, and
`""` ≠ `boa` (§7.4).

`id` is the export's slug (`afrikaans-kaaps`, `purepecha-de-capacuaro`): unique across all 127,
stable, and the value every screen, URL and saved view already carries. **Frozen as the primary
key of the Shemá record.** BE-16 must not mint new ids; a UUID column beside it is fine, the slug
is the address.

#### Identity

| Field | Type | Export (of 127) | Rule |
|---|---|---|---|
| `id` | `string` | 127 distinct | Above. |
| `languageName` | `string` | 127, all distinct | **Never normalised.** Not trimmed, not title-cased, not transliterated. `Embera Dobida` contains a non-breaking space and three names legitimately begin lowercase (`popoluca`, `mixteco de Magdalena Peñasco`, `purépecha de capacuaro`). A migration that trims or title-cases renames a language. |
| `languageCode` | `string` | 124 filled, 120 distinct | **Checked, never refused.** `isIsoShape` raises a hint and nothing else. The export holds `?`, `N/A`, `not iso language`, `LLL`, `Rop`, `jaa-b`, three empty strings, and `pah` five times. §4 explains why this is text and not a FK. |
| `bridgeLanguage` | `string` | **0 filled** | Required in the type (the export has the column) and **required to save** (§5.1.1). Empty in every seed record. |
| `vitalityStatus` | `string` | **0 filled** | Free text, offered as the six-step UNESCO scale in `VITALITY_SCALE`. Radix reads `value=""` as "nothing selected", so the form uses the sentinel `"na"` in / `""` out. The stored value is `""`, never `"na"`. |
| `location` | `string` | 125 filled, 28 distinct | Free text that **may name several countries** — `China, Laos, Vietnam`, `Colombia, Peru`, `Mexico, United States`. The region is derived from the first (§7.6). Two records are empty and land in region `other`. |
| `location2` | `string?` | absent | |
| `speakerCount` | `string` | **0 filled** | String, not a number: the field records ranges and notes as typed. |
| `coords` | `[lng, lat]` | 127, 26 distinct | **Longitude first.** `[0, 0]` means *no coordinate*, not the Gulf of Guinea — `hasPlottableCoords` is the single owner of that reading and the two records with an empty `location` carry it. Coordinates repeat: 26 distinct pairs over 127 records, so they are country-level, not site-level. |
| `sensitiveCountry` | `boolean` | 2 true | **The safety flag, and the only one the code reads.** §8.1. |
| `sensitivity` | `string` | 9 filled (`Unrestricted` ×7, `Confidential` ×2) | The export's own free-text column. It agrees exactly with `sensitiveCountry` on today's data — the two `Confidential` records are the two flagged ones — **which is two fields holding one fact**. BE-16 decides: derive the boolean from the text on import and keep the text as provenance, or keep both and name the boolean authoritative. Do not let a future edit move one without the other. |

#### Team

| Field | Type | Export | Rule |
|---|---|---|---|
| `team` | `string` | 127, 21 distinct | |
| `ywamBase` | `string` | 127, 21 distinct | **`team` and `ywamBase` are one concept with two names** — JOCUM is the Portuguese for YWAM, and all 127 records carry the identical string in both. The record shows one input and writes both. Two columns that can drift is the defect; BE-02 may collapse them, and if it keeps both the server writes both from one input. Two values are multi-base (`YWAM Casa - São Paulo, YWAM Porto Velho`). |
| `teamLeader` | `string` | 38 filled | **Multi-value people stay in one string**, split for display on `,` and `;` only. `Pati & Marcos` and `Rodolfo / Debora` are how the export records *one* contact; splitting on `&` or `/` invents people. |
| `mentor` | `string` | 93 filled, 16 distinct | Same rule. Read by the notification preference "only projects I mentor", by substring match. |
| `translators`, `technicalReviewers`, `partnerOrg` | `string` | **0 filled** | Same rule. |
| `teamContact` | `string` | 120 filled | Personal data. §8.1. |
| `teamLeaderContact`, `mentorContact` | `string?` | absent | Personal data. §8.1. |
| `facilitator` | `string?` | absent | |
| `regionalCoordinator`, `obtLabPerson`, `resourceCirclePerson` | `string` | **0 filled, and they stay empty on purpose** | The region's three role-holders are **read from the org chart, never copied onto the project** (§5.3). The prototype's edit form had text inputs for them; the product resolves them by reference and `src/fixtures/__tests__/fixtures.test.ts` asserts the three fields stay empty. **Server requirement: reject a write that fills them, or drop the columns.** A name stored here is a second owner of a fact the org chart owns. |

#### Objective, scope and money

| Field | Type | Export | Rule |
|---|---|---|---|
| `objective` | `Objective[]` | 104 filled; only `NT` (52), `Capítulos` (42), `Bíblia Completa` (10) of the seven | Drives which progress tables the record shows. |
| `scopeDetails` | `string` | 23 filled, 4 distinct | |
| `objectiveNotes` | `string?` | absent | |
| `translationType` | `TranslationType[]` | 24 filled; only `OBT` (20) and `OMT` (4) of the nine | |
| `portion` | `string?` | absent | |
| `financialResources` | `FinancialResource[]` | **0 filled** | Five approved values, none exercised by the seed. |
| `financialNotes`, `financialOtherDetails` | `string?` | absent | |
| `orgRole` | `string` | 24 filled, 1 distinct (`Manages/Co-manages`) | Export column, no screen edits it. |
| `inETEN` | `boolean` | **false on all 127** | §9.8: the entire ETEN report is empty by honest accident, and that is not a bug to hide. |

#### Progress

| Field | Type | Export | Rule |
|---|---|---|---|
| `totalUnits` | `number` | 127; four values: 260 (×52), 25 (×42), 0 (×23), 1189 (×10) | 23 records have a scope of zero. |
| `totalUnitsType` | `string` | 127, all `"Capítulos"` | Six options offered; one used. |
| `translatedUnits` | `number` | 127; 22 above zero | |
| `communityCheckedUnits` | `number` | 127; **zero on all 127** | The middle stage of the pipeline has no data at all in the seed. |
| `approvedUnits` | `number` | 127; **equal to `translatedUnits` on all 127** | **The export's approved count is a copy of the translated count, not an independent reading.** It matters because the ETEN credit is counted in *approved* chapters (§11.1): the migrated data would credit work nobody has approved. BE-16 must decide whether to import it as-is, as zero, or flagged as unverified — and BE-11 must know which. |
| `bookProgress` | `BookProgressItem[]` | **empty on all 127** | |
| `storyProgress` | `StoryProgressItem[]` | **empty on all 127** | |
| `otherProgress` | `OtherProgressItem[]?` | absent | |
| `progressHistory` | `ProgressHistoryEntry[]` | **empty on all 127** | There is no history to migrate. Every year-end reconstruction the ETEN report does (§9.8) reads this, so ETEN is empty until the field starts reporting. |
| `phases` | `ProjectPhase[]` | **empty on all 127** | `{label, scope, date}`, typed on the record. Not `shema-api`'s `phases`. |
| `startDate` | `string` | **8 filled**, `DD/MM/YYYY` | §6.1. |
| `deadline` | `string` | **0 filled** | Not one record has a deadline. The `soon` / `overdue` reading of §7.3 has never run against real data. |
| `lastUpdated` | `string` | **62 filled**, `DD/MM/YYYY` | Read as "the Pulse cycle is covered" by Rhythm and Forms (§7.5). |
| `status` | `ProjectStatus` | 127; six of the eight values used | `final` and `nao-iniciado` are derived-only (§7.1). |
| `statusComments` | `string` | 79 filled, 68 distinct | Free prose. |
| `statusGoal` | `string` | 121 filled, 5 distinct, one of them `N/A` | Export column, no vocabulary. |
| `storiesTranslated`, `readyVesselsAudioHours` | `string?` | absent | |

**Three records have `translatedUnits > totalUnits`** — `156/25`, `8/0`, `4/0`. **Server
requirement: do not add a `translated <= total` constraint.** It would reject the real data on
import, and `getProgress` already returns 624% for the first without breaking anything. The scope
is what is wrong in those records, not the count.

#### Health, needs, media, notes, materials

| Field | Type | Export | Rule |
|---|---|---|---|
| `healthEmotional`, `healthRelational`, `healthSpiritual` | `HealthRating` | 127 columns, **all empty** | `"" \| boa \| atencao \| critica`. |
| `healthPhysical` | `HealthRating?` | **no column** | The fourth dimension the product added. |
| `healthAssessmentDate`, `healthAssessor`, `healthNotes` | `string` | columns present, **all empty** | |
| `healthHistory` | `HealthAssessment[]?` | **no column** | **The flat fields are the projection of the newest entry, never a second truth.** `recordAssessment` is the only writer: it appends, re-projects, and carries a pre-history record into the history before appending so a first assessment cannot erase what the flat fields held. §7.4. |
| `prayerRequests` | `string` | column present, **all empty** | Seeded for 8 records by `src/fixtures/data/prayerSeed.json`, two of them deliberately without a visibility so the default is exercised. |
| `prayerVisibility` | `PrayerVisibility?` | **no column** | `coordenacao \| rede`. **Absent means `coordenacao`.** §8.2. |
| `prayerRequestsAudio` | `string?` | **no column** | The seam the Pulse import fills; an audio-only request reaches the wall. |
| `needsPastoralIntervention` | `YesNo` | 127, all `"nao"` | |
| `pastoralInterventionName` | `string` | all empty | |
| `pastoralInterventionWhen` | `string?` | **no column** | `"now" \| "30d"`. |
| `needsItems` | `NeedItem[]` | **empty on all 127** | §5.2. |
| `needsNotes`, `notes` | `string` | all empty | `notes` round-trips unchanged, any script, nothing trims or normalises it. |
| `materials` | `ProjectMaterial[]` | **empty on all 127** | §5.2. |
| `mediaPhotos` | `MediaPhoto[]?` | **no column** | Replaced the prototype's parallel caption/authorization arrays with one collection, one owner per item. |
| `mediaVideos` | `ProjectVideo[]?` | **no column** | Videos carry the same per-item authorization photos do. |

#### 5.1.1 Required to save — and it is four fields, not fifty-five

`missingRequired` in `recordStore` is the only place that decides what is missing, and it names
**`languageName`, `bridgeLanguage`, `team`, `objective`** — the prototype's own four. Everything
else may be saved empty, and the seed proves it: 27 of the 55 export columns are empty on all 127
records.

**Server requirement:** validate those four and nothing more. A schema that marks `location`,
`deadline` or `speakerCount` NOT NULL makes 127 existing records unsaveable, and makes the record
uneditable for the field teams whose data is exactly this thin.

### 5.2 The sub-shapes

**`NeedItem`** — `{category, urgency, status, description}` required; `estimatedValue`, `deadline`,
`prayerShared`, `prayerAnswered`, `fulfilledBy`, `fulfilledDate`, `droppedDate`, `submittedBy`,
`submittedAt` optional. **The lifecycle has four states, not three**: the prototype's `open`,
`in-progress`, `fulfilled` plus **`dropped`** — a request that stopped mattering must leave the open
list without being deleted, because deleting loses the history a region is judged by. `isOpenNeed`
(`open` or `in-progress`) is the single owner of "still outstanding"; a predicate written as
`status !== "fulfilled"` is a bug the moment a fifth state exists. **Urgency is not health**: they
never share a vocabulary and the health derivation never reads needs. A need carries **no id**;
`submittedAt` plus `category` plus the project is what identifies it in a derived notification, and
§12.6 says why a server-side id would be an improvement.

**`BookProgressItem`** — `{id, name, chapters, translated, communityChecked, mentorApproved}`. The
`id` is a Bible book key from `BIBLE_BOOKS` (`src/constants/bible.ts`): 66 books, 39 OT and 27 NT,
each with its PT name, its EN name and its chapter count. **That table is the authority and the
export agrees with it** — its chapter counts sum to 1,189 and the New Testament's to 260, which are
exactly the `totalUnits` values the export carries for *Bíblia Completa* (×10) and *NT* (×52). A
server that keeps its own book list must match it book for book, or the roll-up and the export
disagree about what a complete Bible is.

**`OtherProgressItem`** — the same shape without the `id`.
**`StoryProgressItem`** — `{name}` plus optional `audioHours` (**`number | string`** — the field
types ranges), `recordLocation`, `recordStatus` (`planned | recording | recorded`), `aiAssisted`.
**A story row has no translated/checked/approved columns**, which is why the roll-up ignores it
(§7.2).

**`ProgressHistoryEntry`** — `{date, translatedUnits, communityCheckedUnits, approvedUnits}`
required; `totalUnits`, the three unit tables, `previousTranslated|Community|Approved`, `initial`,
`synthetic`, `fromField`, `formType` optional. Each entry **snapshots the unit tables**, which is
what makes `progressAsOf` a point-in-time reader and the ETEN year-end reconstruction possible.
`fromField` is the submitter's name as a string and together they are the entry's provenance; a
notification only exists for an entry that has one (§9.11).

**`formType` is a free `string`, and it is deliberately not `FormKind` — §12.10.** `FormKind` is
`pulso | health`, and neither is what anyone writes: the values in the repo today are `"full"` —
the prototype's own generator mode (`generateFieldFormHTML(project, …, 'full')`) — and `"field"`.
Typing the column as the union would reject the prototype's own value on the first import.

**`ProjectPhase`** — `{label, scope, date}`.

**`ProjectMaterial`** — `{kind, scope}` required; `id`, `fileName`, `fileSize`, `dataUrl`, `link`,
`format`, `durationSeconds`, `authorization` optional. **Audio is an artifact, not an attachment**:
`format` and `durationSeconds` are read from the file at import, never typed. Rows are addressed by
the client-generated `id`, never by position.

**`MediaPhoto`** — `{image: StoredImage | null, caption: string, authorization: MediaAuthorization
| null}`: three required keys, two of them nullable. **`ProjectVideo`** — `{url}` plus optional `caption` and `authorization`.

**`MediaAuthorization`** — `{granted, by, at}`. **The default is not authorized**: only an explicit
`granted === true` counts, so an item with no recorded decision behaves exactly as a refused one.
This deliberately inverts the prototype's default-checked toggle. `by` is the deciding user's name
**as it was then** — a historical fact that must not follow a later rename (§5.3). Replacing the
photo, the video URL or the material file **resets the decision to undecided**: the consent belonged
to that file, not to the slot.

**`HealthAssessment`** — `{date, assessor, emotional, relational, spiritual, physical, notes}`
required, `dimensionNotes` optional. **The per-dimension note is the data; the running note is a
reading of it**: `compileNotes` derives the `notes` blob from `dimensionNotes` at write time so the
older display keeps working. One source, one derivation. A server that stores only the blob has
lost the data.

### 5.3 Region, roles and the org chart

`src/types/region.ts`, `src/types/role.ts`, `src/types/team.ts`. **Frozen.**

Seven region keys — `south-america`, `north-america`, `africa`, `asia`, `oceania`, `europe`,
`other` — and three roles per region: `coordinator` (Administrador), `obtLab` (Operacional de
Línguas), `resourceCircle` (Intercessor). `Region` is `{key, labelKey, team: RegionTeam}` and
`RegionTeam` is three names, one per role.

**This is the single source of truth for who holds which role where, and it has four consumers, all
by reference**: the project record's Team tab, the sidebar's region panel, the Rhythm meeting cards,
and the session itself — the signed-in persona's *name* is resolved out of the org chart, so
renaming a role-holder renames who the session says you are. **Never duplicate a role-holder's name
into another model.**

The one stored copy that is correct is `MediaAuthorization.by` and `RoleChange.changedBy`: those are
accountability records of who acted under the name they had then, and they must **not** follow a
rename.

`RoleChange` is `{regionKey, role, from, to, changedBy, changedAt}` — the edit trail the screen
keeps. **Server requirement:** the region team is a write with an audit row, not a silent update.

The seed has **21 unassigned roles**: `REGION_TEAMS` is empty for all seven regions, deliberately,
because the prototype's names were real people hardcoded in a file. `GLOBAL_STRATEGIST_NAME` in
`AuthContext.tsx` is the one remaining hardcoded name and §12.2 owns it.

Region membership is derived, not stored: `COUNTRY_REGION` maps 25 country strings — **keyed on the
export's exact spelling**, including `São Tomé e Príncipe` in Portuguese and `East Timor` in
English — and anything unmapped falls to `other`. **Server requirement: do not normalise country
names on import**; every mapping is by that string.

### 5.4 Meetings

`src/types/meeting.ts`. **Frozen except the set itself — Open · GATE-02.**

Five meetings today, each `{id, cadence, scope, icon, roles, feeds, readiness?, titleKey,
descriptionKey}`; `MeetingLogEntry` is `{meetingId, scopeKey, period, date, notes}` and
`MeetingStatus` is `{state, date}` with `state` in `done | pending | overdue | new`.

`scopeKey` is a `RegionKey` or `"global"`. `period` is a calendar key — `2026-05`, `2026-Q2`,
`2026` — and §7.5 is the rule that produces it. **A meeting is unique per (meeting, scope,
period)**: logging one replaces the entry for that period rather than appending a second.

### 5.5 Prayer and the intercessor network

`src/types/prayer.ts`. **Frozen.**

`PrayerRequest` is **derived, never stored**: `{id, projectId, language, base, country, region,
locationWithheld, text, audioUrl?, source, answered, date}`, built from the projects on every call
by `buildPrayerRequests`, which is also where the consent gate lives. §8.2.

`Intercessor` is `{id, name, country: CountryCode, contact, addedAt}` — **a different model from the
`resourceCircle` role, and they must never share one**. The role is a platform role held by one
person per region; the network is people around the world who will never sign in.
`networkSeparation.test.ts` asserts the separation structurally in both directions.

Three rules the server inherits: **country is an ISO 3166-1 alpha-2 code**, never typed prose, so
the network cannot fragment into *Brasil* / *Brazil* / *BR*; **at least one usable channel is
required** (`contactChannel` recognises an email or ≥8 digits and refuses the record otherwise);
and **removal erases** — no tombstone, no `removed` flag, the contact string absent from the stored
payload. §8.5.

### 5.6 ETEN

`src/types/eten.ts`. **Shapes frozen; the rule that fills them is Open · GATE-01.**

`EtenCreditEntry` is `{projectId, year, credits, source}` with `source` in `manual | calculated`;
`EtenYearSnapshot` and `EtenYearReport` are the report's read shapes. **A stored `manual` entry
overrides the computed value; `calculated` marks what the rule produced.** §11.1.

`EtenYearSnapshot.country` is a `LocationDisplay`, not a string — the redaction is carried in the
shape so a renderer cannot leak what the snapshot does not hold.

### 5.7 Forms

`src/types/forms.ts`. **Frozen except the serialization — Open · GATE-03.**

Two instruments that must not be merged: the **Pulso Mensal** (`kind: "pulso"`, monthly, a file, filled
by the team leader) and the **Avaliação de Saúde** (`kind: "health"`, quarterly, in-app, filled by the
OBT Lab mentor).

`ReceivedSubmission.kind` is **`ArchivedKind` = `"pulso"` only**, deliberately narrower than
`FormKind`. The assessment is filled in-app and produces no file, so nothing of it ever leaves to
come back; its history belongs to `healthHistory`. A server that archives a `health` submission has
landed a kind that by definition never left.

`ProjectReporting`, `FormReadiness` and `PendingProject` are the reporting-state shapes. §7.5 is
what "reported" means, and it is a freshness signal, not a received Pulse.

### 5.8 Notifications

`src/types/notification.ts`. **Frozen.**

`AppNotification` is a discriminated union over `kind` — `field | health | need | stale | prayer` —
sharing `{id, urgent, audience, region, projectId, language, base, country, locationWithheld,
mentor, date}`. **Derived, never stored**; the store owns only the preferences and the read ids.

Entry ids are stable derivations of what the row renders — `health:{projectId}:{date}`,
`need:{projectId}:{category}:{submittedAt}` — never of a position, because a removed need would
otherwise hand its read state to its neighbour. Exact duplicates take an occurrence suffix.

`audience` is a list of `RoleKey`, from the table in `src/constants/notifications.ts`: field,
health, need and stale reach `coordinator` and `obtLab`; **prayer reaches `resourceCircle` alone** —
the role whose responsibility it is.

`NotificationPrefs` is `{enabled, channels{email,push,whatsapp}, when, scope, emailAddr, phoneAddr,
customProjectIds}`. `NotificationPrefsHandlers` is the operations contract the store implements and
§10 maps to endpoints. The address fields ship **empty**, with the channel label as placeholder —
the prototype seeded a real person's email and a mock phone.

### 5.9 The assessment draft

`src/types/assessment.ts`. **Frozen, and client-side.** `AssessmentDraft` is the wizard's
per-project autosave; only `applyAssessment` turns it into a `HealthAssessment` plus the pastoral
answer and, **when one was actually written**, the prayer request and its consent. A save that
writes `prayerRequests: ""` unconditionally deletes an existing request as a side effect, which
§8.2 forbids. The suggestion to escalate pastorally is returned **with its reasons** and never
applied: `pastoral` stays `"nao"` until a person picks otherwise.

---

## 6. What the 127-record export actually contains

`src/fixtures/data/projects.json` is the Notion export **byte-identical**, including empty fields,
mixed casing, `Waima’a` and `Ngäbere`. It is the input to BE-16 and it is thinner than the schema
suggests: **27 of its 55 columns are empty on all 127 records** — `bridgeLanguage`,
`vitalityStatus`, `speakerCount`, `financialResources`, `translators`, `technicalReviewers`,
`partnerOrg`, `deadline`, `phases`, `materials`, `storyProgress`, `bookProgress`,
`progressHistory`, the three health ratings, `healthAssessmentDate`, `healthAssessor`,
`healthNotes`, `prayerRequests`, `pastoralInterventionName`, `needsItems`, `needsNotes`, `notes`,
and the three org-chart names.

### 6.1 The dates are `DD/MM/YYYY`, and the conversion happens at the boundary

The export writes dates day-first. That is provable rather than assumed: of the 70 dates it
carries, 60 have a first component above 12 and none has a second one above 12.

`src/fixtures/normalize.ts` (`toIsoDate`) converts `startDate`, `deadline`, `lastUpdated`,
`healthAssessmentDate` and every `progressHistory[].date` on load; anything that is not an export
date passes through untouched. `data/projects.json` stays byte-identical — the conversion is on
load, never on the file.

**Server requirement (BE-16): reproduce this conversion and store real `date` columns.** `toIsoDate`
is the reference implementation. A migration that inserts `13/04/2024` into a text column moves a
parsing bug into the database, where the fix costs a migration instead of a function.

What the conversion is worth, measured: **left unconverted, every record reads `em-dia` and the
`recent` preset matches nothing.** Converted, the 8 dated records resolve to **7 `critico` and 1
`em-dia`** at the reference date `2026-05-14` — and the one that is not critical has a *future*
start date, `16/06/2026`. `src/utils/__tests__/parity.test.ts` pins both sides.

### 6.2 The traps, in one list

Each of these is a real value in the file, and each would be "fixed" by a reasonable-looking
migration.

1. **`languageCode` is not an ISO code.** `?`, `N/A`, `not iso language`, `LLL`, `Rop`, `jaa-b`,
   three empty, and `pah` five times. §4.
2. **`languageName` carries a non-breaking space** (`Embera Dobida`) and three names begin
   lowercase. Do not trim, case or transliterate.
3. **`[0, 0]` is not a coordinate.** Two records.
4. **`location` may name several countries**, and two records are empty.
5. **Country names are the export's own spellings**, mixing English and Portuguese. The region map
   is keyed by them.
6. **`team` and `ywamBase` are always identical.** One concept, two columns.
7. **People fields hold several people in one string** — `Pati & Marcos`, `Rodolfo / Debora` — and
   splitting on `&` or `/` invents people.
8. **`translatedUnits > totalUnits`** on three records. Do not constrain it.
9. **`totalUnits` is 0** on 23 records.
10. **`approvedUnits` is a copy of `translatedUnits`** on all 127, and `communityCheckedUnits` is 0
    on all 127. The pipeline's three stages have no independent data.
11. **`sensitivity` and `sensitiveCountry` hold one fact in two columns.** §5.1.
12. **Only the Mexican subset is richly filled.** All 8 records that carry a `startDate` are
    Mexican, and 7 of them are the 7 `Unrestricted` ones; the eighth is one of the two
    `Confidential`. Do not read the seed's coverage as typical.

### 6.3 What is seeded, and what is honestly empty

`src/fixtures/data/prayerSeed.json` adds a prayer request to 8 records so the wall, the consent
gate and the notification path have something to exercise — 6 with `visibility: "rede"` and **2
without the field at all**, so the default of §8.2 is tested rather than assumed. It also stamps
`healthAssessmentDate: "2026-05-14"` on those 8.

Everything else that is empty is **empty on purpose and stays empty**: no meeting log, no ETEN
credit ledger, no received submission, no intercessor, and no region team. The screens say so in
words rather than seeding plausible rows — the ETEN report in particular renders an empty table
because `inETEN` is false on all 127 and no record has any `progressHistory`. A backend that seeds
demo rows to make those screens look populated is inventing numbers on a funder-facing report.

`src/fixtures/data/continents.json` is 77 outlines / 1,111 points for the Atlas globe. **It is a
static asset, not an endpoint** — it never changes and it must not become a request.

---

## 7. The derivations the server must reproduce exactly

They live in `src/utils/` and are pure functions of `(record, now)`. There is no hidden clock: `now`
defaults to `new Date()` and is injected in tests. **`src/utils/__tests__/dataJsParity.json` is the
acceptance artifact** — the output of nine derivations over all 127 records at `2026-05-14`. A
backend implementation of any of them should be checked against that file.

### 7.1 Status

`getProjectStatus` returns the stored `status` when it is one of the six **explicit** values
(`em-andamento`, `cancelado`, `pausado`, `planejado`, `concluido`, `desconhecido`). Otherwise it
derives from progress: 0% → `nao-iniciado`, 100% → `concluido`, ≥75% → `final`, else
`em-andamento`. So `final` and `nao-iniciado` are **derived-only** and never stored — but the record
form can still express a stored status outside its own three edit cards, by appending the *saved*
status as a fourth option. A server that narrows `status` to the three editable values
(`em-andamento`, `pausado`, `planejado`) makes the 24 records stored as `desconhecido`, `cancelado`
or `concluido` unsaveable.

`getProgress` is `translatedUnits / totalUnits * 100`, and `0` when `totalUnits` is 0.

### 7.2 Roll-up and history

`rollUpProgress` sums **only the tables that can express counts** — `bookProgress` and
`otherProgress`. A story row has no translated/checked/approved columns, so a story-only table
leaves the aggregates untouched instead of zeroing them. This is a deliberate divergence from the
prototype's own roll-up, which includes story rows and would overwrite the aggregates with zeros
the form has no column to restore.

`applyProgressUpdate(previous, next, date, source?)` is the single writer:

1. roll the tables into the aggregates (`withRolledAggregates`; the previous `totalUnits` survives
   when the roll is 0);
2. append a history entry **only if an aggregate changed**, carrying `previousTranslated`,
   `previousCommunity`, `previousApproved` and a snapshot of the three tables;
3. stamp `source` — `fromField` and `formType` — when the change came from an imported form.

**Server requirement:** the history entry is **produced by the server**, never accepted from the
client. The previous values are the server's own read of the record before the write; a client that
sends them can rewrite history. The same function is the Pulse import's write path, which is what
makes an imported update and a typed update indistinguishable afterwards.

**Server requirement:** stamp the **coordinator's local day**, not a UTC day. In UTC-3 a save after
21:00 lands on tomorrow's date, and on 31 December in the next *year* — which is exactly the
year-end boundary the ETEN report reconstructs from. `toLocalIsoDate` is the reference.

`progressAsOf(project, date)` is the point-in-time reader: the newest history entry on or before
`date`. `historyDeltas` reads the deltas back out. A decrease is never silent — the form names the
falling counts before save and the history renders negative deltas.

### 7.3 Staleness — the 60-day rule, and what "no news" means

`getStaleStatus` returns `null` for `concluido`, `cancelado`, `planejado` and `desconhecido` — a
finished or unstarted project is not silent, it is finished. Otherwise it reads days since the last
progress update (`progressHistory`'s last entry, else `startDate`): **≥120 → `critico`, ≥60 →
`atencao`, else `em-dia`**.

**The filter named "sem notícias 60+ dias" means `atencao` ∪ `critico`, not the [60, 120) bucket.**
`isNoNews` and `staleFilterMatches` own that reading. Before it existed, the projects most out of
contact were absent from the very filter named after them. `em-dia` and `critico` keep exact
matching.

`isRecentlyUpdated` is the `recent` preset: `lastUpdated` within 30 days — a different field from
the one staleness reads, deliberately. `getDeadlineInfo` classifies a deadline as `overdue`, `soon`
(<90 days) or `ok`.

### 7.4 Health — the worst of four, and `""` is not `boa`

`getOverallHealth` is the worst of the four dimensions, and **returns `na` when none is filled**.
All 127 seed records arrive with every dimension empty, so *not assessed* is the dominant state,
not an edge case. The copy says the team has not been heard yet, never that it is well. A server
that defaults an unassessed dimension to `boa` reports every silent team as healthy.

`isAssessed` is "at least one dimension is not `""`" and it gates everything that counts an
assessment — including Rhythm's readiness, where a `healthAssessmentDate` with four empty
dimensions would otherwise report a team as heard when nobody rated it.

`healthScore` is `boa 3 / atencao 2 / critica 1 / "" 0`, summed over the four, used only for
sorting. `getPriority` composes health, staleness and status into the card's tone.

### 7.5 Periods, cadence and "reported"

`src/utils/cadence.ts` is the single owner and **it never constructs a `Date` from text**.
`parseIsoDate` splits `YYYY-MM-DD` and validates the day against the real month length; every
comparison is on calendar fields. The prototype's own period key did `new Date(iso)` (UTC midnight)
and then read `getMonth()` in local time, so in every zone behind UTC the 1st of a month filed
under the previous month and 1 January under the previous **year**.

Period keys are `YYYY-MM`, `YYYY-Qn`, `YYYY`. `periodEnd` anchors to **period boundaries, not
"same day next period"**: monthly from the 31st lands on 28 February (29 in a leap year), quarterly
from 30 November closes on 31 December and rolls to 31 March.

**`hasReported` is a freshness signal, not a received form.** For the Pulse it is
`coversPeriod(cadence, lastUpdated, today)`; for the assessment it is `isAssessed(project) &&
coversPeriod(cadence, healthAssessmentDate, today)`. Rhythm's readiness and the Forms hub's
"who has not reported" read the same function so the two screens cannot drift. **A server that
relabels a fresh `lastUpdated` as "the Pulse arrived" is lying to a coordinator about whether a
team was heard.**

### 7.6 Region, and the counts

`getCountry` is `location.split(",")[0].trim()`; `getRegion` maps it through `COUNTRY_REGION` and
falls back to `other`. Today: oceania 36, asia 31, south-america 29, africa 17, north-america 12,
other 2, europe 0.

`filterProjects` is one pass that produces the visible list **and** every facet count, using the
rule that an option counts a record when the record passes every filter group except, at most, that
one. Sixteen facet groups, four presets, and the counts are what the sidebar shows.

**A count never promises results a click will not return.** The facet count and the filter
predicate answer the same question: where the filter is `.some(...)` over needs, the count is
projects, not need items. §9.1 is why this stays in the browser for now.

### 7.7 The presets

- `attention` — critical health **or** critical staleness **or** an open high-urgency need
  (`isOpenNeed`, so a `dropped` need must not hold a project here any more than a fulfilled one).
- `prayer` — has a need with `prayerShared`.
- `celebrate` — completed **or** has a need with `prayerAnswered`.
- `recent` — `lastUpdated` within 30 days.

### 7.8 ETEN credit

`accountFor(project, year, ledger, now)` — **Open · GATE-01**, and §11.1 is the whole story. The
shape of the computation is frozen even though the rule is not: read `approvedUnits` at the end of
`year - 1` and at the end of `year` from the history snapshots, and a credit is earned when the
project's own scope closes inside the year. A stored `manual` entry wins. A project marked
`concluido` that the snapshots cannot date earns `null` — **completed, year not recorded** — not a
credit in whichever year is on screen.

**Server requirement (BE-11): reproduce this function exactly, including reading the year boundary
from the ISO date by field and never through a timezone-dependent `Date`.**

---

## 8. Privacy — as server-side requirements

Everything in this section is **enforced in `app/services/`, on every output path**, scheduled
early in B1 as BE-04 ([OBT-393](https://linear.app/shema-obt/issue/OBT-393)), before anything that
emits data exists. The frontend already implements each rule, and that is not the same thing: **the
console is one consumer.** An export, a generated Pulse, a webhook, a notification e-mail and a
future mobile client all read the same services, and a rule that lives in a React component guards
none of them.

The test that proves the whole section is the one the delivery plan already names: **an
unauthorized prayer request is absent from all four output paths** — the prayer wall, exports, the
ETEN report and notifications.

**Where redaction lives, stated once, because the types already encode it.** A project read by
someone allowed to open it is a *coordination* surface and carries the truth: `Project.location` is
a plain string and the console applies the display rule when it draws a card, a tooltip or a
marker. Every shape that *leaves* coordination carries the redaction **in its own type** —
`PrayerRequest.locationWithheld`, `EtenYearSnapshot.country: LocationDisplay`,
`AppNotification.locationWithheld`, `ExportedProject.locationWithheld` — so a renderer downstream
cannot leak what the payload does not hold. **That split is the rule**: redact in the payload on
every path that leaves, and never on the project read itself, where hiding the country from its own
author is data loss rather than privacy (§8.1, rule 5).

### 8.1 Sensitive countries

`sensitiveCountry` is the flag; `sensitivity` is the export's text beside it (§5.1).

**Server requirement, on every path that leaves coordination — exports in any format, the prayer
wall, the ETEN report, notifications, and the Pulse.** The console's own map and cards apply the
same rule while rendering, through the same single owner (`getLocationDisplay` / `getMapPlacement`);
rules 1 to 3 below are what both sides implement, and the server is the one that must hold.

1. **The location is replaced by the region name, never the country or the place.** The frontend's
   single owner is `getLocationDisplay`; its shape is `{withheld: true, regionLabelKey}` or
   `{withheld: false, location}` — **the redaction travels in the shape**, so a renderer cannot leak
   what the payload does not hold. Reproduce that: return the withheld marker, not an empty string.
2. **Coordinates are the region centroid, never the true position** — `REGION_CENTROIDS` in
   `src/constants/geo.ts`. The marker carries a dashed "approximate" ring and the map announces, in
   a visible overlay, **how many projects are being withheld**: a silently incomplete map is its own
   hazard, so the reduction is always announced. Reduced precision was chosen over omission because
   the map must show exactly what the filters return.
3. **The base name goes with the location in any file that leaves.** Both flagged seed records have
   a base that names a place — `YWAM Egypt`, `YWAM Morelia` — so a file that withholds `Egypt`
   while printing `YWAM Egypt` one column over has redacted nothing. In the export the base is
   emptied for a withheld record; **in-console surfaces still render it verbatim**, which is an open
   gap §11.4 owns.
4. **Media of a flagged project never reaches a public audience**, however it was authorized. §8.3.
5. **The record itself is not redacted.** The coordinator filling it is the person who needs the
   real country, so the Identity tab renders `location` verbatim with a badge. Redaction belongs to
   output paths; an editing surface that hides the data from its own author is not privacy, it is
   data loss. The same holds for `teamLeaderContact`, `mentorContact` and `teamContact` — personal
   data that may belong to someone in a sensitive country, shown on the record and **gated on every
   output the same way `location` is**.

### 8.2 Consent — prayer requests and needs

`PrayerVisibility` is `coordenacao` or `rede`, and the three rules are:

1. **It is a visibility level, not a published boolean.** `coordenacao` is a real destination — the
   people who follow up and support — not a queue for something unpublished. A team in trouble that
   has not consented to being shared still gets help.
2. **Absence of consent is not consent.** `prayerVisibility` is optional and a missing value reads
   as `coordenacao`. Nothing has to be written for a request to stay private; something has to be
   written for it to travel. **Server requirement: the column is nullable and NULL means
   `coordenacao`** — do not default it to `rede` in a migration, and do not backfill it.
3. **One owner for the gate.** `reachesPrayerWall` is the predicate and `buildPrayerRequests` is the
   only query that applies it; a scan test fails the build if any shipped file outside the record's
   own editing surfaces reads `prayerRequests`, `prayerVisibility` or `prayerRequestsAudio` raw.
   **Server requirement: one service function is the only reader of those columns, and every output
   path calls it.** A filter applied per-endpoint is a rule that a new endpoint forgets.

A need reaches the wall only through `prayerShared`, and `prayerAnswered` marks it celebrated
rather than removing it.

**"Cleared, not merely hidden" — what it means on each side.** In wave 1 the wall is *derived*, so
moving a request back to `coordenacao` removes it from the next query with no cleanup step, and
that is the property to preserve. **Wave 2 changes the cost, not the rule: once BE-09 stores
requests server-side, a withdrawn request must be deleted from that store, never flagged and
retained. A filter over a cached list is not compliance.** What withdrawal does *not* do is delete
the text from the record — coordination is a destination, not a wastebasket.

**And it must not delete by accident.** The health wizard writes `prayerRequests` **only when one
was actually written**; an unconditional write of `""` on every save deletes an existing request as
a side effect of an unrelated action.

### 8.3 Media and materials

**Server requirement: the default is not authorized.** Only an explicit `granted === true` counts.
An item with no recorded decision behaves exactly as a refused one — the inverse of the prototype's
default-checked toggle, deliberately.

**Every decision carries its evidence**: who decided (the acting user's name as it was then) and
when. **Replacing the file, the image or the video URL resets the decision to undecided** — the
consent belonged to that artifact, not to the slot.

**The sharing rule composes, and the most restrictive wins.** `canShareMedia(project, item,
audience)`: an authorized item reaches `coordenacao`; the same item on a `sensitiveCountry` project
never reaches `publico`. One owner (`getShareableMedia` / `canShareMedia`), consulted by every
future sharing surface — exports, the prayer wall, the ETEN report, notifications — never
re-derived.

**And the storage must be able to keep the promise.** §3.1: the existing upload returns a public
bucket URL. A per-item authorization that ends in a public URL enforces nothing, so BE-04 owns
either signed expiring URLs or a read endpoint that applies the predicate per request.

### 8.4 Notes and the export

**Notes are internal by default.** `canExportNotes(audience)` is the single owner: `coordenacao`
yes, `publico` never, and nothing recorded on the project changes that. Notes carry the most
sensitive human context in the record.

**The export is a report that leaves, not a backup that returns.** `redactProjectForExport` is an
**allowlist** (`ExportedProject`, 24 fields), which means a field added to `Project` later stays out
of the file until someone puts it in. Personal contacts, people's names, media and materials are not
in the allowlist at all; `sharedPrayerRequests` comes through `buildPrayerRequests`, so the raw
columns are never read; `location` comes through `getLocationDisplay`; `notes` is asked of
`canExportNotes` under an audience of `publico`, which answers no.

**Server requirement (BE-14): the export is generated server-side by an allowlist, and so is the
file's header** — what it contains, when it was generated, that it is confidential, and **how many
locations were withheld**. A file with no sensitive projects gets no withheld note rather than a
"0 withheld" line.

**Server requirement: the export is not an import.** The redacted file is recognised and refused on
import, because importing the report would replace full records with reduced ones. Import validates
everything before applying anything — by vocabulary and shape, not by `typeof` — and applies as one
all-or-nothing operation: the first broken record rejects the whole file with its 1-based index, and
a duplicated id rejects it too.

### 8.5 The intercessor network

They are neither users nor field records: people whose name and contact the platform holds so
prayer requests can reach them, and who will never open the console. **Server requirements:**
removal **erases** the row — no tombstone, no `removed` flag, the contact absent from storage; a
record without a usable channel is **refused**, not merely discouraged; and the country is stored as
an ISO 3166-1 alpha-2 code.

**Three questions must be answered before this data leaves the browser, and none can be answered by
the frontend.** Wave 1 records **when** someone entered the network (`addedAt`) so the question is
answerable, and states the obligation in the UI — it does **not** record *the basis on which the
contact is held*, and there is no review or expiry. BE-09 stores this network server-side; shipping
the storage before answering them is how silent retention starts:

1. what consent was given, and how it is evidenced;
2. how a person outside the platform asks to be removed when they cannot log in;
3. what happens to a contact nobody has used in a year.

### 8.6 The Pulse — the file designed to be forwarded

**Open · GATE-03** for the format, but not for the rule: the Pulse contains prayer requests and is
built to be forwarded, so **only authorized requests go in, and sensitive countries are transformed
before serialization, not at render time**. Once it is out, it is out — retention and withdrawal
from an already-distributed file are part of GATE-03's own DoD.

### 8.7 Authorization is reflected by the frontend, never enforced by it

The console hides controls a role may not use. That is presentation. **Every rule — by role and by
region — is enforced in `app/services/`.** A regional holder reads and writes their region; a global
role sees everything. The leader link grants access to the public intake form and nothing else.

---

## 9. Endpoints, one section per screen

These are what wave 1's screens ask for, in the order B2 integrates them. **The route prefix is
`/api/shema` — Open · BE-01**, which owns the module's name, prefix and service package; whatever
it picks, the paths below keep their shape.

### 9.0 Conventions

- Every route requires `Authorization: Bearer <token>` **except** login/refresh and the public
  leader-link intake (§9.9).
- **Dates on the wire are `YYYY-MM-DD` strings**, never datetimes, because every date in this
  product is a calendar day a person wrote down (§7.5). `addedAt`, `changedAt` and
  `MediaAuthorization.at` are the same.
- **Every response is already scoped, and every *leaving* shape is already redacted.** A response
  never carries a project the caller may not see, and never carries a raw prayer column (§8). The
  project read itself carries the true `location` — it is a coordination surface, and §8 states the
  split once.
- Errors are the repository's own envelope; the frontend surfaces the message and nothing else.
- **No endpoint returns a vocabulary the frontend already has** (Appendix A), with one exception
  named in §9.7.

### 9.1 Projetos — INT-02 ([OBT-407](https://linear.app/shema-obt/issue/OBT-407)) · BE-05 ([OBT-394](https://linear.app/shema-obt/issue/OBT-394))

```
GET /api/shema/projects            -> Project[]
```

**Response:** the whole collection the caller's role and region allow, scoped server-side. `Project`
carries the true `location`, per the split in §8 — the console applies the display rule when it
draws a card or a marker; the server applies it on the paths that leave. No pagination, no filter
parameters, no facet counts.

That is a decision, not an omission. Sixteen facet groups and four presets are computed in **one
pass** by `filterProjects`, under a rule — an option counts a record that passes every group except
at most that one — that is the reason the sidebar's numbers agree with the list. Reproducing it
server-side creates a second owner of a counting rule whose whole value is that there is one, and
every screen that shows a number (the Início band, Rhythm's readiness, the Forms hub's pending
block, the notification badge) derives it from the same collection. **At 127 records the collection
is 193 KB of JSON and the client is the right place.**

**When this stops being true** — and it is the one thing to watch: past roughly 2,000 projects, or
when a role's scope stops being expressible as "these regions". At that point the server takes the
filter *and* the counts together, in one endpoint, never the filter alone — a filtered list with
client-computed counts is the defect this note exists to prevent.

The Atlas reads the same response. `geoAPI.outlines()` stays a bundled asset (§6.3).

### 9.2 Início — FE-30, no endpoint of its own

The six indicators are derived from `GET /api/shema/projects` through the same `filterProjects` the
destination uses, so **the count is by construction what the link returns**. An `/indicators`
endpoint would be a second owner of that relation and is explicitly not wanted.

### 9.3 Ficha do projeto — INT-03 ([OBT-408](https://linear.app/shema-obt/issue/OBT-408)) · BE-06 ([OBT-395](https://linear.app/shema-obt/issue/OBT-395))

```
GET    /api/shema/projects/{id}     -> Project
POST   /api/shema/projects          {Project}          -> Project      # id is the slug, client-minted
PATCH  /api/shema/projects/{id}     {Partial<Project>} -> Project
```

`projectsStore.saveProject` is an upsert and splits at this seam by whether the id is new.

**Server requirements on the write:**

- Validate exactly the four required fields of §5.1.1 and nothing more.
- **Reject (or ignore) `regionalCoordinator`, `obtLabPerson`, `resourceCirclePerson`** (§5.3).
- **Roll the aggregates from the tables and append the history entry server-side** (§7.2). The
  response carries the recomputed record, including the new `progressHistory` entry, because the
  record screen renders what the save actually wrote.
- **`team` and `ywamBase` are written together from one input** (§5.1).
- Stamp the actor's local day, not a UTC day (§7.2).

```
GET /api/shema/projects/{id}/progress-history  -> ProgressHistoryEntry[]
```

Only if the record stops carrying the history inline. Wave 1 reads it off the project and the
history is small; this is named so BE-06 does not invent a different split.

**Drafts are not part of this contract** (§2 and §12.8).

### 9.4 Avaliação de Saúde — INT-04 ([OBT-409](https://linear.app/shema-obt/issue/OBT-409)) · BE-07 ([OBT-396](https://linear.app/shema-obt/issue/OBT-396))

```
POST /api/shema/projects/{id}/health-assessments   {HealthAssessment + pastoral + prayer}  -> Project
GET  /api/shema/projects/{id}/health-assessments                                           -> HealthAssessment[]
```

**Request body** — what `applyAssessment` produces: the `HealthAssessment` (with `dimensionNotes`,
from which `notes` is derived), the pastoral answer (`needsPastoralIntervention`,
`pastoralInterventionName`, `pastoralInterventionWhen`), and **only when one was written**, the
prayer request plus its `prayerVisibility`.

**Server requirements:**

- **Append to `healthHistory` and re-project the flat fields in one step** — the server does what
  `recordAssessment` does (§5.1, the `healthHistory` row). Never let the client send the flat fields
  directly; a backdated
  assessment must not overwrite a newer reading.
- A record that predates `healthHistory` has its flat fields carried into the history before the
  append, so the first new assessment cannot erase what was already there.
- **Never write `prayerRequests: ""`** as a side effect (§8.2).
- The pastoral escalation is **suggested with reasons and never applied** (§5.9).

### 9.5 Necessidades e recursos — INT-05 ([OBT-410](https://linear.app/shema-obt/issue/OBT-410)) · BE-08 ([OBT-397](https://linear.app/shema-obt/issue/OBT-397))

Needs and financial resources **travel with the project** — they are edited on record tabs and
saved by §9.3's `PATCH`. There is no separate needs endpoint in wave 1, and adding one would give
`needsItems` a second owner.

```
GET /api/shema/needs/rollup?region&from&to   -> NeedsRollup     # optional
```

`aggregateNeeds` is a derivation over the projects, consumed by Rhythm. **It is a derivation, never
a second store.** Serve it only if Rhythm stops loading the collection; the period cut reads
`submittedAt`, so an undated need counts in the total and not in the window.

### 9.6 Oração e intercessores — INT-06 ([OBT-411](https://linear.app/shema-obt/issue/OBT-411)) · BE-09 ([OBT-398](https://linear.app/shema-obt/issue/OBT-398))

```
GET    /api/shema/prayer/requests                 -> PrayerRequest[]     # gated + redacted server-side
GET    /api/shema/prayer/intercessors             -> Intercessor[]
POST   /api/shema/prayer/intercessors   {name, country, contact}  -> Intercessor
PATCH  /api/shema/prayer/intercessors/{id}        {name, country, contact}  -> Intercessor
DELETE /api/shema/prayer/intercessors/{id}        -> 204
```

`GET /prayer/requests` is the wall: **the consent gate is applied by the query, not by the caller**
(§8.2), a withheld project's entry carries `country: ""` and `locationWithheld: true` (§8.1), and
`addedAt` survives an edit of an intercessor. `DELETE` **erases** (§8.5).

`POST` and `PATCH` refuse a record with no usable channel and an unknown country code — the error
must say which field is missing, because the screen names it.

### 9.7 Ritmo — INT-07 ([OBT-412](https://linear.app/shema-obt/issue/OBT-412)) · BE-10 ([OBT-399](https://linear.app/shema-obt/issue/OBT-399))

```
GET    /api/shema/meetings                        -> MeetingDefinition[]
GET    /api/shema/meetings/log                    -> MeetingLogEntry[]
POST   /api/shema/meetings/log    {meetingId, scopeKey, date, notes}  -> MeetingLogEntry
DELETE /api/shema/meetings/log/{meetingId}/{scopeKey}/{period}        -> 204
```

**`GET /meetings` is the one exception to §9.0's last rule**, and only because of GATE-02: serving
the definitions lets the meeting set change without a frontend deploy. Until the gate closes, the
frontend's `RITMO_MEETINGS` is the source and the endpoint is optional; both catalogues already
carry the unused `ritmo_m4_*` (Governança) and `ritmo_m7_*` (Repasse de recursos) keys, so swapping
the Prayer Pulse for Governance costs no copy work either way.

**The log is unique per `(meetingId, scopeKey, period)`** and the server derives `period` from
`date` and the meeting's cadence — never from the client (§7.5). A second log for the same period
**replaces** the first.

Readiness (`X/Y` per meeting and region) is **derived from the project collection**, not an
endpoint; §7.5 is what it counts.

### 9.8 ETEN — INT-08 ([OBT-413](https://linear.app/shema-obt/issue/OBT-413)) · BE-11 ([OBT-400](https://linear.app/shema-obt/issue/OBT-400))

```
GET /api/shema/eten/report?year=YYYY              -> EtenYearReport
GET /api/shema/eten/credits                       -> EtenCreditEntry[]
PUT /api/shema/eten/credits/{projectId}/{year}    {credits}  -> EtenCreditEntry   # source: "manual"
```

`EtenYearReport` carries `{year, listedProjects, advancingProjects, totalCredits, hasData,
snapshots[]}`, and each snapshot carries the scope, the approved count at the start and end of the
year, the advance between them, and the credit with its `source`.

**Server requirements:**

- **A year with no data is not a year of zero credits.** `hasData` distinguishes them at the row and
  at the report, because they say very different things to a funder.
- **Do not seed.** With `inETEN` false on all 127 and no `progressHistory`, the honest report is
  empty. The prototype fabricated `inETEN` and invented two year-end snapshots at 45% and 100% of
  the current count; that is not ported and must not be reintroduced.
- A `manual` entry wins over the computed value; the computed one is marked `calculated`.
- The rule itself is **Open · GATE-01** (§11.1).

### 9.9 Formulários e link do líder — INT-09 ([OBT-414](https://linear.app/shema-obt/issue/OBT-414)) · BE-12 ([OBT-401](https://linear.app/shema-obt/issue/OBT-401))

```
GET  /api/shema/forms/submissions                  -> ReceivedSubmission[]
POST /api/shema/forms/pulse/{projectId}            -> the generated artifact        # Open · GATE-03
POST /api/shema/forms/submissions                  {the returned artifact}  -> ReceivedSubmission
POST /api/shema/intake-links   {projectId?, expiresAt}  -> {token, url, expiresAt}
GET  /api/shema/intake/{token}                     -> the public intake form        # no auth
POST /api/shema/intake/{token}                     {the filled form}  -> 202        # no auth
```

**Server requirements:**

- **The import is idempotent and transactional: a double import is a no-op.** That is a DoD line of
  the delivery plan and it is the requirement, not a nicety — a leader who forwards the same file
  twice must not double a chapter count.
- **The submission is archived byte-identically.** Whatever the format, the bytes that arrived are
  what is kept.
- **Prayer and needs ingestion is consent-gated**: when the leader opted out of sharing, the shared
  prayer text is cleared on ingest, not stored and hidden (§8.2).
- **An imported progress change goes through the same write path as a typed one** (§7.2), carrying
  `fromField` (the submitter's name) and `formType`.
- **Only the Pulse is archivable.** `ReceivedSubmission.kind` is `"pulso"` and nothing else (§5.7).
- The leader link grants the intake form **and nothing else**: no console, no project data, and it
  expires.
- **Neither the format nor the distribution model is decided** — §11.3.

### 9.10 Equipe — INT-10 ([OBT-415](https://linear.app/shema-obt/issue/OBT-415)) · BE-13 ([OBT-402](https://linear.app/shema-obt/issue/OBT-402))

```
GET /api/shema/regions                   -> Region[]          # key, labelKey, team{coordinator,obtLab,resourceCircle}
PUT /api/shema/regions/{key}/team        {RegionTeam}  -> {outcome: SaveOutcome, changes: RoleChange[]}
GET /api/shema/regions/role-changes      -> RoleChange[]
```

`SaveOutcome` is `{changed, filled, cleared}` — the screen reports what the save actually did, and a
save that changed nothing says so.

**Server requirements:** every change writes a `RoleChange` audit row carrying who and when; the
name stored there is a **snapshot** and must not follow a later rename (§5.3); and **no other model
stores a role-holder's name** — the four consumers read this one.

**`role-changes` is `coordinator`-only, and the client asks for it separately from `regions`.**
`regionsStore.hydrate()` requests `GET /regions` alone; `hydrateChanges()` — its own hydration slot,
called only from the Equipe screen — requests the trail and swallows a 403 into the store's previous
`changes` rather than rejecting, because a session with no coordination role (or a coordination with
nothing recorded yet) hits that refusal by construction and must not sink the region list the other
three consumers (Sidebar, `RolesPanel`, Ritmo) render fine without it.

### 9.11 Notificações — INT-11 ([OBT-416](https://linear.app/shema-obt/issue/OBT-416)) · BE-15 ([OBT-404](https://linear.app/shema-obt/issue/OBT-404))

```
GET  /api/shema/notifications          -> AppNotification[]   # already routed, capped and redacted
GET  /api/shema/notifications/prefs    -> NotificationPrefs
PUT  /api/shema/notifications/prefs    {NotificationPrefs}  -> NotificationPrefs
POST /api/shema/notifications/read     {ids: string[]}  -> 204
```

**Server requirements:**

- **Route by role *and* region before capping.** The audience table (§5.8) plus the caller's region
  scope; a global role sees all. Capping before routing lets one region's volume evict another
  recipient's entries. The cap is 30 per recipient, after routing.
- **Prayer entries reach `resourceCircle` alone** — so a non-consented team's coordination traffic
  never lands on the person whose job is to share with the network.
- **Prayer text enters only through the §8.2 gate**, and location only through §8.1's owner.
- Ids are **stable derivations of what the row renders**, never of a position (§5.8), so a persisted
  read state survives a re-derivation.
- The badge counts unread over **exactly the list the panel returns**.
- Channel delivery does not exist yet on either side (§3.1). The preference records the choice.

**One schema consequence worth naming before BE-15 starts.** These notifications are *derived from
the projects*, so their ids are not rows: the existing `notifications` table stores a row per
delivered notice and marks it read by its own primary key, which a derived id has no counterpart
for. Either the read state is its own small table keyed by `(user, derived id)`, or BE-15
materialises each entry as a real notification row at the moment the underlying fact changes. Both
work; they are different products, and §5.8's stable-id rule is what makes the first one safe.

### 9.12 Exportar e importar — INT-11 ([OBT-416](https://linear.app/shema-obt/issue/OBT-416)) · BE-14 ([OBT-403](https://linear.app/shema-obt/issue/OBT-403))

```
GET  /api/shema/export/projects?format=json|csv   -> the redacted file + its header
POST /api/shema/import/projects   {Project[]}     -> {applied: number}
```

§8.4 is the whole requirement. Two details the frontend already carries and the server inherits:
the CSV neutralises anything a spreadsheet would read as a formula and opens with a BOM so
non-Latin names survive Excel; and the import refuses the export file by recognising it.

### 9.13 Sessão e autenticação — INT-01 ([OBT-406](https://linear.app/shema-obt/issue/OBT-406)) · BE-03 ([OBT-392](https://linear.app/shema-obt/issue/OBT-392))

Reuse `shema-api`'s existing routes whole (§3): `POST /api/auth/login`, `/refresh`, `/logout`,
`GET /api/auth/me`. The frontend attaches the bearer token from a single Axios instance and retries
once on 401 after a refresh.

**Two lines of this section were written before the screen existed, and INT-01 departed from both
(`CLAUDE.md` §8 carries the reasoning).** First, *"clears the tokens and redirects to `/login`"*: it
clears the tokens and does **not** redirect — the gate keeps the app mounted and asks for the
password in a dialog over it, because a redirect unmounts exactly the unsaved work the issue exists
to protect. Second, the tokens were assumed to live in `localStorage`; **no token is written to any
web storage**, both live in module memory, and the cost is that a page reload asks for the password
again. ⚠️ **Closing that is a server change, not a frontend one**: `/api/auth/refresh` takes the
refresh token in the body, so a session that survives a reload needs `shema-api` to set it as an
httpOnly, `Secure`, `SameSite` cookie. Nobody owns that yet.

**One requirement this section did not state, and the client now depends on: the wire spelling.**
`GET /api/shema/session` answers camelCase (BE-03 aliases it), and the client does **no case
conversion anywhere** — the frozen types in `src/types/` are the wire. **BE-05 and BE-06 must serve
`Project` in camelCase.** The platform's own `/api/auth/*` is the single exception: it is
pre-existing snake_case and gets one named three-field mapping. A second spelling for the record
would put a translation table on every read, which is the defect §9.0's conventions exist to avoid.

One Shemá-specific read is missing and BE-03 owns it:

```
GET /api/shema/session   -> { role: SessionRole, regionScope: RegionKey[] | null, name: string | null }
```

`SessionRole` is `globalStrategist | coordinator | obtLab | resourceCircle`; `regionScope: null`
means global. **`name` is resolved from the org chart** (§5.3) — it is not a user profile field, and
renaming a role-holder renames who the session says you are. `GET /api/auth/my-roles` cannot answer
this today because the grant has no region (§3.1). `SessionRole` and `SessionPersona` were declared
in `src/contexts/AuthContext.tsx` rather than under `src/types/`, the one gap in the frozen surface
of §1. INT-01 closed it (§12.3): they live in `src/types/session.ts` now, under the same
`contract.test.ts` guard as the other ten, and the context re-exports them so no import moved.

---

## 10. Every wave-1 write, and the endpoint it becomes

This is the whole write surface of the product. The stores expose operations precisely so this table
can exist; `hydrate()` becomes the matching `GET`.

| Store (localStorage key) | Operation | Becomes |
|---|---|---|
| `projectsStore` (`shema-projects-v1`) | `saveProject(project)` | `POST` / `PATCH /projects[/{id}]` (§9.3) |
| | `importProjects(projects)` | `POST /import/projects` (§9.12) |
| | `reload()` | the same `GET /projects` as `hydrate()`, unconditionally |
| `regionsStore` (`shema-regions-v1`) | `saveTeams(drafts, changedBy)` | `PUT /regions/{key}/team` (§9.10) |
| `rhythmStore` (`shema-rhythm-v1`) | `logMeeting(id, scope, cadence, entry)` | `POST /meetings/log` (§9.7) |
| | `undoMeeting(id, scope, period)` | `DELETE /meetings/log/...` (§9.7) |
| | `setDraft` / `clearDraft` | stays client-side — a typed note is not a write |
| `prayerStore` (`shema-intercessors-v1`) | `addIntercessor` / `updateIntercessor` / `removeIntercessor` | `POST` / `PATCH` / `DELETE /prayer/intercessors` (§9.6) |
| `notificationStore` (`shema-notifications-v1`) | the seven `NotificationPrefsHandlers` | one `PUT /notifications/prefs` (§9.11) |
| | `markRead(ids)` | `POST /notifications/read` (§9.11) |
| `assessmentStore` (`shema-assessments-v1`) | `saveStep` / `discardDraft` | stays client-side; only the finished draft posts (§9.4) |
| `recordStore` (`shema-record-drafts-v1`) | the record draft | stays client-side (§12.8) |
| `formsStore` (`shema-form-submissions-v1`) | — read-only in wave 1 | `GET /forms/submissions`; the write is the import (§9.9) |
| `filtersStore`, `prefsStore`, `savedViewsStore` | filters, sort, metaphor, saved views | **stay client-side.** Saved views are per browser today; §12.9 is the question of whether they should follow the user. |

There is no other write. Anything a wave-2 issue adds that is not on this list is new product, not
integration.

---

## 11. The three open client gates

None of these may be frozen by implementation. Each blocks named issues, and each has a place in
the product where the openness is already stated in words rather than hidden behind a plausible
number.

### 11.1 GATE-01 — the ETEN credit rule ([OBT-387](https://linear.app/shema-obt/issue/OBT-387))

**Blocks:** BE-11 ([OBT-400](https://linear.app/shema-obt/issue/OBT-400)), INT-08
([OBT-413](https://linear.app/shema-obt/issue/OBT-413)). Owner on the client side: **Youngshin**.

**Answered so far, by Karina Marinho on 14/aug/2026** — and recorded here because GATE-01's own DoD
asks for it:

> **A credit is one completed defined scope, counted in APPROVED chapters.**

- The unit is `approvedUnits` — not translated, not community-checked.
- **It is not a divisor.** A 25-chapter scope and a 260-chapter New Testament are worth **1 credit
  each**, on closing their own scope. The "25 chapters" in the original phrasing is the size of one
  kind of scope, not a rate.
- Completion is read from the project's `status` field, not from "scope covered".

This contradicts the prototype, which counts one credit per *translated* chapter advanced. The
prototype is out of date on this point.

**Still open, and not to be guessed:**

1. **Formal confirmation with Youngshin.** The decision above is Karina's; the DoD names Youngshin.
   Until then the rule stays marked provisional in the product, and `accountFor` stays one swappable
   pure function.
2. **The split** when several partners contribute to one project.
3. **The period**, and a project that spans two.
4. **What ETEN's own reporting expects**, since this must reconcile with something external.
5. **Carry-over of partial scope** — today it earns nothing, and whether it ever should is
   deliberately unanswered; the screen says so rather than choosing a side.
6. **A completion date on the model.** `status` records *that* a project finished, never *when*, and
   the report is per year. A project marked `concluido` that the year-end snapshots cannot date
   renders as *completed, year not recorded* and earns `null`. Closing this needs a real
   `completedDate` field; until then the manual ledger entry is the escape hatch. **This is the one
   item on the list that is a schema change, so BE-02 should know it is coming.**

And a data fact that lands squarely on this gate: **the export's `approvedUnits` is a copy of
`translatedUnits`** (§6.2), so migrating it as-is would credit approvals nobody made.

### 11.2 GATE-02 — the Rhythm meeting set ([OBT-388](https://linear.app/shema-obt/issue/OBT-388))

**Blocks:** BE-10 ([OBT-399](https://linear.app/shema-obt/issue/OBT-399)), INT-07
([OBT-412](https://linear.app/shema-obt/issue/OBT-412)).

What must be settled: **which meetings exist**, whether Prayer Pulse and Governance are two things
or one seen twice, **cadence and attendees** per meeting, which produce an artifact the platform
stores, and — the expensive one — **whether the set differs by region**.

**That last question is a data-model fork, not a detail.** Today `MeetingLogEntry.scopeKey` carries
a region or `"global"` and the *definitions* are global. A per-region meeting set means the
definition itself is scoped, which changes the table and the readiness computation. Do not build
either shape until the gate answers.

The frontend is already arranged so the answer is cheap: the set is data in one file
(`RITMO_MEETINGS`), and both i18n catalogues already carry unused keys for Governança and Repasse
de recursos.

### 11.3 GATE-03 — the Pulse file format ([OBT-389](https://linear.app/shema-obt/issue/OBT-389))

**Blocks:** BE-12 ([OBT-401](https://linear.app/shema-obt/issue/OBT-401)), BE-09
([OBT-398](https://linear.app/shema-obt/issue/OBT-398)), INT-09
([OBT-414](https://linear.app/shema-obt/issue/OBT-414)) — the Pulse epic, which is the riskiest work
in the plan.

The prototype emits `.html` and takes back `.json`, and **that pairing has never been confirmed with
the client.** It is not a fact this contract may repeat: wave 1 removed every mention of a file
extension from the product's copy and a test fails the build if one comes back.

What must be settled: the format, and if both, **which is authoritative when they disagree**; the
distribution model — intercessors-only or freely shareable; **retention and withdrawal** from an
already-distributed file; and the privacy rules for Pulse contents, which §8.6 states
format-independently.

**The privacy consequence is the part to raise in the conversation**, because it changes what
belongs in the file more than the format does.

> The offline artifact is the project's highest technical risk: an unknown Android phone, no
> connectivity, and a file round trip through WhatsApp. **Prove it on a real device early**, not when
> you reach it.

### 11.4 The fourth gate, which has no issue: what *devida cautela* means per output

`CLAUDE.md` §6.1 marks it and BE-04 ([OBT-393](https://linear.app/shema-obt/issue/OBT-393)) is
scheduled before anything that emits data. One concrete question is already open and named in §8.1:
**the base name.** The export file empties it for a withheld record; the console's cards, tooltips
and prayer wall still render it verbatim, and both flagged records carry a base that names a place.
Redacting it everywhere is a second rule and it belongs to this gate — **do not invent it surface
by surface.**

---

## 12. What this contract deliberately does not decide

Each of these is a real question with a named owner. None is an oversight.

1. **The module's name, route prefix, service package and table names** — BE-01. §3.2 records the
   per-directory naming evidence so the decision is made once.
2. **How the region dimension attaches to the role grant** — BE-03. §3.1. Whatever the mechanism,
   the frontend needs exactly `{role, regionScope}` back from §9.13.
3. **Where the session shape lives** — INT-01, with BE-03 holding the other half of it (item 2).
   **Closed by INT-01**; the paragraph below is the record of why it was open.
   `SessionRole`, `SessionPersona` and `SessionUser` are declared in
   `src/contexts/AuthContext.tsx`, not under `src/types/`: §9.13's response body is the one shape
   on the wire that §1's frozen surface misses, and `contract.test.ts` cannot see it either,
   because it scans that directory. Half of it is frozen anyway — `SessionRole` is
   `"globalStrategist" | RoleKey` and `regionScope` is `RegionKey[] | null` — so what lives loose
   is the `globalStrategist` member and the persona envelope around them. Wave 1 has no second
   reader: the session is mocked in the shell, and the types are the mock's own. INT-01 is the
   issue that gives the shape a server, and that is when it becomes `src/types/session.ts`, under
   the same guard as the other ten — which is what INT-01 did.
4. **Whether `team`/`ywamBase` and `sensitivity`/`sensitiveCountry` stay as two columns each** —
   BE-02. §5.1. Either way, one input writes both and one of each pair is authoritative.
5. **Whether `approvedUnits` is migrated as-is, as zero, or flagged unverified** — BE-16, with
   BE-11 needing the answer. §6.2 and §11.1.
6. **Whether a `NeedItem` gets a server-side id.** It has none today; a notification identifies one
   by `(project, category, submittedAt)`. A real id would be better and would change
   `NeedItem` — which is why it is named here rather than done quietly.
7. **Signed URLs or a gated read endpoint for media** — BE-04. §3.1 and §8.3.
8. **Whether drafts move to the server.** They are `localStorage` today, which means a coordinator
   who fills half a record and opens a different browser has lost it. That is a real cost, it is not
   data loss in the browser they used, and no issue owns it yet.
9. **Whether saved views follow the user.** Per browser today; the view codec is shareable by URL,
   which is the substitute.
10. **What `ProgressHistoryEntry.formType` may contain** — BE-12, alongside GATE-03. It is a free
    `string` (§5.2) because the only values written are the prototype's generator modes, and
    narrowing it to `FormKind` would both reject those and put a cycle in the type graph
    (`project.ts` is the root: `region.ts` imports it, and `forms.ts` reaches `region.ts` through
    `meeting.ts`). Whoever settles the Pulse settles this vocabulary, in `forms.ts`.

---

## Appendix A — the frozen vocabularies

All in `src/constants/`, ported verbatim from the design prototype's `modals.jsx` and the approved
option lists — **not re-derived from the PRD**. A server that validates against a different list
rejects data the console can produce.

| Vocabulary | Values | Used by the export |
|---|---|---|
| `ProjectStatus` | `nao-iniciado`, `em-andamento`, `final`, `concluido`, `pausado`, `cancelado`, `planejado`, `desconhecido` | 6 of 8; `final` and `nao-iniciado` are derived-only |
| `HealthRating` | `""`, `boa`, `atencao`, `critica` | none |
| `OverallHealth` | `boa`, `atencao`, `critica`, `na` | derived |
| `StaleStatus` | `em-dia`, `atencao`, `critico` | derived |
| `Objective` | `NT`, `AT`, `Bíblia Completa`, `Livros Específicos`, `Capítulos`, `Histórias`, `Outro` | 3 of 7 |
| `TranslationType` | `OBT`, `OMT`, `OBT/OMT`, `Tradução escrita`, `IA Assistida`, `Filme Jesus`, `Língua de Sinais`, `Ready Vessels`, `Taste&See` | 2 of 9 |
| `FinancialResource` | `Seed Company`, `Global Partnerships`, `OBT TABLE - ETEN`, `Innovation Lab`, `Outros` | none |
| `NeedCategory` | financial, training, equipment, volunteers, material, security, connectivity, logistics, documentation | none |
| `NeedUrgency` | `low`, `medium`, `high` | none |
| `NeedStatus` | `open`, `in-progress`, `fulfilled`, `dropped` | none |
| `PrayerVisibility` | `coordenacao`, `rede` | none; default `coordenacao` |
| `RegionKey` | `south-america`, `north-america`, `africa`, `asia`, `oceania`, `europe`, `other` | derived from `location` |
| `RoleKey` | `coordinator`, `obtLab`, `resourceCircle` | none |
| `MaterialKind` | `text`, `audio`, `video` | none |
| `StoryRecordStatus` | `planned`, `recording`, `recorded` | none |
| `MeetingState` | `done`, `pending`, `overdue`, `new` | derived |
| `EtenCreditSource` | `manual`, `calculated` | none |
| `YesNo` | `sim`, `nao` | `nao` on all 127 |
| Unit types | `Livros`, `Capítulos`, `Versículos`, `Páginas`, `Histórias`, `Outro` | 1 of 6 (`Capítulos`) |
| Vitality scale | Vital, Vulnerável, Ameaçada, Seriamente ameaçada, Em situação crítica, Extinta | none |
| `BIBLE_BOOKS` | 66 books (39 OT, 27 NT), each `{id, name (PT), en, chapters, ot}`; 1,189 chapters, 260 of them NT | matches `totalUnits` exactly |

**Two vocabularies are *not* frozen and must not be treated as enums:** `statusGoal` (5 values in
the export, one of them `N/A`) and `orgRole` (1 value) are free text the export happened to produce.
No screen edits them and no list defines them.

**PT/EN copy is the frontend's.** Both catalogues are complete and a test fails the build when a
Portuguese string leaks into the English render. The backend serves **keys and data, never rendered
labels** — every `labelKey` in these types is an i18next key the frontend resolves.

---

## Appendix B — conflicts found while writing this, and how they are resolved

The quality rule is that a document a change contradicts is reconciled in the same delivery, or the
conflict is recorded explicitly. These are recorded rather than silently resolved, because each has
an owner who is not this issue.

**B.1 `CLAUDE.md` §3.2 on this branch says the Shemá module "already exists, scaffolded".** It does
not — §3.2 of this document is the verification, and it names the branch the cited commit really
lives on. The correction is already written and sits **uncommitted** in this repository's main
working copy (which has the FE-40 branch checked out); it also renames `tripod-api` to `shema-api`
throughout and fixes B.4. This document does not duplicate that edit — two copies of one correction
is the defect the correction is about — but **it is uncommitted, so nothing guarantees it lands.**
If it is lost, `CLAUDE.md` §3.2 still needs it.

**B.2 `README.md` still names the backend `tripod-api` and states that Shemá is a module inside it
at `/api/shema`.** The repo was renamed to `shema-api` and the prefix is BE-01's to confirm. This is
pre-existing staleness, outside this issue's scope — **and the uncommitted edit of B.1 does not
cover it**: that edit touches `CLAUDE.md` only. `README.md` needs its own correction, by whoever
owns the rename.

**B.3 `CLAUDE.md` §3.2's capability table says "Media upload + signed URLs".** There are no signed
URLs on `main` (§3.1). The table is right about the *paths* and wrong about the *capability*, which
matters because §8.3's rule depends on it. Recorded here; the table's owner is BE-01, which turns it
into verdicts.

**B.4 `CLAUDE.md` §3.1 and §8 describe `src/services/api.ts` as existing.** It does not exist;
`axios` is pinned and imported by no file under `src/`, and INT-01 writes the client. The corrected
text is in the same uncommitted edit as B.1, which is why §2 of this document names INT-01 rather
than describing the file as written.
