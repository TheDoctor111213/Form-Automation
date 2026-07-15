# RCS Package Automation → Navigator 2.0 — integration handoff

Written for the engineer (or AI assistant) integrating this app into Navigator.
It assumes you have this package's source tree and can read code; it tells you
what each piece is, which seams were designed to be cut, and where the sharp
edges are. Everything stated here was verified against the running app.

---

## 1. What you are integrating

A single-page browser app that produces the **HUD Section 8 fifth-year (RCS)
renewal package**: a guided, provenance-tracked form over a per-property
record, a live **150% SAFMR affordability test**, and client-side generation
of six PDFs + one Excel workbook (individually, combined, or zipped as an
"RCS Package" folder). Current stack: static HTML bundle + Supabase (Postgres,
auth, one edge function). There is **no server-side rendering and no build
tooling** — integration cost is deliberately low.

Three integration depths, cheapest first:

- **A. Host as-is.** Serve `index.html`, stand up the database from
  `schema.sql`, deploy the `hud-safmr` edge function, set `config.js`. Done.
  Users sign in with email/password (registration closed).
- **B. Swap the backend (the intended path).** Keep the entire UI and
  generation pipeline; replace `db.supabase.js` with a Navigator adapter
  implementing the interface in §4, and replace the auth gate (§6). The rest
  of the app does not know or care where data lives.
- **C. Absorb the pieces.** The generation engine (`gen.js` + `xlsx.js` +
  `templates.js`) is pure `record → bytes` with zero DOM/store dependencies —
  it can be lifted into any JS context (including Node) by supplying
  `PDFLib` and the flat record (§7). The form UI is the hardest part to
  extract; if Navigator has its own forms, feed §7 from Navigator data.

## 2. Ground rules for working in this tree

- `index.html` **is a build artifact** (~2 MB). Never hand-edit it; never open
  it (or `app/full-mp/templates.js`, or `app/full-mp/lib/*.min.js`) in a
  context-limited tool — they are hundreds of thousands of tokens. Grep them
  instead.
- Edit the small sources in `app/full-mp/`, then rebuild:
  `bash app/full-mp/build.sh` → writes `index.html` at the repo root. The
  build is a **plain concatenation** in this order:
  `shell.head.html · lib/pdf-lib.min.js · lib/supabase.min.js · config.js ·
  core.js · db.js · db.supabase.js · app.js · gen.js · xlsx.js · templates.js
  · shell.tail.html`. Rebuilding unmodified source reproduces the shipped
  bundle byte-for-byte — use that as an integrity check.
- With Node available, `bash app/full-mp/deliver.sh` gates the build on syntax
  checks and `test_db.js` (49 assertions on the data-layer semantics);
  `node app/full-mp/test_interactions.js` covers save/revert/group and
  Enter/Escape decision logic against the real store.

## 3. Runtime anatomy

Boot (`app.js`, bottom): `DOMContentLoaded` → create the Supabase client from
`window.SUPABASE_URL/ANON_KEY` (`config.js`) → session check → sign-in view or
`boot()` → `mpdb = await makeSupabaseDb(client)` → property menu. Views (all in
`shell.head.html`, toggled by `show()`): `#viewAuth` (sign-in), `#viewMenu`
(property gallery), `#viewLauncher` (property summary, program picker,
letterhead manager), `#viewContacts` (four contact directories), `#viewForm`
(the 9-section RCS form + command center + generation).

Modules:

| File | Role |
|---|---|
| `core.js` | `makeStore(adapter, FIELDS)` — the keyed-cell store. Six ops: `emptyForm/fillForm/editForm/revertForm/saveField/saveFields/saveToDb`. **All provenance semantics live here** (§5). |
| `db.js` | Pure shared helpers used at runtime: `num`, `computeAnalysis` (the 150% test), `computeSalutation`, `isPerCycleKey`. Also a complete legacy localStorage data layer (`makeDb(localAdapter)`) kept as the reference implementation + test target. |
| `db.supabase.js` | The live data layer (§4). |
| `app.js` | Everything the user sees: renderers, event wiring, HUD pull, capacity warnings, letterhead measurement, package assembly and downloads. |
| `gen.js` | `window.RCSGen` — PDF generation, pure `record → Uint8Array` (§7). |
| `xlsx.js` | `window.RCSXlsx` — Excel generation by zip-level template patching; also exports `makeZip` (stored-entry zip writer used for the folder download). |
| `templates.js` | `window.RCSTemplates = {checklist, rentSchedule}` — base64 AcroForm PDFs. The Excel template is embedded separately inside `xlsx.js`. |

