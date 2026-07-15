# RCS Package Automation

A browser app that assembles the complete **HUD Section 8 fifth-year renewal
package** (Rent Comparability Study cycle) for a portfolio of properties. A
property manager fills a guided, pre-populated form; the app runs the internal
**150% SAFMR affordability test** live and generates the six-document renewal
package plus a Rent Analysis Excel workbook, ready for review and submission.

**Live app:** https://packageautomation.run.place (email + password sign-in;
registration is closed)

## What it generates

| # | Document | How |
|---|----------|-----|
| 01 | Cover letter to the Contract Administrator | Composed from scratch (pdf-lib), Related letterhead |
| 02 | Owner cover letter (10 certifications) | Composed from scratch |
| 03 | Owner's checklist | HUD template PDF, AcroForm fill |
| 04 | RCS report | User-uploaded PDF, passed through |
| 05 | Draft rent schedule (HUD-92458 style) | Template PDF fill: Section 8 rows → "Non- Section 8 Rents" banner → non-S8 rows → non-revenue rows; Parts B/D/G |
| 06 | Tenant notice | Composed; prints ON the property's uploaded letterhead (PDF or image underlay, header height auto-measured), guaranteed one page |
| — | Rent Analysis workbook (.xlsx) | Template patch, 11 unit-type rows, live formulas |

Everything downloads individually, as one combined PDF, or as a zipped
**"RCS Package" folder** containing all of the above.

## Feature highlights

- **Multi-property gallery** with completeness rings, search, and per-property
  letterhead management.
- **Provenance-tracked form**: every cell knows whether its value is on-file
  (blue), pulled this cycle (teal), a new unsaved entry (grey), or an override
  of the stored record (orange) — with per-field save and revert.
- **150% SAFMR test**: unit-weighted gross-rent-potential gauge against the
  ceiling, with a one-click **HUD SAFMR pull** by ZIP (FY-aware, >4BR
  extrapolation per HUD rules) via a Supabase edge function.
- **Contact directories** (PM, appraiser, contract administrator, signatory)
  that autofill whole form sections.
- **Guardrails**: rent-schedule capacity warnings (11 Part A rows, 5 Part D
  rows), zero-unit-count protection, conflict resolution for RS-vs-RCS values,
  unsaved-change exit prompts, surfaced save failures.

## Architecture in one paragraph

The deliverable is a **single self-contained `index.html`** (~2 MB) built by
concatenating the modular source in `app/full-mp/` — no build tooling beyond
`bash app/full-mp/build.sh`. Data lives in a hosted **Supabase Postgres**
database (schema in `schema.sql`) behind email/password auth and row-level
security; the data layer (`db.supabase.js`) is a drop-in adapter over a small,
well-defined interface, so the backend is swappable. PDF generation is fully
client-side (vendored pdf-lib); the Excel workbook is produced by patching an
embedded template with the browser's native zip/inflate primitives — no
spreadsheet library.

## Repository layout

```
index.html                  ← the built app (never hand-edited)
app/full-mp/
  shell.head.html           HTML skeleton + all CSS + the four views
  config.js                 Supabase URL + anon (public) key
  core.js                   keyed-cell store: save/revert/override semantics
  db.js                     pure helpers + legacy localStorage data layer (kept for tests)
  db.supabase.js            Supabase data layer (drop-in adapter)
  app.js                    the whole UI: menu, launcher, form, contacts, generation
  gen.js                    PDF generation (pure: record → bytes)
  xlsx.js                   Excel generation + embedded template
  templates.js              base64 PDF templates (large — do not open in an editor)
  lib/                      vendored pdf-lib + supabase-js
  build.sh                  concatenate source → index.html
  deliver.sh                build + syntax checks + tests (requires Node)
  test_db.js, test_interactions.js, smoke_combined.js
supabase/functions/hud-safmr/index.ts   HUD SAFMR edge function
schema.sql                  full database DDL + RLS
HANDOFF-NAVIGATOR.md        integration guide (written for an AI/engineer)
```

## Running it

- **Use the hosted app** — nothing to install.
- **Self-host**: serve `index.html` from any static host. It needs a Supabase
  project: run `schema.sql`, create a user (disable public sign-up), deploy the
  `hud-safmr` function with a HUD USER API token in Vault, and point
  `app/full-mp/config.js` at your project URL + anon key, then rebuild.
- **Rebuild after editing source**: `bash app/full-mp/build.sh` (writes
  `index.html` at the repo root). With Node available, `bash
  app/full-mp/deliver.sh` also runs the test suites.

## Integrating into another system

Read **`HANDOFF-NAVIGATOR.md`** — it documents the data model (flat-key
dictionary), the exact data-layer interface to implement against your own
database, the generation pipeline, and the known sharp edges.
