# Cycles + OCAF/UAF — design spec (tabled pending McKee confirmation)

**Status (2026-07-16): designed, not built.** Awaiting Mike McKee's confirmation of the
document workflows — the questions are in
`Reference & Research/Process Research/OCAF-UAF-Document-Workflow-Confirmation.pdf`.
Everything below is settled between Matt and the design discussion unless marked **OPEN**.

**Scope:** the app grows from a single-program RCS tool into a multi-cycle renewal tool
covering **RCS**, **OCAF**, and **factor-based UAF** years. Explicitly out of scope:
**UA baselines** (owned by site/property-management teams, never this tool) and **BBRA**
(stays as the greyed "future" pill on the property page — not in the new selector).

Evidence base: the 07-15 McKee training transcript, the OCAF deep-dive
(`Reference & Research/Process Research/OCAF Renewal Process - Deep Dive (Willow Woods 2025).md`),
and three real packages — Colonial Village 2025 (fixed-rate, OCAF+UAF), Village Court 2026
(floating-rate OCAF), Beacon Hill 2025 (OCAF+UAF with a UA decrease) — in
`Reference & Research/Process Research/`.

---

## 1. The cycle data model

The core structural change: a property stops being "one form" and becomes a **property
record plus a list of cycles**.

### Property record = the template
Durable identity only: name, tenant alias, address, FHA/Section-8 #, entity name/type,
GP, POC, signatory, CA block, tenant-notice sender, **debt-service default**, letterhead,
links to the contact directories. The template is what a new cycle is stamped from.

### Cycle = a complete, frozen snapshot
Created by "Start new cycle" on the property page. At creation it **copies the template
in** (durable fields arrive with blue "on file" provenance). From that moment, **nothing
external ever writes into it**: not property-record edits, not other cycles' saves, not
new HUD publications, not API pulls. The only thing that changes a cycle is a person
editing that cycle on screen. Old cycles are therefore historically accurate by
construction — regenerating a 2025 package reproduces the 2025 data.

A cycle owns ALL transient data, and it is the *only* home of that data:
- unit rows (mix, counts, current rents, UAs — including **per-utility UA components**, see §6)
- proposed rents, SAFMR pulls, non-S8 rows, non-rev rows
- OCAF/UAF factors **with their fiscal-year labels and publish dates**
- debt service *as used* (snapshotted from the template default, editable per-cycle)
- program selection, effective/submission dates, checklist, Part B, appraiser
- the generated package (documents produced for this cycle)

**No cycle-to-cycle transient inheritance.** A new cycle's rent data comes from the
executed RS uploaded *for that cycle* (or manual entry) — never from a previous cycle.
This was a deliberate decision: "which older cycle should we pull from" logic is opaque
and error-prone; the uploaded RS is the single, visible source of truth per cycle.

**The one pragmatic exception: letterhead.** It's a multi-MB asset that almost never
changes — it stays property-level and is NOT snapshotted per cycle. Regenerating an old
cycle's tenant notice uses the current letterhead; the stored generated package covers
the rare case where the historical version matters.

### Save routing (the rule that keeps cycles glitch-free)
Every flat key has exactly one home; every write carries the open cycle's id.
- Editing the **property record's own page** → updates the template only, touches no cycle.
- Editing a **durable field inside a cycle** → always updates that cycle; ALSO updates
  the template **only if that cycle is dominant** (below).
