/* db.cosmos.js — RA Platform (Cosmos DB) data layer for the RCS app.
   Drop-in replacement for makeSupabaseDb(client): same public method surface,
   so app.js/core.js/gen.js run unchanged. Written for the Azure port
   (2026-07-15) per HANDOFF-MKOD §4 and RCS-Automation-Integration-REVIEW §4.

   Model: ONE Cosmos document per property (container RcsProperties, pk /id):
     { id, type:'rcsProperty', raMasterId, created_at, updated_at,
       durable:{ key:{value,saved_at} }, percycle:{ key:{value,saved_at} },
       name, fha, city_state, entity, alias, unit_types, total_units,
       completeness, has_letterhead }          // denormalized gallery summary
   This makes saveFlat ONE atomic upsert (Cosmos single-doc writes are
   transactional) and skips the relational PSCALAR/UCOL decomposition entirely.

   Letterheads (dataURLs up to ~5.5MB) exceed Cosmos's 2MB doc cap, so they
   live as ≤1.4MB chunks in RcsAssets, written via /api/rcs/letterhead and
   re-assembled server-side into the bootstrap payload.

   AUM PREFILL (read-only): the bootstrap payload carries a projection of the
   AUM master registry. aumIndex()/aumPrefill(raid) feed create-time seeding.
   The adapter has NO write path to AUM or any other source container — user
   edits to prefilled values are stored on the RCS property doc only, by
   construction.

   Auth: every request rides the App Service Easy Auth session (cookies);
   the server enforces module view/edit via requireModule(['rcs']). */