## 4. The data-layer contract (what a Navigator adapter must implement)

`app.js` talks to one object, `mpdb`. Replace `makeSupabaseDb(client)` with
`makeNavigatorDb(...)` returning the same surface and the app works unchanged.
`async` marks methods the UI awaits; the rest must return synchronously (the
Supabase layer achieves this with an in-memory mirror loaded once at boot —
copy that pattern: **sync reads from a mirror, writes update the mirror then
push to the backend**).

| Method | Sync? | Contract |
|---|---|---|
| `listProperties()` | sync | `[{id, name, fha, city_state, entity, alias, unit_types, total_units, completeness (0..1), created_at, updated_at, has_letterhead}]` sorted by name. |
| `getActive()` / `setActive(pid)` | sync / async | In-memory active-property pointer. `setActive` must not write to the backend. |
| `createProperty(name)` | sync return | Returns `{pid}` immediately (client-generated UUID); persist in the background. |
| `renameProperty(pid, name)` / `deleteProperty(pid)` | async | Delete cascades to unit rows. |
| `getFlat(pid)` | sync | The property's full flat map: `{flatKey: {value, source:'database', saved_at}}` (§5 keys). |
| `saveFlat(pid, map)` | async | Full rewrite of the property from a flat map (same shape). **This is the only write path the form uses** — every save is the whole record, so implement it as one transactional upsert. Reject → the UI shows a save-failure warning, so throw on backend errors, never swallow. |
| `loadForm(pid)` / `saveForm(pid, form)` | sync / async | Same as getFlat/saveFlat but cell-shaped; only tests use them. |
| `pruneUnitRows(pid, keepUnits, keepNonrev, keepLihtc)` | async | Delete unit rows whose index is not in the keep lists (arrays of flat indices). |
| `getLetterhead(pid)` / `setLetterhead(pid, name, thumb, data)` | sync / async | `{name, thumb, data}` — `data` is a dataURL (PDF or PNG, ≤ ~5.5 MB). |
| `listContacts()` / `addContact(c)` / `updateContact(id, patch)` / `deleteContact(id)` | sync list, async writes | PM contacts `{id, name, email, phone}`. |
| `listDir(kind)` / `addDir(kind, c)` / `updateDir(id, patch)` / `deleteDir(id)` | sync list, async writes | Directory contacts, `kind ∈ {'appraiser','ca','signatory'}`, fields: name, email, phone, prefix, org, firm, title, addr_street/city/state/zip. |
| `computeAnalysis`, `computeSalutation` | sync | Re-export the pure functions from `db.js` untouched. |

Two behaviors worth copying from `db.supabase.js` verbatim:

- **Per-property write queue + push coalescing** (`enqueue` / `pushSoon`):
  writes for one property are serialized, and while a push is queued further
  saves ride it (the push reads the mirror at execution time). All coalesced
  callers await the same promise and all see a failure if it fails.
- **Value conventions**: every value is a **string** in the flat map. When
  writing typed columns, coerce with `num()` and write `NULL` for `''`; when
  loading, skip NULL columns entirely (a missing record and a NULL column are
  the same thing to the store).

## 5. The flat-key data model and provenance semantics

The whole app operates on one flat dictionary per property. Keys:

