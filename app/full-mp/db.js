/* db.js — multi-property store on a portable storage socket.
   ------------------------------------------------------------------------
   The "filing cabinet" behind the tool. Holds MANY properties; each property
   is ONE CURRENT RECORD — a durable bucket (per-property fields + unit
   structure + Part B profile + letterhead) plus a single per-cycle bucket
   (this submission's rents, UA, SAFMR, appraiser, checklist, dates). There is
   NO form history: loading a new RCS report + rent schedule overwrites the
   per-cycle values; durable data persists. Generate a package -> Box -> next
   cycle, reload new source docs and regenerate. Values are keyed cells with a
   source + save date, using the SAME flat keys the form UI already uses.

   Portability: the store talks to an async ADAPTER ({get,set,clear}). The
   browser plugs in a localStorage adapter; a future Node/SQLite/API build
   plugs in an adapter of the same shape — the public API and the UI never
   change. Each flat key maps to a v7 dictionary key + FIELD_HOME via CROSSWALK
   below, so extracting this JSON into the SQLite tables is a table lookup. */

/* ---- which flat keys are PER-CYCLE (everything else is durable) --------- */
function isPerCycleKey(k) {
  return /^units\.\d+\.(current|proposed|ua_exec|ua_rcs|ua_source|ua_reviewed|ua_custom|num_rcs|br_rcs|ba_rcs|num_source|num_reviewed|type_source|type_reviewed|safmr_rcs|safmr_hud|safmr_source|safmr_reviewed|safmr_custom)$/.test(k)
    || /^appr\./.test(k)
    || /^check\.\d+$/.test(k)
    || /^cycle\./.test(k)
    || k === 'checklist.sign_date' || k === 'tenant.date_of_notice' || k === 'rent_schedule.date_rents_effective';
}

/* ---- crosswalk: UI flat key -> v7 dictionary key + home (for extraction) -
   Consumed by tools that port this browser JSON into the SQLite schema; not
   used by the UI. Array keys carry {i} the unit index. */
const CROSSWALK = {
  'property.name': ['property.name', 'property.name'],
  'property.addr_street': ['property.address_street', 'property.address_street'],
  'property.addr_city': ['property.address_city', 'property.address_city'],
  'property.addr_state': ['property.address_state', 'property.address_state'],
  'property.addr_zip': ['property.address_zip', 'property.address_zip'],
  'property.fha': ['property.fha_section8_no', 'property.fha_section8_no'],
  'owner.entity_name': ['owner.entity_name', 'property.entity_name'],
  'owner.entity_type': ['owner.entity_type', 'property.entity_type'],
  'owner.gp': ['owner.general_partner', 'property.general_partner'],
  'poc.name': ['owner_poc.name', 'property.owner_poc_name'],
  'poc.phone': ['owner_poc.phone', 'property.owner_poc_phone'],
  'poc.email': ['owner_poc.email', 'property.owner_poc_email'],
  'sig.name': ['signatory.name', 'property.signatory_name'],
  'sig.title': ['signatory.title', 'property.signatory_title'],
  'ca.org': ['ca.org', 'property.ca_org'],
  'ca.prefix': ['ca.contact_prefix', 'property.ca_contact_prefix'],
  'ca.name': ['ca.contact_name', 'property.ca_contact_name'],
  'ca.position': ['ca.contact_title', 'property.ca_contact_title'],
  'ca.addr_street': ['ca.address_street', 'property.ca_address_street'],
  'ca.addr_city': ['ca.address_city', 'property.ca_address_city'],
  'ca.addr_state': ['ca.address_state', 'property.ca_address_state'],
  'ca.addr_zip': ['ca.address_zip', 'property.ca_address_zip'],
  'tenant.sender_name': ['tenant.sender_name', 'property.tenant_sender_name'],
  'tenant.sender_title': ['tenant.sender_title', 'property.tenant_sender_title'],
  'tenant.mgmt_source': ['tenant.mgmt_source', 'property.tenant_mgmt_source'],
  'tenant.mgmt_street': ['tenant.mgmt_address_street', 'property.tenant_mgmt_address_street'],
  'tenant.mgmt_city': ['tenant.mgmt_address_city', 'property.tenant_mgmt_address_city'],
  'tenant.mgmt_state': ['tenant.mgmt_address_state', 'property.tenant_mgmt_address_state'],
  'tenant.mgmt_zip': ['tenant.mgmt_address_zip', 'property.tenant_mgmt_address_zip'],
  'tenant.property_alias': ['tenant.property_alias', 'property.tenant_alias_name'],
  'assets.letterhead_name': ['assets.letterhead', 'property.letterhead_asset'],
  'appr.firm': ['study.appraiser_firm', 'submission.appraiser_firm'],
  'appr.name': ['study.appraiser_name', 'submission.appraiser_name'],
  'appr.email': ['study.appraiser_email', 'submission.appraiser_email'],
  'appr.phone': ['study.appraiser_phone', 'submission.appraiser_phone'],
  'units.{i}.br': ['units[].bedrooms', 'unit_type.bedrooms'],
  'units.{i}.ba': ['units[].bathrooms', 'unit_type.bathrooms'],
  'units.{i}.num_units': ['units[].num_units', 'unit_type.num_units'],
  'units.{i}.current': ['units[].current_contract_rent', 'unit_cycle_value.current_contract_rent'],
  'units.{i}.proposed': ['units[].proposed_contract_rent', 'unit_cycle_value.proposed_contract_rent'],
  'units.{i}.ua_exec': ['units[].ua_from_exec_rs', 'unit_cycle_value.ua_from_exec_rs'],
  'units.{i}.ua_rcs': ['units[].ua_from_rcs', 'unit_cycle_value.ua_from_rcs'],
  'units.{i}.safmr_hud': ['units[].safmr_from_hud', 'unit_cycle_value.safmr_from_hud'],
  'units.{i}.safmr_rcs': ['units[].safmr_from_rcs', 'unit_cycle_value.safmr_from_rcs'],
  'check.{i}': ['checklist.items[17]', 'checklist_item.checked'],
  'nonrev.{i}.use': ['units[].nonrev_use', 'unit_type.nonrev_use'],
  'nonrev.{i}.rent': ['units[].nonrev_rent', 'unit_type.nonrev_rent'],
};

