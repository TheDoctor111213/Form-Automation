# Navigator as a data source — feature spec (addendum to HANDOFF-NAVIGATOR.md)

This is the piece the original handoff did not cover: **which form cells pull
from Navigator's saved property data, and how**. It was left out deliberately —
the Navigator APIs live on your side, so the wiring was always going to be
yours. This document specifies the intended behavior precisely so the feature
lands consistent with everything the app already does. Nothing here is
implemented yet; the app in the package is unmodified.

## 1. The governing principle: Navigator is a *source*, not the store

Navigator data must flow into the form **exactly the way the other external
sources do** — the parsed RCS report, the parsed executed Rent Schedule (RS),
the HUD SAFMR API, and the saved contact lists. That pattern, already fully
built and visible in the code, is:

- A sourced cell holds **one flat key per source** (e.g. UA keeps
  `units.{i}.ua_exec`, `units.{i}.ua_rcs`, `units.{i}.ua_custom`) plus a
  `*_source` selector key. Add Navigator values the same way (new `*_nav`
  keys or a `nav.*` namespace — mirror the existing naming).
- The cell renders as a **dropdown listing every source's value**, each
  labeled with its origin (`$21 · Executed RS`, `$25 · RCS report`,
  `Custom…`). Every sourced value is always selectable by the user, forever —
  precedence only controls the *default*.
- **Sourced options sit at the top of the dropdown**, listed in precedence
  order, followed by `Custom…` / manual entry. In dropdowns that also carry a
  static option list (State's 50 abbreviations, entity types, the contact
  pickers), the sourced values go **above** the static list, visually
  distinguished by their origin label — the user should see what the
  API/parse/Navigator pulled before anything else.
- **Precedence = which present source is picked by default** (see the table
  in §3, written as 1st pick > 2nd pick > 3rd pick). The reference
  implementation is `defUaSrc()`/`uaBox()` in `app.js` — copy that cell
  wholesale; it is the canonical multi-source cell.
- **A missing source is an empty option, never an error.** If Navigator has
  no value for a cell (or the Navigator call fails entirely), the dropdown
  shows it as `— · Navigator` and the default falls through to the next
  source in precedence — identical to how the app behaves today when the
  RCS/RS was never parsed or the HUD pull didn't go through. No blocking, no
  warning modal; at most a status-bar note like the HUD pull's.
- Sourced values carry provenance `this-cycle` (teal) — the same rendering
  HUD-pulled SAFMRs get. User edits on top of them follow the normal
  override/revert semantics; nothing new to build there.
- **The form never writes back to Navigator.** Navigator keys are read-only
  inputs: exclude them from any push back to Navigator's systems. Saving the
  property stores a *snapshot* of the Navigator values in this app's own
  database (so the form still works when Navigator is unreachable), and a
  fresh fetch on form-open refreshes the snapshot — the same
  fetch-on-open + cache pattern as `ensureHudSafmr()`.

**Do not disturb the standalone dropdowns.** Cells that already have their
own dropdown for unrelated reasons — the State selectors, the POC / appraiser
/ CA / signatory contact pickers, BR/BA pills, entity type — keep their
existing behavior. Where such a cell also gains Navigator sourcing (e.g. POC),
the source feed *fills values into* the existing mechanism; it does not
replace the widget.

## 2. Property creation: pick-or-type from Navigator's portfolio

The "New property" dialog's name input becomes a **combobox**:

- Below the input, show the full list of properties pulled from Navigator.
- Typing acts as a **live search filter** over that list — each character
  narrows the options (match anywhere in the name, case-insensitive).
- The user can **either** select a Navigator property **or** keep typing and
  create a free-named profile exactly as today. Selecting one uses its name
  and — critically — stores its **Navigator property id** on the new record.
  That id is what every later per-cell Navigator pull keys off; add a
  `navigator_property_id` column to the `property` table. A free-typed
  property simply has no id and all its Navigator options read `—`.
- The app already contains the interaction pattern to reuse: the
  `.uadrop/.uamenu/.uaopt` dropdown with type-ahead highlighting in
  `wireBody()`'s trigger keydown handler, and the dialog scaffold in
  `dialogInput()`.

## 3. Source list per cell (order = 1st pick > 2nd pick > 3rd pick)

Anything not listed has no external source and stays as it is today (manual
entry, defaults, or contact pickers). "RS" and "RCS" below refer to the parsed
executed Rent Schedule and parsed RCS report — parsing is still a stub in the
app, but the plumbing conventions (`*_rcs` keys, `*_source`, `*_reviewed`,
conflict chips) already exist; Navigator should be built as a sibling of
those, so all three light up uniformly as parsing lands.

### Section 2 — Property

