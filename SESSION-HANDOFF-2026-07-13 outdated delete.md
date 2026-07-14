# RCS Automation — Session Handoff (2026-07-13)

_Owner: Matt Kodsi (mkodsi@related.com), Related Affordable._
_Purpose: capture the app's state after the clusters 4–5 tranche so the next chat resumes cleanly._

> Operational rules live in `CLAUDE.md` (auto-loads each chat). This file is the working state.

## ▶ Resume here
- **Where we are:** the "design edits" work is organized into **6 clusters** (plan below).
  **All 6 clusters are delivered & verified**, plus the three 2026-07-13 tweaks (§6 SAFMR-note
  alignment · empty-unit no-undo · "Parsed / API" relabel). Only **package generation (batch G)**
  + parsing-dependent items remain. Build is verified reproducible; data-layer tests pass (49/49).
- **Deliverable:** `RCS Renewal — Multi-property (open in browser).html` ·
  md5 `f391bcd21b4b4df6ccddcfef2a28b42a` · 1,663,348 bytes.
- **Status:** all interaction refinements **QA'd and accepted by Matt** (2026-07-13). Write-in Enter-to-save
  confirmed working (his "still jumps" report was a stale browser tab — a hard reload fixed it). No local
  browser/renderer was available to the agent (npm blocked; no chromium/jsdom; Claude-in-Chrome never
  connected), so the pass was **logic-verified** via `test_interactions.js` (34 checks) + Matt's manual QA.
- **Next up (in order):** **package generation** fixes (batch G, `gen.js`). Then update this handoff again.
- **⚠ Get a browser connected if possible.** `test_interactions.js` now covers the save/revert/GROUP
  decisions; the DOM glue (focus target, caret-to-end) is centralized in `renderBody`'s refocus block + the
  input keydown handler and reasoned, not browser-driven.
- **Workflow (IMPORTANT):** edit source **in the sandbox**, never with host `Write`/`Edit`
  (they corrupt files on the mounted folder — CLAUDE.md rule 3). Apply edits with a Python/sed
  patch script (exact-match + uniqueness assert), write to a `mktemp` path (NOT /tmp/<fixed-name>
  — a stale root-owned /tmp/handoff.md bit us this session), `cp` into `app/full-mp/`, then
  `bash app/full-mp/deliver.sh`. Matt QAs in the browser.

## What changed 2026-07-13 (this session) — cluster 6 + three §6 tweaks
All in `app/full-mp/app.js` + `shell.head.html`; built + delivered + verified (49/49, reproducible).
- **§6 SAFMR-note alignment:** `.urnotes` is now a grid mirroring `.ucells`; notes+metric sit in
  `.urnsub` (grid-column 6/8) so the 150% SAFMR note starts under the SAFMR column and the
  rent-increase metric is pushed right (`margin-left:auto;padding-right:24px`) — near the right but
  not flush. `unitCard` reordered to `${notes}${metric}`. (padding-right is the one knob to tune.)
- **Empty-unit no-undo:** `[data-delunit]` skips the undo stack when `!unitHasData(i)&&num_units<=0`
  ("Empty unit type removed."); still offers undo when the unit had data.
- **"Parsed / API" relabel:** source-key legend (shell.head.html) + `CLR` label. Confirmed green is
  DERIVED from parsed/API source-values at render time (`uaBox`/`safmrBox`/`dateEffCell`
  `state=hasAny?'this-cycle':'new'`), so it persists across save/exit — not cycle-specific.
- **Cluster 6 (interaction model):** new module state `_pending`/`_refocusSel` + helpers
  `commitPending()` and `revertCellIfOver()`. #5 Esc closes an open dropdown (trigger stops
  propagation so no exit) / reverts an overridden focused cell; #6 darker `.uaopt.hl` (#c7d2ee) +
  reliable arrow-nav + Enter-select with scroll preserved across `renderBody`; #7 Enter after a
  dropdown/checkbox/fuel/POC change commits that field (click OR Tab elsewhere cancels the pending);
  #8 save/revert buttons excluded from tab order (`tabindex=-1` in `wireBody`), focus restored to the
  changed cell after a KEYBOARD selection (guarded by `!_mouseFocus`); #11 Enter-to-save now also
  fires for NEW address groups (CA + all) via `grpNewHasVal`. Removed the trigger focus→auto-open
  (it re-opened after select).

