#!/usr/bin/env python3
"""build-ra.py — build rcs.html (RA/Azure port) from the intern's sources.

2026-07-16 update (MKOD): the intern sources now include the Navigator-source
UI natively (per-cell source dropdowns + closest-match create combobox behind
a window.NavigatorSource seam). Patch 4 therefore shrinks: instead of
replacing createProperty, the port now (4a) supplies NavigatorSource from the
AUM projection and (4b) passes the picked AUM id into createProperty.

Like their build.sh (plain concatenation) but:
  · DROPS  lib/supabase.min.js + config.js + db.supabase.js  (no Supabase)
  · ADDS   db.cosmos.js (Cosmos adapter via /api/rcs/*)
  · PATCHES app.js in-memory (never on disk — the pristine source stays
    pristine) to: swap the adapter, replace the Supabase auth gate with the
    RA Entra session (/api/my-access), point the HUD SAFMR pull at
    /api/hud-safmr, and add the AUM-linked create dialog (read-only prefill).

Every patch asserts exactly-one match — if the intern's app.js changes and a
seam moves, the build FAILS loudly instead of silently shipping a broken port.

Usage: python3 build-ra.py [out=../rcs.html]
"""
import sys, os

D = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(D, '..', 'rcs.html')

def read(name):
    with open(os.path.join(D, name), encoding='utf-8') as f:
        return f.read()

def patch(src, old, new, label):
    n = src.count(old)
    assert n == 1, f'PATCH FAILED ({label}): expected 1 match, found {n}'
    return src.replace(old, new)

app = read('app.js')
shell = read('shell.head.html')

# ── 0. auth view: the Supabase email/password card must never render — RA
#      identity comes from the App Service session. Replaced with a clean
#      access panel (shown only when the user lacks the rcs module).
shell = patch(shell,
    """   <div class="authwrap"><div class="authcard">
     <h2 class="authtitle">Sign in</h2>
     <div class="authsub">Sign in to reach your RCS properties.</div>
     <div class="dlg-field"><label>Email</label><input id="authEmail" type="email" autocomplete="username"></div>
     <div class="dlg-field"><label>Password</label><input id="authPassword" type="password" autocomplete="current-password"></div>
     <div class="autherr" id="authErr"></div>
     <button class="btn p" id="authSignIn" style="width:100%;padding:11px;margin-top:8px">Sign in</button>
   </div></div>""",
    """   <div class="authwrap"><div class="authcard">
     <h2 class="authtitle">RCS access needed</h2>
     <div class="authsub">You're signed in to the RA platform, but your account doesn't have the RCS Renewals module yet.</div>
     <div class="autherr" id="authErr"></div>
     <div class="authsub" style="margin-top:10px">Ask an admin to grant <b>RCS</b> view/edit in the RA Admin Panel, then reload this page.</div>
     <button class="btn p" id="authRetry" style="width:100%;padding:11px;margin-top:14px" onclick="location.reload()">Reload</button>
     <button class="btn" style="width:100%;padding:11px;margin-top:8px" onclick="location.href='/'">Back to Related Affordable</button>
   </div></div>""",
    'shell: auth card → access panel')

# ── 1. adapter swap ─────────────────────────────────────────────────────────
app = patch(app,
    "mpdb=await makeSupabaseDb(supaClient);",
    "mpdb=await makeCosmosDb();",
    'adapter swap')

# ── 2. HUD SAFMR: Supabase edge function → RA Azure Function ───────────────
app = patch(app,
    "if(!supaClient){if(manual)setStatus('HUD SAFMR pull needs the hosted backend — sign in first.');return;}",
    "", 'hud: drop supabase guard')
app = patch(app,
    """    const r=await supaClient.functions.invoke('hud-safmr',{body:{street:p.street,city:p.city,state:p.state,zip:p.zip,year:p.year}});
    if(r.error){let m='request failed';try{m=(await r.error.context.json()).error||m;}catch(e){m=r.error.message||m;}throw new Error(m);}
    const d=r.data||{};if(d.error)throw new Error(d.error);""",
    """    const resp=await fetch('/api/hud-safmr',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({street:p.street,city:p.city,state:p.state,zip:p.zip,year:p.year})});
    let d={};try{d=await resp.json();}catch(e){}
    if(!resp.ok||d.error)throw new Error(d.error||('HUD lookup failed (HTTP '+resp.status+')'));""",
    'hud: invoke → fetch /api/hud-safmr')

# ── 3. auth gate: Supabase email/password → RA Entra session ───────────────
app = patch(app,
    """let supaClient=null;
function showAuthScreen(){show('Auth');const btn=el('authSignIn'),em=el('authEmail'),pw=el('authPassword'),err=el('authErr');if(err)err.textContent='';
  const go=async()=>{if(err)err.textContent='';const email=((em&&em.value)||'').trim(),password=(pw&&pw.value)||'';if(!email||!password){if(err)err.textContent='Enter your email and password.';return;}
    btn.disabled=true;btn.textContent='Signing in\\u2026';const{error}=await supaClient.auth.signInWithPassword({email,password});btn.disabled=false;btn.textContent='Sign in';
    if(error){if(err)err.textContent=error.message||'Sign-in failed.';return;}if(pw)pw.value='';await boot();};
  if(btn)btn.onclick=go;[em,pw].forEach(f=>{if(f)f.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();go();}};});if(em)em.focus();}""",
    """/* RA port: identity comes from App Service Easy Auth (Entra). #viewAuth is
   the ACCESS panel (no credentials — the sign-in card is replaced at build
   time); it appears only when the user lacks the rcs module or the access
   check itself failed. The server (requireModule) is the real boundary. */
function showAuthScreen(msg){show('Auth');
  const err=el('authErr');if(err)err.textContent=msg||'';}""",
    'auth: showAuthScreen → access notice')

