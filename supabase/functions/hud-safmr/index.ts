// Supabase Edge Function: hud-safmr
// Looks up HUD Small Area FMRs for the property's address so the app can fill
// the 150%-ceiling column (units.{i}.safmr_hud) in Section 6.
//
// Flow: property address -> Census geocoder (free, no key) -> county FIPS
//       -> HUD FMR API /fmr/data/{fips}99999 -> zip-level SAFMR row.
//
// The HUD USER API token stays server-side: HUD_API_TOKEN env secret if set,
// else Supabase Vault ('hud_api_token') — it must never ship in index.html or git.
// Returns BASE rents; the client applies the x1.5 ceiling + bedroom mapping.

import { createClient } from 'jsr:@supabase/supabase-js@2';

let HUD_TOKEN = Deno.env.get('HUD_API_TOKEN') ?? '';
async function getHudToken(): Promise<string> {
  if (HUD_TOKEN) return HUD_TOKEN;
  // Fall back to Supabase Vault (secret name: hud_api_token) via a
  // service-role-only RPC — the token never appears in code or git.
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data, error } = await admin.rpc('get_hud_token');
  if (error) throw new Error('vault lookup failed: ' + error.message);
  HUD_TOKEN = data || '';
  return HUD_TOKEN;
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const J = (o: unknown, s = 200) =>
    new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });
  try {
    // Require a signed-in user — the platform's verify_jwt lets the public anon
    // key through, so check the JWT's role claim ourselves.
    const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    let role = '';
    try { role = JSON.parse(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role || ''; } catch (_e) { /* fall through */ }
    if (role !== 'authenticated') return J({ error: 'Sign-in required.' }, 401);
    const hudToken = await getHudToken();
    if (!hudToken) return J({ error: 'HUD API token is not configured on the server.' }, 500);

    const { street, city, state, zip, year } = await req.json();
    if (!(street && city && state)) return J({ error: 'Need the property street, city, and state (Section 2).' }, 400);

    // 1) address -> county FIPS via the Census geocoder
    const line = [street, city, state, zip].filter(Boolean).join(', ');
    const gUrl = 'https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?address=' +
      encodeURIComponent(line) + '&benchmark=Public_AR_Current&vintage=Current_Current&format=json&layers=Counties';
    const g = await (await fetch(gUrl)).json();
    const match = g?.result?.addressMatches?.[0];
    const county = match?.geographies?.Counties?.[0];
    if (!county?.GEOID) return J({ error: 'Census geocoder found no match for "' + line + '" — check the Section 2 address.' }, 422);
    const matchedZip = String(zip || match?.addressComponents?.zip || '').slice(0, 5);

    // 2) county -> HUD FMR data; try the requested year, fall back a year, then HUD's latest
    const fips = county.GEOID + '99999';
    const y = parseInt(String(year), 10);
    const tries = [...new Set([...(y >= 2017 && y <= 2099 ? [String(y), String(y - 1)] : []), ''])];
    let data: any = null, lastErr = '';
    for (const yy of tries) {
      const r = await fetch('https://www.huduser.gov/hudapi/public/fmr/data/' + fips + (yy ? '?year=' + yy : ''),
        { headers: { Authorization: 'Bearer ' + hudToken } });
      const body = await r.json().catch(() => null);
      if (r.ok && body?.data?.basicdata) { data = body.data; break; }
      lastErr = body?.error || ('HTTP ' + r.status);
    }
    if (!data) return J({ error: 'HUD FMR lookup failed: ' + lastErr }, 502);

    // 3) pick the property's ZIP row (SAFMR areas return an array; others a single object)
    const rows = Array.isArray(data.basicdata) ? data.basicdata : [data.basicdata];
    const pick = (r: any) => r ? {
      efficiency: r['Efficiency'], br1: r['One-Bedroom'], br2: r['Two-Bedroom'],
      br3: r['Three-Bedroom'], br4: r['Four-Bedroom'],
    } : null;
    const zipRow = Array.isArray(data.basicdata) ? rows.find((r: any) => String(r.zip_code) === matchedZip) : null;
    const areaRow = Array.isArray(data.basicdata) ? rows.find((r: any) => !/^\d{5}$/.test(String(r.zip_code))) : data.basicdata;

    return J({
      year: data.year, county: county.NAME, area_name: data.area_name,
      smallarea: String(data.smallarea_status) === '1', zip: matchedZip,
      zip_rents: pick(zipRow), area_rents: pick(areaRow),
    });
  } catch (e) {
    return J({ error: String((e as Error)?.message || e) }, 500);
  }
});