### Follow-up tweaks (same session, post-QA feedback)
- Checkbox revert/save (↺/✓) moved next to the label (`.cb .ovic` was pinned far-right).
- Rent-increase metric moved under the Proposed-rent column (`.urnmetric` grid-column 4); SAFMR note stays under SAFMR.
- **Esc reverts the LAST change** (checkbox/fuel/dropdown too) via `_pending`→`revertPending()`; a click OR Tab elsewhere cancels it. Focus restored to the reverted cell (`closest('[data-box],.cb,.wi')` + `refocusSelForKey`); checkboxes get a `:focus` ring.
- **Saved toggles fix:** `fixSavedToggles()` (after every form load — openForm/bFill/discard) makes a saved-but-empty checkbox/fuel reload as `database` (db_value set) not `new`, so an intentionally-unchecked saved box is blue and toggling reads as an override (orange). `boxStyle` unified to border+bg+color from `CLR`.

## The 6-cluster plan (recovered from prior transcripts — do not lose)
Maps the `Revisions.md` "Form notes" items to clusters (numbers = Matt's item order in the
Cluster 1-2 triage):
1. **Calc verification** (#1 SAFMR/affordability weighting) — done (aggregate 150% gross test
   reproduces the Colonial Village manual package to the dollar; SAFMR field holds the **150%
   value directly**, no internal x1.5; per-type over-cap flag added).