/* ---- number + computed helpers (shared by the form and the menu) -------- */
function num(v) { const n = parseFloat(String(v == null ? '' : v).replace(/[^0-9.\-]/g, '')); return isNaN(n) ? 0 : n; }

function unitIndices(form) {
  const s = new Set();
  Object.keys(form).forEach(k => { const m = k.match(/^units\.(\d+)\./); if (m) s.add(+m[1]); });
  return [...s].sort((a, b) => a - b);
}

/** The internal 150% SAFMR analysis — unit-weighted portfolio economics.
    Reads the SAME flat form the UI uses, so the menu and the command center
    never diverge. */
function safmrResolvedFrom(val, i) {
  const sh = num(val('units.' + i + '.safmr_hud')), sr = num(val('units.' + i + '.safmr_rcs'));
  const src = val('units.' + i + '.safmr_source') || (sh > 0 ? 'hud' : (sr > 0 ? 'rcs' : 'custom'));
  if (src === 'custom') return num(val('units.' + i + '.safmr_custom'));
  return src === 'rcs' ? (sr || sh) : (sh || sr); // HUD trumps by default
}
function computeAnalysis(form) {
  const val = k => (form[k] ? form[k].value : '');
  const units = unitIndices(form);
  let cg = 0, pg = 0, tot = 0, sc = 0, sp = 0, nd = 0, ceil = 0, safmrMissing = false, safmrOver = 0;
  units.forEach(i => {
    const n = num(val('units.' + i + '.num_units')), cur = num(val('units.' + i + '.current')), pro = num(val('units.' + i + '.proposed'));
    const ue = num(val('units.' + i + '.ua_exec')), ur = num(val('units.' + i + '.ua_rcs'));
    const usrc = val('units.' + i + '.ua_source') || (ue > 0 ? 'exec' : (ur > 0 ? 'rcs' : 'custom'));
    const ua = usrc === 'rcs' ? num(val('units.' + i + '.ua_rcs')) : (usrc === 'custom' ? num(val('units.' + i + '.ua_custom')) : num(val('units.' + i + '.ua_exec')));
    const safmr = safmrResolvedFrom(val, i);
    cg += (cur + ua) * n; pg += (pro + ua) * n; tot += n;
    if (safmr > 0) { ceil += safmr * n; if (pro > 0 && pro >= safmr) safmrOver++; } else if (n > 0) safmrMissing = true; // safmr = the 150% SAFMR ceiling per unit, entered/parsed directly (future HUD API pull must x1.5 its base value); per-type over when net proposed >= it
    if (cur > 0 && pro > 0) { sc += cur * n; sp += pro * n; nd += n; }
  });
  return {
    current_gpr: cg, proposed_gpr: pg, ceiling: ceil, headroom: ceil - pg, pass: (ceil > 0 && pg < ceil), safmr_missing: safmrMissing, safmr_over: safmrOver,
    total_units: tot, pct: sc ? Math.round((sp - sc) / sc * 100) : 0, per_unit: nd ? (sp - sc) / nd : 0,
  };
}