| Cell | Precedence | Notes |
|---|---|---|
| Property name | **Creation input > Navigator > RCS** | The name typed/picked at creation always trumps. If created by picking from the Navigator list, creation input and Navigator agree by construction. |
| Property address | **Navigator > RCS** | Street/city/state/zip as a group; State keeps its standalone dropdown. |
| FHA / Section 8 # | **RS > Navigator > RCS** | The app stores one combined field (`property.fha`), matching the single field on the HUD rent-schedule form. If Navigator carries the FHA project number and the Section 8/HAP contract number separately, feed the **contract number** — that is what the generated documents use. |
| Ownership entity name | **RS > Navigator** | |
| Entity type | **RS > Navigator** | Keeps its standalone dropdown; sourced value pre-selects an option. |

### Section 3 — Point of contact & signatory

| Cell | Precedence | Notes |
|---|---|---|
| Point of contact | **Navigator > RCS** | When a sourced POC name matches a saved PM contact (case-insensitive trim match on name), auto-fill email + phone from that contact — the same enrichment the contact picker does. The existing PM-contact picker dropdown is untouched. |
| General Partner | **RS** | |
| Signatory name | **RS** | Signatory contact picker untouched. |
| Signatory title | **RS** | |

### Section 5 — Appraiser

All five cells (company, address, name, email, phone): **RCS only.** No
Navigator involvement. Appraiser contact picker untouched.

### Section 6 — Rents & unit mix

| Cell | Precedence | Notes |
|---|---|---|
| Date rents will be effective | **RS (+1 year)** | The sourced option is the executed RS's effective date advanced exactly one year (the renewal anniversary). The cell's existing RS/custom dropdown already models this — the +1-year adjustment happens when the RS value is captured. |
| Unit type (BR/BA), unit count, UA | **RS > RCS** | **Already fully plumbed**: `units.{i}.br/ba/num_units` (RS-side) vs `*_rcs` counterparts, `ua_exec` vs `ua_rcs`, with source selectors, review flags, and conflict chips. No Navigator feed. |
| Current rent | **RS** | |
| Proposed rent | **RCS** | |
| Non-revenue producing units | **RS** | |
| SAFMR (150% ceiling) | **HUD API > RCS** | **Already implemented** (`safmr_hud` / `safmr_rcs` + selector + conflict review). |

### Section 7 — Items included in rent (Part B)

Everything: **RS.** (Checkboxes, fuel types, write-ins.)

### Tenant notice section

| Cell | Precedence | Notes |
|---|---|---|
| Sender name | **Navigator, or the Property Contacts excel** | These two should hold the same data — treat whichever you wire as one source. Falls back to manual entry as today. |

## 4. Implementation pointers (for whoever builds it)

1. **Copy the UA cell.** `uaBox()` + `defUaSrc()` + the `data-uaopt` click
   handler + `coupledKeys()` in `app.js` are the complete reference for a
   multi-source cell: per-source keys, default-by-precedence, dropdown with
   labeled options, inline `srcedit`, custom entry, provenance tint.
2. **Fetch like HUD.** `ensureHudSafmr()` shows the lifecycle to imitate:
   fetch on form open (and on relevant key changes), cache per key, apply
   values as `this-cycle`, keep quiet on failure except a status-bar note,
   never block the form.
3. **Storage.** One column per Navigator-sourced field (the way
   `safmr_from_hud` sits beside `safmr_from_rcs` in `unit_type`), plus
   `navigator_property_id` on `property`. Update the flat-key↔column maps in
   the data layer (`PSCALAR` etc.) accordingly. Navigator snapshot columns are
   written by the app's normal save (they're part of the record) but are never
   pushed toward Navigator.
4. **Defaults must re-evaluate when sources appear.** If Navigator data
   arrives after the user opened the form (slow API), apply it exactly as the
   HUD pull does: fill the `*_nav` keys, re-render, and let the default-pick
   logic choose it only where the user hasn't chosen or typed something
   already (never clobber a user's explicit selection or override).
5. **Capacity/consistency guards are source-agnostic** — `rsCapacity()`,
   the zero-unit protections, and the 150% test all read the resolved values,
   so Navigator-sourced data flows through them with no changes.

## 5. Acceptance checklist

- Every cell in §3 shows its Navigator/RS/RCS values as dropdown options with
  origin labels, **at the top of the list in precedence order** (above any
  static options); missing sources read `—` and are skipped by the default.
- Precedence order matches §3 exactly; the user can always pick any listed
  source or type a custom value; existing standalone dropdowns still work.
- Navigator outage or a property with no `navigator_property_id` degrades to
  today's behavior everywhere (no errors, manual entry works).
- New-property dialog lists Navigator properties, filters as you type,
  allows free-typed names, and records the Navigator id on selection.
- Nothing the form does ever mutates Navigator's data.