- Editing anything in a **non-dominant cycle** → stays entirely inside that cycle
  (historical corrections can never pollute next year's starting point).
- **Auto-fetch-on-open (SAFMR etc.) runs only on the latest/dominant cycle.** On older
  cycles, pulls happen only via explicit button click, landing with provenance labels.

### The dominant cycle (computed, never manually selected)
1. Latest **effective date** wins.
2. Tie → a **rent-setting** combination (RCS or OCAF, with or without UAF) beats UAF-only.
3. Still tied → most recently created.

The dominant cycle: (a) renders elevated at the top of the property page, with all other
cycles listed below it sorted by effective date; (b) is the only cycle whose durable
saves update the template; (c) feeds the property card's summary numbers on the menu.
It wears a badge ("current — sets the property record"); non-dominant cycles show a
quiet note near save ("historical cycle — saves stay here"). No save-time modal, no
manual "mark as current" — creation order never matters, only the rule. (A "pin as
current" override can be added later if a real need appears; don't build it now.)

A freshly created cycle with the latest effective date is dominant immediately even
while empty — harmless (it was just stamped from the template, so its durable saves are
no-ops until edited), and the menu card shows its draft state honestly.

### Cycle cards on the property page
Each cycle renders as an analysis card in the style of today's affordability-proof box:
program chips (e.g. "OCAF + UAF"), year + effective date, status chip, a one-line
derivation summary, the 150% gauge, and per-program metrics (OCAF: published vs.
effective factor, $/yr delta; RCS: lift metrics; UAF: UA before→after per unit type).
**Every cycle type runs the 150% test** — per the transcript, a UA jump can force a
contract-rent change, so even a UAF-only cycle re-proves affordability.

Statuses are **derived, not manual**: Draft / Package generated (+timestamp).
**OPEN:** is a "submitted" state wanted, or does that live outside the tool?

### Migration
Each existing property's current record becomes: template (durable fields) + **cycle #1**
stamped from it (all data). Nothing lost. In the same schema migration, rename
`lihtc_unit` → `ns8_unit` (flat keys `lihtc.*` → `ns8.*`) — the old name reflects an
early misunderstanding (these are non-Section-8 units, not LIHTC-specific). Unit tables
(`unit_type`, `ns8_unit`, `nonrev_unit`) re-parent from `property_id` to `cycle_id`.
The data layer's existing durable/per-cycle key split (`isPerCycleKey` in db.js) is the
seam that becomes the property/cycle routing function.

---

## 2. Program selection

"Start new cycle" → pick the combination:

- **RCS** (the existing flow) — optionally **+ UAF** (**OPEN:** confirm RCS+UAF actually
  occurs in practice; every real example pairs UAF with OCAF. McKee says UAFs "can always
  be done alongside an RCS if desired" — transcript supports the mechanics, but no real
  example yet.)
- **OCAF** — optionally **+ UAF** (the common annual case)
- **UAF only**
- **RCS + OCAF is impossible** (different points in the 5-year contract cycle) — the
  picker never offers it.

The selection configures the form: section rail, visible sections, calculations, and the
generated document list all follow from the combination. BBRA is NOT in this picker.

Timing note (verified): a factor-based UAF is deterministic (existing UA × published
factor — nothing to wait on, nothing that can come back changed), so it can always run
concurrently with an RCS or OCAF. All the sequencing horror stories in the transcript
are about **baselines**, which this tool never touches. Whatever UA number a baseline
year eventually lands on simply arrives in a later cycle via its RS upload or manual
entry, like any other value.

---

## 3. The OCAF calculation (transparent, like the SAFMR gauge)

Follows form HUD-9625's three steps, shown live in the form — not a black box:

1. **Current Section 8 rent potential**: Σ(units × current rent) × 12 = line (F).
2. **The carve-out**: non-S8 potential (H) = **Σ(ns8 rows: units × avg rent) × 12** —
   already-collected data, no new field. Section-8 share (J) = F ÷ (F+G+H). Debt-service
   share (L) = J × K. Operating portion (M) = F − L. Inflate: O = M × published factor (N).
   Adjusted potential (P) = L + O.
3. **Q ≡ P.** The "lesser of P or the RCS comparable" cap on line Q is not applied in
   practice — line Q takes P's value directly (manager's instruction; confirmed in the
   wild: Colonial Village's CA-filled worksheet has Q = P and "RCS Expires: N/A" on the
   letter). This makes OCAF fully self-contained — no RCS-on-file dependency.
   Increase factor (R) = Q ÷ F, applied per unit type, rounded to whole dollars.

The two owner-certified inputs get first-class treatment (surfaced, pre-filled, flagged
for confirmation): **debt service** (K) and **non-S8 potential** (H).

### Debt service
- **Fixed-rate**: near-durable. Lives on the template as the default, snapshots into the
  cycle when used, verified against loan payment history (uploaded as evidence).
- **Floating-rate**: genuinely per-cycle. Methodology (per McKee): **lesser of Chatham's
  trailing-12 and forward-12 SOFR curves, anchored to the rent-effective date**. The
  Village Court amortization workbook (in Process Research/Examples) shows the real
  artifact: sheets "SOFR Forward" / "10-YR UST Forward" / "12-Month Forecasted DS".
  v1: manual entry with the evidence attached. **Future: a Chatham integration** that
  generates the T-12/F-12 comparison. Derivative wrinkles (caps reimbursing interest
  outside the mortgage statement) mean the mortgage-statement number can overstate true
  debt service — the PM wants the *lower* true figure.

---

## 4. The UAF calculation

- **Always per utility type.** Current electric UA × the state's electric UAF; current
  gas UA × the gas UAF; etc. — separately, then summed per unit type. (Not a baseline
  technique — it's how UAF math always works; HUD publishes one factor per utility per
  state.) Confirmed by both real factor-year examples (Beacon Hill: electric ×1.039,
  gas ×0.883; Colonial Village: gas ×0.945, electric ×1.09).
- **Only tenant-paid utilities** get a factor. Utilities marked "included in rent"
  (Part B checkboxes) are excluded — e.g. Village Court: heat/hot water are gas but
  included in rent, so only electric was factored.
- **Rounding rules** (from the Colonial Village CA sheet, citing a HUD FAQ):
  round each utility's result to whole dollars before summing; and each year's base is
  the **higher of last year's rounded vs. unrounded** result.
- **New data requirement**: the RS only carries each unit type's *total* UA — the
  per-utility split lives on the prior UAF sheet/baseline. Cycles must store per-utility
  UA components. (North Cross shows the baseline-year workaround when an approved blended
  number lacks a split — prorate by the proposal's ratio — but that's baseline-only and
  NOT built here.)
- **Decrease detection drives tenant docs** (§5): if any unit type's total UA decreases,
  the 30-day tenant notice + owner's tenant-comment certification are required.

---

## 5. Document matrices

Principle (McKee-endorsed): the app produces **clean, corrected documents of our own**
that CAs accept — not redline edits of each CA's differently-formatted package. The CA's
inbound package is uploaded as the cycle's **source document** (symmetry: RCS report /
CA's auto-OCAF package / executed RS) for reference and number-checking.

### OCAF
| | Document | Notes |
|---|---|---|
| CA provides | Auto-OCAF letter (HUD-9627/9626) | Prospective factor, debt service, election menu |
| | Exhibit A | Prospective per-unit rents |
| | (sometimes a pre-filled worksheet — not guaranteed) | |
| PM produces | Verified 9625 worksheet (official PDF form, signed) | Q≡P; corrected debt service / non-S8 potential |
| | Revised, signed letter | **Election is always box 1** — box 2 ("submitting a Utility Analysis") is baseline-only, even when a factor UAF rides along (proved by both Colonial Village and Beacon Hill) |
| | Revised, signed Exhibit A | **Gets edited** whenever a correction changes the resulting rents (Village Court: $1,403 → $1,400) — matches the corrected worksheet by construction |
| | Debt-service evidence | Fixed: payment history (attached). Floating: the T-12/F-12 lesser-of calc (generated) |
| | Revised Rent Schedule (HUD-92458) | ONE schedule — merged with any concurrent UAF update |
| CA returns | Executed RS + final Exhibit A | Verified on receipt, not edited |

### UAF (factor-based)
| | Document | Notes |
|---|---|---|
| CA provides | Varies: pre-filled certification w/ per-utility breakdown (Beacon Hill's MMAM), or their own UA sheet (Colonial Village's AHSC), or nothing (PM builds it) |
| PM produces | Signed UAF certification/breakdown → CA, always | "Accept the factor adjustment" election (vs. divert-to-baseline — out of scope) |
| | Revised RS with updated UAs → CA, always | Merged with OCAF's schedule if concurrent |
| | 30-day Tenant Notice → tenants, **only if any unit type's UA decreased** | On the property's letterhead; present vs. proposed per BR; reason |
| | Owner's Cert of Compliance with Tenant Comment Procedures → CA, **only if decreased** | Distinct from the notice — attests the notice process was followed |

Conditional slots are **derived** (decrease detected → both tenant docs appear), never a
manual toggle.

---

## 6. Factor sourcing (automation)

- **OCAF — Federal Register API** (better than HUD USER: it's the original publication,
  fully public JSON, no key, no bot protection). Recipe verified live:
  `GET federalregister.gov/api/v1/documents.json?conditions[term]="operating cost
  adjustment factors"&conditions[agencies][]=housing-and-urban-development-department
  &order=newest` → top hit is the current notice; the state table is clean text in the
  notice body (e.g. 2026: Ohio 4.9, Virginia 4.9, national 5.1).
- **UAF — HUD USER static file**: `huduser.gov/portal/datasets/UtilAllow_FY{YY}.xlsx`
  (pattern verified FY15–FY26). HUD USER's "bot protection" is only a User-Agent sniff —
  a browser-style UA header returns the real file (verified: bare curl → empty 202;
  with UA header → valid 531KB xlsx). One data sheet, states × utility-type columns.
  Read server-side in an edge function (like `hud-safmr`), not in the client.
- **Publication lag is a first-class state, not an edge case.** FY factors are published
  irregularly (FY25 OCAF: Dec 11 2024; FY26: Feb 3 2026 — leaving a 33-day window in
  Jan 2026 when "this year's" factor did not exist anywhere). The UI always shows the
  **latest available** table labeled with its FY and publish date; "confirm or override"
  is the normal interaction; **manual factor entry is a first-class path**, not a
  break-glass fallback. Fetch is on-demand (like the SAFMR button), not calendar-based.

---

## 7. Build order (sketch — after McKee confirms)

1. Schema: `cycle` table; re-parent unit tables to `cycle_id`; `lihtc_unit`→`ns8_unit`
   rename; per-utility UA columns; migration (current record → template + cycle #1).
2. Data-layer routing: cycle-scoped saves, template stamping, dominance rule.
3. Property page: cycle cards + Start-new-cycle picker; menu card reads dominant cycle.
4. OCAF section: transparent 3-step calc, factor pull (FR API edge function), debt-service
   inputs + evidence slots.
5. UAF section: per-utility calc, factor pull (HUD USER edge function), decrease
   detection.
6. Generation: 9625 worksheet, revised letter, revised Exhibit A, UAF certification,
   tenant notice + comment certification (conditional), merged RS; floating-rate
   T-12/F-12 evidence sheet.
7. **Document parsing** (RS at minimum) — effectively promoted into this epic: with no
   cycle-to-cycle inheritance, every new cycle means re-entering rents/UA/unit mix until
   parsing lands. **OPEN:** confirmed as in-scope?

## 8. Open questions

1. **McKee confirmations** (the PDF): election always box 1; Q≡P; Exhibit A gets edited;
   Chatham T-12/F-12 methodology + anchor date; per-utility UAF universality; does
   RCS+UAF actually occur?
2. Statuses: Draft / Package-generated enough, or add "submitted"?
3. Parsing in-scope for this epic?
4. Letterhead not snapshotted per cycle — accepted trade-off?