```
property.name .fha .addr_street .addr_city .addr_state .addr_zip
owner.entity_name .entity_type .gp
poc.name .email .phone
sig.name .title
ca.org .prefix .name .position .addr_street .addr_city .addr_state .addr_zip
appr.name .firm .email .phone .addr_street .addr_city .addr_state .addr_zip
tenant.sender_name .sender_title .mgmt_source .mgmt_street .mgmt_city
       .mgmt_state .mgmt_zip .property_alias .date_of_notice
rent_schedule.date_rents_effective .date_eff_rs .date_eff_source .date_eff_custom
checklist.sign_date        cycle.submission_date
units.{i}.br .ba .num_units .current .proposed
         .ua_exec .ua_rcs .ua_source .ua_reviewed .ua_custom
         .num_rcs .br_rcs .ba_rcs .num_source .num_reviewed .type_source .type_reviewed
         .safmr_rcs .safmr_hud .safmr_source .safmr_reviewed .safmr_custom
lihtc.enabled              lihtc.{i}.br .ba .num_units .avg_rent
nonrev.enabled             nonrev.{i}.use .br .ba .num_units .rent
partb.equipment.{0..6}  partb.utilities.{0..4}  partb.fuel.{0..4}
partb.services.{0..5}   partb.writein.{e1..e5|u1|s1..s6}[.on|.fuel]
check.{0..16}
assets.letterhead_name .letterhead_thumb .letterhead_data
```

Conventions: checkboxes are `'1'`/`''`; money and counts are digit strings;
dates are `'YYYY-MM-DD'` or a user-typed `mm/dd/yyyy` (generators normalize);
`safmr_*` fields hold the **150% ceiling**, not the base SAFMR. `db.js`'s
`isPerCycleKey()` splits keys into durable vs per-cycle buckets — per-cycle
values are the ones a future cycle would overwrite (rents, UA, SAFMR,
appraiser, checklist, dates). The mapping from flat keys to columns is the
`PSCALAR` / `UCOL` / `NRCOL` / `LICOL` tables at the top of `db.supabase.js`;
Part B and the checklist fold into the two JSONB columns.

**Keyed cells.** In the form, every key holds
`{value, source, saved_at, prior_value, prior_source, db_value}` with
`source ∈ database | this-cycle | overridden | new`. The rules (all in
`core.js`, ~35 lines — read it):

- `fillForm` marks loaded values `database`; a record saved as blank keeps
  `db_value:''` so a later entry reads as an **override** of a deliberate
  blank, not first-time data.
- `editForm` compares against `db_value`: typing the stored value back turns
  the cell blue again; anything else is orange (`overridden`) with the prior
  kept for revert; entries with no stored record are grey (`new`).
- Saves record `db_value`, so clears and unchecks persist.
- UI groupings: address groups save/revert as one unit (`ADDR_GROUPS`),
  `coupledKeys` pairs a custom value with its source selector, and contact
  picks fill many cells as a *pending* group — Enter commits all, Escape
  restores the snapshot, clicking elsewhere annuls the group behavior.

## 6. Auth

`showAuthScreen()`/`boot()` at the bottom of `app.js` is the only auth-aware
code (plus a sign-out button and an `onAuthStateChange` fallback). For
Navigator SSO: delete the gate, ensure your adapter is constructed with an
authenticated context, call `boot()`. Nothing else in the app touches auth.
If you keep Supabase temporarily, note the model: the anon key is public **by
design** and safe only because registration is disabled and RLS scopes every
row to `owner_id = auth.uid()`.

## 7. Generation pipeline (the crown jewels)

`window.RCSGen` (gen.js) — every function is pure `async (record, …) → bytes`
where `record` is `{flatKey: stringValue}` (the form calls `formRec()` to
strip cell metadata):

```
coverLetter(rec, logoPngBytes)            // 01 — composed
ownerLetter(rec)                          // 02 — composed
fillChecklist(templateBytes, rec)         // 03 — AcroForm fill
fillRentSchedule(templateBytes, rec)      // 05 — AcroForm fill + drawn banner
tenantNotice(rec, letterhead, logoBytes)  // 06 — composed, letterhead underlay
resolve(rec)                              // shared field derivation (dates, salutation, mgmt address…)
```