/** ca.contact_salutation — "Dear " + prefix + last token of the contact name. */
function computeSalutation(form) {
  const name = form['ca.name'] ? String(form['ca.name'].value || '') : '';
  const prefix = form['ca.prefix'] ? String(form['ca.prefix'].value || '') : '';
  if (!name.trim()) return '';
  const last = name.trim().split(/\s+/).pop();
  return 'Dear ' + (prefix ? prefix + ' ' : '') + last;
}

/* ---- Gates Manor seed (the worked sample; also the first-run demo row) --- */
function gatesSeedFlat() {
  const f = {
    'property.name': 'Gates Manor Apartments',
    'property.addr_street': '1135 Wilmette Ave', 'property.addr_city': 'Wilmette',
    'property.addr_state': 'IL', 'property.addr_zip': '60091', 'property.fha': 'IL06H121063',
    'owner.entity_name': 'Gates Manor Preservation, L.P.', 'owner.entity_type': 'Limited Partnership',
    'poc.name': 'Claire Beatty', 'poc.email': 'cbeatty@related.com', 'poc.phone': '(929) 618-8405',
    'owner.gp': 'Related (GP)', 'sig.name': 'David Pearson', 'sig.title': 'Vice President',
    'ca.org': 'National Housing Compliance', 'ca.prefix': 'Ms.', 'ca.name': 'Heather Gross', 'ca.position': 'Asset Manager',
    'ca.addr_street': '1975 Lakeside Parkway, Suite 310', 'ca.addr_city': 'Tucker', 'ca.addr_state': 'GA', 'ca.addr_zip': '30084-5860',
    'appr.firm': 'Belfry Valuation', 'appr.name': 'Aaron M. Zabel', 'appr.email': 'azabel@belfryvaluation.com', 'appr.phone': '(708) 500-2380',
    'units.0.br': '1BR', 'units.0.ba': '1BA', 'units.0.num_units': '51', 'units.0.current': '1903', 'units.0.proposed': '2725',
    'units.0.ua_exec': '31', 'units.0.ua_rcs': '31', 'units.0.ua_source': 'exec', 'units.0.ua_reviewed': '', 'units.0.ua_custom': '', 'rent_schedule.date_rents_effective': '2026-09-01', 'rent_schedule.date_eff_rs': '2026-09-01', 'rent_schedule.date_eff_source': 'rs', 'rent_schedule.date_eff_custom': '',
    'units.0.safmr_rcs': '3435', 'units.0.safmr_hud': '3495', 'units.0.safmr_source': 'hud', 'units.0.safmr_reviewed': '',
    'tenant.sender_name': 'Tasha Francellno-Glenn', 'tenant.sender_title': 'Community Manager',
    'tenant.mgmt_street': '', 'tenant.mgmt_city': '', 'tenant.mgmt_state': '', 'tenant.mgmt_zip': '', 'tenant.mgmt_source': 'property',
  };
  const eqOn = { 0: 1, 1: 1, 2: 1, 5: 1 };      // Range, Refrigerator, Air Conditioner, Carpet
  for (let i = 0; i < 7; i++) f['partb.equipment.' + i] = eqOn[i] ? '1' : '';
  const utOn = { 0: 1, 2: 1, 3: 1 };            // Heating, Hot Water, Cooking
  const utFuel = { 0: 'G', 1: '', 2: 'G', 3: 'G', 4: '' };
  for (let i = 0; i < 5; i++) { f['partb.utilities.' + i] = utOn[i] ? '1' : ''; f['partb.fuel.' + i] = utFuel[i]; }
  const svOn = {};                               // none fixed; write-ins below
  for (let i = 0; i < 6; i++) f['partb.services.' + i] = svOn[i] ? '1' : '';
  ['e1', 'e2', 'e3', 'e4', 'e5', 'u1', 's1', 's2', 's3', 's4', 's5', 's6'].forEach(id => { f['partb.writein.' + id] = ''; f['partb.writein.' + id + '.on'] = ''; });
  f['partb.writein.e1'] = 'Microwave'; f['partb.writein.e1.on'] = '1';         // equipment write-ins
  f['partb.writein.e2'] = 'Mini Blinds'; f['partb.writein.e2.on'] = '1';
  f['partb.writein.s1'] = 'Fitness Center'; f['partb.writein.s1.on'] = '1';    // service write-ins
  f['partb.writein.s2'] = 'Community RM'; f['partb.writein.s2.on'] = '1';
  f['partb.writein.u1.fuel'] = '';
  for (let i = 0; i < 17; i++) f['check.' + i] = (i === 2 || i === 4) ? '' : '1';
  return f;
}