function makeCosmosDb() {
  const today = () => new Date().toISOString().slice(0, 10);
  const now = () => new Date().toISOString();
  const uuid = () => (crypto && crypto.randomUUID ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); }));

  async function api(path, opts) {
    const r = await fetch(path, Object.assign({ headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' } }, opts || {}));
    if (!r.ok) {
      let msg = 'HTTP ' + r.status;
      try { msg = (await r.json()).error || msg; } catch (e) { }
      throw new Error(msg);
    }
    return r.json();
  }

  /* ---- in-memory mirror --------------------------------------------------
     Same shape as db.supabase.js's D, plus letterheads + the AUM projection. */
  let D = { props: {}, contacts: [], dir: [], activePid: null, letterheads: {}, aum: [] };

  const place = (p, key, raw, sa) => {
    const cell = { value: (raw == null ? '' : String(raw)), source: 'database', saved_at: sa };
    if (isPerCycleKey(key)) p.percycle[key] = cell; else p.durable[key] = cell;
  };

  async function load() {
    const b = await api('/api/rcs/bootstrap');
    D = { props: {}, contacts: [], dir: [], activePid: null, letterheads: b.letterheads || {}, aum: b.aum || [] };
    (b.props || []).forEach(doc => {
      const p = {
        id: doc.id, raMasterId: doc.raMasterId || '',
        created_at: doc.created_at || '', updated_at: doc.updated_at || doc.created_at,
        durable: {}, percycle: {},
      };
      ['durable', 'percycle'].forEach(bkt => {
        const src = doc[bkt] || {};
        for (let k in src) {
          const cell = src[k]; if (!cell || cell.value == null) continue;
          // legacy key migration (2026-07-16): lihtc.* renamed to ns8.*
          if (k === 'lihtc.enabled') k = 'ns8.enabled';
          else if (k.indexOf('lihtc.') === 0) k = 'ns8.' + k.slice(6);
          // re-route through isPerCycleKey so durable/percycle stay canonical
          place(p, k, cell.value, cell.saved_at || '');
        }
      });
      // letterhead print data lives outside the doc — rejoin it here
      if (D.letterheads[doc.id]) {
        p.durable['assets.letterhead_data'] = { value: D.letterheads[doc.id], source: 'database', saved_at: doc.updated_at || '' };
      }
      D.props[doc.id] = p;
    });
    D.contacts = (b.contacts || []).map(c => ({ id: c.id, name: c.name || '', email: c.email || '', phone: c.phone || '' }));
    const DIRF = ['name', 'email', 'phone', 'prefix', 'org', 'firm', 'title', 'addr_street', 'addr_city', 'addr_state', 'addr_zip'];
    D.dir = (b.dir || []).map(c => { const r = { id: c.id, kind: c.kind || '' }; DIRF.forEach(f => r[f] = c[f] || ''); return r; });
  }

  /* ---- registry helpers (mirror db.supabase.js) --------------------------- */
  const REQUIRED_DURABLE = ['property.name', 'property.s8', 'property.addr_street', 'property.addr_city', 'property.addr_state', 'property.addr_zip', 'owner.entity_name', 'sig.name', 'ca.org', 'ca.name'];
  const dv = (p, k) => (p.durable[k] && p.durable[k].value !== '' ? p.durable[k].value : '');
  const completenessOf = p => REQUIRED_DURABLE.filter(k => dv(p, k) !== '').length / REQUIRED_DURABLE.length;
  function unitCountOf(p) {
    const idx = new Set(); Object.keys(p.durable).forEach(k => { const m = k.match(/^units\.(\d+)\.num_units$/); if (m && p.durable[k].value !== '') idx.add(m[1]); });
    let total = 0; idx.forEach(i => total += num(p.durable['units.' + i + '.num_units'].value)); return { types: idx.size, units: total };
  }
  function merged(pid) { const p = D.props[pid]; return p ? Object.assign({}, p.durable, p.percycle) : {}; }
  function loadFormCells(pid) {
    const b = merged(pid), form = {};
    for (const k in b) { const v = b[k] ? b[k].value : ''; const has = v !== '' && v != null; form[k] = { value: (v == null ? '' : v), source: has ? 'database' : 'new', saved_at: b[k] ? b[k].saved_at : null, prior_value: null, prior_source: null, db_value: has ? v : (b[k] ? '' : null) }; }
    return form;
  }
  const touch = pid => { if (D.props[pid]) D.props[pid].updated_at = now(); };

  /* ---- build the Cosmos doc from the mirror ------------------------------- */
  function buildDoc(pid) {
    const p = D.props[pid];
    const strip = (bkt) => {
      const out = {};
      for (const k in bkt) {
        if (k === 'assets.letterhead_data') continue; // chunked in RcsAssets
        out[k] = { value: bkt[k].value, saved_at: bkt[k].saved_at || '' };
      }
      return out;
    };
    const uc = unitCountOf(p);
    return {
      id: pid, type: 'rcsProperty', raMasterId: p.raMasterId || '',
      created_at: p.created_at, updated_at: now(),
      durable: strip(p.durable), percycle: strip(p.percycle),
      // denormalized gallery summary (kept on the doc so future list-only
      // endpoints never need the full cell map)
      name: dv(p, 'property.name') || '', fha: dv(p, 'property.s8') || dv(p, 'property.fha') || '',
      city_state: (dv(p, 'property.addr_city') || '') + (dv(p, 'property.addr_state') ? ', ' + dv(p, 'property.addr_state') : ''),
      entity: dv(p, 'owner.entity_name') || '', alias: dv(p, 'tenant.property_alias') || '',
      unit_types: uc.types, total_units: uc.units,
      completeness: completenessOf(p),
      has_letterhead: dv(p, 'assets.letterhead_name') !== '',
    };
  }
  async function pushProperty(pid) {
    if (!D.props[pid]) return; // deleted while queued
    await api('/api/rcs/property', { method: 'POST', body: JSON.stringify(buildDoc(pid)) });
  }

  /* ---- per-property write serialization + push coalescing -----------------
     (verbatim pattern from db.supabase.js — see HANDOFF-MKOD §4) */
  const _q = {};
  function enqueue(pid, fn) { const prev = _q[pid] || Promise.resolve(); const next = prev.then(fn, fn); _q[pid] = next.catch(() => { }); return next; }
  const _pend = {};
  function pushSoon(pid) {
    if (_pend[pid]) return _pend[pid].p;
    const t = {}; t.p = new Promise((res, rej) => { t.res = res; t.rej = rej; });
    _pend[pid] = t;
    enqueue(pid, async () => { delete _pend[pid]; try { await pushProperty(pid); t.res(); } catch (e) { t.rej(e); } });
    return t.p;
  }

  /* ---- AUM prefill (READ-ONLY — no write path to source data exists) ------ */
  const AUM_PREFILL = (a) => ({
    'property.name': a.property_name || '',
    'property.addr_street': a.address || a.street_address || '',
    'property.addr_city': a.city || '',
    'property.addr_state': a.state || '',
    'property.addr_zip': String(a.zip || ''),
    'owner.entity_name': a.partnership_name || '',
    'tenant.property_alias': (a.aka_name && a.aka_name !== 'N/A') ? a.aka_name : '',
    'ca.org': a.section_8_contract_administrator || '',
  });

  /* ---- init ---------------------------------------------------------------- */
  return (async () => {
    await load();
    return {
      _raw: () => D,
      today,
      listProperties() {
        return Object.values(D.props).map(p => {
          const uc = unitCountOf(p);
          return {
            id: p.id, name: dv(p, 'property.name') || '(unnamed property)', fha: dv(p, 'property.s8') || dv(p, 'property.fha') || '—',
            city_state: (dv(p, 'property.addr_city') || '') + (dv(p, 'property.addr_state') ? ', ' + dv(p, 'property.addr_state') : ''),
            entity: dv(p, 'owner.entity_name') || '', alias: dv(p, 'tenant.property_alias') || '', unit_types: uc.types, total_units: uc.units,
            completeness: completenessOf(p), created_at: p.created_at, updated_at: p.updated_at || p.created_at,
            has_letterhead: dv(p, 'assets.letterhead_name') !== '',
          };
        }).sort((a, b) => a.name.localeCompare(b.name));
      },
      propertyAnalysis(pid) { return computeAnalysis(loadFormCells(pid)); },
      getActive() { return { pid: D.activePid }; },
      setActive(pid) { if (D.props[pid]) D.activePid = pid; return Promise.resolve(); },
      createProperty(name, raMasterId) {
        const pid = uuid();
        D.props[pid] = { id: pid, raMasterId: raMasterId || '', created_at: today(), updated_at: now(), durable: {}, percycle: {} };
        if (name) D.props[pid].durable['property.name'] = { value: String(name), source: 'database', saved_at: today() };
        // Read-only AUM prefill: seed cells from the master registry. Edits
        // stay on this RCS doc — nothing is ever written back to AUM.
        if (raMasterId) {
          const a = (D.aum || []).find(x => String(x.RAID || x.ra_master_id || '') === String(raMasterId));
          if (a) {
            const map = AUM_PREFILL(a);
            for (const k in map) if (map[k] !== '') place(D.props[pid], k, map[k], today());
          }
        }
        D.activePid = pid;
        pushSoon(pid);
        return { pid };
      },
      renameProperty(pid, name) {
        const p = D.props[pid]; if (!p) return Promise.resolve();
        p.durable['property.name'] = { value: String(name), source: 'database', saved_at: today() }; touch(pid);
        return pushSoon(pid);
      },
      deleteProperty(pid) {
        delete D.props[pid]; delete D.letterheads[pid];
        if (D.activePid === pid) { const rest = Object.keys(D.props); D.activePid = rest.length ? rest[0] : null; }
        return enqueue(pid, () => api('/api/rcs/property-delete', { method: 'POST', body: JSON.stringify({ id: pid }) }));
      },
      loadForm(pid) { return loadFormCells(pid); },
      saveForm(pid, form) {
        const p = D.props[pid]; if (!p) throw new Error('no such property ' + pid);
        for (const k in form) place(p, k, (form[k] && form[k].value != null ? form[k].value : ''), today());
        touch(pid); return pushSoon(pid);
      },
      pruneUnitRows(pid, keepU, keepNR, keepLI, keepP) {
        const p = D.props[pid]; if (!p) return Promise.resolve();
        const ku = new Set((keepU || []).map(String)), kn = new Set((keepNR || []).map(String)), kl = new Set((keepLI || []).map(String)), kp = new Set((keepP || []).map(String));
        const uidx = k => { const r = k.slice(6); const d = r.indexOf('.'); return d > 0 ? r.slice(0, d) : null; };
        const nidx = k => { const r = k.slice(7); const d = r.indexOf('.'); return d > 0 ? r.slice(0, d) : null; };
        [p.durable, p.percycle].forEach(b => Object.keys(b).forEach(k => {
          if (k.indexOf('units.') === 0) { const i = uidx(k); if (i !== null && !ku.has(i)) delete b[k]; }
          else if (k.indexOf('nonrev.') === 0) { const i = nidx(k); if (i !== null && !kn.has(i)) delete b[k]; }
          else if (k.indexOf('ns8.') === 0) { const i = uidx(k); if (i !== null && !kl.has(i)) delete b[k]; }
          else if (keepP && k.indexOf('principals.') === 0) { const r = k.slice(11), d = r.indexOf('.'), i = d > 0 ? r.slice(0, d) : null; if (i !== null && !kp.has(i)) delete b[k]; }
        }));
        touch(pid); return pushSoon(pid);
      },
      getFlat(pid) { return merged(pid); },
      saveFlat(pid, map) {
        const p = D.props[pid]; if (!p) throw new Error('no property ' + pid);
        for (const k in map) place(p, k, (map[k] && map[k].value != null ? map[k].value : ''), (map[k] && map[k].saved_at) ? map[k].saved_at : today());
        touch(pid); return pushSoon(pid);
      },
      setLetterhead(pid, name, thumb, data) {
        const p = D.props[pid]; if (!p) return Promise.resolve();
        p.durable['assets.letterhead_name'] = { value: name || '', source: 'database', saved_at: today() };
        if (thumb !== undefined) p.durable['assets.letterhead_thumb'] = { value: thumb || '', source: 'database', saved_at: today() };
        if (data !== undefined) {
          p.durable['assets.letterhead_data'] = { value: data || '', source: 'database', saved_at: today() };
          D.letterheads[pid] = data || '';
        }
        touch(pid);
        // Chunked upload: ≤1.4MB per request (Cosmos 2MB doc cap + the
        // server's JSON body limit), serialized on the property queue.
        const CH = 1400000;
        const payload = (data !== undefined) ? (data || '') : (D.letterheads[pid] || '');
        const chunks = []; for (let i = 0; i < payload.length; i += CH) chunks.push(payload.slice(i, i + CH));
        const total = chunks.length;
        return enqueue(pid, async () => {
          if (total === 0) {
            await api('/api/rcs/letterhead', { method: 'POST', body: JSON.stringify({ pid, name: name || '', thumb: thumb || '', seq: 0, total: 0 }) });
            return;
          }
          for (let i = 0; i < total; i++) {
            await api('/api/rcs/letterhead', {
              method: 'POST',
              body: JSON.stringify({ pid, name: name || '', thumb: (i === total - 1 ? (thumb || '') : undefined), seq: i, total, chunk: chunks[i] }),
            });
          }
        });
      },
      getLetterhead(pid) {
        const p = D.props[pid]; if (!p) return { name: '', thumb: '', data: '' };
        return { name: dv(p, 'assets.letterhead_name'), thumb: dv(p, 'assets.letterhead_thumb'), data: dv(p, 'assets.letterhead_data') };
      },
      listContacts() { return (D.contacts || []).slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))); },
      async addContact(c) {
        const id = uuid(); const rec = { id, name: (c && c.name) || '', email: (c && c.email) || '', phone: (c && c.phone) || '' };
        D.contacts.push(rec);
        await api('/api/rcs/contact', { method: 'POST', body: JSON.stringify({ op: 'upsert', collection: 'pm', rec }) });
        return id;
      },
      async updateContact(id, patch) {
        const c = (D.contacts || []).find(x => x.id === id); if (c) Object.assign(c, patch || {});
        await api('/api/rcs/contact', { method: 'POST', body: JSON.stringify({ op: 'upsert', collection: 'pm', rec: c || Object.assign({ id }, patch) }) });
      },
      async deleteContact(id) {
        D.contacts = (D.contacts || []).filter(x => x.id !== id);
        await api('/api/rcs/contact', { method: 'POST', body: JSON.stringify({ op: 'delete', collection: 'pm', id }) });
      },
      listDir(kind) { return (D.dir || []).filter(c => c.kind === kind).sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))); },
      async addDir(kind, c) {
        const DIRF = ['name', 'email', 'phone', 'prefix', 'org', 'firm', 'title', 'addr_street', 'addr_city', 'addr_state', 'addr_zip'];
        const id = uuid(); const rec = { id, kind }; DIRF.forEach(f => rec[f] = (c && c[f]) || '');
        D.dir.push(rec);
        await api('/api/rcs/contact', { method: 'POST', body: JSON.stringify({ op: 'upsert', collection: 'dir', rec }) });
        return id;
      },
      async updateDir(id, patch) {
        const c = (D.dir || []).find(x => x.id === id); if (c) Object.assign(c, patch || {});
        await api('/api/rcs/contact', { method: 'POST', body: JSON.stringify({ op: 'upsert', collection: 'dir', rec: c || Object.assign({ id }, patch) }) });
      },
      async deleteDir(id) {
        D.dir = (D.dir || []).filter(x => x.id !== id);
        await api('/api/rcs/contact', { method: 'POST', body: JSON.stringify({ op: 'delete', collection: 'dir', id }) });
      },
      /* AUM prefill surface (read-only) */
      aumValue(pid, k) {
        // Per-cell AUM read for the RASource seam (same mapping as the
        // create-time prefill; read-only by construction).
        const p = D.props[pid]; if (!p || !p.raMasterId) return null;
        const a = (D.aum || []).find(x => String(x.RAID || x.ra_master_id || '') === String(p.raMasterId));
        if (!a) return null;
        const v = AUM_PREFILL(a)[k];
        return (v === undefined || v === '') ? null : v;
      },
      aumIndex() {
        return (D.aum || []).map(a => ({
          raid: String(a.RAID || a.ra_master_id || ''), name: a.property_name || '',
          city: a.city || '', state: a.state || '', units: a.total_units || '',
        })).filter(a => a.raid && a.name).sort((a, b) => a.name.localeCompare(b.name));
      },
      computeAnalysis, computeSalutation,
    };
  })();
}
if (typeof module !== 'undefined') module.exports = { makeCosmosDb };