`window.RCSXlsx.rentAnalysis({propertyName, apprFirm, rows})` builds the Excel
workbook; `rows` is up to 11 of `{type, units, cur, pro, ua, safmr150}` (the
generator writes `safmr150 / 1.5` into the base-SAFMR column; the sheet's own
formulas recompute the ceiling and verdict, and unused rows are blanked).
Package assembly, combined-PDF merging, and the folder-zip download live in
`app.js` (`__genPackageRun`, `combinePdfs`, `dlPackageFolder`).

Domain rules encoded in `fillRentSchedule` (Part A = 11 rows):
Section 8 rows first; if non-S8 rows exist, a full-width **"Non- Section 8
Rents"** banner row (that row's form fields are removed and a white band +
centered label are drawn from the neighboring widgets' geometry), then the
non-S8 rows **with full rent math that adds into the contract-rent
potential**; then a blank spacer and the non-revenue rows. Overflow: drop the
spacer, then the non-rev rows (they remain in Part D, which holds 5). Totals
count every unit even when rows are trimmed. A row with only a unit count is
a real row everywhere. The template's field-calculation actions are stripped
and Part A normalized to 9pt so viewers can't re-render cells. The form warns
(section card, banner, rail, command center, post-generation modal) whenever
any of this would trim data — `rsCapacity()` in `app.js` is the single source
of those warnings and must stay in sync with the generator's row plan.

**Letterhead system.** Per property, one uploaded letterhead (PDF preferred,
PNG/JPG accepted; images re-encoded at up to 3000px). The tenant notice prints
*on* it: PDFs are embedded as a full-page underlay (vector text stays crisp);
page-shaped images are drawn full-page. The text start line comes from
measuring the header's real bottom edge — pixel-scan for images
(`measureLetterheadDrop`), a transform-tracking content-stream scan for PDFs
(`measurePdfLetterheadDrop`) — plus 36pt of air. The notice is guaranteed one
page by a compaction ladder (`LEVELS` in `tenantNotice`) that trims paragraph
gaps → signature gap → a hair of leading, and never shrinks fonts, tables, or
a measured header drop. With no letterhead, a generated header (Related logo +
tenants-known-as name + management address) is used and the user is warned
before and after generation.

**HUD SAFMR pull.** `ensureHudSafmr()` invokes the `hud-safmr` edge function
(`supabase/functions/hud-safmr/index.ts`) with
`{street, city, state, zip, year}`; the function resolves ZIP→area via HUD's
USPS crosswalk (Census geocoder as address fallback) and returns
`{year, area_name, zip, smallarea, zip_rents?, area_rents?}` where rents hold
`efficiency/br1..br4` base SAFMRs. The client computes ceilings:
`round(base × 1.5)`, and for >4BR, HUD's rule of 4BR + 15% per extra bedroom
(`hudCeil`). Results fill `units.{i}.safmr_hud` as *this-cycle* values; the
fiscal year comes from the first 4-digit run in the effective date. **The HUD
USER API token lives server-side only** (Supabase Vault behind a service-role
RPC). For Navigator: reimplement as any endpoint with the same request/response
shape and change one `invoke` call.

## 8. The 150% test and other business math

`computeAnalysis(form)` in `db.js` (and its live twin `analysis()` in
`app.js`): per unit type, resolved UA = chosen source (`exec`/`rcs`/`custom`,
defaulting to whichever exists), resolved ceiling likewise (`hud` trumping
`rcs`); current/proposed **gross** rent potential = Σ (rent + UA) × units;
PASS iff proposed GPR < Σ ceiling × units, with per-type "over" flags and a
missing-SAFMR flag. Conflict pairs (exec-vs-RCS UA, HUD-vs-RCS SAFMR,
RS-vs-RCS unit type/count) demand an explicit source pick or an "approve"
click (`*_reviewed = '1'`) before their section reads confirmed. Salutation:
`Dear {prefix + last name}` (first name if no prefix). Signatory titles are
normalized to "… of General Partner" (`sigTitle`). Zero-unit protection: the
first unit type can never be committed with no unit count; other rows prompt
for deletion instead.

## 9. Known limitations / backlog (all deliberate)