/* ---- migrate an older store shape (cycles[]) to the single-record shape -- */
function migrate(D) {
  if (!D || !D.props) return D;
  Object.values(D.props).forEach(p => {
    if (!p.durable) p.durable = {};
    if (p.cycles && !p.percycle) {
      const order = p.cycleOrder && p.cycleOrder.length ? p.cycleOrder : Object.keys(p.cycles);
      const last = order[order.length - 1];
      const cells = (last && p.cycles[last] && p.cycles[last].cells) || {};
      p.percycle = {};
      for (const k in cells) p.percycle[k] = cells[k];
    }
    if (!p.percycle) p.percycle = {};
    delete p.cycles; delete p.cycleOrder;
    const _b=p.durable||{}; const _mv=(from,slots)=>{ const c=_b['partb.writein.'+from]; if(c&&c.value){ const slot=slots.find(s=>!(_b['partb.writein.'+s]&&_b['partb.writein.'+s].value)); if(slot){ _b['partb.writein.'+slot]=c; if(_b['partb.writein.'+from+'.on'])_b['partb.writein.'+slot+'.on']=_b['partb.writein.'+from+'.on']; } } delete _b['partb.writein.'+from]; delete _b['partb.writein.'+from+'.on']; };
    _mv('microwave',['e1','e2','e3','e4','e5']); _mv('elevator',['s1','s2','s3','s4','s5','s6']);
  });
  if (D.meta) { delete D.meta.activeSid; }
  D.v = 2;
  return D;
}

