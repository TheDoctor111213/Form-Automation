/* db.supabase.js — Supabase-backed data layer.
   Drop-in replacement for makeDb(localAdapter): exposes the SAME public method
   surface app.js/core.js/gen.js call, so nothing else in the app changes.

   Shape parity: keeps an in-memory mirror `D` identical to db.js's blob
   ({ props:{ pid:{ id, created_at, updated_at, durable:{cells}, percycle:{cells} } }, contacts }),
   loaded from the four Supabase tables at boot. SYNC reads (listProperties,
   propertyAnalysis, getFlat, getLetterhead, listContacts, getActive) serve from
   the mirror; writes update the mirror AND push scoped changes to Supabase.
   Reuses db.js's global pure helpers: isPerCycleKey, num, computeAnalysis,
   computeSalutation — so the 150% SAFMR math and durable/per-cycle routing are
   byte-identical to the localStorage build.

   IDs: property/contact PKs are client-generated UUIDs (crypto.randomUUID), so
   createProperty can stay synchronous and there is no id clash with the uuid
   columns. Per-property writes are serialized through a queue to avoid races
   between createProperty's insert and a fast follow-up save. */
function makeSupabaseDb(client) {
  const today = () => new Date().toISOString().slice(0, 10);
  const now = () => new Date().toISOString();
  const uuid = () => (crypto && crypto.randomUUID ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); }));

  /* ---- flat-key <-> column maps ------------------------------------------ */
  const PSCALAR = {
    'property.name': 'name', 'property.fha': 'fha_section8_no',
    'property.addr_street': 'address_street', 'property.addr_city': 'address_city', 'property.addr_state': 'address_state', 'property.addr_zip': 'address_zip',
    'owner.entity_name': 'entity_name', 'owner.entity_type': 'entity_type', 'owner.gp': 'general_partner',
    'poc.name': 'owner_poc_name', 'poc.email': 'owner_poc_email', 'poc.phone': 'owner_poc_phone',
    'sig.name': 'signatory_name', 'sig.title': 'signatory_title',
    'ca.org': 'ca_org', 'ca.prefix': 'ca_contact_prefix', 'ca.name': 'ca_contact_name', 'ca.position': 'ca_contact_title',
    'ca.addr_street': 'ca_address_street', 'ca.addr_city': 'ca_address_city', 'ca.addr_state': 'ca_address_state', 'ca.addr_zip': 'ca_address_zip',
    'tenant.sender_name': 'tenant_sender_name', 'tenant.sender_title': 'tenant_sender_title', 'tenant.mgmt_source': 'tenant_mgmt_source',
    'tenant.mgmt_street': 'tenant_mgmt_address_street', 'tenant.mgmt_city': 'tenant_mgmt_address_city', 'tenant.mgmt_state': 'tenant_mgmt_address_state', 'tenant.mgmt_zip': 'tenant_mgmt_address_zip',
    'tenant.property_alias': 'tenant_alias_name',
    'assets.letterhead_name': 'letterhead_asset', 'assets.letterhead_thumb': 'letterhead_thumb',
    'appr.name': 'appraiser_name', 'appr.firm': 'appraiser_firm', 'appr.email': 'appraiser_email', 'appr.phone': 'appraiser_phone',
    'appr.addr_street': 'appraiser_address_street', 'appr.addr_city': 'appraiser_address_city', 'appr.addr_state': 'appraiser_address_state', 'appr.addr_zip': 'appraiser_address_zip',
    'rent_schedule.date_rents_effective': 'date_rents_effective', 'rent_schedule.date_eff_rs': 'date_eff_rs', 'rent_schedule.date_eff_source': 'date_eff_source', 'rent_schedule.date_eff_custom': 'date_eff_custom',
    'checklist.sign_date': 'checklist_sign_date', 'tenant.date_of_notice': 'tenant_date_of_notice', 'cycle.submission_date': 'submission_date',
  };
  const PSCALAR_REV = {}; for (const k in PSCALAR) PSCALAR_REV[PSCALAR[k]] = k;

  const UCOL = {
    br: 'bedrooms', ba: 'bathrooms', num_units: 'num_units',
    current: 'current_contract_rent', proposed: 'proposed_contract_rent',
    ua_exec: 'ua_from_exec_rs', ua_rcs: 'ua_from_rcs', ua_source: 'ua_source', ua_reviewed: 'ua_reviewed', ua_custom: 'ua_custom',
    num_rcs: 'num_units_rcs', br_rcs: 'bedrooms_rcs', ba_rcs: 'bathrooms_rcs', num_source: 'num_units_source', num_reviewed: 'num_units_reviewed',
    type_source: 'type_source', type_reviewed: 'type_reviewed',
    safmr_rcs: 'safmr_from_rcs', safmr_hud: 'safmr_from_hud', safmr_source: 'safmr_source', safmr_reviewed: 'safmr_reviewed', safmr_custom: 'safmr_custom',
  };
  const UCOL_REV = {}; for (const k in UCOL) UCOL_REV[UCOL[k]] = k;
  const UINT = new Set(['num_units', 'current', 'proposed', 'ua_exec', 'ua_rcs', 'ua_custom', 'num_rcs', 'safmr_rcs', 'safmr_hud', 'safmr_custom']);

  const NRCOL = { use: 'use', br: 'bedrooms', ba: 'bathrooms', rent: 'monthly_rent' };
  const NRCOL_REV = {}; for (const k in NRCOL) NRCOL_REV[NRCOL[k]] = k;
  const NRINT = new Set(['rent']);

  const toInt = v => { if (v == null || String(v).trim() === '') return null; const n = Math.round(num(v)); return isNaN(n) ? null : n; };

  /* ---- in-memory mirror -------------------------------------------------- */
  let D = { props: {}, contacts: [], activePid: null };

  const place = (p, key, raw, sa) => {
    const cell = { value: (raw == null ? '' : String(raw)), source: 'database', saved_at: sa };
    if (isPerCycleKey(key)) p.percycle[key] = cell; else p.durable[key] = cell;
  };

  async function load() {
    const [pr, ur, nr, ct] = await Promise.all([
      client.from('property').select('*'),
      client.from('unit_type').select('*'),
      client.from('nonrev_unit').select('*'),
      client.from('pm_contact').select('*'),
    ]);
    if (pr.error) throw pr.error;
    D = { props: {}, contacts: [], activePid: null };
    (pr.data || []).forEach(r => {
      const sa = String(r.updated_at || '').slice(0, 10);
      const p = { id: r.id, created_at: String(r.created_at || '').slice(0, 10), updated_at: r.updated_at || r.created_at, durable: {}, percycle: {} };
      for (const col in PSCALAR_REV) if (r[col] != null) place(p, PSCALAR_REV[col], r[col], sa);
      const pb = r.partb || {};
      ['equipment', 'utilities', 'fuel', 'services'].forEach(g => { if (Array.isArray(pb[g])) pb[g].forEach((v, i) => place(p, 'partb.' + g + '.' + i, v, sa)); });
      if (pb.writein && typeof pb.writein === 'object') for (const k in pb.writein) place(p, 'partb.writein.' + k, pb.writein[k], sa);
      const cl = r.checklist || {};
      for (const k in cl) place(p, 'check.' + k, cl[k], sa);
      D.props[r.id] = p;
    });
    (ur.data || []).forEach(u => {
      const p = D.props[u.property_id]; if (!p) return; const sa = String(u.updated_at || '').slice(0, 10);
      for (const col in UCOL_REV) if (u[col] != null) place(p, 'units.' + u.flat_index + '.' + UCOL_REV[col], u[col], sa);
    });
    (nr.data || []).forEach(n => {
      const p = D.props[n.property_id]; if (!p) return; const sa = String(n.updated_at || '').slice(0, 10);
      for (const col in NRCOL_REV) if (n[col] != null) place(p, 'nonrev.' + n.flat_index + '.' + NRCOL_REV[col], n[col], sa);
    });
    D.contacts = (ct.data || []).map(c => ({ id: c.id, name: c.name || '', email: c.email || '', phone: c.phone || '' }));
  }

  /* ---- build Supabase payloads from the mirror --------------------------- */
  function merged(pid) { const p = D.props[pid]; return p ? Object.assign({}, p.durable, p.percycle) : {}; }

  function buildPropRow(pid) {
    const m = merged(pid); const row = { id: pid, updated_at: now() };
    for (const fk in PSCALAR) if (fk in m) row[PSCALAR[fk]] = m[fk].value;
    const pb = { equipment: [], utilities: [], fuel: [], services: [], writein: {} };
    for (let i = 0; i < 7; i++) pb.equipment[i] = ('partb.equipment.' + i) in m ? m['partb.equipment.' + i].value : '';
    for (let i = 0; i < 5; i++) pb.utilities[i] = ('partb.utilities.' + i) in m ? m['partb.utilities.' + i].value : '';
    for (let i = 0; i < 5; i++) pb.fuel[i] = ('partb.fuel.' + i) in m ? m['partb.fuel.' + i].value : '';
    for (let i = 0; i < 6; i++) pb.services[i] = ('partb.services.' + i) in m ? m['partb.services.' + i].value : '';
    let hasPartb = false;
    for (const k in m) { const w = k.match(/^partb\.writein\.(.+)$/); if (w) { pb.writein[w[1]] = m[k].value; hasPartb = true; } if (k.indexOf('partb.') === 0) hasPartb = true; }
    if (hasPartb) row.partb = pb;
    const cl = {}; let hasCl = false;
    for (const k in m) { const c = k.match(/^check\.(\d+)$/); if (c) { cl[c[1]] = m[k].value; hasCl = true; } }
    if (hasCl) row.checklist = cl;
    return row;
  }
  function buildUnitRows(pid) {
    const m = merged(pid); const byIdx = {};
    for (const k in m) { const g = k.match(/^units\.(\d+)\.(.+)$/); if (g && UCOL[g[2]]) (byIdx[g[1]] = byIdx[g[1]] || {})[g[2]] = m[k].value; }
    return Object.keys(byIdx).map(i => {
      const row = { property_id: pid, flat_index: +i, updated_at: now() }; const sub = byIdx[i];
      for (const sk in UCOL) if (sk in sub) row[UCOL[sk]] = UINT.has(sk) ? toInt(sub[sk]) : (sub[sk] === '' ? null : sub[sk]);
      return row;
    });
  }
  function buildNonrevRows(pid) {
    const m = merged(pid); const byIdx = {};
    for (const k in m) { const g = k.match(/^nonrev\.(\d+)\.(.+)$/); if (g && NRCOL[g[2]]) (byIdx[g[1]] = byIdx[g[1]] || {})[g[2]] = m[k].value; }
    return Object.keys(byIdx).map(i => {
      const row = { property_id: pid, flat_index: +i, updated_at: now() }; const sub = byIdx[i];
      for (const sk in NRCOL) if (sk in sub) row[NRCOL[sk]] = NRINT.has(sk) ? toInt(sub[sk]) : (sub[sk] === '' ? null : sub[sk]);
      return row;
    });
  }
  const notInList = arr => '(' + (arr.length ? arr.join(',') : '-1') + ')';
  async function pushProperty(pid) {
    let r = await client.from('property').upsert(buildPropRow(pid)); if (r.error) throw r.error;
    const urows = buildUnitRows(pid);
    if (urows.length) { r = await client.from('unit_type').upsert(urows, { onConflict: 'property_id,flat_index' }); if (r.error) throw r.error; }
    r = await client.from('unit_type').delete().eq('property_id', pid).not('flat_index', 'in', notInList(urows.map(x => x.flat_index))); if (r.error) throw r.error;
    const nrows = buildNonrevRows(pid);
    if (nrows.length) { r = await client.from('nonrev_unit').upsert(nrows, { onConflict: 'property_id,flat_index' }); if (r.error) throw r.error; }
    r = await client.from('nonrev_unit').delete().eq('property_id', pid).not('flat_index', 'in', notInList(nrows.map(x => x.flat_index))); if (r.error) throw r.error;
  }

  /* ---- per-property write serialization ---------------------------------- */
  const _q = {};
  function enqueue(pid, fn) { const prev = _q[pid] || Promise.resolve(); const next = prev.then(fn, fn); _q[pid] = next.catch(() => { }); return next; }

  /* ---- registry helpers (mirror db.js) ----------------------------------- */
  const REQUIRED_DURABLE = ['property.name', 'property.fha', 'property.addr_street', 'property.addr_city', 'property.addr_state', 'property.addr_zip', 'owner.entity_name', 'sig.name', 'ca.org', 'ca.name'];
  const dv = (p, k) => (p.durable[k] && p.durable[k].value !== '' ? p.durable[k].value : '');
  const completenessOf = p => REQUIRED_DURABLE.filter(k => dv(p, k) !== '').length / REQUIRED_DURABLE.length;
  function unitCountOf(p) {
    const idx = new Set(); Object.keys(p.durable).forEach(k => { const m = k.match(/^units\.(\d+)\.num_units$/); if (m && p.durable[k].value !== '') idx.add(m[1]); });
    let total = 0; idx.forEach(i => total += num(p.durable['units.' + i + '.num_units'].value)); return { types: idx.size, units: total };
  }
  function bucketsOf(pid) { return merged(pid); }
  function loadFormCells(pid) {
    const b = bucketsOf(pid), form = {};
    for (const k in b) { const v = b[k] ? b[k].value : ''; const has = v !== '' && v != null; form[k] = { value: (v == null ? '' : v), source: has ? 'database' : 'new', saved_at: b[k] ? b[k].saved_at : null, prior_value: null, prior_source: null, db_value: has ? v : (b[k] ? '' : null) }; }
    return form;
  }
  const touch = pid => { if (D.props[pid]) D.props[pid].updated_at = now(); };

  /* ---- init -------------------------------------------------------------- */
  return (async () => {
    await load();
    return {
      _raw: () => D,
      today,
      listProperties() {
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
      },
      propertyAnalysis(pid) { return computeAnalysis(loadFormCells(pid)); },
      getActive() { return { pid: D.activePid }; },
      setActive(pid) { if (D.props[pid]) D.activePid = pid; return Promise.resolve(); },
      createProperty(name) {
        const pid = uuid();
        D.props[pid] = { id: pid, created_at: today(), updated_at: now(), durable: {}, percycle: {} };
        if (name) D.props[pid].durable['property.name'] = { value: String(name), source: 'database', saved_at: today() };
        D.activePid = pid;
        enqueue(pid, () => client.from('property').upsert({ id: pid, name: name || null }).then(r => { if (r.error) throw r.error; }));
        return { pid };
      },
      renameProperty(pid, name) {
        const p = D.props[pid]; if (!p) return Promise.resolve();
        p.durable['property.name'] = { value: String(name), source: 'database', saved_at: today() }; touch(pid);
        return enqueue(pid, () => client.from('property').update({ name: name, updated_at: now() }).eq('id', pid).then(r => { if (r.error) throw r.error; }));
      },
      deleteProperty(pid) {
        delete D.props[pid];
        if (D.activePid === pid) { const rest = Object.keys(D.props); D.activePid = rest.length ? rest[0] : null; }
        return enqueue(pid, () => client.from('property').delete().eq('id', pid).then(r => { if (r.error) throw r.error; }));
      },
      loadForm(pid) { return loadFormCells(pid); },
      saveForm(pid, form) {
        const p = D.props[pid]; if (!p) throw new Error('no such property ' + pid);
        for (const k in form) place(p, k, (form[k] && form[k].value != null ? form[k].value : ''), today());
        touch(pid); return enqueue(pid, () => pushProperty(pid));
      },
      pruneUnitRows(pid, keepU, keepNR) {
        const p = D.props[pid]; if (!p) return Promise.resolve();
        const ku = new Set((keepU || []).map(String)), kn = new Set((keepNR || []).map(String));
        const uidx = k => { const r = k.slice(6); const d = r.indexOf('.'); return d > 0 ? r.slice(0, d) : null; };
        const nidx = k => { const r = k.slice(7); const d = r.indexOf('.'); return d > 0 ? r.slice(0, d) : null; };
        [p.durable, p.percycle].forEach(b => Object.keys(b).forEach(k => {
          if (k.indexOf('units.') === 0) { const i = uidx(k); if (i !== null && !ku.has(i)) delete b[k]; }
          else if (k.indexOf('nonrev.') === 0) { const i = nidx(k); if (i !== null && !kn.has(i)) delete b[k]; }
        }));
        touch(pid); return enqueue(pid, () => pushProperty(pid));
      },
      getFlat(pid) { return bucketsOf(pid); },
      saveFlat(pid, map) {
        const p = D.props[pid]; if (!p) throw new Error('no property ' + pid);
        for (const k in map) place(p, k, (map[k] && map[k].value != null ? map[k].value : ''), (map[k] && map[k].saved_at) ? map[k].saved_at : today());
        touch(pid); return enqueue(pid, () => pushProperty(pid));
      },
      setLetterhead(pid, name, thumb) {
        const p = D.props[pid]; if (!p) return Promise.resolve();
        p.durable['assets.letterhead_name'] = { value: name || '', source: 'database', saved_at: today() };
        if (thumb !== undefined) p.durable['assets.letterhead_thumb'] = { value: thumb || '', source: 'database', saved_at: today() };
        touch(pid);
        const patch = { letterhead_asset: name || '', updated_at: now() }; if (thumb !== undefined) patch.letterhead_thumb = thumb || '';
        return enqueue(pid, () => client.from('property').update(patch).eq('id', pid).then(r => { if (r.error) throw r.error; }));
      },
      getLetterhead(pid) {
        const p = D.props[pid]; if (!p) return { name: '', thumb: '' };
        return { name: dv(p, 'assets.letterhead_name'), thumb: dv(p, 'assets.letterhead_thumb') };
      },
      listContacts() { return (D.contacts || []).slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))); },
      async addContact(c) {
        const id = uuid(); const rec = { id, name: (c && c.name) || '', email: (c && c.email) || '', phone: (c && c.phone) || '' };
        D.contacts.push(rec);
        const r = await client.from('pm_contact').insert(rec); if (r.error) throw r.error;
        return id;
      },
      async updateContact(id, patch) {
        const c = (D.contacts || []).find(x => x.id === id); if (c) Object.assign(c, patch || {});
        const r = await client.from('pm_contact').update(patch || {}).eq('id', id); if (r.error) throw r.error;
      },
      async deleteContact(id) {
        D.contacts = (D.contacts || []).filter(x => x.id !== id);
        const r = await client.from('pm_contact').delete().eq('id', id); if (r.error) throw r.error;
      },
      async clearAll() {
        await client.from('property').delete().not('id', 'is', null);
        await client.from('pm_contact').delete().not('id', 'is', null);
        D = { props: {}, contacts: [], activePid: null };
      },
      computeAnalysis, computeSalutation,
    };
  })();
}
if (typeof module !== 'undefined') module.exports = { makeSupabaseDb };