- **Document parsing is a stub.** Section 1's "Parse documents" is disabled
  UI; the `*_rcs`/`*_source`/`*_reviewed` plumbing and conflict UI are already
  in place for when RCS/RS parsing lands. The uploaded RCS PDF is passed
  through as document 04 and lives **only in memory for the session**.
- **OCAF / UAF / BBRA** are "coming soon" program cards. The DB has
  `program_type`; briefing material for the OCAF flow exists in the private
  archive (ask Matt).
- Rent-schedule capacity is bounded by the paper form (11 Part A rows, 5
  Part D rows) — the app warns rather than paginating.
- One tenant-notice letterhead page; continuation pages print plain.
- No migrations framework — the schema is young; `schema.sql` is the truth.

## 10. Sharp edges (learned the hard way — keep these)

- **pdf-lib in background tabs**: every `PDFDocument.load` must pass
  `{parseSpeed: Infinity}` and every `.save()` must pass
  `{objectsPerTick: Infinity}`. The defaults yield via `setTimeout`, which
  Chrome throttles in backgrounded tabs — generation appears to hang forever.
  This bit us twice; the two options are set at every call site.
- **`removeField` on the rent schedule** requires the field to have an
  appearance stream — the banner code calls `setText('') + updateAppearances`
  before removal for exactly that reason.
- The vendored pdf-lib is **minified with mangled class names** — never test
  `constructor.name`; use capability checks or `context.lookup` (which passes
  non-refs through).
- The Excel template embedded in `xlsx.js` was numerically verified
  (including the Below-150% verdict). If you replace it, beware Excel's
  **shared-formula groups**: inserting rows once silently corrupted column R
  by merging Q:R into one group. Re-verify every formula after any template
  edit; the fill code targets cells `B/C/D/E/P/T` rows 9–19 by regex and
  requires those `<c>` elements to exist in `sheet1.xml`.
- `''` vs `NULL` in the DB is semantic (§4). Don't "clean up" empty strings.
- `updated_at` is written by the client (it doubles as the "Updated X ago"
  display); if you add a DB trigger, keep the column readable by the adapter.
- The UI re-renders sections wholesale (`renderBody`) and repaints single
  cells on keystrokes (`paintCell`/`applyTint`) — if you touch provenance
  colors, change `tintStyle` **and** `applyTint` together (they are documented
  twins).

## 11. Starting data & credentials (private package only)

If you received this as the private zip, you also have:

- **`seed-data.sql`** — real starting data: the Colonial Village property
  (unit mix, rents, Part B, checklist, embedded letterhead) plus the shared
  contact directories. Load it after `schema.sql`, replacing `__OWNER_ID__`
  with your user's UUID (instructions at the top of the file). This is the
  fastest way to see the app fully populated and to test generation against
  known-good data. Treat it as personal data.
- **`Colonial Village letterhead.pdf`** — the same letterhead as a standalone
  file, for reference or re-upload through the UI.
- **`SECRETS.md`** — the HUD USER API token and exactly where it goes. Tokens
  are free at huduser.gov, so mint your own for production; the shared one
  exists so the SAFMR pull works on day one.

None of these are in the public repository — keep it that way.

## 12. What to build first (suggested order for a Navigator port)

1. Stand up option A against a scratch Supabase project (`schema.sql` + one
   user + `config.js`) and click through the app — fastest way to learn the
   flows the adapter must preserve.
2. Write `makeNavigatorDb` against §4, backed by Navigator's DB with the
   column mapping from `schema.sql`/§5. Point `boot()` at it. Run
   `test_db.js` against the localStorage reference layer to understand the
   expected semantics; adapt its assertions to your adapter if useful.
3. Replace the auth gate with Navigator's session (§6).
4. Rehost the HUD SAFMR endpoint inside Navigator (§7) — one `invoke` call to
   change; keep the token server-side.
5. Only then consider deeper UI integration (option C).

---
*Questions the code can't answer (history, HUD policy context, the OCAF
briefing, why a rule exists): ask Matt Kodsi. The git log is unusually
narrative and is the best changelog.*