2. **Simple/isolated** (#2 §4 2x2 reorder, #3 appraiser address, #9 checklist defaults,
   #13 checkbox no-wiggle, #14 square fuel boxes) — done.
3. **Section 6 unit cards** (#15 drop unit-type header, #16 source auto-fallback, #17 remove
   misleading reset buttons, #18 clearable BR/BA, #19 prune count-less rows on save) + provenance
   colors (fuel chips + checkbox checkmarks colored by source) + undo-delete stack — done.
4. **Provenance / custom-entry** (#10 edit-in-box, #4 use-property-address override) — done THIS SESSION.
5. **Formatting overlays** (#12 live date mm/dd/yyyy + money commas) — done THIS SESSION.
6. **Interaction model** (#5 Esc, #6 dropdown arrow-nav, #7 Enter-saves-after-dropdown/checkbox,
   #8 Tab order, #11 Enter-to-save in address cells) — DONE 2026-07-13.

## What changed this session (clusters 4 & 5)
All in `app/full-mp/app.js` + one CSS line in `shell.head.html`; built + delivered + verified.
- **#10 edit-in-box (cluster 4):** the multi-source cells (UA, 150% SAFMR, Date rents effective)
  now render their resolved value as an **editable input** (class `uac-in srcedit`, neutral grey
  dashed underline) with the source tag beside it (`· Executed RS` / `· HUD` / `· from RS`).
  Typing flips `*_source` -> `custom`, writes to `*_custom`, drops the tag, re-renders once (focus
  restored to the custom input). The `▾` dropdown + **Custom…** option remain as the alternative.
  Handler: new `document.querySelectorAll('.srcedit')` block in `wireBody` (just after the
  `.uac-in,.mgmt-in` stopPropagation line). Render sites: `uaBox`, `safmrBox`, `dateEffCell`.
- **#4 use-property-address override (cluster 4):** in `mgmtCell` property-mode, when
  `srcOf('tenant.mgmt_source')==='overridden'` (a custom mgmt address was saved and the user clicked
  "↺ use property address"), the cell paints **orange** and shows the `ovIcons` (↺ revert / ✓ save)
  combo instead of snapping to blue. Revert restores the saved custom source. (Deliberately NOT in
  `overrideCount` — mgmt_source stays in `isStateKey` — to avoid the old phantom-count issue.)
- **#12 formatting overlays (cluster 5):** added `cleanNum`, `fmtMoney` (comma grouping),
  `fmtDateInput` (mm/dd/yyyy) near `fmtPhone`; changed `fmtDate` to `mm/dd/yyyy` (was mm-dd-yyyy).
  `moneyBox` renders `fmtMoney(get(k))` + `data-money="1"`; the generic input handler formats live:
  `data-money` -> commas (stores CLEAN digits), `data-date` -> mm/dd/yyyy. UA/SAFMR custom inputs got
  `data-money`; date-eff custom got `data-date`. **Storage stays clean** so `gen.js` (strips
  non-digits via `nmv`; accepts mm/dd/yyyy via `_toISO`) is unaffected.

## DONE 2026-07-13 — two §6 sub-line tweaks + "Parsed / API" relabel  (spec kept below for the record)
Both live in `app.js` `unitCard`/`renderRents` + `shell.head.html`.
1. **SAFMR-note alignment.** Today the sub-line `<div class="urnotes">${metric}${notes}</div>` is
   `display:flex;justify-content:flex-end` -> everything pinned to the far right, hard to read.
   Matt wants the **150% SAFMR note** ("✓ $1,850 < $2,085 · 150% SAFMR") to **start at the left edge
   of the "150% SAFMR" column**, and the **rent-increase metric** ("+$703 / unit · +61%") to come
   **after it, spaced out, toward the right but NOT flush** to the margin.
   -> Reorder to `${notes}${metric}` and align the sub-line under the SAFMR column. Row grid:
   `.rgh,.ucells{grid-template-columns:1.5fr .7fr 1fr 1fr 1.25fr 1.25fr 30px;gap:8px 14px}`
   (SAFMR = col 6 of 7). Cleanest: make `.urnotes` a grid mirroring `.ucells` with an empty cell
   spanning cols 1–5 and the notes+metric in a cell spanning cols 6–7 (starts exactly under SAFMR,
   flows left->right). Keep the `<span class="ucmetric" data-metric="i">` element — the live-update
   handler patches its text via `[data-metric]`.
2. **No undo for an empty unit.** In the `[data-delunit]` click handler (in `wireBody`), if the
   deleted unit is genuinely empty — `!unitHasData(i) && numf(get('units.'+i+'.num_units'))<=0` —
   delete its keys and filter `UNITS` but **skip** `_undoStack.push(...)` and the "undo available"
   status (show e.g. "Empty unit type removed."). Only offer undo when the unit had data.
   (`unitHasData` exists ~L437; covers br/ba/current/proposed/ua_*/safmr_*.)

## DONE 2026-07-13 — cluster 6 (interaction model)  (spec kept below for the record)
`app.js` (`wireBody` dropdown keydown ~L308–320, global keydown ~L344, input keydown ~L298) +
`shell.head.html` (`.uaopt.hl`, tabindex):
- **#5** Esc closes an open dropdown (not exit-form); Esc in an overridden cell = revert to saved.
- **#6** Enter selects the highlighted option without page jitter; reliable arrow-key nav; darker
  highlight for visibility on all screens.
- **#7** Enter saves after a dropdown/checkbox/fuel change; a click elsewhere cancels that pending
  save. Needs a "last action" tracker.
- **#8** Seamless Tab; exclude save/revert buttons from the tab order; Tab progresses after a
  dropdown/save.
- **#11** Enter-to-save in CA address and all address cells, for new AND overridden.
(Partial keyboard scaffolding already exists in the `.uatrigger` keydown: arrow nav, type-to-search,
Enter-to-select, Backspace/Delete-clear, Esc/Tab close. Build cluster 6 on top of it.)

## DONE 2026-07-13 (later) — interaction refinements & polish  (spec kept below for the record)
All in `app.js` + one `shell.head.html` CSS line; built + delivered + verified (49/49 data-layer,
**34/34 `test_interactions.js`**, reproducible byte-for-byte, 0 NUL). **md5 `306a903f2b878dde29dd19fcd1928719`.**
What shipped:
- **Background** `#eef1f7`→`#e4e8f1` (body bg) — slightly deeper, still a light neutral (one-knob tweak).
- **Unified esc/enter model:** new `fieldKeys()` (a cell's save/revert GROUP: address=4 keys, write-in=
  label+.on[+fuel], else [k]) + `keysCanSave/Revert/NewDirty()` + `_pendingSnap` (snapshot of pre-change
  cells). Enter = save this field's group; Esc = revert an overridden cell to on-file OR clear a brand-new
  entry; click/Tab elsewhere cancels a pending discrete pick. Snapshot lets Esc undo NEW dropdown/checkbox/
  fuel picks too, not just overrides. `commitPending` + `revertPending` now BOTH set `_refocusSel`
  (`refocusSelForKey`) → fixes the checkbox/dropdown focus "float" on Enter-commit.
- **Write-ins:** Enter saves label+checkbox TOGETHER (was label-only → still looked unsaved); Esc reverts
  (saved) or clears (new); focus returns to the write-in input via `[data-k=...]` (the old
  `[data-box=...]`-only selector matched nothing on write-ins = the reported float).
- **Caret-to-end** after every text revert — `renderBody`'s refocus block does `setSelectionRange(len,len)`
  on the refocused input (was landing at index 0).
- **Unit-type clear** (BR/BA clearable Backspace/Delete) now arms `_pending`+`_pendingSnap`+`_refocusSel`
  → Esc reverts the clear (and keeps focus on the trigger) instead of falling through to exit-form.
- **Non-rev order:** now **Unit type → Use** (swapped the `renderRents` pd grid headers AND the
  `brbaBox`/`numBox` cell order) to match the revenue section.
- **Behavior note (revisit if unwanted):** Esc while focused in a text field with an unsaved edit now
  reverts/clears and STAYS (never exits the form mid-edit). A *clean* field's Esc still backs out (unchanged).

### Follow-up (same session, 2nd QA pass) — md5 `306a903f2b878dde29dd19fcd1928719`
- **No more jitter on Enter-save.** All programmatic refocus (renderBody's refocus block, srcedit, arrow-nav)
  now uses `focus({preventScroll:true})`, so the save→re-render→refocus cycle no longer scroll-bounces.
- **Deleting BA no longer jumps to BR.** csDrop triggers now carry `data-trigfor="<key>"`; the clear handler
  and csopt selection refocus that EXACT trigger (`[data-trigfor=...]`), and `refocusSelForKey` targets it too.
- **Arrow-key nav in composite cells.** New `wireArrowNav()` wires ←/→ to move between sub-boxes in multi-
  control cells (`.fbox/.rbox` with ≥2 focusables, excluding `.uacell`): address street/city/state/zip,
  BR/BA, prefix+name, POC name+pick. For text inputs it only jumps at the caret edge (so ←/→ still move the
  caret mid-text); triggers move freely (closing an open menu first). Lands caret at the near edge.
- **Backspace/Delete clear now works on ALL type-only dropdowns**, not just BR/BA — the keydown gate changed
  from `.clearable` to `.cs` (every csDrop: state, prefix, entity, BR, BA). Arms `_pending`+snapshot so Esc
  reverts the clear. (The ✕ button stays only on BR/BA to avoid crowding the narrow state/prefix boxes.)
- **Non-rev grid tightened.** `.pdgrid` now `180px 180px 130px 40px` + `justify-content:start` — unit-type
  cell matches the revenue width, Use/Contract-rent pulled left, empty space after the rent column.

### Follow-up (3rd QA pass) — md5 `619de47148af7ab8bbb62799967d0055`
- **Enter no longer jumps the page.** Root cause was NOT focus-scroll (that was fixed w/ preventScroll) — it
  was layout shift: saving clears an override, the amber attention banner + command bar shrink, everything
  below moves up, and restoring the same absolute `scrollY` left the focused cell visually displaced.
  `renderBody` now measures the focused cell's viewport top BEFORE the innerHTML rebuild and re-pins it to the
  same top AFTER (`_anchorSel`/`_anchorTop` → `scrollTo(0, scrollY+(newTop-oldTop))`). Cell stays put on Enter.
- **Non-rev section realigned to the revenue grid.** Dropped the standalone `.pdgrid` (was cramped 180px cols);
  the non-rev header is now a `.rgh` and each row a `.pdrow`, BOTH using the revenue 7-col template
  (`1.5fr .7fr 1fr 1fr 1.25fr 1.25fr 30px`, gap 8px 14px). Cells placed by `grid-column`: Unit type=1 (aligns
  TYPE), Use=2/4 (spans Units+Current), Contract rent=4 (aligns Proposed), trash=7. Columns 5–6 stay empty →
  breathes, aligned with the revenue rows above.

### ✅ Matt QA confirmed (2026-07-13) — + browser still not wired to the agent
- **Write-in Enter-to-save CONFIRMED working.** The earlier "Enter still jumps / doesn't save on write-ins"
  report was a **stale browser tab** — hard reload (Ctrl+Shift+R) / reopen fixed it. Lesson for next time:
  after every delivery, tell Matt to reload the file; a cached tab shows old code and mimics a regression.
- **Write-ins: LEAVE AS-IS.** Matt said they "work well now" and does NOT want them restyled to match the
  other cells' colored border / under-bar revert. Do not "fix" write-in provenance styling.
- **Accepted this session:** background darken, unified esc/enter + `_pendingSnap`, write-in group save/revert,
  caret-to-end, unit-type clear-revert, non-rev order+alignment, arrow-key nav in composite cells, Backspace/
  Delete-clear on all type-only dropdowns (state/prefix/entity/BR/BA), and the Enter jump-pin. md5 `619de471…`.
- **Chrome still NOT reaching the agent:** extension installed but `list_connected_browsers` returns [] on
  every check. Needs an explicit connect/enable step in the extension popup on a normal https tab (not
  file:// or the Web Store). Until connected, QA stays manual (Matt) + `test_interactions.js`.

### Follow-up (5th pass) — coupled source-selector saves — md5 `f391bcd21b4b4df6ccddcfef2a28b42a`
Bug (Matt): in the tenant-notice management address, after a custom address is SAVED, clicking "↺ use property
address" went straight to blue instead of orange+save/revert. Root cause = the save paths persisted the four
address fields (`MGMT_ADDR`) but NOT `tenant.mgmt_source`, so on-file source stayed `property` and switching
back read as no-change. Matt: "same for anything else behaving that way" → generalized to all decoupled
source-selectors.
- New `coupledKeys(k)`: a custom-value key drags its `*_source` sibling — `units.i.ua_custom→ua_source`,
  `units.i.safmr_custom→safmr_source`, `rent_schedule.date_eff_custom→date_eff_source`. Applied to the
  `data-save1` (✓) and `data-rev` (↺) handlers and the input-keydown Enter-save so saving/reverting a custom
  value now also saves/reverts its source (fixes the same phantom-override / blue-skip for UA/SAFMR/date).
- `data-save1addr`/`data-revaddr` and the Enter-save now also save/revert `tenant.mgmt_source` when the box is
  `tenant.mgmt`. So: enter a custom mgmt address → save → mgmt_source persists as `custom`; "use property
  address" → OVERRIDDEN (orange + ↺/✓); ↺ restores the saved custom, ✓ commits property.
- Verified: `test_interactions.js` now 43 checks (added coupledKeys + the mgmt override + a UA switch-after-
  saved-custom case). Reproducible, 0 NUL, 49/49 data-layer.

### Punch-list from QA of cluster 6 (original spec, kept for the record)
Intuitive navigation + save/revert is CRITICAL — permutation pass across every cell type.
1. **Form background too light.** Body bg `#eef1f7` (`shell.head.html` `body{...}`) washes out vs the
   white content boxes on Matt's work monitors. Darken *slightly* for separation — NOT so dark it reads as
   a colored form (try ~`#e4e8f1`/`#e1e6f0`; check against white `.card`/`.ccard`/`.pcard`).
2. **Write-in (§7) enter/esc broken.**
   - Deleting a write-in's text then enter/esc does nothing — the "uncheck-when-empty" logic in the
     write-in `input` handler (clears `.on` when empty; `.witext` carries `data-wion`/`data-util`) is
     stealing/exiting the selection. Reconcile empty-uncheck with enter-save / esc-revert.
   - After typing a value, enter/esc don't *always* work.
   - Enter/esc drops focus (selection "floats") — write-ins need the same `_refocusSel` treatment
     (`[data-k="partb.writein.X"]`), like other cells.
   - When esc reverts text, the caret jumps to the START — set caret to END after refocus
     (`setSelectionRange(len,len)` on the refocused input). Apply to ALL text reverts, not just write-ins.
3. **Unit-type box esc-revert.** Esc does NOT revert deleting a unit-type (BR/BA) value — it just exits.
   Delete is via the clearable `csDrop` (Backspace/Delete clears). Make esc revert that clear (treat the
   clear as the "last change" so `_pending`/`revertPending` catches it, or handle esc in the clearable
   `.uatrigger` keydown).
4. **Non-revenue units order.** Lead with **Unit type** then **Use** (currently Use then Unit type) to
   match the revenue section. In `renderRents()` `pd` grid: swap the `Use`/`Unit type` headers AND swap
   `${numBox('nonrev.'+i+'.use',...)}` with `${brbaBox('nonrev.'+i+'.br','nonrev.'+i+'.ba')}`.
   (Requested earlier in `Revisions.md`, never done.)
5. **Full esc/enter audit.** Every cell type — text, phone, money, address (street/city/state/zip),
   dropdowns (state/entity/POC/BR/BA/UA/SAFMR/mgmt/date), checkboxes, fuel, write-ins: verify
   navigate→change→Enter saves; →Esc reverts (the last change AND a navigated-to overridden cell);
   →click/Tab-away cancels the pending; focus stays ON the cell; caret at END after a revert. Fix all
   inconsistencies. **Browser testing required.**

## NEXT UP — package generation (batch G, `gen.js`; NOT STARTED)
From `Revisions.md` "Form generation comments":
- **RS doc (HUD-92458 `fillRentSchedule`) rent totals read zero** — audit. Monthly/Yearly Contract &
  Market Rent Potential + non-rev rent-loss. Re-check that field IDs (94a/95/96 and per-row
  base+2/base+3/base+5) map to the template's ACTUAL AcroForm field names; `tc=Sum(n*pro)` is
  computed but may be writing to the wrong field names.
- **Part B overlapping checkbox glyphs** — two checkboxes overlaid; fix field mapping/positions.
- **Appendix 9-2-2 (owner's checklist) template** needs replacing with Matt's NEW form (he will
  provide the file). Handle carefully — "you cannot keep corrupting it." (`fillChecklist` fills
  `Check Box1..17`, `Property Name`, `Date`, draws the signatory line.)
- **Uploaded RCS report** (section 1) must be included in the combined PDF and as its own doc **04**
  (pass-through of the uploaded file — no generation). `genPackage` doesn't add it yet; depends on
  the upload/parse layer storing the bytes (parsing-dependent).
- **Tenant notice fallback letterhead:** if no property letterhead on file, generate a property-
  specific one (Related logo centered, property name + address below) + a **warning** next to
  "Generate package" and in the file-list modal. (`tenantNotice` already has a no-letterhead header
  fallback — verify it matches this spec; add the warning UI.)
- **Confirm UA source** feeding the generated docs = whichever is selected in the form.
  (`fillRentSchedule` reads `ua_source` exec/rcs/custom — confirm it matches the form's resolved UA.)

## Verification (this session)
- `deliver.sh` green: syntax OK · **test_db.js ALL 49 CHECKS PASSED** · built 1,653,046 bytes ·
  delivered · cmp-verified.
- Source **rebuilds byte-for-byte** to the shipped deliverable. **0 NUL bytes** in every source file.
- Formatter unit checks pass (fmtMoney: 2725->"2,725", 149195->"149,195"; fmtDateInput:
  09012026->"09/01/2026").

## Hard-won lessons (also in CLAUDE.md + memory)
- **Edit source in the sandbox, not host tools.** Host `Edit`/`Write` corrupt files on this mounted
  folder (tail truncation / trailing NULs). Use a sandbox patch script; verify `cmp` + `node --check`.
- **Sandbox /tmp can hold stale root-owned files** — write temps with `mktemp`, not fixed
  `/tmp/<name>` paths (a leftover `/tmp/handoff.md` silently no-op'd a copy this session).
- **Don't overload one turn.** Prior chats "buffered out" doing multiple clusters + rebuilds at
  once. One cluster/tranche per turn, rebuild once, hand off for QA.
- **Prune stray unit types by unit count**, not "empty". SAFMR field holds the **150% value directly**.

## Deferred / needs the parsing layer (unchanged)
HUD SAFMR API · AI parsing of §1 uploads · CA + appraiser + community-manager stored contacts ·
"Re-parse this section" button (§2/§3/§5/§6/§7) · Navigator integration · pre-generation discrepancy
warning page · include the uploaded RCS report in output (needs stored bytes).
