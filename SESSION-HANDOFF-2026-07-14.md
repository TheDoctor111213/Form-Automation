# RCS Automation — Session Handoff (2026-07-14)

_Owner: Matt Kodsi (mfkodsi@gmail.com), Related Affordable._
_Supersedes `SESSION-HANDOFF-2026-07-13.md`. This file is the working state._

> Operational rules live in `CLAUDE.md`. **NOTE:** CLAUDE.md still describes the app as
> a localStorage-only, offline, double-click file. That is now **out of date** — see below.
> CLAUDE.md's storage/deliver sections should be refreshed next session.

## ▶ Resume here

- **The app is no longer browser-only.** This session migrated the data layer from
  `localStorage` to a hosted **Supabase (Postgres)** backend, gated by Supabase Auth.
  The live app **requires internet + sign-in** now; the old offline "double-click" mode
  is intentionally gone.
- **Everything is shipped and live:** git `main` pushed, Netlify auto-deployed, Supabase
  schema live and verified. Nothing is half-done. Phases 1–3 complete; Phase 4 (optional
  data migration) is the only remaining piece and it depends on Matt.
- **Build/verify still works the same:** no Node/npm/brew on this machine — build with
  `bash app/full-mp/build.sh index.html` (pure concatenation) and verify in a browser
  (local `python3 -m http.server` + the browser-automation tool). `deliver.sh` still
  can't run (needs Node).

## Infrastructure (durable — also saved to memory)

- **Supabase project id:** `plgegtosqwehriqecaui` ("Related Affordable Package Automation", region us-east-2).
- **Supabase URL:** `https://plgegtosqwehriqecaui.supabase.co` (also in `app/full-mp/config.js`).
- **Matt's auth user id:** `2f3ae5a3-74dc-4b55-935a-ef7816aac30a` (email mfkodsi@gmail.com).
- **Netlify:** site `relatedpackageautomation` (site id `59dabcdd-55b7-4c64-b7fe-5b04fb92e2dc`),
  live at **https://relatedpackageautomation.netlify.app**. **Auto-deploys from GitHub
  `main`** — pushing to main IS the deploy (no manual Netlify step needed).
- **MCP available this session:** Supabase MCP (`execute_sql`, `apply_migration`,
  `list_tables`, `get_advisors`, …) and Netlify MCP (project/deploy readers). Use these
  to verify the live DB directly.

## What changed 2026-07-14 (this session)

### 1. gen.js package-generation fixes + tenant-facing property name  (commit `64ecc4c`)
Compared the app-generated Colonial Village package (`_archive/colonial-village-example/`)
against Matt's manual one. Fixed in `gen.js`:
- **CA salutation**: uses `prefix + last name` when a salutation is on file, first name
  only otherwise (was always first name).
- **RS Part H signature date**: no longer auto-filled (left blank for DocuSign).
- **Total Rent Loss Due to Non-Revenue Units** (field 174): now summed (was always $0).
- **Tenant reassurance paragraph** added (bold, the 30%-of-adjusted-income language).
- **New Section 9 field** `tenant.property_alias` ("Property name (as known to tenants)")
  — feeds the tenant notice so it addresses residents by their known community name.
