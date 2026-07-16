# RA port (Kinley / Azure) — the anchor contract

Kinley's integration (received back 2026-07-16, reference copy in
`_archive/Kinley/ra-port-2026-07-16/`, kept out of git) treats this folder's
sources as **pristine** — he never edits them. His `build-ra.py` concatenates
them and applies **assert-guarded, in-memory patches** to swap the backend:

- drops `lib/supabase.min.js` + `config.js` + `db.supabase.js`, adds `db.cosmos.js`
- patches `app.js`/`shell.head.html`: Supabase auth → App Service Easy Auth (Entra),
  `makeSupabaseDb` → `makeCosmosDb`, the HUD SAFMR edge function → `/api/hud-safmr`,
  and wires our `window.NavigatorSource` seam to his AUM master registry
  (`aumIndex()`/`aumValue()` on the adapter — read-only; nothing writes back to AUM).

Every patch asserts **exactly one match**, so if a seam string in our sources
moves, his build fails loudly instead of silently shipping a broken port.

## What this means for us (the contract)

**`db.cosmos.js` and `build-ra.py` in this folder are the hand-back copies** —
updated by us whenever our changes move an anchor, and included in every source
drop we send him. They are NOT part of our own build (`build.sh`/`deliver.sh`
ignore them; our app still builds and ships on Supabase, unchanged).

**Post-edit gate** (add to the usual rebuild/NUL/syntax checks): after touching
`app.js` or `shell.head.html`, run

```bash
python3 app/full-mp/build-ra.py /tmp/rcs-ra-check.html
```

It must print `built … bytes`. If an assert fails, an anchor moved — update the
patch in `build-ra.py` to target the new text (keep the replacement's intent),
re-run, and mention it in the commit message so the change travels with the
next handoff.

## Current anchors in app.js / shell.head.html (don't move casually)

1. shell: the `#viewAuth` sign-in card markup (replaced with the RA access panel)
2. `mpdb=await makeSupabaseDb(supaClient);` (adapter swap + NavigatorSource injection)
3. the `supaClient.functions.invoke('hud-safmr'…)` block + its no-client guard
4. the `showAuthScreen` function body, the `bSignOut` handler, and the
   `DOMContentLoaded` boot block
5. the create-dialog OK handler (`const r=mpdb.createProperty(v);` … `void pickedId;`)
   — the RA patch passes `pickedId` (the picked AUM RAID) into
   `createProperty(name, raMasterId)` for read-only prefill

Note on escaping: `build-ra.py` is Python — any literal `\uXXXX` text inside our
JS (e.g. in comments) must be written double-backslashed in its anchor strings.

## Divergence status (2026-07-16)

His returned sources = our commit `669f875` exactly (app.js/shell byte-identical;
core/db/gen/xlsx/templates/tests identical to current). Our later commits
(`616f863` Navigator sourcing UI, `d915338` menu restyle) are what his copy is
missing — the updated `build-ra.py` here already targets them, so sending him
the current folder + these two files is a complete, verified handoff.