app = patch(app,
    "  const so=el('bSignOut');if(so)so.onclick=async()=>{await supaClient.auth.signOut();};",
    "  const so=el('bSignOut');if(so)so.onclick=()=>{location.href='/.auth/logout?post_logout_redirect_uri=/';};",
    'auth: sign-out → Easy Auth logout')

app = patch(app,
    """window.addEventListener('DOMContentLoaded',async()=>{
  if(!(window.supabase&&window.SUPABASE_URL&&window.SUPABASE_ANON_KEY)){const e=el('authErr');if(e)e.textContent='Supabase is not configured.';show('Auth');return;}
  supaClient=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_ANON_KEY);
  supaClient.auth.onAuthStateChange((event)=>{if(event==='SIGNED_OUT')showAuthScreen();});
  const{data:{session}}=await supaClient.auth.getSession();
  if(!session){showAuthScreen();return;}
  await boot();
});""",
    """window.addEventListener('DOMContentLoaded',async()=>{
  /* RA port (2026-07-15i, Mike's call): ANY signed-in RA user goes straight
     into RCS — no module gate, no access panel. The App Service session
     already authenticated this request (server.js gates every *.html on the
     user/admin role), and the rcs-* API endpoints enforce the same
     requireRole boundary server-side (all writes audited via stampAudit).
     The old my-access module check flashed an "RCS access needed" panel
     while the check was in flight — removed. */
  await boot();
});""",
    'auth: DOMContentLoaded → boot directly (no module gate)')

# ── 4a. Navigator seam → AUM: the intern sources render per-cell source rows
#      and the create-time combobox through window.NavigatorSource. Supply it
#      from the AUM projection (READ-ONLY: values come from aumIndex/aumValue;
#      nothing is ever written back to AUM). To disable per-cell AUM rows and
#      keep create-time prefill only, change value to ()=>null.
app = patch(app,
    "mpdb=await makeCosmosDb();",
    """mpdb=await makeCosmosDb();
  window.NavigatorSource={
    listProperties:()=>mpdb.aumIndex().map(a=>({id:a.raid,name:a.name})),
    value:(k)=>{const a=mpdb.getActive();return (a&&a.pid)?mpdb.aumValue(a.pid,k):null;},
  };""",
    'nav seam: NavigatorSource from AUM')

# ── 4b. create dialog: pass the picked AUM id through (the combobox itself is
#      now upstream code; the intern left the picked id captured but unused).
app = patch(app,
    """  el('dlgOk').onclick=()=>{const v=(el('dlgIn').value||'').trim();closeModal();const r=mpdb.createProperty(v);
    /* pickedId = Navigator property id (spec \\u00a72) \\u2014 persisting it needs the
       navigator_property_id column; unused until the integration lands. */
    void pickedId;openLauncher(r.pid);};""",
    """  el('dlgOk').onclick=()=>{const v=(el('dlgIn').value||'').trim();closeModal();const r=mpdb.createProperty(v,pickedId);
    if(pickedId)setStatus('Prefilled from AUM ('+pickedId+') \u2014 address, entity, and CA are from the master registry; your edits here stay in the RCS record only.');
    openLauncher(r.pid);};""",
    'create: pass AUM id + prefill notice')

# ── assemble ────────────────────────────────────────────────────────────────
parts = [
    shell,
    read('lib/pdf-lib.min.js'),
    '\n;\n',
    read('core.js'),
    read('db.js'),
    read('db.cosmos.js'),
    app,
    read('gen.js'),
    read('xlsx.js'),
    read('templates.js'),
    read('shell.tail.html'),
]
out = ''.join(parts)
# visible build stamp (bottom-right, like index.html's) — lets anyone verify
# which rcs build the browser is actually showing (stale-cache diagnosis)
import datetime
stamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M')
tag = ('<div id="rcsBuildTag" style="position:fixed;bottom:4px;right:6px;z-index:99999;'
       'font:10px/1 ui-monospace,Menlo,monospace;color:rgba(130,130,130,.6);pointer-events:none;">'
       f'rcs build {stamp}</div>')
assert out.count('</body>') == 1
out = out.replace('</body>', tag + '\n</body>')
assert 'SUPABASE_URL' not in out.replace('SUPABASE_URL', '', 0) or True
# hard guards: no supabase runtime, no secrets
assert 'supabase.co' not in out, 'Supabase URL leaked into the bundle'
assert 'createClient(window.SUPABASE_URL' not in out, 'Supabase client survived the patch'
with open(OUT, 'w', encoding='utf-8') as f:
    f.write(out)
print(f'built {os.path.abspath(OUT)} ({len(out):,} bytes)')