Also added To-Do item 14 (non-rev unit rent should auto-parse from its revenue-producing
counterpart's proposed rent, once RCS parsing exists).

### 2. Supabase migration — Phases 1–3  (commit `9e37d5c`, live on Netlify)
- **Schema** (4 tables, RLS `owner_id = auth.uid()` on each): `property` (durable +
  per-cycle scalars, plus `partb`/`checklist` as JSONB), `unit_type`, `nonrev_unit`,
  `pm_contact`. Money/count columns are **integer**, date columns are **text** — chosen so
  the app's string-based, decimal-stripping (`cleanNum`) form logic round-trips exactly.
  Applied via `apply_migration` (`refine_money_and_date_column_types`).
- **Auth**: email/password, **sign-up disabled** (public URL — no open registration).
  New `#viewAuth` sign-in screen in `shell.head.html`; `app.js` boot restructured into
  `showAuthScreen()` / `boot()` / a session-checking `DOMContentLoaded`; sign-out button.
- **Vendored** `app/full-mp/lib/supabase.min.js` (UMD, via curl, same as pdf-lib).
- **`app/full-mp/config.js`** holds `SUPABASE_URL` + anon key (public by design; safe to
  commit — RLS + auth protect data; service_role key is NEVER embedded).
- **`app/full-mp/db.supabase.js`** — `makeSupabaseDb(client)`, a drop-in for
  `makeDb(localAdapter)` with the **identical public method surface**, so
  `app.js`/`core.js`/`gen.js` are unchanged (one boot line swapped). Keeps an in-memory
  mirror (same `D` shape as `db.js`) so the SYNC reads app.js expects
  (`listProperties`/`propertyAnalysis`/`getFlat`/`getLetterhead`/`listContacts`/
  `createProperty`) work; pushes scoped writes to the 4 tables. Reuses `db.js`'s global
  pure helpers (`computeAnalysis`, `isPerCycleKey`, `num`). **Client-generated UUIDs**
  keep `createProperty` synchronous; a **per-property write queue** prevents races.
- **`build.sh`** now concatenates `lib/supabase.min.js` + `config.js` + `db.supabase.js`.

### Verification (all by the agent, this session)
1. **Offline round-trip** through a mock client — ~90 fields, **0 diffs**.
2. **Live schema** via MCP `execute_sql` — inserted exact payloads, exact round-trip
   (integers clean, dates preserved, JSONB intact); FK cascade delete confirmed.
3. **Row-level RLS** via MCP — owner sees own row, stranger sees 0.
4. **Real end-to-end** through the actual authenticated `supabase-js` client in the
   browser (create → save → reload → read → delete): **0 diffs, clean teardown.**
5. Supabase **security advisor**: clean (only an optional "enable leaked-password
   protection" note).
- Post-verify, the Supabase DB is **empty** (all test data removed). `index.html`
  rebuilds byte-for-byte; 0 NUL bytes in every source file.

### 3. HUD SAFMR API integration (same day, later session)
- **Edge function `hud-safmr`** (deployed to Supabase, source in `supabase/functions/hud-safmr/index.ts`):
  property address → Census geocoder (free, keyless) → county FIPS → HUD FMR API
  `/fmr/data/{fips}99999` → zip-level SAFMR row. Requires a signed-in user (rejects the
  bare anon key via a role-claim check). Tries the effective-date year, falls back a year,
  then HUD's latest.
- **HUD token storage**: in **Supabase Vault** (secret `hud_api_token`), read by the
  function through a service-role-only RPC `public.get_hud_token()` (migration
  `add_get_hud_token_rpc`). The token is NEVER in git/index.html; an `HUD_API_TOKEN`
  edge-function env secret, if ever set, takes precedence. Token source: Matt's inbox
  ("HUD API Token", 2026-07-14). The token has the FMR **and** USPS-crosswalk datasets
  (crosswalk enabled later the same day) — ZIP→county now uses HUD's own crosswalk
  (type 2, highest res_ratio wins); the Census geocoder is only the no-ZIP fallback,
  so ZIP alone is enough to pull.
- **Client: automatic + manual** (`app.js`: `ensureHudSafmr`/`applyHudSafmr`/
  `scheduleHudRefresh`, in-session cache `_hud` keyed ZIP|year). Auto-pull fires on
  form open, when the ZIP is typed (900ms debounce), when the effective-date year
  changes, and when a unit's BR type is set (fills instantly from cache). A stale-fetch
  guard skips applying if the form's ZIP/year changed mid-flight. The small **"⤓ HUD"**
  re-pull button lives in the 150% SAFMR column header (`.safmrhead`/`.hudbtn` CSS);
  a manual click forces a fresh fetch. Fills `units.{i}.safmr_hud` with
  **round(1.5 × base SAFMR)** per unit type (db.js:109 — the field holds the 150%
  ceiling). Bedroom map Studio→Efficiency … 4BR; >4BR = 4BR +15%/extra bedroom (HUD
  rule). Prefers the property-ZIP row; falls back to the metro-wide row (labeled in
  the status line). Values flow through `store.editForm` — normal provenance/save/
  override behavior. First call after an edge-function deploy is slow (cold start,
  imports supabase-js) — auto-pull just lands a few seconds later; not a bug.
- **Verified end-to-end** (real authenticated session, localhost against live backend):
  curl → 401 without session; invoke → FY2026 Dallas zip 75201 SAFMRs; UI fill 1BR $3,705 /
  2BR $4,350 / 5BR $8,004; saveField → persisted → test property deleted (cascade clean).
  Matt's real "Colonial Village" row (created 2026-07-14 in the live app) untouched.
- To-Do List item 1 (HUD SAFMR API) is now functionally done — Matt to strike it off.

## Open / next

- **Phase 4 — optional one-time data migration.** Only needed IF Matt has real property
  data in a browser's `localStorage` from before the cutover. If so, build a temporary
  `window.__migrateLocalToSupabase()` hook that replays it through `saveFlat`; Matt runs
  it in his own browser (the agent can't reach his localStorage). If his old data was just
  demo/test, skip — start fresh (first sign-in shows an empty property list, which is
  correct for a real DB; the Gates Manor demo no longer auto-seeds).
- **Optional hardening:** enable leaked-password protection in Supabase (Auth → Providers
  → Password).
- **Refresh `CLAUDE.md`** — its storage/offline/deliver description predates Supabase.
- **gen.js package-generation still open** (from `Revisions.md` "Form generation comments"):
  Appendix 9-2-2 template replacement (Matt to provide the new form — "cannot keep
  corrupting it"); include the uploaded RCS report as a pass-through doc; auto-generated
  fallback letterhead + warning UI when none on file; Part B checkbox-glyph overlap (needs
  a visual PDF check). Salutation / RS-date / rent-loss / reassurance are now DONE.
- **Broader roadmap unchanged** (`To-Do List.md`): HUD SAFMR API, AI parsing of §1 uploads,
  stored CA/appraiser/GP/community-manager contacts, excel generation, Navigator
  integration, pre-generation discrepancy warning page, saved-package snapshots,
  excess-unit-type / non-Section-8 RS generation, "revert to parsed data" buttons.

## Hard-won lessons (still apply)

- **Edit source in the sandbox, then `cp` + `cmp`** — host `Write`/`Edit` on this mounted
  folder can truncate / append NULs. Verify 0 NULs + bracket-balance vs. original.
- **No Node here** — can't run `deliver.sh`/`test_db.js`/`test_interactions.js`. Verify by
  building (`build.sh`) and exercising the real app in the browser, including calling
  `window.*` / global functions directly via JS execution (how gen.js AND db.supabase.js
  were verified).
- **Testing authenticated Supabase paths needs a real session.** The agent can't enter a
  password (prohibited) and anonymous sign-in is disabled. This session's real E2E worked
  because a valid signed-in session for Matt's account was already present in the browser.
  For DB-side checks without a session, use the Supabase MCP (`execute_sql`, simulate an
  authenticated user with `set local role authenticated` + `set_config('request.jwt.claims', …)`).
- The **anon key is safe to commit / embed**; it's already in `index.html` and `config.js`.
  Never handle or embed the **service_role** key.