/* ======================================================================== */
async function makeDb(adapter, opts) {
  opts = opts || {};
  const today = () => new Date().toISOString().slice(0, 10);
  const now = () => new Date().toISOString();
  const freshDb = () => ({ v: 2, meta: { seq: 0, activePid: null, contacts: [] }, props: {} });

  let D = await adapter.get();
  const _needSeed = !D || !D.props;
  if (_needSeed) D = freshDb();
  else migrate(D);
  if (!D.meta) D.meta = { seq: 0, activePid: null }; if (!D.meta.contacts) D.meta.contacts = [];

  function nid(pre) { D.meta.seq = (D.meta.seq || 0) + 1; return pre + D.meta.seq; }
  const persist = () => adapter.set(D);
  const touch = pid => { if (D.props[pid]) D.props[pid].updated_at = now(); };
  const cell = v => ({ value: (v == null ? '' : String(v)), source: 'database', saved_at: today() });

  function _createProperty(name) {
    const pid = nid('p');
    D.props[pid] = { id: pid, created_at: today(), updated_at: now(), durable: {}, percycle: {} };
    if (name) D.props[pid].durable['property.name'] = cell(name);
    // New-property checklist default is applied at the FORM layer (app.js applyChecklistDefaults)
    // as source 'new' (grey/unsaved), NOT seeded here as 'database' (which would render blue).
    D.meta.activePid = pid;
    return { pid };
  }

  function seedGates() {
    const { pid } = _createProperty(null);
    const flat = gatesSeedFlat();
    const p = D.props[pid];
    for (const k in flat) { const c = cell(flat[k]); if (isPerCycleKey(k)) p.percycle[k] = c; else p.durable[k] = c; }
    return pid;
  }

  /* ---- form <-> store mapping (durable + per-cycle, merged) ------------- */
  function bucketsOf(pid) { const p = D.props[pid]; return p ? Object.assign({}, p.durable, p.percycle) : {}; }

  function loadForm(pid) {
    const p = D.props[pid]; if (!p) return {};
    const merged = bucketsOf(pid);
    const form = {};
    for (const k in merged) {
      const c = merged[k];
      const v = c ? c.value : '';
      const has = v !== '' && v != null;
      form[k] = { value: (v == null ? '' : v), source: has ? 'database' : 'new', saved_at: c ? c.saved_at : null, prior_value: null, prior_source: null, db_value: has ? v : (c ? '' : null) };
    }
    return form;
  }

  function saveForm(pid, form) {
    const p = D.props[pid]; if (!p) throw new Error('no such property ' + pid);
    for (const k in form) {
      const v = form[k].value;
      const c = { value: (v == null ? '' : String(v)), source: 'database', saved_at: today() };
      if (isPerCycleKey(k)) p.percycle[k] = c; else p.durable[k] = c;
    }
    touch(pid);
    return persist();
  }

  /* ---- property registry ------------------------------------------------ */
  const REQUIRED_DURABLE = ['property.name', 'property.fha', 'property.addr_street', 'property.addr_city', 'property.addr_state', 'property.addr_zip', 'owner.entity_name', 'sig.name', 'ca.org', 'ca.name'];
  const dv = (p, k) => (p.durable[k] && p.durable[k].value !== '' ? p.durable[k].value : '');
  const completenessOf = p => REQUIRED_DURABLE.filter(k => dv(p, k) !== '').length / REQUIRED_DURABLE.length;
  function unitCountOf(p) {
    const idx = new Set(); Object.keys(p.durable).forEach(k => { const m = k.match(/^units\.(\d+)\.num_units$/); if (m && p.durable[k].value !== '') idx.add(m[1]); });
    let total = 0; idx.forEach(i => total += num(p.durable['units.' + i + '.num_units'].value)); return { types: idx.size, units: total };
  }

  function listProperties() {
    return Object.values(D.props).map(p => {
      const uc = unitCountOf(p);
      return {
        id: p.id, name: dv(p, 'property.name') || '(unnamed property)', fha: dv(p, 'property.fha') || '—',
        city_state: (dv(p, 'property.addr_city') || '') + (dv(p, 'property.addr_state') ? ', ' + dv(p, 'property.addr_state') : ''),
        entity: dv(p, 'owner.entity_name') || '', unit_types: uc.types, total_units: uc.units,
        completeness: completenessOf(p), created_at: p.created_at, updated_at: p.updated_at || p.created_at,
        has_letterhead: dv(p, 'assets.letterhead_name') !== '',
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }

  /** One property's headline analysis, for the launcher summary. */
  function propertyAnalysis(pid) { return computeAnalysis(loadForm(pid)); }

  if (_needSeed) { if (opts.seed !== false) { seedGates(); D.meta.contacts = [{ id: 'k1', name: 'Claire Beatty', email: 'cbeatty@related.com', phone: '(929) 618-8405' }]; } await adapter.set(D); }
  else if (opts && opts.persistMigration !== false) { await adapter.set(D); }

  return {
    _raw: () => D,
    today,
    listProperties, propertyAnalysis,
    getActive() { return { pid: D.meta.activePid }; },
    setActive(pid) { if (D.props[pid]) D.meta.activePid = pid; return Promise.resolve(); }, // pointer only; nav must not write (real saves persist it)
    createProperty(name) { const r = _createProperty(name || ''); persist(); return r; },
    renameProperty(pid, name) { const p = D.props[pid]; if (!p) return; p.durable['property.name'] = cell(name); touch(pid); return persist(); },
    deleteProperty(pid) {
      delete D.props[pid];
      if (D.meta.activePid === pid) { const rest = Object.keys(D.props); D.meta.activePid = rest.length ? rest[0] : null; }
      return persist();
    },
    loadForm, saveForm,
    pruneUnitRows(pid, keepU, keepNR) {
      const p = D.props[pid]; if (!p) return Promise.resolve();
      const ku = new Set((keepU || []).map(String)), kn = new Set((keepNR || []).map(String));
      const uidx = k => { const r = k.slice(6); const d = r.indexOf('.'); return d > 0 ? r.slice(0, d) : null; };
      const nidx = k => { const r = k.slice(7); const d = r.indexOf('.'); return d > 0 ? r.slice(0, d) : null; };
      [p.durable, p.percycle].forEach(b => Object.keys(b).forEach(k => {
        if (k.indexOf('units.') === 0) { const i = uidx(k); if (i !== null && !ku.has(i)) delete b[k]; }
        else if (k.indexOf('nonrev.') === 0) { const i = nidx(k); if (i !== null && !kn.has(i)) delete b[k]; }
      }));
      touch(pid); return persist();
    },
    getFlat(pid) { return bucketsOf(pid); },
    saveFlat(pid, map) {
      const p = D.props[pid]; if (!p) throw new Error('no property ' + pid);
      for (const k in map) {
        const c = { value: (map[k] && map[k].value != null ? String(map[k].value) : ''), source: 'database', saved_at: (map[k] && map[k].saved_at) ? map[k].saved_at : today() };
        if (isPerCycleKey(k)) p.percycle[k] = c; else p.durable[k] = c;
      }
      touch(pid); return persist();
    },
    /** Letterhead — a permanent per-property durable asset (name + UI thumbnail + print-quality PNG). */
    setLetterhead(pid, name, thumb, data) {
      const p = D.props[pid]; if (!p) return;
      p.durable['assets.letterhead_name'] = cell(name || '');
      if (thumb !== undefined) p.durable['assets.letterhead_thumb'] = cell(thumb || '');
      if (data !== undefined) p.durable['assets.letterhead_data'] = cell(data || '');
      touch(pid); return persist();
    },
    getLetterhead(pid) {
      const p = D.props[pid]; if (!p) return { name: '', thumb: '', data: '' };
      return { name: dv(p, 'assets.letterhead_name'), thumb: dv(p, 'assets.letterhead_thumb'), data: dv(p, 'assets.letterhead_data') };
    },
    listContacts() { return (D.meta.contacts || []).slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))); },
    addContact(c) { D.meta.contacts = D.meta.contacts || []; const id = nid('k'); D.meta.contacts.push({ id, name: (c && c.name) || '', email: (c && c.email) || '', phone: (c && c.phone) || '' }); persist(); return id; },
    updateContact(id, patch) { const c = (D.meta.contacts || []).find(x => x.id === id); if (c) Object.assign(c, patch || {}); return persist(); },
    deleteContact(id) { D.meta.contacts = (D.meta.contacts || []).filter(x => x.id !== id); return persist(); },
    clearAll() { D = freshDb(); seedGates(); return persist(); },
    computeAnalysis, computeSalutation,
  };
}

/* ---- adapters --------------------------------------------------------- */
function localAdapter(KEY) {
  KEY = KEY || 'rcs_mp_db1';
  let LS; try { LS = window.localStorage; LS.setItem('__t', '1'); LS.removeItem('__t'); }
  catch (e) { const m = {}; LS = { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = v; }, removeItem: k => { delete m[k]; } }; }
  return {
    get: async () => { try { return JSON.parse(LS.getItem(KEY)); } catch (e) { return null; } },
    set: async (o) => LS.setItem(KEY, JSON.stringify(o)),
    clear: async () => LS.removeItem(KEY),
  };
}
function memoryAdapter(init) { let o = init || null; return { get: async () => o, set: async (x) => { o = x; }, clear: async () => { o = null; } }; }

if (typeof module !== 'undefined') module.exports = { makeDb, localAdapter, memoryAdapter, isPerCycleKey, migrate, computeAnalysis, computeSalutation, safmrResolvedFrom, gatesSeedFlat, num, CROSSWALK };
