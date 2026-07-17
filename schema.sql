-- RCS Package Automation — database schema (exported from the live Supabase
-- project on 2026-07-15; matches db.supabase.js's column maps exactly).
--
-- Design notes for porters:
--  * Money/count columns are INTEGER and date columns are TEXT deliberately:
--    the app stores every value as a string ('1850', '2026-09-01' or a custom
--    'mm/dd/yyyy') and round-trips it verbatim. Text dates avoid timezone
--    drift; integer rents match the app's whole-dollar handling.
--  * ''-vs-NULL matters: the client writes NULL for cleared cells and the
--    loader treats NULL as "no record". Empty-string values are preserved.
--  * Every table is scoped to one user via owner_id + RLS. In a multi-tenant
--    Navigator integration, replace owner_id/auth.uid() with your own tenant
--    scoping — nothing in the client depends on the column beyond the default.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- property --
-- One row per property: durable identity/contacts/addresses/letterhead plus
-- the current cycle's dates+appraiser, and two fixed-shape JSONB blobs
-- (Part B equipment/utilities/services; the 17-item owner's checklist).
create table public.property (
  id                          uuid primary key default gen_random_uuid(),
  owner_id                    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name                        text,
  fha_section8_no             text,
  address_street              text,
  address_city                text,
  address_state               text,
  address_zip                 text,
  entity_name                 text,
  entity_type                 text,
  general_partner             text,
  owner_poc_name              text,
  owner_poc_email             text,
  owner_poc_phone             text,
  signatory_name              text,
  signatory_title             text,
  ca_org                      text,
  ca_contact_prefix           text,
  ca_contact_name             text,
  ca_contact_title            text,
  ca_address_street           text,
  ca_address_city             text,
  ca_address_state            text,
  ca_address_zip              text,
  tenant_sender_name          text,
  tenant_sender_title         text,
  tenant_mgmt_source          text,          -- 'property' | 'custom'
  tenant_mgmt_address_street  text,
  tenant_mgmt_address_city    text,
  tenant_mgmt_address_state   text,
  tenant_mgmt_address_zip     text,
  tenant_alias_name           text,          -- "known to tenants as"
  letterhead_asset            text,          -- original file name
  letterhead_thumb            text,          -- small JPEG dataURL for the UI card
  letterhead_data             text,          -- print asset: data:application/pdf;… or data:image/png;… (up to ~5.5MB)
  partb                       jsonb not null default '{}'::jsonb,
    -- {"equipment":["1","",…×7],"utilities":[…×5],"fuel":["G"|"E"|""×5],
    --  "services":[…×6],"writein":{"e1":"Microwave","e1.on":"1","u1.fuel":"G",…}}
  program_type                text default 'RCS',
  submission_date             text,
  date_rents_effective        text,
  date_eff_rs                 text,
  date_eff_source             text,          -- 'rs' | 'custom'
  date_eff_custom             text,
  checklist_sign_date         text,
  tenant_date_of_notice       text,
  appraiser_name              text,
  appraiser_firm              text,
  appraiser_email             text,
  appraiser_phone             text,
  appraiser_address_street    text,
  appraiser_address_city      text,
  appraiser_address_state     text,
  appraiser_address_zip       text,
  checklist                   jsonb not null default '{}'::jsonb,  -- {"0":"1", … "16":""}
  has_ns8                   text,          -- '1' | '' — non-Section 8 section toggle (renamed from has_lihtc)
  ocaf_rate_type            text,          -- 'Fixed rate' | 'Floating rate' — OCAF debt-service default (template; cycles snapshot it)
  ocaf_debt_service         text,          -- annual P&I + MIP default for the 9625 line K (template; per-cycle copy lives in cycle.cells)
  has_nonrev                  text,          -- '1' | '' — non-revenue (Part D) toggle
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);
create index property_owner_idx on public.property(owner_id);

-- --------------------------------------------------------------- unit_type --
-- Section 8 revenue unit rows (flat keys units.{i}.*). flat_index mirrors the
-- UI's array index. *_rcs / *_source / *_reviewed columns support the parsed-
-- document conflict-resolution flow (RS vs RCS values).
create table public.unit_type (
  id                      uuid primary key default gen_random_uuid(),
  owner_id                uuid not null default auth.uid() references auth.users(id) on delete cascade,
  property_id             uuid not null references public.property(id) on delete cascade,
  flat_index              integer not null,
  bedrooms                text,      -- 'Studio' | '1BR' … '5BR'
  bathrooms               text,      -- '1BA' | '1.5BA' … '3BA'
  num_units               integer,
  current_contract_rent   integer,
  proposed_contract_rent  integer,
  ua_from_exec_rs         integer,
  ua_from_rcs             integer,
  ua_source               text,      -- 'exec' | 'rcs' | 'custom'
  ua_reviewed             text,      -- '1' | ''
  ua_custom               integer,
  num_units_rcs           integer,
  bedrooms_rcs            text,
  bathrooms_rcs           text,
  num_units_source        text,
  num_units_reviewed      text,
  type_source             text,
  type_reviewed           text,
  safmr_from_rcs          integer,   -- 150% SAFMR CEILING (already ×1.5)
  safmr_from_hud          integer,   -- 150% SAFMR CEILING (already ×1.5)
  safmr_source            text,      -- 'hud' | 'rcs' | 'custom'
  safmr_reviewed          text,
  safmr_custom            integer,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (property_id, flat_index)
);
create index unit_type_owner_idx on public.unit_type(owner_id);
create index unit_type_property_idx on public.unit_type(property_id);

-- ------------------------------------------------------------- nonrev_unit --
-- Non-revenue units (flat keys nonrev.{i}.*) — Part D of the rent schedule.
create table public.nonrev_unit (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  property_id   uuid not null references public.property(id) on delete cascade,
  flat_index    integer not null,
  "use"         text,
  bedrooms      text,
  bathrooms     text,
  num_units     integer,
  monthly_rent  integer,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (property_id, flat_index)
);
create index nonrev_unit_owner_idx on public.nonrev_unit(owner_id);
create index nonrev_unit_property_idx on public.nonrev_unit(property_id);

-- -------------------------------------------------------------- ns8_unit --
-- Non-Section 8 revenue-producing rows (flat keys ns8.{i}.*; renamed from
-- lihtc_unit 2026-07-16 — the old name was an early misunderstanding). Print on the
-- rent schedule under the "Non- Section 8 Rents" banner with full rent math.
create table public.ns8_unit (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  property_id   uuid not null references public.property(id) on delete cascade,
  flat_index    integer not null,
  bedrooms      text,
  bathrooms     text,
  num_units     integer,
  avg_rent      integer,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (property_id, flat_index)
);
create index ns8_unit_owner_idx on public.ns8_unit(owner_id);
create index ns8_unit_property_idx on public.ns8_unit(property_id);

-- -------------------------------------------------------------- pm_contact --
-- Shared PM contact list (fills the point-of-contact cell).
create table public.pm_contact (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text,
  email       text,
  phone       text,
  created_at  timestamptz not null default now()
);
create index pm_contact_owner_idx on public.pm_contact(owner_id);

-- ------------------------------------------------------------- app_contact --
-- Contact directory: kind = 'appraiser' | 'ca' | 'signatory'. Picking one in
-- the form autofills that whole section.
create table public.app_contact (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind         text not null,
  name         text,
  email        text,
  phone        text,
  prefix       text,
  org          text,
  firm         text,
  title        text,
  addr_street  text,
  addr_city    text,
  addr_state   text,
  addr_zip     text,
  created_at   timestamptz not null default now()
);
create index app_contact_owner_idx on public.app_contact(owner_id);

-- --------------------------------------------------------------------- RLS --
alter table public.property    enable row level security;
alter table public.unit_type   enable row level security;
alter table public.nonrev_unit enable row level security;
alter table public.ns8_unit  enable row level security;
alter table public.pm_contact  enable row level security;
alter table public.app_contact enable row level security;

create policy "owner_all_property"    on public.property    for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner_all_unit_type"   on public.unit_type   for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner_all_nonrev_unit" on public.nonrev_unit for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner_all_ns8_unit"  on public.ns8_unit  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner_all_pm_contact"  on public.pm_contact  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner_all_app_contact" on public.app_contact for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Not included here (backend-specific, recreate in your environment):
--  * Auth: email+password sign-in with public sign-up DISABLED (the client
--    has no sign-up UI; the anon key is embedded and safe only because RLS +
--    closed registration gate everything).
--  * HUD SAFMR edge function `hud-safmr` (source in supabase/functions/):
--    the HUD USER API token lives in Supabase Vault behind a service-role-only
--    RPC `get_hud_token()` — the token must never ship to the client.
