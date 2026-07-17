/* app.js — the whole RCS package form (Rich Review v4), on the keyed-cell store. */
const STATES='AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' ');
const BR_OPTS=['Studio','1BR','2BR','3BR','4BR','5BR']; const BA_OPTS=['1BA','1.5BA','2BA','2.5BA','3BA'];
const ENTITY_TYPES=['Individual','Corporation','General Partnership','Limited Partnership','Joint Tenancy/Tenants in Common','Trust','Other (specify)'];
const FIELD_SECTIONS=[
  {n:2,title:'Property',fields:[{k:'property.name',label:'Property name',col:0},{k:'property.addr',label:'Address',col:0,type:'addr'},{k:'property.fha',label:'FHA / Section 8 #',col:0},{k:'owner.entity_name',label:'Ownership entity',col:1},{k:'owner.entity_type',label:'Entity type',col:1,type:'select',opts:ENTITY_TYPES}]},
  {n:3,title:'Point of contact & signatory',fields:[{k:'poc.name',label:'Point of contact',col:0},{k:'poc.email',label:'Email',col:0},{k:'poc.phone',label:'Phone',col:0,type:'phone'},{k:'owner.gp',label:'General Partner',col:1},{k:'sig.name',label:'Signatory',col:1},{k:'sig.title',label:'Signatory title',col:1}]},
  {n:4,title:'Contract administrator',fields:[{k:'ca.name',label:'Name',col:0,prefix:'ca.prefix'},{k:'ca.position',label:'Position',col:0},{k:'ca.org',label:'CA organization',col:1},{k:'ca.addr',label:'CA address',col:1,type:'caaddr'}]},
  {n:5,title:'Appraiser',fields:[{k:'appr.name',label:'Appraiser name',col:0},{k:'appr.firm',label:'Appraisal company',col:0},{k:'appr.addr',label:'Appraiser address',col:0,type:'appraddr'},{k:'appr.email',label:'Email',col:1},{k:'appr.phone',label:'Phone',col:1,type:'phone'}]},
  {n:9,title:'Tenant notice',fields:[{k:'tenant.sender_name',label:'Sender — name',col:0},{k:'tenant.sender_title',label:'Sender — title',col:0},{k:'tenant.mgmt_address',label:'Management address',col:1,type:'mgmtaddr'},{k:'tenant.property_alias',label:'Property name (as known to tenants)',col:1}]},
];
const ADDR=['property.addr_street','property.addr_city','property.addr_state','property.addr_zip'];
const CA_ADDR=['ca.addr_street','ca.addr_city','ca.addr_state','ca.addr_zip'];
const MGMT_ADDR=['tenant.mgmt_street','tenant.mgmt_city','tenant.mgmt_state','tenant.mgmt_zip'];
const APPR_ADDR=['appr.addr_street','appr.addr_city','appr.addr_state','appr.addr_zip'];
const ADDR_GROUPS={'property.addr':ADDR,'ca.addr':CA_ADDR,'tenant.mgmt':MGMT_ADDR,'appr.addr':APPR_ADDR};
const PARTB={equipment:['Range','Refrigerator','Air Conditioner','Disposal','Dishwasher','Carpet','Drapes'],utilities:['Heating','Cooling','Hot Water','Cooking','Lights, etc.'],services:['Parking','Laundry','Swimming Pool','Tennis Courts','Nursing Care','Linen/Maid Service']};
const CHECKLIST_FLAT=['Signed cover letter','Signed owner’s checklist','Scope of repair','Appraiser’s transmittal letter','Scope of work','Subject description (+ photos)','Subject’s market area ID','Neighborhood description','Selection-of-comparables narrative','Locator map (subject + comps)','Rent comparability grid (per type)','Adjustments & conclusions narrative','Comparable profiles (+ photo)','Appraiser’s certification','Appraiser’s license copy (if temp)','Gross rents computation (project + SAFMR)','Gross rents vs SAFMR comparison'];
const SECTION_TITLES={1:'Source documents',2:'Property',3:'Point of contact & signatory',4:'Contract administrator',5:'Appraiser',6:'Rents & unit mix',7:'Items included in rent (Part B)',8:"Owner’s checklist",9:'Tenant notice',10:'OCAF rent adjustment (HUD-9625)',11:'Utility allowance factors'};
/* HUD publishes exactly four UAF categories per state (UtilAllow_FY file). */
const UAF_UTILS=[['oil','Oil'],['gas','Natural Gas'],['electric','Electric'],['water','Water / Sewer / Trash']];
const D='database',T='this-cycle',O='overridden';
const SEED={ // key manifest only — the VALUES are never read (ALL_KEYS below feeds the store), so no sample data ships in the public bundle
  'property.name':['',D],'property.addr_street':['',D],'property.addr_city':['',D],'property.addr_state':['',D],'property.addr_zip':['',D],'property.fha':['',D],
  'owner.entity_name':['',D],'owner.entity_type':['',D],
  'poc.name':['',D],'poc.email':['',D],'poc.phone':['',D],
  'owner.gp':['',D],'sig.name':['',D],'sig.title':['',D],
  'ca.org':['',D],'ca.prefix':['',D],'ca.name':['',D],'ca.position':['',D],
  'ca.addr_street':['',D],'ca.addr_city':['',D],'ca.addr_state':['',D],'ca.addr_zip':['',D],
  'appr.firm':['',T],'appr.name':['',T],'appr.email':['',T],'appr.phone':['',T],'appr.addr_street':['',T],'appr.addr_city':['',T],'appr.addr_state':['',T],'appr.addr_zip':['',T],
  'units.0.br':['',D],'units.0.ba':['',D],'units.0.num_units':['',D],'units.0.current':['',T],'units.0.proposed':['',T],
  'units.0.ua_exec':['',T],'units.0.ua_rcs':['',T],'units.0.ua_source':['',T],'units.0.ua_reviewed':['',T],'units.0.ua_custom':['',T],
  'units.0.safmr_rcs':['',T],'units.0.safmr_hud':['',T],'units.0.safmr_source':['',T],'units.0.safmr_reviewed':['',T],
  'rent_schedule.date_eff_rs':['',T],'rent_schedule.date_eff_source':['',T],'rent_schedule.date_eff_custom':['',T],'rent_schedule.date_rents_effective':['',T],
  'tenant.sender_name':['',D],'tenant.sender_title':['',D],'tenant.mgmt_source':['',D],'tenant.property_alias':['',D],
  'tenant.mgmt_street':['',D],'tenant.mgmt_city':['',D],'tenant.mgmt_state':['',D],'tenant.mgmt_zip':['',D],
  'ocaf.g':['',T],'ocaf.rate_type':['',D],'ocaf.ds_annual':['',D],'ocaf.ds_t12':['',T],'ocaf.ds_f12':['',T],
  'ocaf.factor_pub':['',T],'ocaf.factor_fy':['',T],'ocaf.factor_pubdate':['',T],'ocaf.factor_src':['',T],'ocaf.factor_custom':['',T],
  'uaf.f_oil':['',T],'uaf.f_gas':['',T],'uaf.f_electric':['',T],'uaf.f_water':['',T],'uaf.factor_fy':['',T],'uaf.factor_pubdate':['',T],
  'units.0.uac_oil':['',T],'units.0.uac_gas':['',T],'units.0.uac_electric':['',T],'units.0.uac_water':['',T],
};
const PB_CHECK={'Range':1,'Refrigerator':1,'Carpet':1,'Heating':1,'Hot Water':1,'Cooking':1,'Parking':1};
const PB_FUEL={0:'G',1:'',2:'G',3:'G',4:''};
Object.entries(PARTB).forEach(([g,items])=>items.forEach((it,i)=>{SEED['partb.'+g+'.'+i]=[PB_CHECK[it]?'1':'',D];}));
Object.entries(PB_FUEL).forEach(([i,f])=>SEED['partb.fuel.'+i]=[f,D]);
['e1','e2','e3','e4','e5','u1','s1','s2','s3','s4','s5','s6'].forEach(id=>{SEED['partb.writein.'+id]=['',D];SEED['partb.writein.'+id+'.on']=['',D];});
SEED['partb.writein.u1.fuel']=['',D];
CHECKLIST_FLAT.forEach((it,i)=>{const off=/scope of repair/i.test(it)||/scope of work/i.test(it);SEED['check.'+i]=[off?'':'1',D];});
const ALL_KEYS=Object.keys(SEED).map(k=>({key:k}));

let mpdb=null, activePid=null, activeCid=null, _cyFresh=null;
const bridge={getDb:async()=>mpdb?(activeCid?mpdb.getFlatCycle(activeCid):mpdb.getFlat(activePid)):{},saveDb:async(m)=>{_cyFresh=null;return activeCid?mpdb.saveFlatCycle(activeCid,m):mpdb.saveFlat(activePid,m);},clearDb:async()=>{}};
const store=makeStore(bridge,ALL_KEYS);
let form=store.emptyForm(); let UNITS=[0]; let NONREV=[]; let NS8=[]; let _undoStack=[]; let _undoNR=[]; let _undoLI=[]; let _pending=null,_refocusSel=null,_pendingSnap=null; let _rcsUpload=null;

const CLR={database:['#2563eb','#e8f0fe','On file'],'this-cycle':['#0f766e','#e9f5f2','API / this cycle'],overridden:['#b45309','#fbf1e6','Overridden'],'auto-calculated':['#2563eb','#e8f0fe','Auto-calc'],'new':['#64748b','#f6f7f9','New']};
const TODAY=new Date().toISOString().slice(0,10);
const el=id=>document.getElementById(id); const get=k=>form[k]?form[k].value:'';
const numf=v=>{const n=parseFloat(String(v||'').replace(/[^0-9.\-]/g,''));return isNaN(n)?0:n;};
const money=n=>'$'+Math.round(n).toLocaleString('en-US');
const money2=n=>'$'+(+n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
function sMoney(n){n=Math.round(n);return(n<0?'-$':'+$')+Math.abs(n).toLocaleString('en-US');}
function sPct(n){n=Math.round(n);return(n<0?'-':'+')+Math.abs(n)+'%';}
function sK(n){return(n<0?'-$':'+$')+Math.abs(Math.round(n/1000))+'K';}
function fmtDate(d){if(!d)return '';const p=String(d).split('-');return p.length===3?p[1]+'/'+p[2]+'/'+p[0]:d;}
function fmtPhone(x){const d=String(x).replace(/\D/g,'').slice(0,10);if(!d)return '';if(d.length<4)return '('+d;if(d.length<7)return '('+d.slice(0,3)+') '+d.slice(3);return '('+d.slice(0,3)+') '+d.slice(3,6)+'-'+d.slice(6);}
function cleanNum(x){return String(x==null?'':x).replace(/[^0-9]/g,'');}
function fmtMoney(x){const d=cleanNum(x);return d?(+d).toLocaleString('en-US'):'';}
function fmtDateInput(x){const d=String(x==null?'':x).replace(/\D/g,'').slice(0,8);if(!d)return '';let o=d.slice(0,2);if(d.length>=3)o+='/'+d.slice(2,4);if(d.length>=5)o+='/'+d.slice(4,8);return o;}
const clamp=n=>Math.max(0,Math.min(100,n));
const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const setStatus=t=>{el('status').textContent=t||'';};
const srcOf=k=>form[k]?form[k].source:'new';
function saveFailed(e){setStatus('\u26a0 Save failed \u2014 this change is NOT in the database yet. Check your connection and try again. ('+((e&&e.message)||e)+')');}
function saveFailedModal(e){dialogConfirm('Save failed','The change did not reach the database \u2014 check your connection and try again.<div class="sub" style="margin-top:7px;color:#8791a5">'+esc((e&&e.message)||e)+'</div>','OK',false,function(){});}
let DBSNAP={};
async function refreshSnap(){DBSNAP=await bridge.getDb();}
function modeOf(kk){const keys=Array.isArray(kk)?kk:[kk];if(keys.some(k=>srcOf(k)==='overridden'))return 'over';if(keys.some(k=>srcOf(k)==='new'&&get(k)!==''&&get(k)!=null))return 'new';return '';}
function ovIcons(kk){const keys=Array.isArray(kk)?kk:[kk];const j=keys.join(',');const m=modeOf(keys);return `<span class="ovic" data-ovic="${j}" data-mode="${m}" style="display:${m?'inline-flex':'none'}"><button class="miniic rv" data-rev="${j}" title="Revert to on-file">↺</button><button class="miniic sv" data-save1="${j}" title="Save this field to the database">✓</button></span>`;}

/* ---- program-driven sections: a cycle's program picks its form ---------- */
function cycleProgs(){if(activeCid&&mpdb){const cy=mpdb.listCycles(activePid).find(c=>c.id===activeCid);if(cy&&cy.programs.length)return cy.programs;}return ['rcs'];}
function hasProg(p){return cycleProgs().indexOf(p)>=0;}
function visibleSections(){const s=new Set();const pr=cycleProgs();
  if(pr.indexOf('rcs')>=0)[1,2,3,4,5,6,7,8,9].forEach(n=>s.add(n));
  if(pr.indexOf('ocaf')>=0)[1,2,3,4,6,7,10].forEach(n=>s.add(n));
  if(pr.indexOf('uaf')>=0)[1,2,3,4,6,7,9,11].forEach(n=>s.add(n));
  return [1,2,3,4,5,6,7,8,9,10,11].filter(n=>s.has(n));}
let _secPos={};
function computeSecPos(){_secPos={};visibleSections().forEach((n,ix)=>_secPos[n]=ix+1);}
function secRef(n){return 'Section '+(_secPos[n]||n);}
function deriveUnits(){const u=new Set([0]),nr=new Set(),lh=new Set();Object.keys(form).forEach(k=>{let m=k.match(/^units\.(\d+)\./);if(m)u.add(+m[1]);m=k.match(/^nonrev\.(\d+)\./);if(m)nr.add(+m[1]);m=k.match(/^ns8\.(\d+)\./);if(m)lh.add(+m[1]);});UNITS=[...u].sort((a,b)=>a-b);NONREV=[...nr].sort((a,b)=>a-b);NS8=[...lh].sort((a,b)=>a-b);}

function defUaSrc(i){const e=numf(get('units.'+i+'.ua_exec')),r=numf(get('units.'+i+'.ua_rcs'));return e>0?'exec':(r>0?'rcs':'custom');}
function defSafmrSrc(i){const h=numf(get('units.'+i+'.safmr_hud')),r=numf(get('units.'+i+'.safmr_rcs'));return h>0?'hud':(r>0?'rcs':'custom');}
function uaResolvedOf(i){const src=get('units.'+i+'.ua_source')||defUaSrc(i);if(src==='rcs')return numf(get('units.'+i+'.ua_rcs'));if(src==='custom')return numf(get('units.'+i+'.ua_custom'));return numf(get('units.'+i+'.ua_exec'));}
function uaConflict(i){return numf(get('units.'+i+'.ua_exec'))!==numf(get('units.'+i+'.ua_rcs'));}
function uaReviewedOf(i){return get('units.'+i+'.ua_reviewed')==='1';}
function uaUnresolved(i){return uaConflict(i)&&!uaReviewedOf(i);}
function safmrResolvedOf(i){const src=get('units.'+i+'.safmr_source')||defSafmrSrc(i);const sh=numf(get('units.'+i+'.safmr_hud')),sr=numf(get('units.'+i+'.safmr_rcs')),sc=numf(get('units.'+i+'.safmr_custom'));return src==='custom'?sc:(src==='rcs'?(sr||sh):(sh||sr));}
function safmrConflictOf(i){const sh=numf(get('units.'+i+'.safmr_hud')),sr=numf(get('units.'+i+'.safmr_rcs'));return sh>0&&sr>0&&sh!==sr;}
function safmrReviewedOf(i){return get('units.'+i+'.safmr_reviewed')==='1';}
function safmrUnresolved(i){return safmrConflictOf(i)&&!safmrReviewedOf(i);}
function analysis(){let cg=0,pg=0,tot=0,sc=0,sp=0,nd=0,ceil=0,safmrMissing=false,safmrConflict=false,safmrOver=0;
  UNITS.forEach(i=>{const n=numf(get('units.'+i+'.num_units')),cur=numf(get('units.'+i+'.current')),pro=numf(get('units.'+i+'.proposed')),ua=uaResolvedOf(i);const safmr=safmrResolvedOf(i);
    cg+=(cur+ua)*n;pg+=(pro+ua)*n;tot+=n;if(safmr>0){ceil+=safmr*n;if(pro>0&&pro>=safmr)safmrOver++;}else if(n>0)safmrMissing=true;if(safmrConflictOf(i))safmrConflict=true;
    if(cur>0&&pro>0){sc+=cur*n;sp+=pro*n;nd+=n;}});
  const perUnit=nd?(sp-sc)/nd:0;const pct=sc?Math.round((sp-sc)/sc*100):0;
  return{cg,pg,ceil,headroom:ceil-pg,pass:(ceil>0&&pg<ceil),perUnit,dMo:pg-cg,dYr:(pg-cg)*12,pct,tot,safmrMissing,safmrConflict,safmrOver};}

function ovBtns(k){return `<button class="revert" data-rev="${k}">↺ revert</button><button class="save1" data-save1="${k}">✓ save this field</button>`;}
function ovNote(kk){const keys=Array.isArray(kk)?kk:[kk];const j=keys.join(',');const m=modeOf(keys);return `<div class="ovnote" data-ov="${j}" data-mode="${m}" style="display:${m?'flex':'none'}"><span class="om-over">changed from stored record</span><span class="om-new">new — not saved yet</span>${ovBtns(j)}</div>`;}
function ovNoteAddr(box){const keys=ADDR_GROUPS[box];const m=modeOf(keys);return `<div class="ovnote" data-ov="${box}" data-mode="${m}" style="display:${m?'flex':'none'}"><span class="om-over">changed from stored record</span><span class="om-new">new — not saved yet</span><button class="revert" data-revaddr="${box}">↺ revert</button><button class="save1" data-save1addr="${box}">✓ save this field</button></div>`;}
function csDrop(key,options,ph,cls,clearable,tint){const cur=get(key);const has=cur!==''&&cur!=null;const lab=has?cur:(ph||'—');const menu=options.map(o=>'<div class="uaopt" data-csopt="'+esc(o)+'" data-cskey="'+key+'">'+esc(o)+'</div>').join('');const clr=(clearable&&has)?'<span class="csclear" data-csclear="'+key+'" title="Clear">✕</span>':'';return '<div class="uadrop cs '+(cls||'')+(clearable?' clearable':'')+'"><div class="uatrigger" tabindex="0" data-trigfor="'+key+'"'+(tint?' style="'+tint+'"':'')+'><span class="ualab">'+esc(lab)+'</span>'+clr+'<span class="cvx">▾</span></div><div class="uamenu">'+menu+'</div></div>';}
function dateEffResolved(){const src=get('rent_schedule.date_eff_source')||(get('rent_schedule.date_eff_rs')?'rs':'custom');return src==='custom'?get('rent_schedule.date_eff_custom'):get('rent_schedule.date_eff_rs');}
function dateEffCell(){const rs=get('rent_schedule.date_eff_rs');const src=get('rent_schedule.date_eff_source')||(rs?'rs':'custom');const custom=get('rent_schedule.date_eff_custom');
  const rsLab=rs?(fmtDate(rs)+' · from RS'):'— · no RS date parsed';
  const lab=(src==='custom')?('<input class="uac-in dateeff-in" data-date="1" data-k="rent_schedule.date_eff_custom" value="'+esc(custom)+'" placeholder="mm/dd/yyyy" autocomplete="off">'):(rs?('<input class="uac-in srcedit" data-srcedit="dateeff" data-date="1" value="'+esc(fmtDate(rs))+'"><span class="srctag">· from RS</span>'):('<span class="ualab">'+esc(rsLab)+'</span>'));
  let state,c;if(src==='custom'){state=srcOf('rent_schedule.date_eff_custom');c=CLR[state]||CLR.new;}else{state=rs?'this-cycle':'new';c=CLR[state];}
  const boxKey=(src==='custom')?'rent_schedule.date_eff_custom':'rent_schedule.date_eff_source';
  const menu='<div class="uamenu">'+srcOptRow('data-deffopt="rs"',rs?esc(fmtDate(rs)):'','Executed RS')+'<div class="uaopt" data-deffopt="custom">Custom…</div></div>';
  return `<div class="field"><div class="flabel">Date rents will be effective</div><div class="fbox uacell" data-box="${boxKey}" style="background:${c[1]};border-left-color:${c[0]}"><div class="uadrop" style="flex:1;min-width:0"><div class="uatrigger" tabindex="0">${lab}<span class="cvx">▾</span></div>${menu}</div>${src==='custom'?ovIcons('rent_schedule.date_eff_custom'):''}</div></div>`;}
function pocSelectContact(ct){form=store.editForm(form,'poc.name',ct.name||'');form=store.editForm(form,'poc.email',ct.email||'');form=store.editForm(form,'poc.phone',fmtPhone(ct.phone||''));}
function pocNote(){const m=modeOf('poc.name');return `<div class="ovnote" data-ov="poc.name" data-mode="${m}" style="display:${m?'flex':'none'}"><span class="om-over">changed from stored record</span><span class="om-new">new — not saved yet</span><button class="revert" data-rev="poc.name,poc.email,poc.phone">↺ revert</button><button class="save1" data-save1="poc.name,poc.email,poc.phone">✓ save this field</button></div>`;}
function pocCell(){const k='poc.name';const contacts=(mpdb?mpdb.listContacts():[]);const cur=get(k);const c=CLR[srcOf(k)]||CLR.new;
  const nvp=raVal('poc.name');
  const navRow=(nvp?'<div class="uaopt" data-pocra="1">'+esc(nvp)+'<span class="uasub">Related Affordable</span></div>':'<div class="uaopt srcdim">\u2014<span class="uasub">Related Affordable \u00b7 not available</span></div>')+'<div class="uaopt srcdim">\u2014<span class="uasub">RCS report \u00b7 not available</span></div>';
  const menu='<div class="uamenu">'+navRow+contacts.map(ct=>'<div class="uaopt" data-pocopt="'+esc(ct.id)+'">'+esc(ct.name)+(ct.email?'<span class="uasub">'+esc(ct.email)+'</span>':'')+'</div>').join('')+'</div>';
  const pick='<div class="uadrop pocpick"><div class="uatrigger" tabindex="0" title="Pick a saved contact"><span class="cvx">&#9662;</span></div>'+menu+'</div>';
  return `<div class="field"><div class="flabel">Point of contact</div><div class="fbox poccell" data-box="${k}" style="background:${c[1]};border-left-color:${c[0]}"><input class="pocname-in" data-k="poc.name" value="${esc(cur)}" placeholder="Type a name, or pick a saved contact" autocomplete="off">${pick}</div>${pocNote()}</div>`;}
/* Saved-contact pickers (appraiser / CA / signatory) — same mechanics as the
   PM point-of-contact cell: picking a saved contact fills its whole section as
   a pending change (Enter commits every filled cell, Esc restores what was
   there, clicking anywhere else annuls the pending group), and the name cell's
   revert / save-this-field buttons act on every autofilled key. */
function dirAddrLine(c){return [c.addr_street,c.addr_city,[c.addr_state,c.addr_zip].filter(Boolean).join(' ')].filter(s=>s&&String(s).trim()).join(', ');}
const DIR_PICK={
 'appr.name':{kind:'appraiser',one:'appraiser',keys:['appr.name','appr.firm','appr.email','appr.phone','appr.addr_street','appr.addr_city','appr.addr_state','appr.addr_zip'],modeKeys:['appr.name'],
  apply:ct=>dirFill([['appr.name',ct.name],['appr.firm',ct.firm],['appr.email',ct.email],['appr.phone',fmtPhone(ct.phone||'')],['appr.addr_street',ct.addr_street],['appr.addr_city',ct.addr_city],['appr.addr_state',ct.addr_state],['appr.addr_zip',ct.addr_zip]]),
  sub:ct=>[ct.firm,dirAddrLine(ct)].filter(Boolean).join(' \u00b7 ')||ct.email||''},
 'ca.name':{kind:'ca',one:'contract administrator',keys:['ca.prefix','ca.name','ca.position','ca.org','ca.addr_street','ca.addr_city','ca.addr_state','ca.addr_zip'],modeKeys:['ca.prefix','ca.name'],
  apply:ct=>dirFill([['ca.prefix',ct.prefix],['ca.name',ct.name],['ca.position',ct.title],['ca.org',ct.org],['ca.addr_street',ct.addr_street],['ca.addr_city',ct.addr_city],['ca.addr_state',ct.addr_state],['ca.addr_zip',ct.addr_zip]]),
  sub:ct=>[ct.title,ct.org,dirAddrLine(ct)].filter(Boolean).join(' \u00b7 ')},
 'sig.name':{kind:'signatory',one:'signatory',keys:['sig.name','sig.title'],modeKeys:['sig.name'],
  apply:ct=>dirFill([['sig.name',ct.name],['sig.title',ct.title]]),
  sub:ct=>ct.title||''},
};
function dirFill(pairs){pairs.forEach(p=>{form=store.editForm(form,p[0],p[1]||'');});}
function dirList(kind){return (mpdb&&mpdb.listDir)?mpdb.listDir(kind):[];}
function dirNote(fk){const P=DIR_PICK[fk];const m=modeOf(P.modeKeys);const j=P.keys.join(',');return `<div class="ovnote" data-ov="${P.modeKeys.join(',')}" data-mode="${m}" style="display:${m?'flex':'none'}"><span class="om-over">changed from stored record</span><span class="om-new">new \u2014 not saved yet</span><button class="revert" data-rev="${j}">\u21ba revert</button><button class="save1" data-save1="${j}">\u2713 save this field</button></div>`;}
function dirCell(f){const k=f.k;const P=DIR_PICK[k];const list=dirList(P.kind);const cur=get(k);
  const st=f.prefix?baseSrc([f.prefix,f.k]):srcOf(k);const c=CLR[st]||CLR.new;const nameTint=(f.prefix&&partHot(k))?tintStyle(k):'';
  const pre=f.prefix?csDrop(f.prefix,['Ms.','Mr.','Dr.','Mx.'],'\u2014','csnarrow',true,partHot(f.prefix)?tintStyle(f.prefix):''):'';
  const srcRow=DIR_SRCROW[k]?('<div class="uaopt srcdim">\u2014<span class="uasub">'+esc(DIR_SRCROW[k])+' \u00b7 not available</span></div>'):'';
  const menu='<div class="uamenu">'+srcRow+list.map(ct=>{const s=P.sub(ct);return '<div class="uaopt" data-dirid="'+esc(ct.id)+'" data-dirfor="'+k+'">'+esc(ct.name)+(s?'<span class="uasub">'+esc(s)+'</span>':'')+'</div>';}).join('')+'</div>';
  const pick=(srcRow||list.length)?('<div class="uadrop pocpick"><div class="uatrigger" tabindex="0" title="Pick a saved '+esc(P.one)+'"><span class="cvx">&#9662;</span></div>'+menu+'</div>'):'';
  return `<div class="field"><div class="flabel">${f.label}</div><div class="fbox poccell" data-box="${k}" style="background:${c[1]};border-left-color:${c[0]}">${pre}<input class="pocname-in" type="text" data-k="${k}" style="${nameTint}" value="${esc(cur)}" placeholder="Type a name, or pick a saved ${esc(P.one)}" autocomplete="off">${pick}</div>${dirNote(k)}</div>`;}
/* ====== External-source dropdowns (Related Affordable / RS / RCS) ======
   Sourced options sit at the top of each cell's dropdown in precedence order;
   a source with no data is a dimmed "\u2014 \u00b7 not available" row, never
   an error. (Spec history: _archive/Kinley/NAVIGATOR-SOURCING-SPEC.md.)
   No Related Affordable (RA) platform provider ships in this build. The RA
   integration plugs in by setting window.RASource before boot:
     listProperties() -> [{id, name}]   portfolio for the New-property picker
     value(flatKey)   -> string|null    the active property's value for a form
                                        flat key (the spec \u00a73 cells)
   value() is called synchronously on every render, so the provider should
   fetch a snapshot when the form opens (copy ensureHudSafmr()'s lifecycle),
   answer from that snapshot, and call renderBody() when fresh data lands.
   Executed-RS / RCS-report rows stay "not available" until document parsing
   lands (still a stub); they render now so all three sources light up
   uniformly. The form never writes back to the RA platform. */
function raProps(){try{const p=window.RASource;const l=(p&&p.listProperties)?p.listProperties():[];return Array.isArray(l)?l:[];}catch(e){return [];}}
function raVal(k){try{const p=window.RASource;const v=(p&&p.value)?p.value(k):null;return (v==null||v==='')?null:String(v);}catch(e){return null;}}
function srcOptRow(attrs,val,tag){return val?('<div class="uaopt" '+attrs+'>'+val+'<span class="uasub">'+esc(tag)+'</span></div>'):('<div class="uaopt srcdim">\u2014<span class="uasub">'+esc(tag)+' \u00b7 not available</span></div>');}
function srcPick(k,rows){
  const menu='<div class="uamenu">'+rows.map(r=> r.val!=null
    ?'<div class="uaopt" data-srck="'+k+'" data-srcv="'+esc(r.val)+'" data-srctag="'+esc(r.tag)+'">'+esc(r.val)+'<span class="uasub">'+esc(r.tag)+'</span></div>'
    :'<div class="uaopt srcdim">\u2014<span class="uasub">'+esc(r.tag)+' \u00b7 not available</span></div>').join('')+'</div>';
  return '<div class="uadrop pocpick"><div class="uatrigger" tabindex="0" title="Pull from a source"><span class="cvx">&#9662;</span></div>'+menu+'</div>';
}
/* Per-cell source rows in precedence order (spec \u00a73). val:null renders dim. */
const SRCPICK_ROWS={
 'property.name':()=>[{tag:'Related Affordable',val:raVal('property.name')},{tag:'RCS report',val:null}],
 'property.fha':()=>[{tag:'Executed RS',val:null},{tag:'Related Affordable',val:raVal('property.fha')},{tag:'RCS report',val:null}],
 'owner.entity_name':()=>[{tag:'Executed RS',val:null},{tag:'Related Affordable',val:raVal('owner.entity_name')}],
 'owner.gp':()=>[{tag:'Executed RS',val:null}],
 'sig.title':()=>[{tag:'Executed RS',val:null}],
 'appr.firm':()=>[{tag:'RCS report',val:null}],
 'appr.email':()=>[{tag:'RCS report',val:null}],
 'appr.phone':()=>[{tag:'RCS report',val:null}],
 'tenant.sender_name':()=>[{tag:'Related Affordable',val:raVal('tenant.sender_name')}],
};
/* Address groups: one dropdown pulls the whole street/city/state/zip group. */
const SRCGROUP={
 'property.addr':()=>{const st=raVal('property.addr_street'),ci=raVal('property.addr_city'),sa=raVal('property.addr_state'),zp=raVal('property.addr_zip');
   return [{tag:'Related Affordable',apply:(st||ci||sa||zp)?{'property.addr_street':st||'','property.addr_city':ci||'','property.addr_state':sa||'','property.addr_zip':zp||''}:null},{tag:'RCS report',apply:null}];},
 'appr.addr':()=>[{tag:'RCS report',apply:null}],
};
function srcGroupPick(box){const rows=SRCGROUP[box]().map((r,ix)=> r.apply
  ?'<div class="uaopt" data-srcgrp="'+box+'" data-srcgix="'+ix+'">'+esc(r.apply[Object.keys(r.apply)[0]])+'\u2026<span class="uasub">'+esc(r.tag)+'</span></div>'
  :'<div class="uaopt srcdim">\u2014<span class="uasub">'+esc(r.tag)+' \u00b7 not available</span></div>').join('');
  return '<div class="uadrop pocpick"><div class="uatrigger" tabindex="0" title="Pull from a source"><span class="cvx">&#9662;</span></div><div class="uamenu">'+rows+'</div></div>';}
/* Dim source rows atop the existing contact-picker menus (spec \u00a73 notes). */
const DIR_SRCROW={'appr.name':'RCS report','sig.name':'Executed RS'};
function moneySrcTag(k){if(/^units\.\d+\.current$/.test(k))return 'Executed RS';if(/^units\.\d+\.proposed$/.test(k))return 'RCS report';if(/^nonrev\.\d+\.rent$/.test(k))return 'Executed RS';return null;}
function dimPick(tag){return '<div class="uadrop pocpick"><div class="uatrigger" tabindex="0" title="Source"><span class="cvx">&#9662;</span></div><div class="uamenu"><div class="uaopt srcdim">\u2014<span class="uasub">'+esc(tag)+' \u00b7 not available</span></div></div></div>';}
/* ================== end external-source dropdowns ================== */
function fieldCell(f){if(f.type==='addr')return addrCell();if(f.type==='caaddr')return caAddrCell();if(f.type==='appraddr')return apprAddrCell();if(f.type==='mgmtaddr')return mgmtCell();if(f.type==='select')return selectCell(f);if(f.k==='poc.name')return pocCell();if(DIR_PICK[f.k])return dirCell(f);
  const s=form[f.k]||{value:'',source:'new'};
  const st=f.prefix?baseSrc([f.prefix,f.k]):s.source;const c=CLR[st]||CLR.new;
  const pre=f.prefix?csDrop(f.prefix,['Ms.','Mr.','Dr.','Mx.'],'—','csnarrow',true,partHot(f.prefix)?tintStyle(f.prefix):''):'';
  return `<div class="field"><div class="flabel">${f.label}</div><div class="fbox" data-box="${f.k}" style="background:${c[1]};border-left-color:${c[0]}">${pre}<input type="text" data-k="${f.k}" style="${f.prefix&&partHot(f.k)?tintStyle(f.k):''}"${f.type==='phone'?' data-phone="1" inputmode="tel" maxlength="14"':''} value="${esc(s.value)}" autocomplete="off">${SRCPICK_ROWS[f.k]?srcPick(f.k,SRCPICK_ROWS[f.k]()):''}</div>${ovNote(f.prefix?[f.prefix,f.k]:f.k)}</div>`;}
function addrCell(){return compAddrCell(ADDR,'property.addr','Address');}
function caAddrCell(){return compAddrCell(CA_ADDR,'ca.addr','CA address');}
function apprAddrCell(){return compAddrCell(APPR_ADDR,'appr.addr','Appraiser address');}
function selectCell(f){const c=CLR[srcOf(f.k)]||CLR.new;let dd=csDrop(f.k,f.opts,f.ph||'Select…');
  if(f.k==='owner.entity_type'){const nv=raVal('owner.entity_type');
    const navRows='<div class="uaopt srcdim">\u2014<span class="uasub">Executed RS \u00b7 not available</span></div>'
      +(nv?'<div class="uaopt" data-cskey="owner.entity_type" data-csopt="'+esc(nv)+'">'+esc(nv)+'<span class="uasub">Related Affordable</span></div>'
          :'<div class="uaopt srcdim">\u2014<span class="uasub">Related Affordable \u00b7 not available</span></div>');
    dd=dd.replace('<div class="uamenu">','<div class="uamenu">'+navRows);}
  return `<div class="field"><div class="flabel">${f.label}</div><div class="fbox seldrop" data-box="${f.k}" style="background:${c[1]};border-left-color:${c[0]}">${dd}${ovIcons(f.k)}</div>${ovNote(f.k)}</div>`;}
function compAddrCell(keys,box,label){const a=baseSrc(keys);const c=CLR[a]||CLR.new;const ti=k=>partHot(k)?(';'+tintStyle(k)):'';
  return `<div class="field"><div class="flabel">${label}</div><div class="fbox addr" data-box="${box}" style="background:${c[1]};border-left-color:${c[0]}">
     <input type="text" data-k="${keys[0]}" value="${esc(get(keys[0]))}" placeholder="Street" style="flex:2.2${ti(keys[0])}"><span class="adiv"></span>
     <input type="text" data-k="${keys[1]}" value="${esc(get(keys[1]))}" placeholder="City" style="flex:1.3${ti(keys[1])}"><span class="adiv"></span>
     ${csDrop(keys[2],STATES,'ST','csnarrow',false,partHot(keys[2])?tintStyle(keys[2]):'')}<span class="adiv"></span>
     <input type="text" data-k="${keys[3]}" value="${esc(get(keys[3]))}" placeholder="ZIP" style="width:64px${ti(keys[3])}">${SRCGROUP[box]?srcGroupPick(box):''}</div>
   ${ovNoteAddr(box)}</div>`;}
function mgmtCell(){const src=get('tenant.mgmt_source')||'property';const propHas=ADDR.some(k=>get(k)!=='');
  if(src==='custom'){const a=baseSrc(MGMT_ADDR);const c=CLR[a]||CLR.new;const ti=k=>partHot(k)?(';'+tintStyle(k)):'';
    return `<div class="field"><div class="flabel">Management address <span class="mgmtswitch" data-mgmt="property">↺ use property address</span></div><div class="fbox addr" data-box="tenant.mgmt" style="background:${c[1]};border-left-color:${c[0]}">
       <input type="text" data-k="tenant.mgmt_street" value="${esc(get('tenant.mgmt_street'))}" placeholder="Street" style="flex:2.2${ti('tenant.mgmt_street')}"><span class="adiv"></span>
       <input type="text" data-k="tenant.mgmt_city" value="${esc(get('tenant.mgmt_city'))}" placeholder="City" style="flex:1.3${ti('tenant.mgmt_city')}"><span class="adiv"></span>
       ${csDrop('tenant.mgmt_state',STATES,'ST','csnarrow',false,partHot('tenant.mgmt_state')?tintStyle('tenant.mgmt_state'):'')}<span class="adiv"></span>
       <input type="text" data-k="tenant.mgmt_zip" value="${esc(get('tenant.mgmt_zip'))}" placeholder="ZIP" style="width:64px${ti('tenant.mgmt_zip')}"></div>
     ${ovNoteAddr('tenant.mgmt')}</div>`;}
  const pretty=propHas?(get('property.addr_street')+', '+get('property.addr_city')+' '+get('property.addr_state')+' '+get('property.addr_zip')).replace(/\s+/g,' ').replace(/^,\s*/,'').trim():'';
  const inner=propHas?('<span class="mgmtprop">'+esc(pretty)+'</span><span class="srctag">· property</span>'):('<span class="mgmtph">Set the property address in Section 2, or pick a different address</span>');
  const menu='<div class="uamenu"><div class="uaopt" data-mgmt="property">Use property address</div><div class="uaopt" data-mgmt="custom">Different address…</div></div>';
  const ovSrc=srcOf('tenant.mgmt_source')==='overridden';const c=ovSrc?CLR.overridden:CLR[propHas?'database':'new'];
  return '<div class="field"><div class="flabel">Management address</div><div class="fbox mgmtcell" data-box="tenant.mgmt_address" style="background:'+c[1]+';border-left-color:'+c[0]+'"><div class="uadrop"><div class="uatrigger" tabindex="0"><span class="ualab">'+inner+'</span><span class="cvx">▾</span></div>'+menu+'</div>'+(ovSrc?ovIcons('tenant.mgmt_source'):'')+'</div></div>';}
function renderFieldSection(sec){const cols=[[],[]];sec.fields.forEach(f=>cols[f.col].push(fieldCell(f)));return card(sec.n,sectionPill(sec.n),`<div class="cols"><div>${cols[0].join('')}</div><div>${cols[1].join('')}</div></div>`);}

function boxColor(k){return CLR[srcOf(k)]||CLR.new;}
function moneyBox(k){const c=boxColor(k);const _mt=moneySrcTag(k);return `<div class="rbox money" data-box="${k}" style="background:${c[1]};border-left-color:${c[0]}"><span class="cur">$</span><input type="text" data-money="1" data-k="${k}" value="${esc(fmtMoney(get(k)))}">${_mt?dimPick(_mt):''}${ovIcons(k)}</div>`;}
function numBox(k,ph){const c=boxColor(k);return `<div class="rbox" data-box="${k}" style="background:${c[1]};border-left-color:${c[0]}"><input type="text" data-k="${k}" value="${esc(get(k))}" placeholder="${esc(ph||'')}">${ovIcons(k)}</div>`;}
function brbaBox(brK,baK){const st=baseSrc([brK,baK]);const c=CLR[st]||CLR.new;
  return `<div class="rbox brba" data-box="${brK}" style="background:${c[1]};border-left-color:${c[0]}">${csDrop(brK,BR_OPTS,'BR','',true,partHot(brK)?tintStyle(brK):'')}<span class="slash">/</span>${csDrop(baK,BA_OPTS,'BA','',true,partHot(baK)?tintStyle(baK):'')}${ovIcons([brK,baK])}</div>`;}
function uaBox(i){const src=get('units.'+i+'.ua_source')||defUaSrc(i),exec=get('units.'+i+'.ua_exec'),rcs=get('units.'+i+'.ua_rcs'),custom=get('units.'+i+'.ua_custom');
  const hasAny=numf(exec)>0||numf(rcs)>0||numf(custom)>0;
  const lab=src==='rcs'?('$<input class="uac-in srcedit" data-srcedit="ua" data-si="'+i+'" data-money="1" value="'+esc(fmtMoney(rcs))+'"><span class="srctag">· RCS report</span>'):(src==='custom'?('$<input class="uac-in" data-money="1" data-k="units.'+i+'.ua_custom" value="'+esc(fmtMoney(custom))+'" placeholder="0">'):('$<input class="uac-in srcedit" data-srcedit="ua" data-si="'+i+'" data-money="1" value="'+esc(fmtMoney(exec))+'"><span class="srctag">· Executed RS</span>'));
  let state,c;if(src==='custom'){state=srcOf('units.'+i+'.ua_custom');c=CLR[state]||CLR.new;}else{state=hasAny?'this-cycle':'new';const overSrc=srcOf('units.'+i+'.ua_source')==='overridden';if(uaUnresolved(i)||overSrc)state='overridden';c=CLR[state];}const boxKeyUA=src==='custom'?('units.'+i+'.ua_custom'):('units.'+i+'.ua_source');
  const menu='<div class="uamenu">'+srcOptRow('data-uaopt="exec" data-uai="'+i+'"',(exec!==''&&exec!=null)?('$'+fmtMoney(exec)):'','Executed RS')+srcOptRow('data-uaopt="rcs" data-uai="'+i+'"',(rcs!==''&&rcs!=null)?('$'+fmtMoney(rcs)):'','RCS report')+'<div class="uaopt" data-uaopt="custom" data-uai="'+i+'">Custom…</div></div>';
  return '<div class="rbox uacell" data-box="'+boxKeyUA+'" style="background:'+c[1]+';border-left-color:'+c[0]+'"><div class="uadrop"><div class="uatrigger" tabindex="0"><span class="ualab">'+lab+'</span><span class="cvx">▾</span></div>'+menu+'</div>'+(src==='custom'?ovIcons('units.'+i+'.ua_custom'):ovIcons('units.'+i+'.ua_source'))+'</div>';}
function uaNoteCell(i){const conf=uaConflict(i),overSrc=srcOf('units.'+i+'.ua_source')==='overridden';if(!conf&&!overSrc)return '';const ex=get('units.'+i+'.ua_exec'),rc=get('units.'+i+'.ua_rcs');
  if(conf&&uaUnresolved(i))return '<div class="ucnote warn">⚠ exec $'+ex+' · RCS $'+rc+' <span class="pick"><button class="urev sv" data-uaok="'+i+'">approve $'+uaResolvedOf(i)+'</button></span></div>';
  const src=get('units.'+i+'.ua_source')||defUaSrc(i);const chosen=src==='rcs'?'RCS':(src==='custom'?'custom':'exec RS');
  return '<div class="ucnote ok">✓ '+chosen+(src==='custom'?'':' ($'+uaResolvedOf(i)+')')+'</div>';}
function typeConflict(i){const br=get('units.'+i+'.br'),ba=get('units.'+i+'.ba'),brR=get('units.'+i+'.br_rcs'),baR=get('units.'+i+'.ba_rcs');const has=(brR!==''&&brR!=null)||(baR!==''&&baR!=null);return has&&((brR&&brR!==br)||(baR&&baR!==ba));}
function typeReviewedOf(i){return get('units.'+i+'.type_reviewed')==='1';}
function typeUnresolved(i){return typeConflict(i)&&!typeReviewedOf(i);}
function numConflict(i){const nR=get('units.'+i+'.num_rcs');return (nR!==''&&nR!=null)&&numf(nR)!==numf(get('units.'+i+'.num_units'));}
function numReviewedOf(i){return get('units.'+i+'.num_reviewed')==='1';}
function numUnresolved(i){return numConflict(i)&&!numReviewedOf(i);}
function unitTypeCell(i){const brK='units.'+i+'.br',baK='units.'+i+'.ba';const conf=typeUnresolved(i);const st=conf?'overridden':baseSrc([brK,baK]);const c=CLR[st]||CLR.new;
  return `<div class="rbox brba" data-box="${brK}" style="background:${c[1]};border-left-color:${c[0]}">${csDrop(brK,BR_OPTS,'BR','',true,(!conf&&partHot(brK))?tintStyle(brK):'')}<span class="slash">/</span>${csDrop(baK,BA_OPTS,'BA','',true,(!conf&&partHot(baK))?tintStyle(baK):'')}${ovIcons([brK,baK])}</div>`;}
function unitCountCell(i){const k='units.'+i+'.num_units';const st=numUnresolved(i)?'overridden':srcOf(k);const c=CLR[st]||CLR.new;return `<div class="rbox" data-box="${k}" style="background:${c[1]};border-left-color:${c[0]}"><input type="text" data-k="${k}" value="${esc(get(k))}">${ovIcons(k)}</div>`;}
function typeNote(i){if(!typeConflict(i))return '';const br=get('units.'+i+'.br'),ba=get('units.'+i+'.ba'),brR=get('units.'+i+'.br_rcs')||br,baR=get('units.'+i+'.ba_rcs')||ba;
  if(typeUnresolved(i))return '<div class="ucnote warn">⚠ RS '+br+'/'+ba+' · RCS '+brR+'/'+baR+' <span class="pick"><button class="urev" data-typ="rs" data-ci="'+i+'">keep RS</button><button class="urev sv" data-typ="rcs" data-ci="'+i+'">use RCS</button></span></div>';
  return '<div class="ucnote ok">✓ RS · '+br+'/'+ba+'</div>';}
function numNote(i){if(!numConflict(i))return '';const n=get('units.'+i+'.num_units'),nR=get('units.'+i+'.num_rcs');
  if(numUnresolved(i))return '<div class="ucnote warn">⚠ RS '+n+' · RCS '+nR+' <span class="pick"><button class="urev" data-num="rs" data-ci="'+i+'">keep RS</button><button class="urev sv" data-num="rcs" data-ci="'+i+'">use RCS</button></span></div>';
  return '<div class="ucnote ok">✓ RS · '+n+'</div>';}
function safmrBox(i){const src=get('units.'+i+'.safmr_source')||defSafmrSrc(i),hud=get('units.'+i+'.safmr_hud'),rcs=get('units.'+i+'.safmr_rcs'),custom=get('units.'+i+'.safmr_custom');
  const hasAny=numf(hud)>0||numf(rcs)>0||numf(custom)>0;
  const lab=src==='rcs'?('$<input class="uac-in srcedit" data-srcedit="safmr" data-si="'+i+'" data-money="1" value="'+esc(fmtMoney(rcs))+'"><span class="srctag">· RCS</span>'):(src==='custom'?('$<input class="uac-in" data-money="1" data-k="units.'+i+'.safmr_custom" value="'+esc(fmtMoney(custom))+'" placeholder="0">'):('$<input class="uac-in srcedit" data-srcedit="safmr" data-si="'+i+'" data-money="1" value="'+esc(fmtMoney(hud))+'"><span class="srctag">· HUD</span>'));
  let state,c;if(src==='custom'){state=srcOf('units.'+i+'.safmr_custom');c=CLR[state]||CLR.new;}else{state=hasAny?'this-cycle':'new';const overSrc=srcOf('units.'+i+'.safmr_source')==='overridden';if(safmrUnresolved(i)||overSrc)state='overridden';c=CLR[state];}const boxKeySA=src==='custom'?('units.'+i+'.safmr_custom'):('units.'+i+'.safmr_source');
  const menu='<div class="uamenu">'+srcOptRow('data-safmropt="hud" data-safmri="'+i+'"',(hud!==''&&hud!=null)?('$'+fmtMoney(hud)):'','HUD API')+srcOptRow('data-safmropt="rcs" data-safmri="'+i+'"',(rcs!==''&&rcs!=null)?('$'+fmtMoney(rcs)):'','RCS report')+'<div class="uaopt" data-safmropt="custom" data-safmri="'+i+'">Custom…</div></div>';
  return '<div class="rbox uacell" data-box="'+boxKeySA+'" style="background:'+c[1]+';border-left-color:'+c[0]+'"><div class="uadrop"><div class="uatrigger" tabindex="0"><span class="ualab">'+lab+'</span><span class="cvx">▾</span></div>'+menu+'</div>'+(src==='custom'?ovIcons('units.'+i+'.safmr_custom'):ovIcons('units.'+i+'.safmr_source'))+'</div>';}
function safmrNote(i){const res=safmrResolvedOf(i),hud=numf(get('units.'+i+'.safmr_hud')),rcs=numf(get('units.'+i+'.safmr_rcs'));
  if(safmrUnresolved(i))return '<div class="ucnote warn">⚠ HUD $'+hud+' · RCS $'+rcs+' <span class="pick"><button class="urev sv" data-safmrok="'+i+'">approve $'+res+'</button></span></div>';
  if(res>0){const pro=numf(get('units.'+i+'.proposed'));if(pro>0)return '<div class="ucnote '+(pro<res?'ok':'warn')+'">'+(pro<res?'✓ ':'✗ ')+'$'+pro.toLocaleString()+(pro<res?' < ':' ≥ ')+'$'+res.toLocaleString()+' · 150% SAFMR</div>';return '<div class="ucnote ok">150% SAFMR $'+res.toLocaleString()+'</div>';}
  if(numf(get('units.'+i+'.num_units'))>0)return '<div class="ucnote warn">⚠ needed for the 150% test</div>';
  return '';}
/* Rent-schedule capacity. Part A prints 11 rows: the Section 8 rows, then
   (when non-S8 units exist) a banner row + those rows; non-rev rows print in
   Part D, which holds 5. Warn whenever a generated document would trim data. */
function rsCapacity(){
  const R=UNITS.filter(i=>numf(get('units.'+i+'.num_units'))||numf(get('units.'+i+'.proposed'))||get('units.'+i+'.br')||get('units.'+i+'.ba')).length;
  const L=get('ns8.enabled')==='1'?NS8.filter(i=>get('ns8.'+i+'.br')||get('ns8.'+i+'.ba')||get('ns8.'+i+'.avg_rent')||numf(get('ns8.'+i+'.num_units'))>0).length:0;
  const N=NONREV.filter(i=>get('nonrev.'+i+'.use')||get('nonrev.'+i+'.br')||get('nonrev.'+i+'.ba')||get('nonrev.'+i+'.rent')||numf(get('nonrev.'+i+'.num_units'))>0).length;
  const cut=Math.max(0,R+(L?1+L:0)-11);
  const nrOver=Math.max(0,N-5);
  const msgs=[],flags=[];
  if(cut){msgs.push('Too many unit types \u2014 rent schedule Part A holds 11 rows'+(L?(' and your '+R+' Section 8 + banner + '+L+' non-Section 8 rows need '+(R+1+L)):'')+'. The last '+cut+' row'+(cut>1?'s':'')+' will be left off the generated rent schedule.');
    flags.push(cut+' unit-type row'+(cut>1?'s':'')+' over the rent schedule\u2019s 11-row limit');}
  if(nrOver){msgs.push('Rent schedule Part D holds 5 non-revenue rows \u2014 the last '+nrOver+' will be left off (and out of the Part D rent total).');
    flags.push(nrOver+' non-revenue unit'+(nrOver>1?'s':'')+' over Part D\u2019s 5 rows');}
  return {R,L,N,cut,nrOver,msgs,flags};
}
function capNote(){const c=rsCapacity();if(!c.msgs.length)return '';return '<div class="ucnote warn" style="display:block;margin:0 0 10px">\u26a0 '+c.msgs.map(esc).join('<br>')+'</div>';}
function refreshFlags(){document.querySelectorAll('[data-pill]').forEach(p=>{const n=+p.getAttribute('data-pill');const st=sectionStatus(n);p.className='pill '+(st==='warn'?'warn':'ok');p.textContent=st==='warn'?'review':'confirmed';});renderRail();renderAttention();}
function unitCard(i,pos){const trash=UNITS.length>1?`<button class="trash" data-delunit="${i}" title="Delete this unit type">✕</button>`:'';
  const _c=numf(get('units.'+i+'.current')),_p=numf(get('units.'+i+'.proposed'));const _d=_p-_c,_pc=_c>0?Math.round(_d/_c*100):0;
  const metric=(_c>0&&_p>0)?`<span class="ucmetric" data-metric="${i}" style="color:${_d>=0?'#166534':'#b91c1c'}">${sMoney(_d)} / unit · ${sPct(_pc)}</span>`:`<span class="ucmetric" data-metric="${i}"></span>`;
  const notes=[typeNote(i),numNote(i),uaNoteCell(i),safmrNote(i)].filter(Boolean).join('');
  const sub=((_c>0&&_p>0)||notes)?`<div class="urnotes"><div class="urnmetric">${metric}</div><div class="urnsub">${notes}</div></div>`:'';
  return `<div class="urow"><div class="ucells">${unitTypeCell(i)}${unitCountCell(i)}${moneyBox('units.'+i+'.current')}${moneyBox('units.'+i+'.proposed')}${uaBox(i)}${safmrBox(i)}<div class="urx">${trash}</div></div>${sub}</div>`;}
function renderRents(){
  const cards=UNITS.map((i,pos)=>unitCard(i,pos)).join('');
  const nrOn=get('nonrev.enabled')==='1'||NONREV.length>0;
  let pd=`<div class="pdhead"><label class="ns8flag"><input type="checkbox" id="nonrevToggle"${nrOn?' checked':''}><span>This property has non-revenue units (Part D)</span></label>${nrOn?' <span class="sub">from the prior rent schedule — model / manager’s unit, etc.; excluded from rent totals</span>':''}</div>`;
  if(nrOn){
    if(NONREV.length)pd+=`<div class="rgh"><span style="grid-column:1">Unit type</span><span style="grid-column:2">Units</span><span style="grid-column:3">Contract rent</span><span style="grid-column:4/6">Use</span></div>`+NONREV.map(i=>`<div class="pdrow"><div style="grid-column:1">${brbaBox('nonrev.'+i+'.br','nonrev.'+i+'.ba')}</div><div style="grid-column:2">${numBox('nonrev.'+i+'.num_units','')}</div><div style="grid-column:3">${moneyBox('nonrev.'+i+'.rent')}</div><div style="grid-column:4/6">${numBox('nonrev.'+i+'.use',"e.g. Manager’s unit")}</div><div class="urx" style="grid-column:7"><button class="trash" data-delnonrev="${i}" title="Delete">✕</button></div></div>`).join('');
    pd+=`<div class="addrow" id="addNonrev">+ Add non-revenue unit</div>`;
  }
  pd+=undoBits('NR');
  const lhOn=get('ns8.enabled')==='1';
  let lh=`<div class="pdhead"><label class="ns8flag"><input type="checkbox" id="ns8Toggle"${lhOn?' checked':''}><span>This property has non-Section 8 revenue producing units</span></label>${lhOn?' <span class="sub">listed on the rent schedule as unit type + average unit rent</span>':''}</div>`;
  if(lhOn){
    if(NS8.length)lh+=`<div class="rgh"><span style="grid-column:1">Unit type</span><span style="grid-column:2">Units</span><span style="grid-column:3">Average unit rent</span></div>`+NS8.map(i=>`<div class="pdrow"><div style="grid-column:1">${brbaBox('ns8.'+i+'.br','ns8.'+i+'.ba')}</div><div style="grid-column:2">${numBox('ns8.'+i+'.num_units','')}</div><div style="grid-column:3">${moneyBox('ns8.'+i+'.avg_rent')}</div><div class="urx" style="grid-column:7"><button class="trash" data-delns8="${i}" title="Delete">✕</button></div></div>`).join('');
    lh+=`<div class="addrow" id="addNs8">+ Add non-Section 8 unit type</div>`;
  }
  lh+=undoBits('LI');
  const rgHead='<div class="rgh"><span>Unit type</span><span>Units</span><span>Current rent</span><span>Proposed rent</span><span>Utility allowance</span><span class="safmrhead">150% SAFMR<button class="urev hudbtn" id="pullSafmr" title="Re-pull 150% ceilings from HUD for this property’s ZIP">⤓ HUD</button></span><span></span></div>';
  return card(6,sectionPill(6),`<div class="reseff">${dateEffCell()}</div>${capNote()}<div class="ucards">${UNITS.length?rgHead:''}${cards}</div><div class="addrow" id="addUnit">+ Add unit type</div>${_undoStack.length?(' <span class="addrow ghostlink" id="undoUnit">↩ Undo delete'+(_undoStack.length>1?(' ('+_undoStack.length+')'):'')+'</span><button class="undocommit" id="undoCommit" title="Keep deletions — dismiss undo">✓</button>'):''}<div class="partd">${lh}</div><div class="partd">${pd}</div>`);}

const SAFMR_BR_KEY={'Studio':'efficiency','1BR':'br1','2BR':'br2','3BR':'br3','4BR':'br4'};
let _hud={key:'',data:null,inflight:null};let _hudTimer=null;
function scheduleHudRefresh(){clearTimeout(_hudTimer);_hudTimer=setTimeout(()=>{ensureHudSafmr({});},900);}
function hudCeil(rents,br){let base=0;const bk=SAFMR_BR_KEY[br];
  if(bk)base=numf(rents[bk]);
  else{const m=String(br).match(/^(\d+)BR/);const n=m?+m[1]:0;if(n>4)base=numf(rents.br4)*(1+0.15*(n-4));} // HUD rule: >4BR = 4BR FMR +15% per extra bedroom
  return base>0?String(Math.round(base*1.5)):'';}
function hudParams(){const zip=String(get('property.addr_zip')||'').replace(/\D/g,'').slice(0,5);
  const de=dateEffResolved();const _ym=String(de||'').match(/\d{4}/);const year=_ym?parseInt(_ym[0],10):(new Date()).getFullYear();
  return{zip,year,street:get('property.addr_street'),city:get('property.addr_city'),state:get('property.addr_state')};}
function applyHudSafmr(){if(!_hud.data)return 0;const rents=_hud.data.zip_rents||_hud.data.area_rents;if(!rents)return 0;
  let changed=0;UNITS.forEach(i=>{const br=get('units.'+i+'.br');if(!br)return;const v=hudCeil(rents,br);
    if(v&&get('units.'+i+'.safmr_hud')!==v){form=store.editForm(form,'units.'+i+'.safmr_hud',v);changed++;}});
  return changed;}
function renderKeepFocus(){const ae=document.activeElement;const k=ae&&ae.getAttribute?ae.getAttribute('data-k'):null;const pos=(k&&ae.selectionStart!=null)?ae.selectionStart:null;renderBody();
  if(k){const ni=document.querySelector('[data-k="'+k+'"]');if(ni){ni.focus({preventScroll:true});try{const L=pos==null?(ni.value||'').length:pos;ni.setSelectionRange(L,L);}catch(e){}}}}
function hudStatus(n){const d=_hud.data;if(!d)return;
  const srcNote=d.zip_rents?('ZIP '+d.zip):(d.smallarea?'metro-wide — ZIP not in HUD’s SAFMR table':'area FMR — not a Small Area FMR zone');
  setStatus('HUD FY'+d.year+' · '+d.area_name+' · '+srcNote+(n?(' — filled the 150% ceiling for '+n+' unit type'+(n===1?'':'s')+'. Review, then “Update database”.'):' — SAFMR ceilings are up to date.'));}
async function ensureHudSafmr(opts){opts=opts||{};const manual=!!opts.manual;
  if(!supaClient){if(manual)setStatus('HUD SAFMR pull needs the hosted backend — sign in first.');return;}
  if(manual)_hud={key:'',data:null,inflight:null}; // manual click = force a fresh pull
  const p=hudParams();
  if(p.zip.length!==5&&!(p.street&&p.city&&p.state)){if(manual)setStatus('Enter the property ZIP (or full address) in Section 2 first — HUD SAFMRs are looked up by ZIP.');return;}
  const key=p.zip+'|'+p.year;
  if(_hud.key===key&&_hud.data){const n=applyHudSafmr();if(n)renderKeepFocus();if(manual||n)hudStatus(n);return;}
  if(_hud.inflight===key)return;
  _hud.inflight=key;
  const b0=el('pullSafmr');if(b0)b0.disabled=true;
  try{
    const r=await supaClient.functions.invoke('hud-safmr',{body:{street:p.street,city:p.city,state:p.state,zip:p.zip,year:p.year}});
    if(r.error){let m='request failed';try{m=(await r.error.context.json()).error||m;}catch(e){m=r.error.message||m;}throw new Error(m);}
    const d=r.data||{};if(d.error)throw new Error(d.error);
    if(!(d.zip_rents||d.area_rents))throw new Error('HUD returned no rent data for this area.');
    _hud={key:key,data:d,inflight:null};
    const pNow=hudParams();if(pNow.zip+'|'+pNow.year!==key)return; // form/property changed while fetching — cache it, don't apply
    const n=applyHudSafmr();if(n)renderKeepFocus();hudStatus(n);
  }catch(e){_hud.inflight=null;if(manual)setStatus('HUD SAFMR pull failed: '+(e&&e.message?e.message:e));}
  finally{const b=el('pullSafmr');if(b)b.disabled=false;}
}

function undoBits(fam){const st=fam==='LI'?_undoLI:_undoNR;if(!st.length)return '';const id=fam==='LI'?'undoNs8':'undoNonrev';return ' <span class="addrow ghostlink" id="'+id+'">↩ Undo delete'+(st.length>1?(' ('+st.length+')'):'')+'</span><button class="undocommit" id="'+id+'C" title="Keep deletions — dismiss undo">✓</button>';}
function provColor(k){return (CLR[srcOf(k)]||CLR.new)[0];}
function boxStyle(k){const c=CLR[srcOf(k)]||CLR.new;return 'color:'+c[0]+';border-color:'+c[0]+';background:'+c[1];}
function fuelChip(k,three){const v=get(k);const has=v!==''&&v!=null;const c=CLR[has?srcOf(k):'new']||CLR.new;const cls=three?'fuel3':'fuel';return '<span class="'+cls+(has?'':' empty')+'" data-fuel'+(three?'3':'')+'="'+k+'" style="color:'+c[0]+';border-color:'+c[0]+';background:'+c[1]+'">'+(has?esc(v):'-')+'</span>';}
function cbx(k,label){const on=get(k)==='1';return `<label class="cb"><input type="checkbox" data-cb="${k}" ${on?'checked':''}><span class="box" style="${boxStyle(k)}">${on?'✓':''}</span><span class="cbt">${esc(label)}</span>${ovIcons(k)}</label>`;}
function pbUtil(i,label){const on=get('partb.utilities.'+i)==='1';return `<div class="cb utrow"><label class="cbmain"><input type="checkbox" data-cb="partb.utilities.${i}" ${on?'checked':''}><span class="box" style="${boxStyle('partb.utilities.'+i)}">${on?'✓':''}</span><span class="cbt ut">${label}</span></label>${fuelChip('partb.fuel.'+i,false)}${ovIcons(['partb.utilities.'+i,'partb.fuel.'+i])}</div>`;}
function writein(id,hasFuel){const val=get('partb.writein.'+id);const on=get('partb.writein.'+id+'.on')==='1';const state=!val?'empty':(on?'checked':'unchecked');
  const f=hasFuel?fuelChip('partb.writein.'+id+'.fuel',true):'';
  const ks=hasFuel?['partb.writein.'+id,'partb.writein.'+id+'.on','partb.writein.'+id+'.fuel']:['partb.writein.'+id,'partb.writein.'+id+'.on'];
  const attr=hasFuel?` data-util="1"`:` data-wion="partb.writein.${id}.on"`;
  return `<span class="cb wi ${state}${hasFuel?' util':''}"><span class="box wibox" data-wibox="partb.writein.${id}" style="${boxStyle('partb.writein.'+id+'.on')}">${on?'✓':''}</span><input type="text" class="witext" data-k="partb.writein.${id}"${attr} placeholder="write-in…" value="${esc(val)}">${f}${ovIcons(ks)}</span>`;}
function renderPartB(){const eq=PARTB.equipment,sv=PARTB.services;
  return card(7,sectionPill(7),`<div class="pbnote">Preprinted labels check-only; dashed slots are write-ins — the box checks itself when you type in it. <b>Source: Executed RS</b> \u2014 this whole section auto-fills once the executed Rent Schedule is parsed.</div>
  <div class="pbgrp">Equipment / furnishings</div><div class="cols3"><div>${cbx('partb.equipment.0',eq[0])}${cbx('partb.equipment.1',eq[1])}${cbx('partb.equipment.2',eq[2])}${cbx('partb.equipment.3',eq[3])}</div>
    <div>${cbx('partb.equipment.4',eq[4])}${cbx('partb.equipment.5',eq[5])}${cbx('partb.equipment.6',eq[6])}${writein('e1')}</div>
    <div>${writein('e2')}${writein('e3')}${writein('e4')}${writein('e5')}</div></div>
  <div class="pbgrp">Utilities (included · fuel type)</div><div class="cols3"><div>${pbUtil(0,'Heating')}${pbUtil(1,'Cooling')}</div><div>${pbUtil(2,'Hot Water')}${pbUtil(3,'Cooking')}</div><div>${pbUtil(4,'Lights, etc.')}${writein('u1',true)}</div></div>
  <div class="pbgrp">Services / facilities</div><div class="cols3"><div>${cbx('partb.services.0',sv[0])}${cbx('partb.services.1',sv[1])}${cbx('partb.services.2',sv[2])}${cbx('partb.services.3',sv[3])}</div>
    <div>${writein('s1')}${writein('s2')}${writein('s3')}${writein('s4')}</div>
    <div>${cbx('partb.services.4',sv[4])}${cbx('partb.services.5',sv[5])}${writein('s5')}${writein('s6')}</div></div>`);}
function renderChecklist(){const F=CHECKLIST_FLAT;const item=n=>{const on=get('check.'+n)==='1';return `<label class="cb"><input type="checkbox" data-cb="check.${n}" ${on?'checked':''}><span class="box" style="${boxStyle('check.'+n)}">${on?'✓':''}</span><span class="cbt">${F[n]}</span>${ovIcons('check.'+n)}</label>`;};
  const grp=(t,arr)=>`<div class="clhead">${t}</div>${arr.map(item).join('')}`;
  const left=grp("Owner’s Materials",[0,1,2])+grp("RCS Materials",[3,4,5,6,7,8]);const right=`<div class="clcont">${[9,10,11,12,13,14].map(item).join('')}</div>`+grp("Mandatory Market Rent Threshold",[15,16]);
  let sel=0;for(let j=0;j<F.length;j++)if(get('check.'+j)==='1')sel++;
  return card(8,sectionPill(8),`<div class="cltop"><b>${sel} of ${F.length} selected</b><span class="clbtns"><button class="mini" id="clAll">✓ Check all</button><button class="mini" id="clNone">Clear</button></span></div><div class="cols2"><div>${left}</div><div>${right}</div></div>`);}
function srcDocLabel(){
  if(hasProg('rcs'))return{title:'Completed RCS report',sub:'Upload the appraiser’s final RCS report (PDF) — it becomes document 04 of the generated package. Uploads last for this session only.',need:true};
  if(hasProg('ocaf'))return{title:'CA’s auto-OCAF package',sub:'Upload the CA’s auto-OCAF letter + Exhibit A (PDF) — this cycle’s source document, for checking the worksheet numbers below. Uploads last for this session only.',need:true};
  return{title:'CA’s UAF certification / UA sheet',sub:'Optional — some CAs send a pre-filled certification or their own UA sheet; upload it for reference. Uploads last for this session only.',need:false};}
function renderSources(){
  const up=_rcsUpload;const sl=srcDocLabel();
  const rcs=up
    ?`<div class="srcrow"><span class="ok">✓</span><div><b>${esc(up.name)}</b> <span class="parsed">uploaded · this session</span><div class="sub">${hasProg('rcs')?'Goes into the generated package as document 04. ':'This cycle’s source document. '}Automatic parsing is not applied yet — review the sections below.</div></div><button class="btn sm" id="upRcs">Replace</button></div>`
    :`<div class="srcrow${sl.need?'':' dim'}"><span class="mut">○</span><div><b>${esc(sl.title)}</b> <span class="${sl.need?'missing':'parsed'}">${sl.need?'not uploaded':'optional'}</span><div class="sub">${esc(sl.sub)}</div></div><button class="btn sm" id="upRcs">Upload PDF</button></div>`;
  const rs=`<div class="srcrow dim"><span class="mut">○</span><div><b>Prior executed rent schedule</b> <span class="missing">not uploaded</span><div class="sub">Not required — only used by document parsing, which isn’t live yet.</div></div><button class="btn sm" disabled title="Parsing is a work in progress">Upload PDF</button></div>`;
  const foot=`<div class="srcfoot"><button class="btn teal" disabled title="Work in progress">↻ Parse documents</button><span class="sub">Automatic parsing (rents · unit mix · appraiser · UA) is a <b>work in progress</b> — for now, enter values in the sections below or pull SAFMRs from HUD in ${secRef(6)}.</span></div><input type="file" id="rcsFile" accept="application/pdf,.pdf" style="display:none">`;
  return card(1,sectionPill(1),rcs+rs+foot);}

function sectionKeys(n){if(n===10)return ['ocaf.g','ocaf.rate_type','ocaf.ds_annual','ocaf.ds_t12','ocaf.ds_f12','ocaf.factor_pub','ocaf.factor_custom','ocaf.factor_src'];
  if(n===11)return ['uaf.f_oil','uaf.f_gas','uaf.f_electric','uaf.f_water'].concat(UNITS.flatMap(i=>UAF_UTILS.map(u=>'units.'+i+'.uac_'+u[0])));
  if(n===6)return UNITS.flatMap(i=>['units.'+i+'.br','units.'+i+'.ba','units.'+i+'.num_units','units.'+i+'.current','units.'+i+'.proposed','units.'+i+'.ua_source','units.'+i+'.safmr_source']);const fs=FIELD_SECTIONS.find(s=>s.n===n);return fs?fs.fields.flatMap(f=>f.type==='addr'?ADDR:(f.type==='caaddr'?CA_ADDR:(f.type==='appraddr'?APPR_ADDR:(f.type==='mgmtaddr'?MGMT_ADDR:(f.prefix?[f.prefix,f.k]:[f.k]))))):[];}
function sectionStatus(n){if(n===1)return _rcsUpload?'ok':((hasProg('rcs')||hasProg('ocaf'))?'warn':'ok');
  if(n===10){if(sectionKeys(10).some(k=>srcOf(k)==='overridden'))return'warn';const C=ocafCalc();return(C.F>0&&C.R>0)?'ok':'warn';}
  if(n===11){if(sectionKeys(11).some(k=>srcOf(k)==='overridden'))return'warn';const A=uafAnalysis();if(A.mismatch.length)return'warn';const hasF=UAF_UTILS.some(u=>numf(get('uaf.f_'+u[0]))>0);return(hasF&&A.any)?'ok':'warn';}const over=sectionKeys(n).some(k=>srcOf(k)==='overridden');if(n===6&&(UNITS.some(uaUnresolved)||UNITS.some(safmrUnresolved)||UNITS.some(typeUnresolved)||UNITS.some(numUnresolved)||UNITS.some(i=>srcOf('units.'+i+'.ua_source')==='overridden')||UNITS.some(i=>srcOf('units.'+i+'.safmr_source')==='overridden')||UNITS.some(i=>{const r=safmrResolvedOf(i),p=numf(get('units.'+i+'.proposed'));return r>0&&p>0&&p>=r;})||rsCapacity().msgs.length>0))return'warn';return over?'warn':'ok';}
function sectionPill(n){return sectionStatus(n)==='warn'?'<span class="pill warn" data-pill="'+n+'">review</span>':'<span class="pill ok" data-pill="'+n+'">confirmed</span>';}
function card(n,pill,body){return `<div class="card"><div class="chead"><span class="cnum">${_secPos[n]||n}</span><span class="ctitle">${SECTION_TITLES[n]}</span>${pill}<span class="chev">▾</span></div><div class="cbody">${body}</div></div>`;}


/* ================== OCAF (Section 10) — transparent HUD-9625 ==================
   Three steps shown live, never a black box (like the SAFMR gauge):
   F annual S8 potential -> carve out the debt-service share (J,K,L) ->
   inflate only the operating portion by the published factor (N,O) ->
   P = L + O, and line Q TAKES P (the RCS cap is not applied — manager's rule,
   confirmed in the wild: CA-filled worksheets show Q = P, "RCS Expires: N/A").
   R = Q ÷ F rounded to 3 decimals, applied per unit type, rounded to dollars. */
function ocafFactorResolved(){const src=get('ocaf.factor_src')||(get('ocaf.factor_pub')?'fr':'custom');return src==='custom'?numf(get('ocaf.factor_custom')):numf(get('ocaf.factor_pub'));}
function ocafK(){const rt=get('ocaf.rate_type')||'Fixed rate';if(/floating/i.test(rt)){const t=numf(get('ocaf.ds_t12')),f=numf(get('ocaf.ds_f12'));return (t>0&&f>0)?Math.min(t,f):(t||f);}return numf(get('ocaf.ds_annual'));}
function ocafCalc(){let e=0;UNITS.forEach(i=>{e+=numf(get('units.'+i+'.num_units'))*numf(get('units.'+i+'.current'));});
  const F=e*12,G=numf(get('ocaf.g'));
  let h=0;if(get('ns8.enabled')==='1')NS8.forEach(i=>{h+=numf(get('ns8.'+i+'.num_units'))*numf(get('ns8.'+i+'.avg_rent'));});
  const H=h*12,I=F+G+H,J=I>0?F/I:0,K=ocafK(),L=J*K,M=F-L;
  const pct=ocafFactorResolved(),N=pct>0?1+pct/100:0,O=M*N,P=L+O,Q=P;
  const R=(F>0&&N>0)?Math.round(Q/F*1000)/1000:0;   // HUD-9625 rounds the increase factor to 3 decimals
  return{e,F,G,H,I,J,K,L,M,pct,N,O,P,Q,R};}
function ocafFactorCell(){const pub=get('ocaf.factor_pub'),fy=get('ocaf.factor_fy');
  const src=get('ocaf.factor_src')||(pub?'fr':'custom');const custom=get('ocaf.factor_custom');
  const lab=(src==='custom')
    ?('<input class="uac-in" data-k="ocaf.factor_custom" value="'+esc(custom)+'" placeholder="e.g. 4.9" style="width:64px"><span class="srctag">% · custom</span>')
    :(pub?('<span class="ualab">'+esc(pub)+'%<span class="srctag" style="margin-left:6px">· FY'+esc(fy)+' Federal Register</span></span>'):('<span class="ualab" style="color:#8791a5">— pull or enter the factor</span>'));
  let state,c;if(src==='custom'){state=srcOf('ocaf.factor_custom');c=CLR[state]||CLR.new;}else{state=pub?'this-cycle':'new';c=CLR[state];}
  const boxKey=(src==='custom')?'ocaf.factor_custom':'ocaf.factor_src';
  const menu='<div class="uamenu">'+srcOptRow('data-ocfopt="fr"',pub?esc(pub+'% · FY'+fy):'','Federal Register')+'<div class="uaopt" data-ocfopt="custom">Custom…</div></div>';
  return '<div class="rbox uacell" data-box="'+boxKey+'" style="background:'+c[1]+';border-left-color:'+c[0]+';max-width:330px;flex:0 1 auto"><div class="uadrop" style="flex:1;min-width:0"><div class="uatrigger" tabindex="0">'+lab+'<span class="cvx">▾</span></div>'+menu+'</div>'+(src==='custom'?ovIcons('ocaf.factor_custom'):'')+'</div>';}
function renderOcaf(){const C=ocafCalc();
  const rt=get('ocaf.rate_type')||'Fixed rate';const fl=/floating/i.test(rt);
  const fy=get('ocaf.factor_fy'),pd=get('ocaf.factor_pubdate');const st=get('property.addr_state');
  const head='<div class="ocpull"><b>Published OCAF</b>'+ocafFactorCell()
    +'<button class="urev hudbtn" id="pullOcaf" title="Pull the latest published OCAF notice from the Federal Register">⤓ Federal Register</button>'
    +'<span class="sub">'+(fy?('FY'+esc(fy)+(st?' · '+esc(st):'')+(pd?' · published '+esc(fmtDateLong(pd)):'')):'latest published notice — if this year’s isn’t out yet (publication lag), a custom factor is the normal path')+'</span></div>';
  const ds='<div class="pbgrp">Owner-certified inputs</div><div class="ocds">'
    +selectCell({k:'ocaf.rate_type',label:'Debt rate type',opts:['Fixed rate','Floating rate']})
    +(fl?('<div class="field"><div class="flabel">Trailing-12 debt service</div>'+moneyBox('ocaf.ds_t12')+'</div><div class="field"><div class="flabel">Forward-12 debt service</div>'+moneyBox('ocaf.ds_f12')+'</div>')
        :('<div class="field"><div class="flabel">Annual debt service (P&amp;I + MIP)</div>'+moneyBox('ocaf.ds_annual')+'</div>'))
    +'<div class="field"><div class="flabel">Non-expiring S8 potential (line G)</div>'+moneyBox('ocaf.g')+'</div></div>'
    +(fl?'<div class="pbnote">Floating rate: K takes the <b>lesser</b> of Chatham’s trailing-12 and forward-12 SOFR figures, anchored to the rent-effective date — the comparison goes in the package as evidence.</div>'
        :'<div class="pbnote">Fixed rate: verify against the loan payment history (it rides along as evidence). This default lives on the property record; on the current cycle your edits update it, on older cycles they stay put.</div>');
  const L=(code,lab,val)=>'<div class="ocline"><span class="occode">'+code+'</span><span class="oclab">'+lab+'</span><span class="ocval" data-ocl="'+code+'">'+val+'</span></div>';
  const ws='<div class="pbgrp">HUD-9625 worksheet — computed live</div><div class="ocwork">'
    +L('E','Monthly Section 8 rent potential — units × current rents ('+secRef(6)+')',money(C.e))
    +L('F','Annual expiring Section 8 potential (E × 12)',money(C.F))
    +L('G','Annual potential, non-expiring Section 8 contracts',money(C.G))
    +L('H','Annual potential, non-Section 8 units ('+secRef(6)+' non-S8 rows × 12)',money(C.H))
    +L('I','Total project rent potential (F + G + H)',money(C.I))
    +L('J','Section 8 share of the project (F ÷ I)',C.I>0?C.J.toFixed(4):'—')
    +L('K','Annual debt service'+(fl?' — lesser of T-12 / F-12':''),C.K>0?money2(C.K):'—')
    +L('L','Section 8 share of debt service (J × K)',money2(C.L))
    +L('M','Section 8 potential less debt share (F − L)',money2(C.M))
    +L('N','OCAF factor',C.N>0?'× '+C.N.toFixed(3):'—')
    +L('O','Operating portion inflated (M × N)',money2(C.O))
    +L('P','Adjusted contract rent potential (L + O)',money2(C.P))
    +L('Q','Line Q takes P — the RCS-comparable cap is not applied',money2(C.Q))
    +L('R','<b>Increase factor (Q ÷ F, 3 decimals)</b>',C.R>0?'<b>'+C.R.toFixed(3)+'</b>':'—')
    +'</div>';
  const nr='<div class="pbgrp">Resulting rents — current × R, rounded to whole dollars</div>'
    +UNITS.map(i=>{const cur=numf(get('units.'+i+'.current'));const n=numf(get('units.'+i+'.num_units'));const br=get('units.'+i+'.br')||'—';const ba=get('units.'+i+'.ba');
      const nv=(cur>0&&C.R>0)?Math.round(cur*C.R):0;
      return '<div class="ocnrrow"><span style="flex:0 0 110px;font-weight:700">'+esc(br+(ba?'/'+ba:''))+'</span><span style="flex:0 0 78px;color:#8791a5">'+(n?(n+' unit'+(n===1?'':'s')):'—')+'</span><span>'+(cur>0?money(cur):'—')+' → <b data-ocnr="'+i+'">'+(nv?money(nv):'—')+'</b>'+(nv&&cur?' <span style="color:#166534">('+sMoney(nv-cur)+')</span>':'')+'</span></div>';}).join('')
    +'<div style="margin-top:10px"><button class="btn teal" id="ocafApply">Apply as proposed rents → '+secRef(6)+'</button></div>';
  const warn=(!C.F)?'<div class="ucnote warn" style="display:block;margin:0 0 10px">⚠ Enter the unit mix and current contract rents in '+secRef(6)+' first — the worksheet builds on them.</div>':'';
  return card(10,sectionPill(10),warn+head+ds+ws+nr);}
function refreshOcafLines(k){if(k&&!/^(ocaf|units|ns8)\./.test(k))return;if(!document.querySelector('[data-ocl]'))return;const C=ocafCalc();
  const M={E:money(C.e),F:money(C.F),G:money(C.G),H:money(C.H),I:money(C.I),J:C.I>0?C.J.toFixed(4):'—',K:C.K>0?money2(C.K):'—',L:money2(C.L),M:money2(C.M),N:C.N>0?'× '+C.N.toFixed(3):'—',O:money2(C.O),P:money2(C.P),Q:money2(C.Q),R:C.R>0?'<b>'+C.R.toFixed(3)+'</b>':'—'};
  document.querySelectorAll('[data-ocl]').forEach(x=>{const c=x.getAttribute('data-ocl');if(M[c]!=null)x.innerHTML=M[c];});
  UNITS.forEach(i=>{const cur=numf(get('units.'+i+'.current'));const nv=(cur>0&&C.R>0)?Math.round(cur*C.R):0;const b=document.querySelector('[data-ocnr="'+i+'"]');if(b)b.textContent=nv?money(nv):'—';});}
async function pullOcafFactor(){
  if(!supaClient){setStatus('The OCAF pull needs the hosted backend — sign in first.');return;}
  const b0=el('pullOcaf');if(b0)b0.disabled=true;setStatus('Pulling the latest OCAF notice from the Federal Register…');
  try{const r=await supaClient.functions.invoke('ocaf-factor',{body:{}});
    if(r.error){let m='request failed';try{m=(await r.error.context.json()).error||m;}catch(e){m=r.error.message||m;}throw new Error(m);}
    const d=r.data||{};if(d.error)throw new Error(d.error);
    const stt=get('property.addr_state');let v=(stt&&d.factors&&d.factors[stt]!=null)?d.factors[stt]:null;let usedNat=false;
    if(v==null&&d.national!=null){v=d.national;usedNat=true;}
    if(v==null)throw new Error('No factor for state '+(stt||'(none)')+' in the FY'+d.fy+' notice.');
    form=store.editForm(form,'ocaf.factor_pub',String(v));form=store.editForm(form,'ocaf.factor_fy',String(d.fy||''));form=store.editForm(form,'ocaf.factor_pubdate',String(d.publication_date||''));form=store.editForm(form,'ocaf.factor_src','fr');
    renderBody();
    setStatus('FY'+d.fy+' OCAF '+(usedNat?'(national average — set the property state in '+secRef(2)+' for the state factor)':('for '+stt))+': '+v+'% — published '+fmtDateLong(d.publication_date)+'. Review, then “Update database”.');
  }catch(e){setStatus('OCAF pull failed: '+(e&&e.message?e.message:e));}
  finally{const b=el('pullOcaf');if(b)b.disabled=false;}}
async function ocafApplyRents(){const C=ocafCalc();
  if(!(C.R>0)){setStatus('Enter the OCAF factor and debt service first — the increase factor (R) drives the new rents.');return;}
  let n=0;UNITS.forEach(i=>{const cur=numf(get('units.'+i+'.current'));if(cur>0){const nv=String(Math.round(cur*C.R));if(get('units.'+i+'.proposed')!==nv){form=store.editForm(form,'units.'+i+'.proposed',nv);n++;}}});
  if(n){renderBody();setStatus('Filled proposed rents for '+n+' unit type'+(n===1?'':'s')+' at ×'+C.R.toFixed(3)+' — review, then “Update database”.');}
  else setStatus('Proposed rents already match the OCAF calculation.');}

/* ================== UAF (Section 11) — per-utility, always ==================
   Each utility is factored separately (HUD publishes one factor per utility per
   state) and rounded to whole dollars BEFORE summing; only tenant-paid
   utilities belong here. A decrease in any unit type's total UA derives the
   30-day tenant notice + tenant-comment certification into the package. */
function uafRow(i){const parts=UAF_UTILS.map(x=>{const u=x[0],label=x[1];const cur=numf(get('units.'+i+'.uac_'+u));const f=numf(get('uaf.f_'+u));const raw=(cur>0&&f>0)?cur*f:0;return{u,label,cur,f,raw,rounded:raw?Math.round(raw):0};});
  const curSum=parts.reduce((s,p)=>s+p.cur,0);const newSum=parts.reduce((s,p)=>s+p.rounded,0);
  return{parts,curSum,newSum};}
function uafAnalysis(){let any=false;const dec=[],mismatch=[];
  UNITS.forEach(i=>{const r=uafRow(i);if(r.curSum>0)any=true;const ua=uaResolvedOf(i);
    if(r.curSum>0&&ua>0&&Math.round(r.curSum)!==Math.round(ua))mismatch.push(i);
    if(r.curSum>0&&r.newSum>0&&r.newSum<r.curSum)dec.push(i);});
  return{any,dec,mismatch};}
function fmtFactor(f){return f>0?String(Math.round(f*10000)/10000):'—';}
function uafResHtml(i){const r=uafRow(i);if(!(r.curSum>0))return '';
  const p=r.parts.filter(x=>x.cur>0);
  const calc=p.map(x=>'$'+Math.round(x.cur)+' × '+(x.f>0?fmtFactor(x.f):'?')+(x.raw?(' = $'+x.raw.toFixed(2)+' → <b>$'+x.rounded+'</b>'):'')).join(' &nbsp;·&nbsp; ');
  const ua=uaResolvedOf(i);
  const mis=(ua>0&&Math.round(r.curSum)!==Math.round(ua))?' <span style="color:#b45309">⚠ components total $'+Math.round(r.curSum)+' ≠ current UA $'+Math.round(ua)+' ('+secRef(6)+')</span>':'';
  const tot=r.newSum>0?('Total: $'+Math.round(r.curSum)+' → <b>$'+r.newSum+'</b>'+(r.newSum<r.curSum?' <span style="color:#b45309">(decrease)</span>':'')):'';
  return calc+(tot?'<br>'+tot:'')+mis;}
function renderUaf(){
  const fy=get('uaf.factor_fy'),pd=get('uaf.factor_pubdate');const st=get('property.addr_state');
  const head='<div class="ocpull"><b>Published UAFs</b>'
    +'<button class="urev hudbtn" id="pullUaf" title="Pull this state’s utility allowance factors from HUD USER">⤓ HUD USER</button>'
    +'<span class="sub">'+(fy?('FY'+esc(fy)+(st?' · '+esc(st):'')+(pd?' · file dated '+esc(fmtDateLong(pd)):'')):'one factor per utility per state — pull, or enter them manually')+'</span></div>';
  const fCells='<div class="uffrow">'+UAF_UTILS.map(x=>'<div class="field"><div class="flabel">'+x[1]+' factor</div>'+numBox('uaf.f_'+x[0],'e.g. 1.039')+'</div>').join('')+'</div>';
  const note='<div class="pbnote">Each unit type’s <b>current UA split by utility</b> comes from the prior UAF sheet or baseline — the rent schedule only carries totals. Only tenant-paid utilities: anything “included in rent” in '+secRef(7)+' stays out. Each utility is factored separately and rounded to whole dollars before summing (HUD FAQ).</div>';
  const rows=UNITS.map(i=>{const br=get('units.'+i+'.br')||'—';const ba=get('units.'+i+'.ba');const n=numf(get('units.'+i+'.num_units'));
    const cells=UAF_UTILS.map(x=>'<div class="field"><div class="flabel">'+x[1]+'</div>'+moneyBox('units.'+i+'.uac_'+x[0])+'</div>').join('');
    return '<div class="uafunit"><div class="uafname">'+esc(br+(ba?'/'+ba:''))+(n?' <span style="color:#8791a5;font-weight:400">· '+n+' unit'+(n===1?'':'s')+'</span>':'')+'</div><div class="uafcells">'+cells+'</div><div class="uafres" data-uafres="'+i+'">'+uafResHtml(i)+'</div></div>';}).join('');
  const A=uafAnalysis();
  const banner='<div id="uafBanner">'+(A.any?(A.dec.length
    ?'<div class="ucnote warn" style="display:block;margin:10px 0 0">⚠ UA decrease for '+A.dec.length+' unit type'+(A.dec.length>1?'s':'')+' — the 30-day tenant notice and the owner’s tenant-comment certification are required in the package.</div>'
    :'<div class="ucnote ok" style="display:block;margin:10px 0 0">✓ No UA decreases — no tenant notice required.</div>'):'')+'</div>';
  const apply='<div style="margin-top:12px"><button class="btn teal" id="uafApply">Apply new UAs → '+secRef(6)+'</button></div>';
  return card(11,sectionPill(11),note+head+fCells+'<div class="pbgrp">Current UA components × factors</div>'+rows+banner+apply);}
function refreshUafLines(k){if(k&&!/^(uaf|units)\./.test(k))return;if(!document.getElementById('uafBanner'))return;
  UNITS.forEach(i=>{const x=document.querySelector('[data-uafres="'+i+'"]');if(x)x.innerHTML=uafResHtml(i);});
  const A=uafAnalysis();const bn=document.getElementById('uafBanner');
  bn.innerHTML=A.any?(A.dec.length
    ?'<div class="ucnote warn" style="display:block;margin:10px 0 0">⚠ UA decrease for '+A.dec.length+' unit type'+(A.dec.length>1?'s':'')+' — the 30-day tenant notice and the owner’s tenant-comment certification are required in the package.</div>'
    :'<div class="ucnote ok" style="display:block;margin:10px 0 0">✓ No UA decreases — no tenant notice required.</div>'):'';}
async function pullUafFactors(){
  if(!supaClient){setStatus('The UAF pull needs the hosted backend — sign in first.');return;}
  const b0=el('pullUaf');if(b0)b0.disabled=true;setStatus('Pulling utility allowance factors from HUD USER…');
  try{const r=await supaClient.functions.invoke('uaf-factor',{body:{}});
    if(r.error){let m='request failed';try{m=(await r.error.context.json()).error||m;}catch(e){m=r.error.message||m;}throw new Error(m);}
    const d=r.data||{};if(d.error)throw new Error(d.error);
    const stt=get('property.addr_state');const rec=(stt&&d.factors&&d.factors[stt])||d.national;
    if(!rec)throw new Error('No factors for state '+(stt||'(none)')+' in the FY'+d.fy+' file.');
    const usedNat=!(stt&&d.factors&&d.factors[stt]);
    const r4=x=>String(Math.round((+x||0)*10000)/10000);
    form=store.editForm(form,'uaf.f_oil',r4(rec.oil));form=store.editForm(form,'uaf.f_gas',r4(rec.gas));form=store.editForm(form,'uaf.f_electric',r4(rec.electric));form=store.editForm(form,'uaf.f_water',r4(rec.water));
    form=store.editForm(form,'uaf.factor_fy',String(d.fy||''));
    const lm=d.last_modified?new Date(d.last_modified):null;
    form=store.editForm(form,'uaf.factor_pubdate',(lm&&!isNaN(lm))?lm.toISOString().slice(0,10):'');
    renderBody();
    setStatus('FY'+d.fy+' UAFs '+(usedNat?'(U.S. — set the property state in '+secRef(2)+' for the state factors)':('for '+stt))+': oil '+r4(rec.oil)+' · gas '+r4(rec.gas)+' · electric '+r4(rec.electric)+' · water/sewer/trash '+r4(rec.water)+'. Review, then “Update database”.');
  }catch(e){setStatus('UAF pull failed: '+(e&&e.message?e.message:e));}
  finally{const b=el('pullUaf');if(b)b.disabled=false;}}
async function uafApplyUas(){let n=0;
  UNITS.forEach(i=>{const r=uafRow(i);if(r.curSum>0&&r.newSum>0){form=store.editForm(form,'units.'+i+'.ua_custom',String(r.newSum));form=store.editForm(form,'units.'+i+'.ua_source','custom');form=store.editForm(form,'units.'+i+'.ua_reviewed','1');n++;}});
  if(n){renderBody();setStatus('Set the new UA for '+n+' unit type'+(n===1?'':'s')+' (as the custom UA source in '+secRef(6)+') — review, then “Update database”.');}
  else setStatus('Enter UA components and factors first.');}

/* Keep the interaction point visually still: content above the form (the
   command cards + attention banner) can grow/shrink on any edit — measure the
   focused element before the mutation and counter-scroll the drift after. */
function holdAnchor(fn){const a=document.activeElement;const ok=!!(a&&a!==document.body&&a.getBoundingClientRect&&document.contains(a));const t=ok?a.getBoundingClientRect().top:0;fn();if(ok&&document.contains(a)){const d=a.getBoundingClientRect().top-t;if(d)window.scrollBy(0,d);}}
function renderCommand(){holdAnchor(_renderCommand);}
function _renderCommand(){const a=analysis();const pCur=a.ceil>0?clamp(a.cg/a.ceil*100):0,pPro=a.ceil>0?clamp(a.pg/a.ceil*100):0;
  const conf=UNITS.filter(uaConflict).length,unres=UNITS.filter(uaUnresolved).length;
  const nmOk=(get('property.name')||'').trim()!=='',fhaOk=(get('property.fha')||'').trim()!=='',sigOk=(get('sig.name')||'').trim()!=='';
  const ua=conf===0?['ok','exec & RCS agree']:(unres===0?['ok','UA conflicts resolved per unit type']:['warn',unres+' of '+conf+' unit type'+(conf>1?'s':'')+' need'+(unres===1?'s':'')+' a UA source']);
  el('cc').innerHTML=`
   <div class="ccard afford"><div class="cck">AFFORDABILITY PROOF</div><div class="cctitle">${a.ceil>0?('Proposed rents '+(a.pass?'clear':'exceed')+' the 150% SAFMR ceiling'):'Enter or pull a SAFMR to run the 150% test'}</div><div class="ccsub">Monthly gross rent potential (rent + UA)</div>
     <div class="afrow"><div class="afbar">
        <div class="gauge"><div class="seg dark" style="width:${pCur}%"></div><div class="seg light" style="left:${pCur}%;width:${Math.max(0,pPro-pCur)}%"></div><div class="oend"></div></div>
        <div class="glabels"><div class="gl l"><b style="color:#2f7d57">${money(a.cg)}</b><i>current</i></div><div class="gl c"><b style="color:#47a377">${money(a.pg)}</b><i>proposed</i></div><div class="gl r"><b>${a.ceil>0?money(a.ceil):'—'}</b><i>150% ceiling · HUD SAFMR</i>${a.safmrConflict?`<i class="amber">⚠ RCS differs on ≥1 type</i>`:(a.safmrMissing?`<i class="amber">⚠ SAFMR needed</i>`:'')}</div></div>
       </div>
       ${a.ceil>0?`<div class="passbox" style="background:${a.pass?'#dcfce7':'#fee2e2'};color:${a.pass?'#166534':'#b91c1c'};border-color:${a.pass?'#86efac':'#fca5a5'}">${a.pass?'✓ PASS':'✗ OVER'}<small>${money(Math.abs(a.headroom))} ${a.pass?'headroom':'over'}</small></div>`:`<div class="passbox" style="background:#f1f4f9;color:#64748b;border-color:#d7deea">SAFMR needed<small>enter or pull from HUD</small></div>`}</div>
     <div class="lift"><b>${hasProg('rcs')?'RCS':(hasProg('ocaf')?'OCAF':'RENT')} LIFT vs current rent roll</b><div class="liftnums"><span><b class="teal">${sPct(a.pct)}</b><i>increase</i></span><span><b>${sMoney(a.perUnit)}</b><i>per unit</i></span><span><b>${sMoney(a.dMo)}</b><i>/mo</i></span><span><b>${sK(a.dYr)}</b><i>annualized</i></span></div></div>
   </div>
   <div class="ccard"><div class="cck">RECORD CHECKS</div><div class="chkgrid">
     ${chk(nmOk?'ok':'warn','Property name',nmOk?esc(get('property.name')):'missing — Section 2')}${chk(fhaOk?'ok':'warn','FHA / Section 8 #',fhaOk?esc(get('property.fha')):'missing — Section 2')}${chk(sigOk?'ok':'warn','Signatory (Part H)',sigOk?(esc(get('sig.name'))+(get('sig.title')?' · '+esc(get('sig.title')):'')):'missing — Section 3')}
     ${chk(ua[0],'Utility allowance',ua[1])}${chk(a.safmrMissing?'warn':(a.safmrOver?'warn':(a.safmrConflict?'info':'ok')),'SAFMR (150% ceiling)',a.safmrMissing?'enter or pull SAFMR per unit type':(a.safmrOver?(a.safmrOver+' type'+(a.safmrOver>1?'s':'')+' over 150% SAFMR'):(a.safmrConflict?'HUD vs RCS differ — using HUD':'per unit type · HUD')))}${(()=>{const c=rsCapacity();return c.msgs.length?chk('warn','Rent schedule capacity',esc(c.flags.join(' · '))):'';})()}</div></div>
   ${pkgCard()}`;}
function pkgCard(){
  if(hasProg('rcs'))return `<div class="ccard"><div class="cck">THIS PACKAGE</div><div class="cctitle" style="font-size:15px">${_rcsUpload?'RCS report uploaded':'RCS report needed'}</div><div class="ccsub">${_rcsUpload?esc(_rcsUpload.name)+' — goes in as document 04':'Upload the completed RCS report in '+secRef(1)+' — it becomes document 04 of the package.'}</div>
     <div class="ccsub" style="margin-top:7px;color:#33405c"><b>The 6-document package</b></div><div class="drafts">${[['Cover letter (CA)',1],['Owner cover letter',1],['Owner’s checklist',1],['RCS report (uploaded PDF)',_rcsUpload?1:0],['Draft rent schedule',1],['Tenant notice',1]].map(d=>'<span>'+(d[1]?'✓ ':'○ ')+d[0]+'</span>').join('')}</div>
     <div class="wb">Documents are generated from the form exactly as shown — use “Update database” to save your inputs. The RCS Package folder download bundles everything — the combined PDF, each document, and the Rent Analysis workbook.</div></div>`;
  const docs=[];
  if(hasProg('ocaf'))docs.push('9625 worksheet (Q = P)','Corrected auto-OCAF letter — election box 1','Revised Exhibit A','Debt-service evidence');
  if(hasProg('uaf')){docs.push('UAF certification / breakdown');if(uafAnalysis().dec.length)docs.push('30-day tenant notice (UA decrease)','Tenant-comment certification');}
  docs.push('Revised rent schedule'+(hasProg('ocaf')&&hasProg('uaf')?' — one, merged OCAF + UAF':''));
  return `<div class="ccard"><div class="cck">THIS PACKAGE</div><div class="cctitle" style="font-size:15px">${esc(cycleProgs().map(x=>PROG_NAMES[x]||x).join(' + '))} package</div><div class="ccsub">${_rcsUpload?esc(_rcsUpload.name)+' uploaded — the cycle’s source document':esc(srcDocLabel().title)+(srcDocLabel().need?' goes in '+secRef(1):' — optional, '+secRef(1))}</div>
     <div class="ccsub" style="margin-top:7px;color:#33405c"><b>This cycle produces</b></div><div class="drafts">${docs.map(d=>'<span>○ '+d+'</span>').join('')}</div>
     <div class="wb">The worksheet and UA calculations are live below — document generation for OCAF/UAF packages is the next build step. “Update database” saves everything so the package can be generated from this cycle.</div></div>`;}
function chk(st,name,note){const ic=st==='warn'?'⚠':(st==='info'?'ⓘ':'✓');const cl=st==='warn'?'warn':(st==='info'?'info':'ok');return `<div class="chk"><span class="${cl}">${ic}</span><div><b>${name}</b><div class="sub">${note}</div></div></div>`;}

function isStateKey(k){return /\.(ua_reviewed|safmr_reviewed|type_reviewed|num_reviewed|ua_custom|safmr_custom)$/.test(k)||k==='tenant.mgmt_source'||k==='poc.mode'||/^poc\.custom_/.test(k)||k==='rent_schedule.date_eff_source'||k==='rent_schedule.date_eff_custom'||k==='ocaf.factor_src';}
function overrideCount(){const grouped=new Set();for(const b in ADDR_GROUPS)ADDR_GROUPS[b].forEach(k=>grouped.add(k));UNITS.forEach(i=>{grouped.add('units.'+i+'.br');grouped.add('units.'+i+'.ba');});
  for(let i=0;i<5;i++){grouped.add('partb.utilities.'+i);grouped.add('partb.fuel.'+i);}
  const wiBases=new Set();Object.keys(form).forEach(k=>{const m=k.match(/^partb\.writein\.([a-z0-9]+)(\.on|\.fuel)?$/);if(m){grouped.add(k);wiBases.add(m[1]);}});
  let c=Object.keys(form).filter(k=>form[k].source==='overridden'&&!isStateKey(k)&&!grouped.has(k)).length;
  for(const b in ADDR_GROUPS)if(ADDR_GROUPS[b].some(k=>srcOf(k)==='overridden'))c++;
  UNITS.forEach(i=>{if(srcOf('units.'+i+'.br')==='overridden'||srcOf('units.'+i+'.ba')==='overridden')c++;});
  for(let i=0;i<5;i++){if(srcOf('partb.utilities.'+i)==='overridden'||srcOf('partb.fuel.'+i)==='overridden')c++;}
  wiBases.forEach(b=>{if(srcOf('partb.writein.'+b)==='overridden'||srcOf('partb.writein.'+b+'.on')==='overridden'||srcOf('partb.writein.'+b+'.fuel')==='overridden')c++;});
  return c;}
function attnFlags(){const f=[];const u=UNITS.filter(uaUnresolved).length;if(u)f.push(u+' UA conflict'+(u>1?'s':'')+' to resolve');const sf=UNITS.filter(safmrUnresolved).length;if(sf)f.push(sf+' SAFMR conflict'+(sf>1?'s':'')+' to resolve');const tc=UNITS.filter(i=>typeUnresolved(i)||numUnresolved(i)).length;if(tc)f.push(tc+' unit type/count conflict'+(tc>1?'s':'')+' to resolve');const A=analysis();if(A.safmrMissing)f.push('SAFMR needed for the 150% test');if(A.safmrOver)f.push(A.safmrOver+' unit type'+(A.safmrOver>1?'s':'')+' over 150% SAFMR');rsCapacity().flags.forEach(x=>f.push(x));const ov=overrideCount();if(ov)f.push(ov+' unsaved override'+(ov>1?'s':''));if(!_rcsUpload&&(hasProg('rcs')||hasProg('ocaf')))f.push((hasProg('rcs')?'The completed RCS report isn’t uploaded':'The CA’s auto-OCAF package isn’t uploaded')+' ('+secRef(1)+')');
  if(hasProg('ocaf')){if(!(ocafFactorResolved()>0))f.push('OCAF factor needed — pull or enter it ('+secRef(10)+')');if(!(ocafK()>0))f.push('Annual debt service needed for the OCAF worksheet ('+secRef(10)+')');}
  if(hasProg('uaf')){const UA=uafAnalysis();const hasF=UAF_UTILS.some(u=>numf(get('uaf.f_'+u[0]))>0);
    if(!hasF)f.push('UAF factors needed — pull or enter them ('+secRef(11)+')');
    if(!UA.any)f.push('Current UA components per unit type needed ('+secRef(11)+')');
    if(UA.mismatch.length)f.push(UA.mismatch.length+' unit type'+(UA.mismatch.length>1?'s':'')+' — UA components don’t total the current UA');
    if(UA.dec.length)f.push('UA decrease detected — tenant notice + comment certification join the package');}
  return f;}
function renderRail(){const vis=visibleSections();const st={};vis.forEach(n=>st[n]=(n===7?'ok':sectionStatus(n)));let conf=0;vis.forEach(n=>{if(st[n]!=='warn')conf++;});const need=vis.length-conf;
  el('rail').innerHTML=vis.map(n=>`<div class="railitem"><span class="ri ${st[n]==='warn'?'warn':'ok'}">${st[n]==='warn'?'!':'✓'}</span><span class="rname">${_secPos[n]||n}. ${SECTION_TITLES[n]}</span></div>`).join('');
  el('railprog').innerHTML=`<b>${conf} of ${vis.length} confirmed</b>${need?`<div class="warnt">${need} need your review</div>`:''}<div class="track sm"><div style="width:${conf/vis.length*100}%;background:#166534"></div></div>`;
  const fl=attnFlags();el('railattn').style.display=fl.length?'block':'none';el('railattn').innerHTML=fl.length?`⚠ <b>${fl.length} to review</b>${fl.map(x=>`<div class="sub" style="margin-top:6px">${x}</div>`).join('')}`:'';}
function renderAttention(){holdAnchor(_renderAttention);}
function _renderAttention(){const f=attnFlags();el('attn').style.display=f.length?'block':'none';const n=f.length;el('attn').innerHTML=n?`⚠ <b>${n} thing${n>1?'s':''} ${n>1?'need':'needs'} your attention</b>${f.map(x=>`<div class="sub" style="margin-top:7px">${x}</div>`).join('')}<div class="sub" style="margin-top:9px;opacity:.72">Flagged in amber below. Resolve UA by picking a source; clear an override with Update database or revert.</div>`:'';}

function renderBar(){const a=analysis();const pCur=a.ceil>0?clamp(a.cg/a.ceil*100):0,pPro=a.ceil>0?clamp(a.pg/a.ceil*100):0;const conf=UNITS.filter(uaConflict).length,unres=UNITS.filter(uaUnresolved).length;const uaOk=conf===0||unres===0;
 const bc=(st,l)=>{const ic=st==='warn'?'⚠':(st==='info'?'ⓘ':'✓');const c=st==='warn'?'#b45309':(st==='info'?'#2563eb':'#166534');return `<span class="bchip"><b style="color:${c}">${ic}</b> ${l}</span>`;};
 el('ccbar').innerHTML=`<div class="bl"><div class="minigauge"><div class="seg dark" style="width:${pCur}%"></div><div class="seg light" style="left:${pCur}%;width:${Math.max(0,pPro-pCur)}%"></div><div class="oend"></div></div><div class="mn"><b style="color:#2f7d57">${money(a.cg)}</b> current · <b style="color:#47a377">${money(a.pg)}</b> proposed · <b>${a.ceil>0?money(a.ceil):'—'}</b> ceiling · <b class="teal">${sPct(a.pct)}</b> RCS boost</div></div><div class="bchks">${bc((get('property.name')||'').trim()?'ok':'warn','Name')}${bc((get('property.fha')||'').trim()?'ok':'warn','FHA')}${bc((get('sig.name')||'').trim()?'ok':'warn','Signatory')}${bc(uaOk?'ok':'warn','UA')}${bc(a.safmrMissing||a.safmrOver?'warn':(a.safmrConflict?'info':'ok'),'SAFMR')}</div><div class="bpass" style="color:${a.ceil>0?(a.pass?'#166534':'#b91c1c'):'#64748b'}">${a.ceil>0?((a.pass?'✓ PASS':'✗ OVER')+' · '+money(Math.abs(a.headroom))):'SAFMR needed'}</div>`;}
function renderBody(){const _sy=window.scrollY;const _anchorSel=(_refocusSel&&!_mouseFocus)?_refocusSel:_lastClickSel;let _anchorTop=null;if(_anchorSel){try{const _ac=document.querySelector(_anchorSel);if(_ac)_anchorTop=_ac.getBoundingClientRect().top;}catch(e){}}computeSecPos();const _SR={1:renderSources,2:()=>renderFieldSection(FIELD_SECTIONS[0]),3:()=>renderFieldSection(FIELD_SECTIONS[1]),4:()=>renderFieldSection(FIELD_SECTIONS[2]),5:()=>renderFieldSection(FIELD_SECTIONS[3]),6:renderRents,7:renderPartB,8:renderChecklist,9:()=>renderFieldSection(FIELD_SECTIONS[4]),10:renderOcaf,11:renderUaf};el('sections').innerHTML=visibleSections().map(n=>_SR[n]()).join('');
  wireBody();renderCommand();renderBar();renderRail();renderAttention();
  if(_refocusSel&&!_mouseFocus){try{const _f=document.querySelector(_refocusSel);if(_f&&_f.focus){_f.focus({preventScroll:true});if(/^(INPUT|TEXTAREA)$/.test(_f.tagName)&&typeof _f.setSelectionRange==='function'){const _L=(_f.value||'').length;try{_f.setSelectionRange(_L,_L);}catch(_e){}}}}catch(e){}}_refocusSel=null;
  if(_anchorSel&&_anchorTop!=null){try{const _a2=document.querySelector(_anchorSel);if(_a2){const _nt=_a2.getBoundingClientRect().top;window.scrollTo(0,window.scrollY+(_nt-_anchorTop));}else window.scrollTo(0,_sy);}catch(e){try{window.scrollTo(0,_sy);}catch(_z){}}}else{try{window.scrollTo(0,_sy);}catch(e){}}}
async function commitPending(){if(!_pending||!_pending.length)return;const keys=_pending;_pending=null;if(handleZeroUnitCommit(keys))return;for(const _pk of ['poc.phone','appr.phone'])if(keys.indexOf(_pk)>=0){const _d=(get(_pk)||'').replace(/\D/g,'');if(_d.length!==0&&_d.length!==10){setStatus('Enter a complete 10-digit phone before saving.');return;}}keys.forEach(k=>{const m=k.match(/^partb\.writein\.(e1|e2|e3|e4|e5|s1|s2|s3|s4|s5|s6)(\.on)?$/);if(m)clearUncheckedWriteins([m[1]]);});const _sk=[];keys.forEach(k=>{const gb=groupOf(k);(gb?ADDR_GROUPS[gb]:[k]).forEach(kk=>{if(_sk.indexOf(kk)<0)_sk.push(kk);});});try{form=await store.saveFields(form,_sk);}catch(e){saveFailed(e);return;}await refreshSnap();_pendingSnap=null;_refocusSel=refocusSelForKey(keys[0]);renderBody();setStatus('Saved this field to the database.');}
function revertCellIfOver(cell){if(!cell)return false;const inIc=cell.querySelector('.ovic[data-mode="over"] [data-rev]');if(inIc){inIc.click();return true;}const box=cell.getAttribute('data-box');if(box){const note=document.querySelector('.ovnote[data-ov="'+box+'"][data-mode="over"]');if(note){const b=note.querySelector('[data-rev],[data-revaddr]');if(b){b.click();return true;}}}return false;}
function isToggleKey(k){return /^(check\.\d+|partb\.(equipment|utilities|services)\.\d+|partb\.fuel\.\d+|partb\.writein\.[a-z0-9]+\.(on|fuel))$/.test(k);}
function fixSavedToggles(){Object.keys(DBSNAP||{}).forEach(k=>{if(isToggleKey(k)){const dv=(DBSNAP[k]&&DBSNAP[k].value!=null)?DBSNAP[k].value:'';form[k]={value:dv,source:'database',saved_at:(DBSNAP[k]&&DBSNAP[k].saved_at)||null,prior_value:null,prior_source:null,db_value:dv};}});}
function snapOf(keys){const s={};keys.forEach(k=>{s[k]=form[k]?Object.assign({},form[k]):null;});return s;}
function fieldKeys(k){if(k==='ca.name')return ['ca.prefix','ca.name'];const gb=groupOf(k);if(gb)return ADDR_GROUPS[gb].slice();if(k.indexOf('partb.writein.')===0&&k.indexOf('.',14)<0){const ks=[k,k+'.on'];if(k.slice(14)==='u1'||(k+'.fuel') in form)ks.push(k+'.fuel');return ks;}return [k];}
function coupledKeys(k){if(k.indexOf('units.')===0){if(k.slice(-10)==='.ua_custom')return [k,k.slice(0,-10)+'.ua_source'];if(k.slice(-13)==='.safmr_custom')return [k,k.slice(0,-13)+'.safmr_source'];}if(k==='rent_schedule.date_eff_custom')return [k,'rent_schedule.date_eff_source'];if(k==='ocaf.factor_custom')return [k,'ocaf.factor_src'];return [k];}
function keysCanRevert(keys){return keys.some(k=>srcOf(k)==='overridden');}
function keysNewDirty(keys){return !keysCanRevert(keys)&&keys.some(k=>srcOf(k)==='new'&&String(get(k)==null?'':get(k)).trim()!=='');}
function keysCanSave(keys){return keysCanRevert(keys)||keysNewDirty(keys);}
function refocusSelForKey(k){if(/^(check\.\d+|partb\.(equipment|utilities|services)\.\d+)$/.test(k))return '[data-cb="'+k+'"]';const w=k.match(/^(partb\.writein\.[a-z0-9]+)\.on$/);if(w)return '[data-wibox="'+w[1]+'"]';const gb=groupOf(k);if(gb)return '[data-box="'+gb+'"] input,[data-box="'+gb+'"] .uatrigger';return '[data-trigfor="'+k+'"],[data-box="'+k+'"] .uatrigger,[data-k="'+k+'"]';}
function revertPending(){if(!_pending||!_pending.length)return false;const keys=_pending;const snap=_pendingSnap;_pending=null;_pendingSnap=null;let any=false;if(snap){Object.keys(snap).forEach(k=>{const b=snap[k];const nv=form[k]?form[k].value:undefined;const bv=b?b.value:undefined;if(b)form[k]=b;else delete form[k];if(bv!==nv)any=true;});}else{keys.forEach(k=>{const gb=groupOf(k);if(gb){ADDR_GROUPS[gb].forEach(kk=>{if(store.revertForm(form,kk))any=true;});}else{if(store.revertForm(form,k))any=true;}});}if(any){_refocusSel=refocusSelForKey(keys[0]);renderBody();}setStatus('Reverted your last change.');return true;}
function aggSrc(keys){if(keys.some(k=>srcOf(k)==='overridden'))return'overridden';if(keys.some(k=>srcOf(k)==='database'))return'database';if(keys.some(k=>srcOf(k)==='this-cycle'))return'this-cycle';return'new';}
function groupOf(k){for(const b in ADDR_GROUPS){if(ADDR_GROUPS[b].indexOf(k)>=0)return b;}return null;}
function partHot(k){const s=srcOf(k);return s==='overridden'||(s==='new'&&get(k)!==''&&get(k)!=null);}
function baseSrc(keys){const cold=keys.filter(k=>!partHot(k));return aggSrc(cold.length?cold:keys);}
function tintStyle(k){const c=CLR[srcOf(k)]||CLR.new;return 'background:linear-gradient('+c[0]+','+c[0]+') no-repeat left 4px center/3px 60%,'+c[1]+';border-radius:6px';} // inset bar, not an inset shadow: shadows bend around the pill radius into a "(" crescent
function applyTint(inp,k){if(partHot(k)){const pc=CLR[srcOf(k)]||CLR.new;inp.style.background='linear-gradient('+pc[0]+','+pc[0]+') no-repeat left 4px center/3px 60%,'+pc[1];inp.style.borderRadius='6px';}else{inp.style.background='transparent';}inp.style.boxShadow='none';} // live-paint twin of tintStyle — keep the two in lockstep
function paintGroup(b){const keys=ADDR_GROUPS[b];const a=baseSrc(keys);const c=CLR[a]||CLR.new;const box=document.querySelector('[data-box="'+b+'"]');
  if(box){box.style.background=c[1];box.style.borderLeftColor=c[0];
    keys.forEach(k=>{const inp=box.querySelector('input[data-k="'+k+'"]');if(inp)applyTint(inp,k);});}
  const ov=document.querySelector('[data-ov="'+b+'"]');if(ov){const m=modeOf(keys);ov.setAttribute('data-mode',m);ov.style.display=m?'flex':'none';}}
function paintCaName(){const keys=['ca.prefix','ca.name'];const a=baseSrc(keys);const c=CLR[a]||CLR.new;const box=document.querySelector('[data-box="ca.name"]');
  if(box){box.style.background=c[1];box.style.borderLeftColor=c[0];const inp=box.querySelector('input[data-k="ca.name"]');
    if(inp)applyTint(inp,'ca.name');}
  const ov=document.querySelector('.ovnote[data-ov="ca.prefix,ca.name"]');if(ov){const m=modeOf(keys);ov.setAttribute('data-mode',m);ov.style.display=m?'flex':'none';}}
function paintCell(k){const gb=groupOf(k);if(gb)return paintGroup(gb);if(k==='ca.name'||k==='ca.prefix')return paintCaName();const s=form[k];if(!s)return;const _sr=(k==='rent_schedule.date_rents_effective'&&s.source==='database')?'this-cycle':s.source;const c=CLR[_sr]||CLR.new;const box=document.querySelector('[data-box="'+k+'"]');if(box){box.style.background=c[1];box.style.borderLeftColor=c[0];}const ov=document.querySelector('[data-ov="'+k+'"]');if(ov){const m=modeOf(k);ov.setAttribute('data-mode',m);ov.style.display=m?'flex':'none';}document.querySelectorAll('[data-ovic]').forEach(o=>{const ks=o.getAttribute('data-ovic').split(',');if(ks.indexOf(k)>=0){const m=modeOf(ks);o.setAttribute('data-mode',m);o.style.display=m?'inline-flex':'none';}});}
function clearUncheckedWriteins(ids){ids.forEach(id=>{if(get('partb.writein.'+id)&&get('partb.writein.'+id+'.on')!=='1'){form=store.editForm(form,'partb.writein.'+id,'');form=store.editForm(form,'partb.writein.'+id+'.on','');}});}
function wireArrowNav(){document.querySelectorAll('.fbox:not(.uacell),.rbox:not(.uacell)').forEach(cell=>{const items=[...cell.querySelectorAll('input[data-k],.uatrigger')];if(items.length<2)return;items.forEach((it,idx)=>{it.addEventListener('keydown',e=>{if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;const isInput=/^(INPUT|TEXTAREA)$/.test(it.tagName);if(isInput){const v=(it.value||'');const at0=it.selectionStart===0&&it.selectionEnd===0;const atE=it.selectionStart===v.length&&it.selectionEnd===v.length;if(e.key==='ArrowLeft'&&!at0)return;if(e.key==='ArrowRight'&&!atE)return;}else{const dd=it.closest('.uadrop');if(dd&&dd.classList.contains('open'))dd.classList.remove('open');}const ni=e.key==='ArrowRight'?items[idx+1]:items[idx-1];if(!ni)return;e.preventDefault();ni.focus({preventScroll:true});if(/^(INPUT|TEXTAREA)$/.test(ni.tagName)){try{const L=(ni.value||'').length;const pos=e.key==='ArrowRight'?0:L;ni.setSelectionRange(pos,pos);}catch(_e){}}});});});}
function wireBody(){
  document.querySelectorAll('input[data-k]').forEach(inp=>{const k=inp.getAttribute('data-k'),wion=inp.getAttribute('data-wion');
    inp.addEventListener('input',()=>{let v=inp.value;if(inp.getAttribute('data-phone')){v=fmtPhone(v);inp.value=v;}else if(inp.getAttribute('data-money')){v=cleanNum(v);inp.value=fmtMoney(v);}else if(inp.getAttribute('data-date')){v=fmtDateInput(v);inp.value=v;}form=store.editForm(form,k,v);if(k==='property.name'&&el('hdrProp'))el('hdrProp').textContent=(v||'(unnamed property)');if(k==='property.addr_zip')scheduleHudRefresh();
      if(wion){const on=v.length>0;form=store.editForm(form,wion,on?'1':'');const cbEl=inp.closest('.cb');if(cbEl){cbEl.classList.remove('empty','unchecked','checked');cbEl.classList.add(!v?'empty':(on?'checked':'unchecked'));const bx=cbEl.querySelector('.box');if(bx){bx.textContent=on?'✓':'';bx.style.color=provColor(wion);}}}else if(inp.getAttribute('data-util')){if(v===''){form=store.editForm(form,k+'.on','');form=store.editForm(form,k+'.fuel','');}const cbEl=inp.closest('.cb');const stillOn=v!==''&&get(k+'.on')==='1';if(cbEl){cbEl.classList.remove('empty','unchecked','checked');cbEl.classList.add(!v?'empty':(stillOn?'checked':'unchecked'));const bx=cbEl.querySelector('.box');if(bx){bx.textContent=stillOn?'✓':'';bx.style.color=provColor(k+'.on');}const f3=cbEl.querySelector('[data-fuel3]');if(f3){const fk=k+'.fuel',fv=get(fk),fhas=fv!==''&&fv!=null,fc=CLR[fhas?srcOf(fk):'new']||CLR.new;f3.textContent=fhas?fv:'-';f3.style.color=fc[0];f3.style.borderColor=fc[0];f3.style.background=fc[1];}}}
      paintCell(k);refreshFlags();if(/^units\.|^nonrev\./.test(k)){renderCommand();renderBar();const mm=k.match(/^units\.(\d+)\.(current|proposed)$/);if(mm){const ui=mm[1],me=document.querySelector('[data-metric="'+ui+'"]');if(me){const cc=numf(get('units.'+ui+'.current')),pp=numf(get('units.'+ui+'.proposed'));if(cc>0&&pp>0){me.textContent=sMoney(pp-cc)+' / unit · '+sPct(Math.round((pp-cc)/cc*100));me.style.color=(pp-cc)>=0?'#166534':'#b91c1c';}else me.textContent='';}}}refreshOcafLines(k);refreshUafLines(k);setStatus('Editing — on-file changes show Overridden until you Update or Revert.');});inp.addEventListener('keydown',async e=>{if(e.key!=='Enter'&&e.key!=='Escape')return;const _keys=fieldKeys(k);if(_pending&&_pending.length&&_pending.indexOf(k)>=0){e.preventDefault();e.stopPropagation();if(e.key==='Escape')revertPending();else commitPending();return;}if(e.key==='Escape'){if(keysCanRevert(_keys)){e.preventDefault();e.stopPropagation();_keys.forEach(kk=>store.revertForm(form,kk));_refocusSel='[data-k="'+k+'"]';renderBody();setStatus('Reverted your change to the on-file value.');}else if(srcOf(k)==='new'&&(inp.value||'')!==''){e.preventDefault();e.stopPropagation();const _clr=groupOf(k)?[k]:_keys;_clr.forEach(kk=>store.editForm(form,kk,''));_refocusSel='[data-k="'+k+'"]';renderBody();setStatus('Cleared your unsaved entry.');}return;}e.preventDefault();if(handleZeroUnitCommit(_keys))return;if(k==='poc.phone'){const _d=(inp.value||'').replace(/[^0-9]/g,'');if(_d.length!==0&&_d.length!==10){setStatus('Enter a complete 10-digit phone before saving.');return;}}if(!keysCanSave(_keys))return;_keys.forEach(kk=>{if(kk.indexOf('partb.writein.')===0&&kk.indexOf('.',14)<0&&kk.slice(14)!=='u1')clearUncheckedWriteins([kk.slice(14)]);});const _sk=[];_keys.forEach(kk=>coupledKeys(kk).forEach(x=>{if(_sk.indexOf(x)<0)_sk.push(x);}));if(groupOf(k)==='tenant.mgmt'&&_sk.indexOf('tenant.mgmt_source')<0)_sk.push('tenant.mgmt_source');try{form=await store.saveFields(form,_sk);}catch(e){saveFailed(e);return;}await refreshSnap();_refocusSel='[data-k="'+k+'"]';renderBody();setStatus('Saved this field to the database.');});if(wion)inp.addEventListener('focus',()=>{if(inp.value&&get(wion)!=='1'){form=store.editForm(form,wion,'1');const cb=inp.closest('.cb');if(cb){cb.classList.remove('unchecked','empty');cb.classList.add('checked');const bx=cb.querySelector('.box');if(bx)bx.textContent='✓';}}});});
  document.querySelectorAll('select[data-k]').forEach(sel=>{const k=sel.getAttribute('data-k');sel.addEventListener('change',()=>{form=store.editForm(form,k,sel.value);paintCell(k);renderRail();renderAttention();});});
  document.querySelectorAll('input[data-cb]').forEach(c=>{const k=c.getAttribute('data-cb');c.addEventListener('change',()=>{_pendingSnap=snapOf([k]);form=store.editForm(form,k,c.checked?'1':'');_pending=[k];_refocusSel='[data-cb="'+k+'"]';renderBody();});});
  document.querySelectorAll('[data-fuel]').forEach(fl=>fl.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const k=fl.getAttribute('data-fuel');const cur=(form[k]&&form[k].value)||'';const nx=cur===''?'E':(cur==='E'?'G':'');_pendingSnap=snapOf([k]);form=store.editForm(form,k,nx);_pending=[k];renderBody();}));
  document.querySelectorAll('[data-fuel3]').forEach(fl=>fl.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const k=fl.getAttribute('data-fuel3');const base=k.slice(0,k.lastIndexOf('.fuel'));if(!get(base))return;const cur=(form[k]&&form[k].value)||'';const nx=cur===''?'E':(cur==='E'?'G':'');_pendingSnap=snapOf([k]);form=store.editForm(form,k,nx);_pending=[k];renderBody();}));
  document.querySelectorAll('[data-wibox]').forEach(bx=>bx.addEventListener('click',e=>{e.preventDefault();const base=bx.getAttribute('data-wibox');if(!get(base))return;const on=get(base+'.on')==='1';_pendingSnap=snapOf([base+'.on']);form=store.editForm(form,base+'.on',on?'':'1');_pending=[base+'.on'];_refocusSel='[data-wibox="'+base+'"]';renderBody();}));
  document.querySelectorAll('button[data-rev]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();b.getAttribute('data-rev').split(',').forEach(k=>coupledKeys(k).forEach(x=>store.revertForm(form,x)));renderBody();setStatus('Reverted to the on-file value.');}));
  document.querySelectorAll('button[data-revaddr]').forEach(b=>b.addEventListener('click',()=>{const _box=b.getAttribute('data-revaddr');const g=ADDR_GROUPS[_box]||ADDR;g.forEach(k=>store.revertForm(form,k));if(_box==='tenant.mgmt')store.revertForm(form,'tenant.mgmt_source');renderBody();setStatus('Address reverted.');}));
  document.querySelectorAll('button[data-save1]').forEach(b=>b.addEventListener('click',async e=>{e.preventDefault();e.stopPropagation();const keys=[];b.getAttribute('data-save1').split(',').forEach(_k=>coupledKeys(_k).forEach(x=>{if(keys.indexOf(x)<0)keys.push(x);}));if(handleZeroUnitCommit(keys))return;for(const _pk of ['poc.phone','appr.phone'])if(keys.indexOf(_pk)>=0){const _d=(get(_pk)||'').replace(/\D/g,'');if(_d.length!==0&&_d.length!==10){setStatus('Enter a complete 10-digit phone before saving.');return;}}keys.forEach(k=>{const m=k.match(/^partb\.writein\.(e1|e2|e3|e4|e5|s1|s2|s3|s4|s5|s6)(\.on)?$/);if(m)clearUncheckedWriteins([m[1]]);});try{form=await store.saveFields(form,keys);}catch(e){saveFailed(e);return;}await refreshSnap();renderBody();setStatus('Saved just that field to the database.');}));
  document.querySelectorAll('button[data-save1addr]').forEach(b=>b.addEventListener('click',async()=>{const _box=b.getAttribute('data-save1addr');const ks=(ADDR_GROUPS[_box]||ADDR).slice();if(_box==='tenant.mgmt')ks.push('tenant.mgmt_source');try{form=await store.saveFields(form,ks);}catch(e){saveFailed(e);return;}await refreshSnap();renderBody();setStatus('Saved the address to the database.');}));
  document.querySelectorAll('.uatrigger').forEach(t=>{const d=t.closest('.uadrop');if(!d)return;
    const tog=()=>{const open=d.classList.contains('open');document.querySelectorAll('.uadrop.open').forEach(x=>x.classList.remove('open'));if(!open)d.classList.add('open');};
    const openIt=()=>{document.querySelectorAll('.uadrop.open').forEach(x=>x.classList.remove('open'));d.classList.add('open');};
    const opts=()=>[...d.querySelectorAll('.uaopt')];
    const setHl=idx=>{const o=opts();o.forEach(x=>x.classList.remove('hl'));if(o[idx]){o[idx].classList.add('hl');o[idx].scrollIntoView({block:'nearest'});}};
    t.addEventListener('click',e=>{e.stopPropagation();tog();});
    t.addEventListener('focus',()=>{});
    t.addEventListener('keydown',e=>{if(e.target!==t)return;const o=opts();
      if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(!d.classList.contains('open'))openIt();let hi=o.findIndex(x=>x.classList.contains('hl'));hi=e.key==='ArrowDown'?(hi+1>=o.length?0:hi+1):(hi<=0?o.length-1:hi-1);setHl(hi);return;}
      if(e.key==='Enter'){e.preventDefault();e.stopPropagation();const hl=d.querySelector('.uaopt.hl');if(d.classList.contains('open')&&hl){hl.click();}else if(d.classList.contains('open')){d.classList.remove('open');}else if(_pending&&_pending.length){commitPending();}else{tog();}return;}
      if((e.key==='Backspace'||e.key==='Delete')&&d.classList.contains('cs')){e.preventDefault();const _co=d.querySelector('.uaopt');if(_co){const _ck=_co.getAttribute('data-cskey');_pendingSnap=snapOf([_ck]);form=store.editForm(form,_ck,'');_pending=[_ck];_refocusSel='[data-trigfor="'+_ck+'"]';renderBody();}return;}if(e.key==='Escape'){if(d.classList.contains('open')){e.preventDefault();e.stopPropagation();d.classList.remove('open');}return;}if(e.key==='Tab'){d.classList.remove('open');return;}
      if(/^[a-zA-Z0-9]$/.test(e.key)){e.preventDefault();if(!d.classList.contains('open'))openIt();d._buf=((d._buf||'')+e.key).toUpperCase();clearTimeout(d._bufT);d._bufT=setTimeout(()=>{d._buf='';},800);let idx=o.findIndex(x=>x.textContent.trim().toUpperCase().startsWith(d._buf));if(idx<0&&d._buf.length>1){d._buf=e.key.toUpperCase();idx=o.findIndex(x=>x.textContent.trim().toUpperCase().startsWith(d._buf));}setHl(idx);return;}
    });});
  document.querySelectorAll('.uaopt').forEach(o=>o.addEventListener('click',e=>{e.stopPropagation();const i=o.getAttribute('data-uai');if(i===null)return;const v=o.getAttribute('data-uaopt');_pendingSnap=snapOf(['units.'+i+'.ua_source','units.'+i+'.ua_reviewed']);form=store.editForm(form,'units.'+i+'.ua_source',v);form=store.editForm(form,'units.'+i+'.ua_reviewed','1');_pending=['units.'+i+'.ua_source'];_refocusSel='[data-box="units.'+i+'.ua_source"] .uatrigger';renderBody();setStatus('UA source set — conflict resolved.');}));document.querySelectorAll('[data-mgmt]').forEach(o=>o.addEventListener('click',e=>{e.stopPropagation();_pendingSnap=snapOf(['tenant.mgmt_source']);form=store.editForm(form,'tenant.mgmt_source',o.getAttribute('data-mgmt'));_pending=['tenant.mgmt_source'];_refocusSel='[data-box="tenant.mgmt_address"] .uatrigger';renderBody();}));document.querySelectorAll('[data-csopt]').forEach(o=>o.addEventListener('click',e=>{e.stopPropagation();const _ck=o.getAttribute('data-cskey');const _cb=o.closest('[data-box]');_pendingSnap=snapOf([_ck]);form=store.editForm(form,_ck,o.getAttribute('data-csopt'));_pending=[_ck];_refocusSel='[data-trigfor="'+_ck+'"]';renderBody();if(/\.br$/.test(_ck))scheduleHudRefresh();}));document.querySelectorAll('[data-csclear]').forEach(x=>x.addEventListener('click',e=>{e.stopPropagation();e.preventDefault();form=store.editForm(form,x.getAttribute('data-csclear'),'');renderBody();setStatus('Cleared to blank.');}));document.querySelectorAll('[data-uaok]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();form=store.editForm(form,'units.'+b.getAttribute('data-uaok')+'.ua_reviewed','1');renderBody();setStatus('UA conflict resolved — approved the shown value.');}));document.querySelectorAll('[data-safmropt]').forEach(o=>o.addEventListener('click',e=>{e.stopPropagation();const i=o.getAttribute('data-safmri'),v=o.getAttribute('data-safmropt');_pendingSnap=snapOf(['units.'+i+'.safmr_source','units.'+i+'.safmr_reviewed']);form=store.editForm(form,'units.'+i+'.safmr_source',v);form=store.editForm(form,'units.'+i+'.safmr_reviewed','1');_pending=['units.'+i+'.safmr_source'];_refocusSel='[data-box="units.'+i+'.safmr_source"] .uatrigger';renderBody();setStatus('SAFMR source set.');}));
  document.querySelectorAll('[data-safmrok]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();form=store.editForm(form,'units.'+b.getAttribute('data-safmrok')+'.safmr_reviewed','1');renderBody();setStatus('SAFMR conflict resolved.');}));
  document.querySelectorAll('[data-typ]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();const i=b.getAttribute('data-ci'),w=b.getAttribute('data-typ');if(w==='rcs'){const brR=get('units.'+i+'.br_rcs'),baR=get('units.'+i+'.ba_rcs');if(brR)form=store.editForm(form,'units.'+i+'.br',brR);if(baR)form=store.editForm(form,'units.'+i+'.ba',baR);}form=store.editForm(form,'units.'+i+'.type_reviewed','1');renderBody();setStatus('Unit type resolved — using '+(w==='rcs'?'RCS':'RS')+'.');}));
  document.querySelectorAll('[data-num]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();const i=b.getAttribute('data-ci'),w=b.getAttribute('data-num');if(w==='rcs'){const nR=get('units.'+i+'.num_rcs');if(nR)form=store.editForm(form,'units.'+i+'.num_units',nR);}form=store.editForm(form,'units.'+i+'.num_reviewed','1');renderBody();setStatus('Units resolved — using '+(w==='rcs'?'RCS':'RS')+'.');}));
  document.querySelectorAll('.uac-in,.mgmt-in').forEach(inp=>{inp.addEventListener('mousedown',e=>e.stopPropagation());inp.addEventListener('click',e=>e.stopPropagation());});
  document.querySelectorAll('.srcedit').forEach(inp=>{inp.addEventListener('input',()=>{const fam=inp.getAttribute('data-srcedit'),i=inp.getAttribute('data-si');let key,val;if(fam==='dateeff'){val=fmtDateInput(inp.value);form=store.editForm(form,'rent_schedule.date_eff_source','custom');form=store.editForm(form,'rent_schedule.date_eff_custom',val);key='rent_schedule.date_eff_custom';scheduleHudRefresh();}else{val=cleanNum(inp.value);form=store.editForm(form,'units.'+i+'.'+fam+'_source','custom');form=store.editForm(form,'units.'+i+'.'+fam+'_custom',val);key='units.'+i+'.'+fam+'_custom';}renderBody();const ni=document.querySelector('[data-k="'+key+'"]');if(ni){ni.focus({preventScroll:true});try{const L=(ni.value||'').length;ni.setSelectionRange(L,L);}catch(e){}}});});
  document.querySelectorAll('[data-srck]').forEach(o=>o.addEventListener('click',e=>{e.stopPropagation();const k=o.getAttribute('data-srck');_pendingSnap=snapOf([k]);form=store.editForm(form,k,o.getAttribute('data-srcv'));if(form[k])form[k].source='this-cycle';_pending=[k];_refocusSel='[data-k="'+k+'"]';renderBody();setStatus('Pulled from '+(o.getAttribute('data-srctag')||'source')+'.');}));
  document.querySelectorAll('[data-srcgrp]').forEach(o=>o.addEventListener('click',e=>{e.stopPropagation();const box=o.getAttribute('data-srcgrp');const r=SRCGROUP[box]()[+o.getAttribute('data-srcgix')];if(!r||!r.apply)return;const keys=Object.keys(r.apply);_pendingSnap=snapOf(keys);keys.forEach(k=>{form=store.editForm(form,k,r.apply[k]);if(form[k])form[k].source='this-cycle';});_pending=keys.slice();_refocusSel='[data-box="'+box+'"] input';renderBody();setStatus('Address pulled from '+r.tag+'.');}));
  document.querySelectorAll('[data-pocra]').forEach(o=>o.addEventListener('click',e=>{e.stopPropagation();const nm=raVal('poc.name');if(!nm)return;const saved=(mpdb?mpdb.listContacts():[]).find(x=>((x.name||'').trim().toLowerCase()===nm.trim().toLowerCase()));const c={name:nm,email:raVal('poc.email')||(saved&&saved.email)||'',phone:raVal('poc.phone')||(saved&&saved.phone)||''};_pendingSnap=snapOf(['poc.name','poc.email','poc.phone']);pocSelectContact(c);['poc.name','poc.email','poc.phone'].forEach(k=>{if(form[k])form[k].source='this-cycle';});_pending=['poc.name','poc.email','poc.phone'];_refocusSel='[data-box="poc.name"] .pocname-in';renderBody();setStatus('POC pulled from Related Affordable.');}));
  document.querySelectorAll('[data-pocopt]').forEach(o=>o.addEventListener('click',e=>{e.stopPropagation();const ct=mpdb.listContacts().find(x=>x.id===o.getAttribute('data-pocopt'));_pendingSnap=snapOf(['poc.name','poc.email','poc.phone']);if(ct)pocSelectContact(ct);_pending=['poc.name','poc.email','poc.phone'];_refocusSel='[data-box="poc.name"] .pocname-in';renderBody();}));
  document.querySelectorAll('[data-dirid]').forEach(o=>o.addEventListener('click',e=>{e.stopPropagation();const fk=o.getAttribute('data-dirfor');const P=DIR_PICK[fk];const ct=dirList(P.kind).find(x=>x.id===o.getAttribute('data-dirid'));_pendingSnap=snapOf(P.keys);if(ct)P.apply(ct);_pending=P.keys.slice();_refocusSel='[data-box="'+fk+'"] .pocname-in';renderBody();}));
  document.querySelectorAll('[data-deffopt]').forEach(o=>o.addEventListener('click',e=>{e.stopPropagation();_pendingSnap=snapOf(['rent_schedule.date_eff_source']);form=store.editForm(form,'rent_schedule.date_eff_source',o.getAttribute('data-deffopt'));_pending=['rent_schedule.date_eff_source'];_refocusSel='[data-box="rent_schedule.date_eff_source"] .uatrigger';renderBody();scheduleHudRefresh();}));
  document.querySelectorAll('[data-ocfopt]').forEach(o=>o.addEventListener('click',e=>{e.stopPropagation();_pendingSnap=snapOf(['ocaf.factor_src']);form=store.editForm(form,'ocaf.factor_src',o.getAttribute('data-ocfopt'));_pending=['ocaf.factor_src'];_refocusSel='[data-box="ocaf.factor_src"] .uatrigger';renderBody();}));
  const _po=el('pullOcaf');if(_po)_po.onclick=pullOcafFactor;
  const _pu=el('pullUaf');if(_pu)_pu.onclick=pullUafFactors;
  const _oa=el('ocafApply');if(_oa)_oa.onclick=ocafApplyRents;
  const _ua=el('uafApply');if(_ua)_ua.onclick=uafApplyUas;
  document.querySelectorAll('[data-delunit]').forEach(b=>b.addEventListener('click',()=>{const i=+b.getAttribute('data-delunit');const wasEmpty=!unitHasData(i)&&numf(get('units.'+i+'.num_units'))<=0;const snap={};Object.keys(form).forEach(k=>{if(k.indexOf('units.'+i+'.')===0){snap[k]=form[k];delete form[k];}});UNITS=UNITS.filter(x=>x!==i);if(wasEmpty){renderBody();setStatus('Empty unit type removed.');}else{_undoStack.push({i,snap});renderBody();setStatus('Unit type deleted — undo available below.');}}));
  document.querySelectorAll('[data-delnonrev]').forEach(b=>b.addEventListener('click',()=>{const i=+b.getAttribute('data-delnonrev');const hadData=nonrevHasData(i)||numf(get('nonrev.'+i+'.num_units'))>0;const snap={};Object.keys(form).forEach(k=>{if(k.indexOf('nonrev.'+i+'.')===0){snap[k]=form[k];delete form[k];}});NONREV=NONREV.filter(x=>x!==i);const flagCell=form['nonrev.enabled'];if(!NONREV.length)form=store.editForm(form,'nonrev.enabled','');if(hadData){_undoNR.push({i,snap,flag:flagCell});renderBody();setStatus('Non-revenue unit deleted — undo available below.');}else{renderBody();setStatus(NONREV.length?'Empty non-revenue unit removed.':'Last non-revenue unit removed — Part D section turned off.');}}));
  document.querySelectorAll('[data-delns8]').forEach(b=>b.addEventListener('click',()=>{const i=+b.getAttribute('data-delns8');const hadData=ns8HasData(i)||numf(get('ns8.'+i+'.num_units'))>0;const snap={};Object.keys(form).forEach(k=>{if(k.indexOf('ns8.'+i+'.')===0){snap[k]=form[k];delete form[k];}});NS8=NS8.filter(x=>x!==i);const flagCell=form['ns8.enabled'];if(!NS8.length)form=store.editForm(form,'ns8.enabled','');if(hadData){_undoLI.push({i,snap,flag:flagCell});renderBody();setStatus('Non-Section 8 unit type deleted — undo available below.');}else{renderBody();setStatus(NS8.length?'Empty non-Section 8 unit type removed.':'Last non-Section 8 unit type removed — section turned off.');}}));
  const add=el('addUnit');if(add)add.onclick=()=>{_undoStack=[];const nx=(UNITS.length?Math.max.apply(null,UNITS):-1)+1;form=store.editForm(form,'units.'+nx+'.br','');UNITS.push(nx);renderBody();setStatus('');};
  const addn=el('addNonrev');if(addn)addn.onclick=()=>{_undoNR=[];NONREV.push(NONREV.length?Math.max.apply(null,NONREV)+1:0);renderBody();setStatus('');};
  const nt=el('nonrevToggle');if(nt)nt.onchange=()=>{if(!nt.checked&&NONREV.length){nt.checked=true;setStatus('Delete the non-revenue rows first to turn this section off.');return;}form=store.editForm(form,'nonrev.enabled',nt.checked?'1':'');if(nt.checked&&!NONREV.length){_undoNR=[];NONREV=[0];}renderBody();setStatus('');};
  const lt=el('ns8Toggle');if(lt)lt.onchange=()=>{
    if(!lt.checked&&NS8.some(i=>numf(get('ns8.'+i+'.num_units'))>0)){lt.checked=true;setStatus('Delete the non-Section 8 rows first to turn this section off.');return;}
    if(!lt.checked&&NS8.some(ns8HasData)){
      lt.checked=true;
      dialogConfirm('Turn off non-Section 8 units?','The section still holds '+NS8.length+' row'+(NS8.length>1?'s':'')+' with values. Turned off, the rows are left out of every generated document, and your next \u201cUpdate database\u201d removes them for good \u2014 re-check the box before saving to bring them back.','Turn off',true,()=>{form=store.editForm(form,'ns8.enabled','');renderBody();setStatus('Non-Section 8 units off \u2014 the hidden rows are removed on your next Update database.');});
      return;}
    form=store.editForm(form,'ns8.enabled',lt.checked?'1':'');
    if(lt.checked&&!NS8.length){_undoLI=[];form=store.editForm(form,'ns8.0.br','');NS8=[0];}
    renderBody();setStatus(lt.checked?'Non-Section 8 units on — they print on the rent schedule between Section 8 revenue and non-revenue units.':'');};
  const addl=el('addNs8');if(addl)addl.onclick=()=>{_undoLI=[];const nx=(NS8.length?Math.max.apply(null,NS8):-1)+1;form=store.editForm(form,'ns8.'+nx+'.br','');NS8.push(nx);renderBody();setStatus('');};
  const phs=el('pullSafmr');if(phs)phs.onclick=()=>{ensureHudSafmr({manual:true});};
  const upR=el('upRcs');if(upR)upR.onclick=()=>{const f=el('rcsFile');if(f)f.click();};
  const rf=el('rcsFile');if(rf)rf.onchange=()=>{const f=rf.files&&rf.files[0];if(!f)return;
    f.arrayBuffer().then(buf=>{const b=new Uint8Array(buf);
      if(!(b.length>4&&b[0]===0x25&&b[1]===0x50&&b[2]===0x44&&b[3]===0x46)){setStatus('That file isn\u2019t a PDF \u2014 upload the completed RCS report as a PDF.');rf.value='';return;}
      _rcsUpload={name:f.name,bytes:b};rf.value='';renderBody();setStatus('RCS report uploaded \u2014 it goes in as document 04 when you generate the package.');});};
  const uu=el('undoUnit');if(uu)uu.onclick=()=>{if(!_undoStack.length)return;const e=_undoStack.pop();Object.keys(e.snap).forEach(k=>{form[k]=e.snap[k];});if(UNITS.indexOf(e.i)<0)UNITS.push(e.i);UNITS.sort((a,b)=>a-b);renderBody();setStatus('Unit type restored.');};
  const uc=el('undoCommit');if(uc)uc.onclick=()=>{_undoStack=[];renderBody();setStatus('Deletions kept.');};
  const un=el('undoNonrev');if(un)un.onclick=()=>{if(!_undoNR.length)return;const e=_undoNR.pop();Object.keys(e.snap).forEach(k=>{form[k]=e.snap[k];});if(e.flag)form['nonrev.enabled']=e.flag;else form=store.editForm(form,'nonrev.enabled','1');if(NONREV.indexOf(e.i)<0)NONREV.push(e.i);NONREV.sort((a,b)=>a-b);renderBody();setStatus('Non-revenue unit restored.');};
  const unc=el('undoNonrevC');if(unc)unc.onclick=()=>{_undoNR=[];renderBody();setStatus('Deletions kept.');};
  const ul=el('undoNs8');if(ul)ul.onclick=()=>{if(!_undoLI.length)return;const e=_undoLI.pop();Object.keys(e.snap).forEach(k=>{form[k]=e.snap[k];});if(e.flag)form['ns8.enabled']=e.flag;else form=store.editForm(form,'ns8.enabled','1');if(NS8.indexOf(e.i)<0)NS8.push(e.i);NS8.sort((a,b)=>a-b);renderBody();setStatus('Non-Section 8 unit type restored.');};
  const ulc=el('undoNs8C');if(ulc)ulc.onclick=()=>{_undoLI=[];renderBody();setStatus('Deletions kept.');};
  const all=el('clAll'),none=el('clNone');if(all)all.onclick=()=>{CHECKLIST_FLAT.forEach((_,j)=>form=store.editForm(form,'check.'+j,'1'));renderBody();};if(none)none.onclick=()=>{CHECKLIST_FLAT.forEach((_,j)=>form=store.editForm(form,'check.'+j,''));renderBody();};
  document.querySelectorAll('.chead').forEach(h=>h.addEventListener('click',()=>h.parentElement.classList.toggle('collapsed')));
  document.querySelectorAll('.miniic,.revert,.save1,.urev,.undocommit,.csclear').forEach(b=>b.setAttribute('tabindex','-1'));wireArrowNav();
}

/* ============================ NAVIGATION ==============================
   Menu (property gallery) -> Launcher (pick a program) -> Form (RCS).
   ONE current record per property; leaving the form asks to save or discard.
   The RCS form itself (everything above) is unchanged. */

document.addEventListener('click',e=>{document.querySelectorAll('.uadrop.open').forEach(x=>x.classList.remove('open'));if(_pending&&!(e.target&&e.target.closest&&e.target.closest('.uaopt,[data-cb],.cb,[data-fuel],[data-fuel3],[data-wibox],[data-mgmt],[data-csopt],.uatrigger'))){_pending=null;_pendingSnap=null;}});
document.addEventListener('keydown',e=>{const vis=v=>{const x=el('view'+v);return x&&x.style&&x.style.display!=='none';};if(e.key==='Tab'){_pending=null;_pendingSnap=null;return;}if(e.key==='Enter'){const ae=document.activeElement;const inText=!!ae&&/^(INPUT|TEXTAREA)$/.test(ae.tagName)&&ae.type!=='checkbox';if(!inText&&_pending&&_pending.length){e.preventDefault();commitPending();}return;}if(e.key!=='Escape')return;if(el('scrim')&&el('scrim').classList&&el('scrim').classList.contains('open')){closeModal();_pending=null;_pendingSnap=null;return;}const openD=document.querySelector('.uadrop.open');if(openD){e.preventDefault();openD.classList.remove('open');return;}if(vis('Form')){if(_pending&&_pending.length){e.preventDefault();revertPending();return;}const ae=document.activeElement;const cell=(ae&&ae.closest)?ae.closest('[data-box],.cb,.wi'):null;if(cell){let _sel=null;if(ae.getAttribute){if(ae.getAttribute('data-k'))_sel='[data-k="'+ae.getAttribute('data-k')+'"]';else if(ae.getAttribute('data-cb'))_sel='[data-cb="'+ae.getAttribute('data-cb')+'"]';else if(ae.classList&&ae.classList.contains('uatrigger'))_sel='[data-box="'+(cell.getAttribute('data-box')||'')+'"] .uatrigger';}_refocusSel=_sel;if(revertCellIfOver(cell)){e.preventDefault();return;}_refocusSel=null;}requestExit();return;}if(vis('Launcher')||vis('Contacts')){openMenu();}});
let _mouseFocus=false,_lastClickSel=null;
document.addEventListener('mousedown',e=>{_mouseFocus=true;setTimeout(()=>{_mouseFocus=false;},60);
  _lastClickSel=null;const t=e.target;
  if(t&&t.closest){const pick=(attr)=>{const n=t.closest('['+attr+']');return n?('['+attr+'="'+n.getAttribute(attr)+'"]'):null;}
    _lastClickSel=pick('data-cb')||pick('data-wibox')||pick('data-fuel')||pick('data-fuel3')||pick('data-box');}
},true);
window.addEventListener('scroll',()=>{const s=window.scrollY>150;if(s!==document.body.classList.contains('scrolled'))document.body.classList.toggle('scrolled',s);});

let activeProgram='RCS';let sortMode='name';
function show(v){['Auth','Menu','Launcher','Form','Contacts'].forEach(V=>{const e=el('view'+V);if(e)e.style.display=(v===V)?'':'none';});window.scrollTo(0,0);}

/* ---- small helpers for the menu -------------------------------------- */
function ringSvg(pct,size){size=size||36;const r=size/2-3;const c=2*Math.PI*r;const off=c*(1-Math.max(0,Math.min(100,pct))/100);const col=pct>=100?'#1e3a5f':'#b45309';
  return '<svg class="ringsvg" width="'+size+'" height="'+size+'" viewBox="0 0 '+size+' '+size+'"><circle cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" fill="none" stroke="#e9edf4" stroke-width="3.4"/><circle cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" fill="none" stroke="'+col+'" stroke-width="3.4" stroke-linecap="round" stroke-dasharray="'+c.toFixed(1)+'" stroke-dashoffset="'+off.toFixed(1)+'" transform="rotate(-90 '+size/2+' '+size/2+')"/><text x="50%" y="53%" dominant-baseline="middle" text-anchor="middle" font-size="'+(size<44?10:12.5)+'" font-weight="700" fill="#33405c">'+pct+'</text></svg>';}
function niceDate(d){if(!d)return '—';const m=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];const p=String(d).slice(0,10).split('-');if(p.length!==3)return d;return m[(+p[1])-1]+' '+(+p[2])+', '+p[0];}
function relTime(iso){if(!iso)return '—';const s=String(iso);if(s.indexOf('T')<0)return niceDate(s);const then=new Date(s);if(isNaN(then))return niceDate(s);const now=new Date();const d=(now-then)/1000;if(d<45)return 'just now';if(d<3600)return Math.max(1,Math.round(d/60))+'m ago';if(d<86400)return then.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});return niceDate(s);}
function updTitle(iso){if(!iso)return '';const s=String(iso);const base='Updated '+niceDate(s);if(s.indexOf('T')<0)return base;const t=new Date(s);return isNaN(t)?base:base+' at '+t.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});}

/* ---- generic modal (used for exit, new/rename, delete) --------------- */
function modal(html){el('dialog').innerHTML=html;el('scrim').classList.add('open');}
function closeModal(){el('scrim').classList.remove('open');}
function dialogInput(title,label,value,okLabel,onOk){
  modal('<div class="dlg-t">'+esc(title)+'</div><div class="dlg-field"><label>'+esc(label)+'</label><input id="dlgIn" value="'+esc(value||'')+'" autocomplete="off"></div><div class="dlg-row"><button class="btn" id="dlgCancel">Cancel</button><span class="dlg-sp"></span><button class="btn p" id="dlgOk">'+esc(okLabel||'Save')+'</button></div>');
  const inp=el('dlgIn');if(inp&&inp.focus){inp.focus();if(inp.select)inp.select();inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();el('dlgOk').click();}else if(e.key==='Escape')closeModal();});}
  el('dlgCancel').onclick=closeModal;el('dlgOk').onclick=()=>{const v=(el('dlgIn').value||'').trim();closeModal();onOk(v);};
}
function dialogConfirm(title,body,okLabel,danger,onOk){
  modal('<div class="dlg-t">'+esc(title)+'</div><div class="dlg-b">'+body+'</div><div class="dlg-row"><button class="btn" id="dlgCancel">Cancel</button><span class="dlg-sp"></span><button class="btn '+(danger?'danger':'p')+'" id="dlgOk">'+esc(okLabel||'OK')+'</button></div>');
  el('dlgCancel').onclick=closeModal;el('dlgOk').onclick=()=>{closeModal();onOk();};
}

/* ---- MENU: the property gallery -------------------------------------- */
function openMenu(){activeCid=null;renderMenu();show('Menu');}
function renderMenu(){
  const q=((el('menuSearch')&&el('menuSearch').value)||'').toLowerCase();
  const all=mpdb.listProperties();
  const props=all.filter(p=>!q||(p.name+' '+(p.alias||'')+' '+p.fha+' '+(p.city_state||'')).toLowerCase().indexOf(q)>=0);if(sortMode==='updated'){const idn=x=>parseInt(String(x).replace(/\D/g,''),10)||0;props.sort((a,b)=>String(b.updated_at||'').localeCompare(String(a.updated_at||''))||(idn(b.id)-idn(a.id)));}
  const need=all.filter(p=>p.completeness<1).length;
  if(el('menuCount'))el('menuCount').textContent=all.length+(all.length===1?' property':' properties')+(all.length?(need?'  ·  '+need+' need'+(need===1?'s':'')+' review':'  ·  all complete'):'');
  const card=p=>{const pct=Math.round(p.completeness*100);
    const al=(p.alias||'').trim();const showAl=al&&al.toLowerCase()!==String(p.name||'').trim().toLowerCase();
    return '<button class="pcard" data-open="'+p.id+'"><div class="pc-top"><div class="pc-name">'+esc(p.name)+(showAl?'<span class="pc-alias">&ldquo;'+esc(al)+'&rdquo;</span>':'')+'</div>'+ringSvg(pct)+'</div>'
      +'<div class="pc-meta">'+esc(p.fha)+(p.city_state?' &middot; '+esc(p.city_state):'')+'</div><div class="pc-div"></div>'
      +'<div class="pc-foot"><span class="pc-units">'+p.total_units+' unit'+(p.total_units===1?'':'s')+(p.unit_types?' &middot; '+p.unit_types+' type'+(p.unit_types===1?'':'s'):'')+'</span><span class="pc-upd" title="'+esc(updTitle(p.updated_at))+'">Updated '+relTime(p.updated_at)+'</span></div></button>';};
  const newTile='<button class="pcard newcard" id="tileNew"><span class="plus">+</span><span>New property</span></button>';
  const empty='<div class="mempty">No properties match &ldquo;'+esc(q)+'&rdquo;. <span class="link" id="mClear">Clear search</span></div>';
  el('menuGrid').innerHTML=(props.length?props.map(card).join(''):'')+(q&&!props.length?empty:'')+(q?'':newTile);
  document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openLauncher(b.getAttribute('data-open')));
  const tn=el('tileNew');if(tn)tn.onclick=createProperty;
  const mc=el('mClear');if(mc)mc.onclick=()=>{if(el('menuSearch'))el('menuSearch').value='';renderMenu();};
}
function createProperty(){
  const props=raProps();
  if(!props.length){dialogInput('New property','Property name','','Create',nm=>{const r=mpdb.createProperty((nm||'').trim());openLauncher(r.pid);});return;}
  const rows=props.map(p=>'<div class="uaopt" data-raprop="'+esc(p.name)+'" data-rapid="'+esc(p.id==null?'':String(p.id))+'" style="padding:9px 12px;cursor:pointer">'+esc(p.name)+'<span class="uasub">Related Affordable</span></div>').join('');
  modal('<div class="dlg-t">New property</div><div class="dlg-field"><label>Property name</label><input id="dlgIn" autocomplete="off" placeholder="Type a name, or pick a Related Affordable property"></div>'
    +'<div style="margin:10px 0 4px;font-size:11px;font-weight:700;letter-spacing:.4px;color:#8791a5">RELATED AFFORDABLE PROPERTIES \u2014 TYPE ABOVE TO FILTER</div>'
    +'<div id="srcList" style="max-height:200px;overflow:auto;border:1px solid #e0e5ee;border-radius:8px">'+rows+'</div>'
    +'<div class="dlg-row"><button class="btn" id="dlgCancel">Cancel</button><span class="dlg-sp"></span><button class="btn p" id="dlgOk">Create</button></div>');
  const inp=el('dlgIn'),list=el('srcList');let pickedId='';
  const filter=()=>{const q=(inp.value||'').trim().toLowerCase();let vis=0;
    const score=n=>{const s=n.toLowerCase();if(!q)return 0;if(s.startsWith(q))return 0;if(s.split(/\s+/).some(w=>w.startsWith(q)))return 1;if(s.indexOf(q)>=0)return 2;return 3;};
    const rows=[...list.querySelectorAll('[data-raprop]')];
    rows.forEach(r=>{r._sc=score(r.getAttribute('data-raprop'));const on=r._sc<3;r.style.display=on?'':'none';if(on)vis++;});
    rows.slice().sort((x,y)=>x._sc-y._sc||x.getAttribute('data-raprop').localeCompare(y.getAttribute('data-raprop'))).forEach(r=>list.appendChild(r));
    list.style.display=vis?'':'none';};
  inp.addEventListener('input',()=>{pickedId='';filter();});inp.focus();
  list.querySelectorAll('[data-raprop]').forEach(r=>r.onclick=()=>{inp.value=r.getAttribute('data-raprop');pickedId=r.getAttribute('data-rapid')||'';filter();inp.focus();});
  inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();el('dlgOk').click();}else if(e.key==='Escape')closeModal();});
  el('dlgCancel').onclick=closeModal;
  el('dlgOk').onclick=()=>{const v=(el('dlgIn').value||'').trim();closeModal();
    /* pickedId = the picked RA master-registry id. The Supabase adapter ignores
       the 2nd arg today; the RA port's createProperty(name, raMasterId) uses it
       for the read-only prefill. */
    const r=mpdb.createProperty(v,pickedId);openLauncher(r.pid);};
}

/* ---- LAUNCHER: property summary + program picker --------------------- */
function openLauncher(pid){activePid=pid;activeCid=null;renderLauncher();show('Launcher');}
function docIcon(){return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c86a2" stroke-width="1.6" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>';}
function rcsAffPane(a){
  if(!a.total_units)return '<div class="aff-empty">Add unit types &amp; rents to see the affordability check.</div>';
  if(a.safmr_missing||!a.ceiling)return '<div class="aff-empty">Enter a 150% SAFMR to run the affordability check.</div>';
  const pCur=clamp(a.current_gpr/a.ceiling*100),pPro=clamp(a.proposed_gpr/a.ceiling*100);const dMo=a.proposed_gpr-a.current_gpr,dYr=dMo*12;
  return '<div class="aff"><div class="aff-top"><span class="aff-k">AFFORDABILITY CHECK</span><span class="aff-pass '+(a.pass?'ok':'over')+'">'+(a.pass?'&#10003; PASS':'&#10007; OVER')+' &middot; '+money(Math.abs(a.headroom))+(a.pass?' headroom':' over')+'</span></div>'
    +'<div class="aff-body"><div class="aff-left"><div class="aff-gauge"><div class="seg dark" style="width:'+pCur+'%"></div><div class="seg light" style="left:'+pCur+'%;width:'+Math.max(0,pPro-pCur)+'%"></div><div class="oend"></div></div>'
      +'<div class="aff-anchors"><span><b style="color:#2f7d57">'+money(a.current_gpr)+'</b><i>current</i></span><span><b style="color:#47a377">'+money(a.proposed_gpr)+'</b><i>proposed</i></span><span><b>'+money(a.ceiling)+'</b><i>150% ceiling</i></span></div></div>'
    +'<div class="aff-right"><span><b class="teal">'+sPct(a.pct)+'</b><i>increase</i></span><span><b>'+sMoney(a.per_unit)+'</b><i>per unit</i></span><span><b>'+sMoney(dMo)+'</b><i>/mo</i></span><span><b>'+sK(dYr)+'</b><i>/yr</i></span></div></div></div>';}
/* ---- CYCLES: property-page cards + create picker ----------------------
   A cycle is a complete frozen snapshot (see CYCLES-OCAF-UAF-DESIGN.md).
   The dominant cycle (latest effective date; rent-setting beats UAF-only)
   is elevated, feeds the summary, and is the only cycle whose durable
   saves update the property record. */
const PROG_NAMES={rcs:'RCS',ocaf:'OCAF',uaf:'UAF'};
const MONTHS_LONG=['January','February','March','April','May','June','July','August','September','October','November','December'];
function fmtDateLong(v){v=String(v||'').trim();let y,m,dd;let g=v.match(/^(\d{4})-(\d{2})-(\d{2})/);if(g){y=+g[1];m=+g[2];dd=+g[3];}else{g=v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);if(g){m=+g[1];dd=+g[2];y=+g[3];}}
  return (m>=1&&m<=12)?(MONTHS_LONG[m-1]+' '+dd+', '+y):v;}
function progChips(list){return (list||[]).map(x=>'<span class="cychip">'+(PROG_NAMES[x]||String(x).toUpperCase())+'</span>').join('');}
function cyclesHtml(){
  const cs=mpdb.listCycles(activePid);
  const btn='<button class="btn p" id="bNewCycle" style="margin-bottom:10px">+ Start new cycle</button>';
  if(!cs.length)return btn+'<div class="lh-note">No cycles yet \u2014 start one to work on this property\u2019s renewal.</div>';
  return btn+cs.map(c=>{
    const a=mpdb.cycleAnalysis(c.id);
    const gen=c.generated&&c.generated.at;
    return '<div class="cycard'+(c.dominant?' dom':'')+'" data-cyopen="'+c.id+'">'
      +'<div class="cy-h">'+progChips(c.programs)+'<b class="cy-t">'+esc(c.label||'(no year)')+(c.effective_date?' \u00b7 effective '+esc(fmtDateLong(c.effective_date)):'')+'</b>'
      +(c.dominant?'<span class="cy-dom">current \u00b7 sets the property record</span>':'')
      +'<span class="cy-st'+(gen?' ok':'')+'">'+(gen?'Package generated':'Draft')+'</span></div>'
      +rcsAffPane(a)
      +'<div class="cy-act"><button class="txtbtn del" data-cydel="'+c.id+'">Delete</button></div></div>';
  }).join('');
}
function wireCycles(){
  const b=el('bNewCycle');if(b)b.onclick=newCycleDialog;
  document.querySelectorAll('[data-cyopen]').forEach(x=>x.onclick=()=>openCycleForm(x.getAttribute('data-cyopen')));
  document.querySelectorAll('[data-cydel]').forEach(x=>x.onclick=(e)=>{e.stopPropagation();const id=x.getAttribute('data-cydel');
    dialogConfirm('Delete cycle','This permanently removes the cycle and its saved data. The property record is untouched.','Delete',true,async()=>{try{await mpdb.deleteCycle(id);renderLauncher();}catch(e){saveFailedModal(e);}});});
}
function bootstrapFirstCycle(p){
  // migration: an existing single-record property becomes its own cycle #1
  window.__cyBoot=window.__cyBoot||{};
  if(mpdb.listCycles(activePid).length||window.__cyBoot[activePid])return;
  if(!(p&&p.total_units>0))return;   // real unit data = a record worth migrating; a fresh name-only property is not
  window.__cyBoot[activePid]=1;
  const m=mpdb.getFlat(activePid);
  const eff=(m['rent_schedule.date_rents_effective']&&m['rent_schedule.date_rents_effective'].value)||'';
  const yr=(String(eff).match(/(\d{4})/)||[])[1]||String(new Date().getFullYear());
  const pid=activePid;
  mpdb.createCycle(pid,{full:true,programs:['rcs'],label:yr,effective_date:eff})
    .then(()=>{if(activePid===pid)renderLauncher();})
    .catch(e=>saveFailedModal(e));
}
function newCycleDialog(){
  modal('<div class="dlg-t">Start new cycle</div>'
    +'<div class="dlg-field"><label>This cycle completes</label>'
    +'<div class="cypick"><label class="cyopt"><input type="checkbox" id="cyRCS"> RCS \u2014 5-year market reset</label>'
    +'<label class="cyopt"><input type="checkbox" id="cyOCAF"> OCAF \u2014 annual factor adjustment</label>'
    +'<label class="cyopt"><input type="checkbox" id="cyUAF"> UAF \u2014 utility allowance factor</label></div></div>'
    +'<div class="dlg-field"><label>Rents effective (mm/dd/yyyy)</label><input id="cyEff" autocomplete="off" placeholder="10/01/2026"></div>'
    +'<div class="autherr" id="cyErr"></div>'
    +'<div class="dlg-row"><button class="btn" id="dlgCancel">Cancel</button><span class="dlg-sp"></span><button class="btn p" id="dlgOk">Create</button></div>');
  const rcs=el('cyRCS'),ocaf=el('cyOCAF'),uaf=el('cyUAF'),err=el('cyErr');
  rcs.onchange=()=>{if(rcs.checked)ocaf.checked=false;};   // RCS and OCAF never share a year
  ocaf.onchange=()=>{if(ocaf.checked)rcs.checked=false;};
  el('dlgCancel').onclick=closeModal;
  el('dlgOk').onclick=async()=>{
    const programs=[];if(rcs.checked)programs.push('rcs');if(ocaf.checked)programs.push('ocaf');if(uaf.checked)programs.push('uaf');
    if(!programs.length){err.textContent='Pick at least one program.';return;}
    const eff=fmtDateInput((el('cyEff').value||'').trim());
    const label=(eff.match(/(\d{4})/)||[])[1]||String(new Date().getFullYear());
    closeModal();
    try{const r=await mpdb.createCycle(activePid,{programs,label,effective_date:eff});renderLauncher();await openCycleForm(r.cid);_cyFresh=r.cid;}catch(e){saveFailedModal(e);}
  };
}
async function openCycleForm(cid){
  activeCid=cid;_cyFresh=null;
  const cy=mpdb.listCycles(activePid).find(c=>c.id===cid);
  activeProgram=cy?cy.programs.map(x=>PROG_NAMES[x]||x).join(' + '):'RCS';
  _undoStack=[];_undoNR=[];_undoLI=[];_rcsUpload=null;
  await mpdb.setActive(activePid);await refreshSnap();form=await store.fillForm();
  fixSavedToggles();applyChecklistDefaults();deriveUnits();renderFormHeader();renderBody();
  show('Form');window.scrollTo(0,0);
  if(cy&&cy.dominant)ensureHudSafmr({});   // auto-pulls only on the dominant cycle
}
function renderLauncher(){
  const p=mpdb.listProperties().find(x=>x.id===activePid);if(!p){openMenu();return;}
  const pct=Math.round(p.completeness*100);const a=mpdb.propertyAnalysis(activePid);const lh=mpdb.getLetterhead(activePid);
  const rcsLine=(a.total_units&&a.proposed_gpr)?((a.pass?'PASS':'OVER')+' &middot; '+sPct(a.pct)+' &middot; '+money(a.proposed_gpr)+'/mo'):(a.total_units?'rents not entered yet':'set up units &amp; rents');
  const soon=(code,name)=>'<div class="progcard soon"><div class="pg-h"><span class="pg-code">'+code+'</span><span class="soonchip">Coming soon</span></div><div class="pg-name">'+name+'</div></div>';
  const lhIsPdf=String(lh.data||'').indexOf('data:application/pdf')===0;
  const lhSub=lh.data?(lhIsPdf?'PDF letterhead &middot; the tenant notice prints on it full-page':'Property letterhead &middot; reused on every package'):'<span style="color:#b4552d">Not print-ready &mdash; re-upload the letterhead (PDF, PNG or JPG) so it prints on the tenant notice</span>';
  const letter=lh.name
    ?'<div class="letter has"><div class="lh-doc">'+(lh.thumb?'<img src="'+esc(lh.thumb)+'">':docIcon())+'</div><div class="lh-info"><b>'+esc(lh.name)+'</b><i>'+lhSub+'</i></div><div class="lh-act"><button class="btn sm" id="lhReplace">Replace</button><button class="btn sm" id="lhRemove">Remove</button></div></div>'
    :'<div class="letter empty"><div class="lh-doc">'+docIcon()+'</div><div class="lh-info"><b>Add the property letterhead</b><i>Used on the tenant notice &middot; PDF, PNG or JPG, stored once</i></div><button class="btn sm" id="lhAdd">Upload</button></div>';
  el('launcherBody').innerHTML=
    '<div class="lhead"><div class="lh-left"><div class="lh-name">'+esc(p.name)+'</div>'
      +'<div class="lh-meta">'+esc(p.fha)+(p.city_state?' &middot; '+esc(p.city_state):'')+(p.total_units?' &middot; '+p.total_units+' units':'')+'</div>'
      +(p.entity?'<div class="lh-entity">'+esc(p.entity)+'</div>':'')+'</div>'
      +'<div class="lh-right"><div class="lh-tools"><button class="txtbtn" id="pRename">Rename</button><span class="dotsep">&middot;</span><button class="txtbtn del" id="pDelete">Delete</button></div><div class="lh-ring">'+ringSvg(pct,46)+'</div><div class="lh-rlab">'+pct+'% complete</div></div></div>'
    +'<div class="lsec"><div class="lsec-t">Property letterhead</div>'+letter+'<div class="lh-note">The Related Affordable cover-letter and ownership-entity letterheads are constant &mdash; built into the templates. Only the property&rsquo;s own letterhead (used on the tenant notice) is uploaded here.</div><input type="file" id="lhFile" accept="image/*,.pdf,application/pdf" style="display:none"></div>'
    +'<div class="lsec"><div class="lsec-t">Cycles</div>'+cyclesHtml()+'<div class="progrow" style="margin-top:10px">'+soon('BBRA','Budget-Based Rent Adjustment')+'</div></div>';
  wireCycles();
  bootstrapFirstCycle(p);
  el('pRename').onclick=()=>dialogInput('Rename property','Property name',p.name,'Save',async nm=>{if(!nm)return;try{await mpdb.renameProperty(activePid,nm);renderLauncher();}catch(e){saveFailedModal(e);}});
  el('pDelete').onclick=()=>dialogConfirm('Delete property','This permanently removes <b>'+esc(p.name)+'</b> and its stored record.','Delete',true,async()=>{try{await mpdb.deleteProperty(activePid);openMenu();}catch(e){saveFailedModal(e);}});
  wireLetterhead();
}
function wireLetterhead(){
  const file=el('lhFile');const pick=()=>file&&file.click&&file.click();
  ['lhAdd','lhReplace'].forEach(id=>{const b=el(id);if(b)b.onclick=pick;});
  const rm=el('lhRemove');if(rm)rm.onclick=()=>dialogConfirm('Remove the letterhead?','The stored letterhead is deleted \u2014 the tenant notice will fall back to a generated header (property name + management address) until a new one is uploaded.','Remove',true,async()=>{try{await mpdb.setLetterhead(activePid,'','','');renderLauncher();}catch(e){saveFailedModal(e);}});
  if(file)file.onchange=()=>{const f=file.files&&file.files[0];if(!f)return;file.value='';
    if(f.type==='application/pdf'||/\.pdf$/i.test(f.name)){
      if(f.size>4*1024*1024){dialogConfirm('Letterhead','This PDF is over 4 MB. Export a lighter letterhead PDF (or a PNG/JPG) and upload that.','OK',false,()=>{});return;}
      const rd=new FileReader();rd.onload=async e=>{const u=String(e.target.result||'');
        if(u.indexOf('data:application/pdf')!==0){dialogConfirm('Letterhead','That file could not be read as a PDF.','OK',false,()=>{});return;}
        try{await mpdb.setLetterhead(activePid,f.name,'',u);renderLauncher();}catch(e){saveFailedModal(e);}};
      rd.readAsDataURL(f);return;}
    if(!/^image\//.test(f.type)){dialogConfirm('Letterhead','Upload the letterhead as a PDF, PNG or JPG. (Word files: use File \u2192 Save As \u2192 PDF once, then upload that.)','OK',false,()=>{});return;}
    const rd=new FileReader();rd.onload=e=>makeRender(e.target.result,render=>makeThumb(e.target.result,async t=>{try{await mpdb.setLetterhead(activePid,f.name,t,render);renderLauncher();}catch(e){saveFailedModal(e);}}));rd.readAsDataURL(f);};
}
function makeThumb(dataUrl,cb){try{const img=new Image();img.onload=()=>{const s=Math.min(1,120/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.width*s));c.height=Math.max(1,Math.round(img.height*s));c.getContext('2d').drawImage(img,0,0,c.width,c.height);cb(c.toDataURL('image/jpeg',0.72));};img.onerror=()=>cb('');img.src=dataUrl;}catch(e){cb('');}}
/* print-quality letterhead render — normalized to PNG (gen.js embeds PNG only) */
function makeRender(dataUrl,cb){try{const img=new Image();img.onload=()=>{
  // Print quality: keep up to 3000px on the long side (~270 dpi on letter paper),
  // stepping down only if the encoded PNG would get unreasonably heavy to store.
  const caps=[3000,2200,1500]; let out='';
  for(const cap of caps){ const s=Math.min(1,cap/Math.max(img.width,img.height));
    const c=document.createElement('canvas'); c.width=Math.max(1,Math.round(img.width*s)); c.height=Math.max(1,Math.round(img.height*s));
    c.getContext('2d').drawImage(img,0,0,c.width,c.height); out=c.toDataURL('image/png');
    if(out.length<=5500000) break; }
  cb(out);};img.onerror=()=>cb('');img.src=dataUrl;}catch(e){cb('');}}

/* ---- FORM: open the RCS form for the active property ----------------- */
function nonrevHasData(i){return ['use','br','ba','rent'].some(s=>{const v=get('nonrev.'+i+'.'+s);return v!==''&&v!=null;});}
function ns8HasData(i){return ['br','ba','avg_rent'].some(s=>{const v=get('ns8.'+i+'.'+s);return v!==''&&v!=null;});}
function handleZeroUnitCommit(keys){const zk=keys.find(k=>/^(units|nonrev|ns8)\.\d+\.num_units$/.test(k));
  if(!zk||numf(get(zk))>0)return false;
  const m=zk.match(/^(units|nonrev|ns8)\.(\d+)\./);const fam=m[1],i=+m[2];
  if(fam==='units'&&i===UNITS[0]){setStatus('Cannot commit zero units to the database — the first unit type needs a unit count.');return true;}
  const label=fam==='units'?'unit type':(fam==='nonrev'?'non-revenue unit':'non-Section 8 unit type');
  dialogConfirm('Delete this '+label+' with no unit count?','This row has no unit count. Go back and enter one, or accept — accepting removes this '+label+' and its data from the database. This cannot be undone after saving.','Delete & save',true,async()=>{try{
    Object.keys(form).forEach(k=>{if(k.indexOf(fam+'.'+i+'.')===0)delete form[k];});
    if(fam==='units')UNITS=UNITS.filter(x=>x!==i);
    else if(fam==='nonrev'){NONREV=NONREV.filter(x=>x!==i);if(!NONREV.length){form=store.editForm(form,'nonrev.enabled','');form=await store.saveField(form,'nonrev.enabled');}}
    else{NS8=NS8.filter(x=>x!==i);if(!NS8.length){form=store.editForm(form,'ns8.enabled','');form=await store.saveField(form,'ns8.enabled');}}
    if(mpdb)await(activeCid?mpdb.pruneCycleCells(activeCid,UNITS,NONREV,NS8):mpdb.pruneUnitRows(activePid,UNITS,NONREV,NS8));
    await refreshSnap();renderBody();setStatus('Zero-unit '+label+' deleted and saved.');
  }catch(e){saveFailed(e);renderBody();}});
  return true;}
function unitHasData(i){return ['br','ba','current','proposed','ua_exec','ua_rcs','ua_custom','safmr_hud','safmr_rcs','safmr_custom'].some(s=>{const v=get('units.'+i+'.'+s);return v!==''&&v!=null;});}
function countlessUnits(){return UNITS.filter(i=>numf(get('units.'+i+'.num_units'))<=0);}
async function saveNow(afterSave,fixFirst){clearUncheckedWriteins(['e1','e2','e3','e4','e5','s1','s2','s3','s4','s5','s6']);
  const first=UNITS[0];const fk='units.'+first+'.num_units';let firstFix='';
  if(fixFirst){const c=form[fk];
    if(c&&c.db_value!=null&&c.db_value!==''){store.revertForm(form,fk);firstFix='reverted to its last saved count';}
    else{form=store.editForm(form,fk,'');firstFix='left blank';}}
  countlessUnits().filter(i=>!(fixFirst&&i===first)).forEach(i=>Object.keys(form).forEach(k=>{if(k.indexOf('units.'+i+'.')===0)delete form[k];}));
  NONREV.filter(i=>numf(get('nonrev.'+i+'.num_units'))<=0).forEach(i=>Object.keys(form).forEach(k=>{if(k.indexOf('nonrev.'+i+'.')===0)delete form[k];}));
  if(get('ns8.enabled')!=='1'){Object.keys(form).forEach(k=>{if(/^ns8\.\d+\./.test(k))delete form[k];});NS8=[];} // section off: its hidden rows go
  NS8.filter(i=>numf(get('ns8.'+i+'.num_units'))<=0).forEach(i=>Object.keys(form).forEach(k=>{if(k.indexOf('ns8.'+i+'.')===0)delete form[k];}));
  if(!Object.keys(form).some(k=>/^nonrev\.\d+\./.test(k))&&get('nonrev.enabled')==='1')form=store.editForm(form,'nonrev.enabled','');
  if(!Object.keys(form).some(k=>/^ns8\.\d+\./.test(k))&&get('ns8.enabled')==='1')form=store.editForm(form,'ns8.enabled','');
  deriveUnits();
  try{form=await store.saveToDb(form);if(mpdb)await(activeCid?mpdb.pruneCycleCells(activeCid,UNITS,NONREV,NS8):mpdb.pruneUnitRows(activePid,UNITS,NONREV,NS8));}
  catch(e){saveFailed(e);return;}
  await refreshSnap();deriveUnits();if(firstFix==='left blank'&&form[fk])form[fk].source='new';if(afterSave)afterSave();
  if(firstFix)setStatus('Saved — but zero units cannot be committed: the first unit type\u2019s count was '+firstFix+'.');}
function requestSave(afterSave){
  const first=UNITS[0];const fk='units.'+first+'.num_units';
  const firstZero=numf(get(fk))<=0&&(unitHasData(first)||String(get(fk)==null?'':get(fk)).trim()!=='');
  const mu=countlessUnits().filter(unitHasData).filter(i=>i!==first);
  const mn=NONREV.filter(i=>numf(get('nonrev.'+i+'.num_units'))<=0).filter(nonrevHasData);
  const ml=get('ns8.enabled')==='1'?NS8.filter(i=>numf(get('ns8.'+i+'.num_units'))<=0).filter(ns8HasData):[];
  const total=mu.length+mn.length+ml.length;
  if(total){const parts=[];if(mu.length)parts.push(mu.length+' revenue');if(mn.length)parts.push(mn.length+' non-revenue');if(ml.length)parts.push(ml.length+' non-Section 8');
    dialogConfirm('Delete '+total+' unit type'+(total>1?'s':'')+' with no unit count?','Saving will remove '+parts.join(', ')+' row'+(total>1?'s that have':' that has')+' entered data but no unit count. This cannot be undone after saving.','Save anyway',true,()=>saveNow(afterSave,firstZero));}
  else saveNow(afterSave,firstZero);}
// New-property checklist default: all §8 boxes on except Scope of repair(2) & Scope of work(4),
// applied as source 'new' (grey/unsaved) only when the property has never saved a checklist.
function applyChecklistDefaults(){if(Object.keys(DBSNAP).some(k=>/^check\.\d+$/.test(k)))return;for(let i=0;i<17;i++)form=store.editForm(form,'check.'+i,(i===2||i===4)?'':'1');}
async function openForm(program){activeProgram=program||'RCS';_undoStack=[];_undoNR=[];_undoLI=[];_rcsUpload=null;await mpdb.setActive(activePid);await refreshSnap();form=await store.fillForm();fixSavedToggles();applyChecklistDefaults();deriveUnits();renderFormHeader();renderBody();show('Form');window.scrollTo(0,0);ensureHudSafmr({});}
function renderFormHeader(){
  if(el('hdrProp'))el('hdrProp').textContent=(get('property.name')||'(unnamed property)');
  if(el('hdrProgram'))el('hdrProgram').textContent=activeProgram+' Package';
  const cy=activeCid&&mpdb?mpdb.listCycles(activePid).find(c=>c.id===activeCid):null;
  const wrap=document.querySelector('.progs');
  if(wrap&&cy){
    const on=p=>cy.programs.indexOf(p)>=0;
    wrap.innerHTML=['rcs','ocaf','uaf'].map(p=>'<span class="prog '+(on(p)?'on':'off')+'"'+(p==='uaf'?' id="pillUaf" style="cursor:pointer" title="'+(on('uaf')?'Remove the UAF from this cycle':'Add a UAF to this cycle')+'"':'')+'>'+PROG_NAMES[p]+'</span>').join('')+'<span class="prog off">BBRA</span>';
    const pu=el('pillUaf');if(pu)pu.onclick=toggleCycleUaf;
  }
}
async function toggleCycleUaf(){
  if(!activeCid)return;
  const cy=mpdb.listCycles(activePid).find(c=>c.id===activeCid);if(!cy)return;
  const has=cy.programs.indexOf('uaf')>=0;
  const programs=has?cy.programs.filter(p=>p!=='uaf'):cy.programs.concat(['uaf']);
  try{await mpdb.setCyclePrograms(activeCid,programs);}catch(e){saveFailedModal(e);return;}
  activeProgram=programs.map(x=>PROG_NAMES[x]||x).join(' + ');
  renderFormHeader();renderBody();setStatus(has?'UAF removed from this cycle.':'UAF added to this cycle.');
}

/* ---- EXIT: save or discard, then back to the menu -------------------- */
function isDirty(){const keys=new Set([...Object.keys(form),...Object.keys(DBSNAP)]);for(const k of keys){const fv=form[k]?(form[k].value==null?'':String(form[k].value)):'';const sv=DBSNAP[k]?(DBSNAP[k].value==null?'':String(DBSNAP[k].value)):'';if(fv!==sv)return true;}return false;}
function requestExit(){if(isDirty())openExit();else exitForm();}
async function exitForm(){
  // a cycle created this session and never saved is deleted on the way out
  if(activeCid&&_cyFresh===activeCid){const cid=activeCid;_cyFresh=null;try{await mpdb.deleteCycle(cid);}catch(e){}}
  openLauncher(activePid);
}
function openExit(){const nm=get('property.name')||'this property';
  const fresh=activeCid&&_cyFresh===activeCid;
  const body=fresh?'This cycle was never saved \u2014 leaving without saving deletes it.':'You have unsaved edits to <b>'+esc(nm)+'</b>. Save them to the database so they pre-fill your next submission, or discard them and keep the last saved record.';
  modal('<div class="dlg-t">Save changes before leaving?</div><div class="dlg-b">'+body+'</div><div class="dlg-row"><button class="btn" id="dlgKeep">Keep editing</button><span class="dlg-sp"></span><button class="btn danger" id="dlgDiscard">'+(fresh?'Delete cycle':'Discard changes')+'</button><button class="btn p" id="dlgSave">Save &amp; exit</button></div>');
  el('dlgKeep').onclick=closeModal;
  el('dlgDiscard').onclick=async()=>{form=await store.fillForm();await refreshSnap();fixSavedToggles();deriveUnits();closeModal();await exitForm();setStatus('');};
  el('dlgSave').onclick=()=>requestSave(()=>{closeModal();openLauncher(activePid);});
}

/* ---- generation (client-side, offline via pdf-lib) ------------------- */
const LOGO_B64="iVBORw0KGgoAAAANSUhEUgAAA0MAAAC8CAYAAAC67HW+AAAACXBIWXMAAC4jAAAuIwF4pT92AAAQpklEQVR4nO3dTXLcRpoG4A8T3lNzAmpOIHqHnconMOcE4iyxavoEgk5geVXLpk4w1Ama3NWuqRN06QRDngCzKJRbkkVJRCYKKOTzRDCa7nBmpSQLxJtf/lRd1wUAAEBp/mPqAQAAAExBGAIAAIokDAEAAEUShgAAgCIJQwAAQJGEIQAAoEjCEAAAUCRhCAAAKJIwBAAAFEkYAgAAiiQMAQAARRKGAACAIglDAABAkYQhAACgSMIQAABQJGEIAAAokjAEAAAUSRgCAACKJAwBAABFEoYAAIAiCUMAAECRhCEAAKBIwhAAAFAkYQgAACiSMAQAABRJGAIAAIokDAEAAEUShgAAgCIJQwAAQJGEIQAAoEjCEAAAUCRhCAAAKJIwBAAAFEkYAgAAiiQMAQAARRKGAACAIglDAABAkYQhAACgSMIQAABQJGEIAAAokjAEAAAUSRgCAACKJAwBAABFEoYAAIAiCUMAAECRhCEAAKBIwhAAAFAkYQgAACiSMAQAABRJGAIAAIokDAEAAEUShgAAgCIJQwAAQJGEIQAAoEjCEAAAUCRhCAAAKNJPUw/gkKq6OYuIZ1OP40hsu816O/UgAABgLEWFoYh4GxEvpx7EkXgTEe2hP7Sqm1VE/OPQnzuiDxFx339/039/FxF33WZ9/1ijOVjgn0WSbrOucvZX1U0bEa8HNv+l26xv8o2GVFXdXETE3zN09Z9TPxuqurkJPytT3Xab9SpHR1XddDn6WYisz74j+jn3ELt3h+j/d/8uce9nQbrSwhAc2otPvv/s5aKqm4+xe5hdR8SNShwctTZTP5cZ+wKW4ST+/Q7x5btExG7i9S52k67eJ55IGILpnPZfv0ZEVHXzIXbVy+upZ4aBH9dXhU4zdXdZ1c1bzwDgCV70X68i/pxsvY6Iq26zvvtWQxygAHPyInbLbLZV3bRV3djfBsehzdjXSeyqQwBDnUbE3yLin1Xd7N8pnk88ptkShmB+TmK3l+SuqpvzqQcDPC5zVWjv0mQIkMlp7N4p/lXVzZVQ9FfCEMzXaUT8b1U3b6ceCPCodoQ+VYeAMbwKoegvhCGYv79VdXM19SCAz41UFdpTHQLGsg9FluSHMATH4pVABLPTjti36hAwtv2S/LOpBzIlYQiOx6v+bhpgYiNXhfZUh4CxncbuoIViJ1+EITgur0ufwYGZaA/wGScR4RAV4BB+L3UFijAEx8eBCjChA1WF9toDfQ5AkUvyhSE4Pi+rullNPQgoWHvAzzrtwxfAIRQXiH6aegCQ0buIuJrw85/3XxERzyLirP/nMWaQLyPiZoR+c3mICLdesziJVaF30d8Q/0RtHPbZNoe/u89j+O/zx4jYZhvJMHP4PYyIuJ16AJndTz2AT4zx39mz2F3APrVXVd1Et1lfTD2QQxCGWJJtt1nfTD2IL/UboFexW/s/5EXoa36t6uZZt1nP6QfDp+66zXo19SBgBBcD272P3STGeez2Aj3FaVU3F91mfTXws5+k26wn30jdHxbzemDzq26zbvON5nh5Do9q9P/OPlkFcha7oLTqv3/qM2SIV1Xd3HWb9eKX5gtDMLI+sFxHxHV/WksbEX/L0PV5TFsJg6L0LyYvBzZ/223W91XdXMdxVIeAiX0ywXvz6f/fX5h6Fv+eaB1rD+PvVd3cdJv1XCqdo7BnCA6o26zv+1nXX2K3lCzFKn1EwBO0A9vdfvJSM7QPe4eAiIjoNuttt1lfd5v1ZbdZP4+InyPij9gt3cvteulH/AtDMIH+xSj1yFxHbMOBJFaF2v033Wa9jd3eoaR+APa6zfruk2D0P5E3FJ3Gwi+AFoZgIn0gGvpSFDGPTZZQinZgu49f2cs4tK/Tqm7cOwQ8qtusr/pQ9Fukr0DZe90vzVskYQimlbQxcckPJ5iLXFWhvb469H5gf4ueoQXy6A8+OIuID5m6bDP1MzvCEEyo35SYUs5+nmkowOPage0+fuMEuKETIe4ZA35Iv7foLNJWoey9WuoErDAE09tOPQDg63JXhfb6pXND74B5tF+AL/X3BeUIRIusTAtDML2bqQcAPKod2O7hB+4FGtq36hDwJH0gSr2E9yJ9JPMjDAHAV6TeK/S9f6GvDg1dz98ObAeU6zzSDlU4WeIhLsIQAHxdO7DdQ/z4niB7h4CD6C+BT13qJgwB2T2fegDA51KrQv1Lx3f1S+mGHqLSDmwHFCrxmRMhDAEjSLk89YdeuIAnaxPaPrXaM/SzVIeAIdqEtidV3Szq0ndhCCZU1c2zSLg8tT+aG8gosSr07kerQnv9TO3QdfwXA9sBhUp85kRErPKMZB6EIZhWytrdXBepAZ9rJ2g7dO/QYu/+AEZ1ndB2lWsQcyAMwUT6qlBKGFIVgswyVIW2A9u+jeEzte3AdkC5UsLQ81yDmIOfph4AlKgPQjcRcZLQzU2WwYzj2RHuZbi37JBIW3Y2tLoT3WZ9X9XN24h4PaD5q6pu2oQgxkId4XN4f+Q847tJaDt4ef8cCUNwYP3Gw6tIf5ikzOqM7UVE/GPqQTzRbSys9M/T9MvNXg1sfpshTA8NQxG76tBF4uezPMf2HI6IqKYeQAn6CZiPEXE6pH1VN2dLmUC0TA4OpKqbVVU3VxHxz0gPQk/epA18VztR24j48w6QdwOb2zsEPNU2oe2zXIOYmsoQZNYvgTuL3YPirP9aRdqSuC9dZewLipehKnSTaShtwjjaUB0CftxdDN8jKQzBDL2u6mboEpNjkvPFC9hpE9oO3iv0pW6z3lZ18y6GBSJ7h4CnSFlhchbzXq7/wyyTg+NzMfUAYEkSq0Ifu8069wtBSrhqcw0CoATCEByXN2Z9Ibt2orZf1W9Kvh3Y/LxfqgvwPTdTD2AOLJOb1i+WO/EEt91m3U49CFiSDFWhq3yj+Uwbw04CO4nd/WVtzsEALJXKEByHDxFxPvUgYIHahLbZ9gp9qZ8oG1odulQdAvgxwhDM34eIWDlKG/JKrAo9xPinOg4NW/vqEADfIQzBvL0PQQjG0ia0fTv238v+YIaPA5urDgHfczb1AOZAGIJ5eoiI37rN+lwQgvwyVIVGWyL3hXZgO9Uh4HtMmIQDFGapqpvV1GOIiK1TyybzPiIu/f7DqNqEtleHmqToNuurqm7aiDgd0PyyqpvRK1hAkW6mHkAuwtA8DTlBKLc34TSiQ3sXu6U3d1MPJIOPMf5+ity2Uw+Aw0isCkUcriq010bE3we0c7Icb6YeALO2mnoAcyAMwXQeYjezch0R1wubvd06BpwZaxPavpugansduwB2MqCtMFQwz2G+I2WZ3DbXIKYmDMHhPMTuxWQbliHCJDJUhdo8I/lx3WZ9X9XN24h4PaD5SVU3FyPehwQcof6AlRdD2y/pHUYYYkluY7w1rGcR8WtiHycR8cxFuzCpNrH9v6q6yTGOQ2rj+JatAuNaJbT9kGsQcyAMsSQ3Yy4JqOrmLhJmUXq/V3Vzs5B9QXBU+pnQEi8vPlUdAr6wSmi7qHcYR2vDjzuP3VK3VNfu/4BJXMawfTdL0E49AGBWUiaGhCEoUb8+9iJDV6dhyQocVD8BUfK9O6dV3VxMPQhgelXdnMew4/r3bjINZRaEIXiC/kb4PzJ09WtVNyW/mMGhlVwV2munHgAwCynvHw9LW+ovDMETdZv1ZeTZPPh7VTdnGfoBvkFV6E+qQ1C4qm5WEfEyoYvrTEOZDWEIhrkI+4fgWKgK/Vs79QCAafTvG1eJ3QhDQERfIs4x02z/EIxIVegvTvuZYaA8byNtr9BDv11gUYQhGKg/pvZdhq7sH4LxqAr9VTv1AIDD6pfIplw4HbELU4sjDEEa+4dgplSFHvVSdQjK0Qehv2fo6ipDH7MjDEGCbrO+D/uHYK5UhR7XTj0AYHxV3bSRJwi9668YWRxhCBL1+4faDF2dxgI3JsIUVIW+S3UIFqyqm2dV3dxExOtMXbaZ+pmdn6YeACxBt1m/7V8sfk3s6mVVN223Wbfpo4KipVSFHuJ4blh/FhEvBrZtI2KVbSTALPTVoJyV8TdLrQpFCEOQ00XsXqBSTmqJiHhd1c1Nt1nfJI8ICpShKnTZH5Aye/2v9f8GNn9Z1c3KswaOX/8suIjdsy/1PeRTH2OhByfsWSYHmfT7h84zdWf/EAyXVBU6liAU8edzJ+VUyzbTUIAJVHVzXtXNVewmRX6PvEEoIuKif84slsoQZNRt1ndV3fwWuwdSipPY7R9aJQ8KCpKhKnSMM6BtDD8y92VVN2f93kdg5vol+fuvlyN/3B8lVI6FIcis3z90HukPKfuHeMxZVTdTj2EM2wzr0lP3Ch1dGOo2621VN+9j+J7Fy9gtrwEm9snBJs8iYn/lxioinkf+qs+33HabdRGH0AhDMI7ziNhG+ubFY90/9LKqm27qQYzgl5n8WaRWHufqTaQv27pIaHt1xMtB3sbwMPSqn3jZZhwPM7DQ5/CbmUwSvq7qJtdJbXPzIfIt+589e4ZgBPYPweH1FwumzJweXVVorw/ptwldtHlGAhy5DxGxOuKJoScThmAk/cvJmwxd7fcPAd/WJrRdwoWCVwltX1V18zzTOIDjVFwQihCGYFR9KT9ltnbvZX9vAPAVGapCbZ6RTKc/Be9jQhdtnpEAR6jIIBQhDMEhXMRuY3aq126Mh0e1CW1vF1AV2msT2qoOQZn+6DbrsxKDUIQwBKPrX7IuMnVn/xB8QVXoM9eRNvnSZhoHMH8PEfHfpZwa9xhhCA6g26yvI+KPDF3ZPwR/1Sa0/TCTEwKz6Gd2Uw6CUB2CMryLiOf9+0nRhCE4kH7m5UOGruwfgl7JJ8h9Q+qvqehZYli424j4udusL0pdFvclYQgO6zzsH4Kc2oS2H/tDBxalf8F5l9DFheW4sDjvY3dX3qrbrO+mHsycCENwQPYPQT72Cn1Tm9D2JFSHYAk+xm6J/n91m/X5kpYE5yQMwYH163NTZm337B+idG1C24dY8N+ffuLlfUIXlyZb4CjtA9DP3Wb9vNusLxd0WuYofpp6AFCoy4g4i4gXif28rOqm7e8zgmLk2CtUwHr5txHx68C2++pQm200wBhuI+Ku/7oRfJ6utDA0tzWSj/0gznFJZ6rtRJ97H8N//duM4xhVt1nf9y9zOTZvr6q6ORthDXDKn8VS5Xx53obf3y9tn/DvriLt92+JByd8ptusb6q6eRcRzwd2cZZxOE+1jQJ+Fvwgz4nPbTP2dUw/57b9133s3mfv7f3Jo+q6buoxAAAAHJw9QwAAQJGEIQAAoEjCEAAAUCRhCAAAKJIwBAAAFEkYAgAAiiQMAQAARRKGAACAIglDAABAkYQhAACgSMIQAABQJGEIAAAokjAEAAAUSRgCAACKJAwBAABFEoYAAIAiCUMAAECRhCEAAKBIwhAAAFAkYQgAACiSMAQAABRJGAIAAIokDAEAAEUShgAAgCIJQwAAQJGEIQAAoEjCEAAAUCRhCAAAKJIwBAAAFEkYAgAAiiQMAQAARRKGAACAIglDAABAkYQhAACgSMIQAABQJGEIAAAokjAEAAAUSRgCAACKJAwBAABFEoYAAIAiCUMAAECRhCEAAKBIwhAAAFAkYQgAACiSMAQAABRJGAIAAIokDAEAAEUShgAAgCIJQwAAQJGEIQAAoEjCEAAAUCRhCAAAKJIwBAAAFEkYAgAAivT/tqNfP0iEke0AAAAASUVORK5CYII=";
function b64ToBytes(b64){if(!b64)return null;try{const bin=atob(b64);const a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);return a;}catch(e){return null;}}
function dlFile(bytes,name,mime){const blob=new Blob([bytes],{type:mime||'application/octet-stream'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(url);a.remove();},1500);}
function dlPdf(bytes,name){dlFile(bytes,name,'application/pdf');}
function formRec(){const rec={};for(const k in form)rec[k]=form[k].value;return rec;}
function dataUrlToBytes(u){try{const i=String(u||'').indexOf(',');if(i<0)return null;return b64ToBytes(u.slice(i+1));}catch(e){return null;}}
async function combinePdfs(list){const {PDFDocument}=window.PDFLib;const out=await PDFDocument.create();for(const b of list){if(!b)continue;const src=await PDFDocument.load(b,{ignoreEncryption:true,parseSpeed:Infinity});const pages=await out.copyPages(src,src.getPageIndices());pages.forEach(p=>out.addPage(p));}return await out.save({objectsPerTick:Infinity});}
function showPackageModal(nm,docs,combined,missingRcs,missingLh,capMsgs){
  const rows=docs.map((d,i)=>'<button class="btn sm" data-dldoc="'+i+'" style="justify-content:flex-start">'+esc(d.label)+'</button>').join('');
  const miss=(missingRcs?'<div class="sub" style="color:#b45309;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">\u26a0 RCS report (doc 04) missing \u2014 upload it in Section 1.</div>':'')
    +(missingLh?'<div class="sub" style="color:#b45309;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">\u26a0 No letterhead \u2014 the tenant notice used a generated header.</div>':'')
    +((capMsgs||[]).map(m=>'<div class="sub" style="color:#b45309;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="'+esc(m)+'">\u26a0 '+esc(m)+'</div>').join(''));
  modal('<div class="dlg-t">Package generated</div><div class="dlg-b">'+esc(nm)+' - '+docs.length+' documents. Download the combined file, or any individual document.</div><div style="display:flex;flex-direction:column;gap:7px;margin-top:14px"><button class="btn p" id="dlCombined">Combined package (PDF)</button>'+rows+miss+'<button class="btn excel" id="dlXlsx">Rent Analysis workbook (Excel) \u2014 download it on its own</button><button class="btn p" id="dlFolder" style="margin-top:11px;display:inline-flex;align-items:center;justify-content:center;gap:8px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex:0 0 auto"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> Download the RCS Package folder</button></div><div class="dlg-row"><span class="dlg-sp"></span><button class="btn" id="dlgCancel">Close</button></div>');
  el('dlgCancel').onclick=closeModal;
  const cbn=el('dlCombined');if(cbn)cbn.onclick=()=>dlPdf(combined,nm+' - RCS Package.pdf');
  const xb=el('dlXlsx');if(xb)xb.onclick=()=>genRentAnalysis();
  const fb=el('dlFolder');if(fb)fb.onclick=()=>dlPackageFolder(nm,docs,combined);
  document.querySelectorAll('[data-dldoc]').forEach(b=>b.onclick=()=>{const d=docs[+b.getAttribute('data-dldoc')];dlPdf(d.bytes,d.file+'.pdf');});
}
async function dlPackageFolder(nm,docs,combined){
  if(!(window.RCSXlsx&&window.RCSXlsx.makeZip)){setStatus('Packager still loading \u2014 try again in a moment.');return;}
  try{setStatus('Packing the RCS Package folder\u2026');
    const files=[{name:'RCS Package/'+nm+' - RCS Package.pdf',data:combined}];
    docs.forEach(d=>files.push({name:'RCS Package/'+d.file+'.pdf',data:d.bytes}));
    let xlNote='';
    try{files.push({name:'RCS Package/'+nm+' - RCS Analysis.xlsx',data:await buildRentAnalysisBytes()});
      if(UNITS.length>11)xlNote=' Note: the Excel template holds 11 unit types \u2014 '+(UNITS.length-11)+' extra row(s) were left off the workbook.';}
    catch(e){xlNote=' (the Rent Analysis workbook could not be built: '+((e&&e.message)||e)+')';}
    dlFile(window.RCSXlsx.makeZip(files),nm+' - RCS Package.zip','application/zip');
    setStatus('RCS Package folder downloaded \u2014 the combined report, each document, and the Rent Analysis workbook, all in one folder.'+xlNote);
  }catch(e){setStatus('Folder download failed: '+((e&&e.message)||e));}}
function buildRentAnalysisBytes(){
  const nn=v=>{const n=numf(v);return n>0?n:null;};
  const rows=UNITS.map(i=>({type:(get('units.'+i+'.br')||'')+(get('units.'+i+'.ba')?'/'+get('units.'+i+'.ba'):''),
    units:nn(get('units.'+i+'.num_units')),cur:nn(get('units.'+i+'.current')),pro:nn(get('units.'+i+'.proposed')),
    ua:uaResolvedOf(i)>0?uaResolvedOf(i):null,safmr150:safmrResolvedOf(i)>0?safmrResolvedOf(i):null}));
  return window.RCSXlsx.rentAnalysis({propertyName:get('property.name')||'Property',apprFirm:get('appr.firm')||'',rows});}
async function genRentAnalysis(){
  if(!window.RCSXlsx){setStatus('Excel generator still loading \u2014 try again in a moment.');return;}
  try{setStatus('Building the Rent Analysis workbook\u2026');
    const N=get('property.name')||'Property';
    dlFile(await buildRentAnalysisBytes(),N+' - RCS Analysis.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    setStatus('Rent Analysis workbook downloaded.'+(UNITS.length>11?' Note: the template holds 11 unit types \u2014 '+(UNITS.length-11)+' extra row(s) were left off.':''));
  }catch(e){setStatus('Excel generation failed: '+((e&&e.message)||e));}
}
async function genPackage(){
  if(!hasProg('rcs')){dialogConfirm('Generation for OCAF/UAF packages is coming','The worksheet and UA calculations are live \u2014 their documents (9625 worksheet, corrected letter, revised Exhibit A, UAF certification, revised rent schedule) are the next build step. \u201cUpdate database\u201d keeps everything saved on this cycle meanwhile.','OK',false,function(){});return;}
  if(!(window.RCSGen&&window.PDFLib)){setStatus('Generator still loading - try again in a moment.');return;}
  if(numf(get('units.'+UNITS[0]+'.num_units'))<=0){setStatus('Cannot generate the package with zero units — the first unit type needs a unit count.');return;}
  let hasLh=false;try{const L=(mpdb&&activePid)?mpdb.getLetterhead(activePid):null;hasLh=!!(L&&L.data);}catch(e){}
  if(!hasLh){const alias=get('tenant.property_alias')||get('property.name')||'the property name';
    dialogConfirm('No letterhead uploaded','The tenant notice will use a generated header instead: the Related logo, \u201c'+esc(alias)+'\u201d and the management address. You can upload the real letterhead on the property page.','Generate anyway',false,()=>{__genPackageRun();});return;}
  await __genPackageRun();
}
/* Find where the letterhead's header art ends: scan the top half of the
   page image for the lowest row with ink; the notice starts just below it. */
function measureLetterheadDrop(dataUrl){return new Promise(res=>{try{
  const img=new Image();
  img.onload=()=>{try{
    if(img.height<img.width){res(null);return;} // banners are placed, not underlaid
    const W=306,H=396,c=document.createElement('canvas');c.width=W;c.height=H;
    const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,W,H);g.drawImage(img,0,0,W,H);
    const half=Math.floor(H*0.5);const d=g.getImageData(0,0,W,half).data;let low=-1;
    for(let y=0;y<half;y++){let cnt=0;for(let x=0;x<W;x++){const i=(y*W+x)*4;
      if(d[i+3]>40&&(d[i]<235||d[i+1]<235||d[i+2]<235)){if(++cnt>=3)break;}}
      if(cnt>=3)low=y;}
    if(low<0){res(null);return;}
    res(Math.min(340,Math.max(110,Math.round((low/H)*792)+36)));
  }catch(e){res(null);}};
  img.onerror=()=>res(null);img.src=dataUrl;
}catch(e){res(null);}});}
/* PDF letterheads: find the header's bottom edge without rasterizing. Walk
   page 1's drawing operators with transform tracking and take the lowest
   painted text / image / dark path that lives in the top half of the page
   (full-height borders and page backgrounds are excluded by construction). */
async function measurePdfLetterheadDrop(bytes){ try{
  const PD=window.PDFLib; const doc=await PD.PDFDocument.load(bytes,{parseSpeed:Infinity});
  const page=doc.getPage(0); const ph=page.getHeight()||792; const ctx=doc.context;
  const deref=o=>{ try{ return (o==null)?o:(ctx.lookup(o)||o); }catch(e){ return o; } }; // lookup passes non-refs through (min build mangles class names)
  const bstr=u8=>{ let s='';for(let i=0;i<u8.length;i++)s+=String.fromCharCode(u8[i]);return s; };
  const streamText=s0=>{ const s=deref(s0); if(!s)return '';
    try{ return bstr(PD.decodePDFRawStream(s).decode()); }
    catch(e){ try{ return bstr(s.contents||s.getContents()); }catch(_){ return ''; } } };
  const contentsOf=nd=>{ let c=deref(nd.Contents?nd.Contents():null); if(!c)return '';
    if(c.asArray) return c.asArray().map(streamText).join('\n');
    return streamText(c); };
  const lex=s=>{ const out=[]; let i=0; const n=s.length;
    while(i<n){ const c=s[i];
      if(c==='%'){ while(i<n&&s[i]!=='\n')i++; continue; }
      if(c==='('){ let d=1;i++; while(i<n&&d>0){ if(s[i]==='\\')i++; else if(s[i]==='(')d++; else if(s[i]===')')d--; i++; } out.push({t:'str'}); continue; }
      if(c==='<'){ if(s[i+1]==='<'){ let d=1;i+=2; while(i<n&&d>0){ if(s[i]==='<'&&s[i+1]==='<'){d++;i+=2;continue;} if(s[i]==='>'&&s[i+1]==='>'){d--;i+=2;continue;} i++; } out.push({t:'dict'}); continue; }
        i++; while(i<n&&s[i]!=='>')i++; i++; out.push({t:'str'}); continue; }
      if(c==='['){ out.push({t:'['}); i++; continue; }
      if(c===']'){ out.push({t:']'}); i++; continue; }
      if(c==='/'){ let j=i+1; while(j<n&&!/[\s\/\[\]()<>{}%]/.test(s[j]))j++; out.push({t:'name',v:s.slice(i+1,j)}); i=j; continue; }
      if(/\s/.test(c)){ i++; continue; }
      let j=i; while(j<n&&!/[\s\/\[\]()<>%]/.test(s[j]))j++;
      const w=s.slice(i,j); i=j;
      if(w==='ID'){ const e=s.indexOf('EI',i); i=(e<0)?n:e+2; out.push({t:'op',v:'EI'}); continue; }
      if(/^[+\-.0-9]/.test(w)&&!isNaN(parseFloat(w))) out.push({t:'num',v:parseFloat(w)});
      else out.push({t:'op',v:w});
    } return out; };
  const mul=(m,q)=>[m[0]*q[0]+m[1]*q[2], m[0]*q[1]+m[1]*q[3], m[2]*q[0]+m[3]*q[2], m[2]*q[1]+m[3]*q[3], m[4]*q[0]+m[5]*q[2]+q[4], m[4]*q[1]+m[5]*q[3]+q[5]];
  const apply=(m,x,y)=>({x:m[0]*x+m[2]*y+m[4], y:m[1]*x+m[3]*y+m[5]});
  const wOf=st=>{ const ns=st.filter(t=>t.t==='num').map(t=>t.v);
    if(ns.length===4) return 1-Math.min(1,(ns[0]+ns[1]+ns[2])/3+ns[3]);
    if(ns.length===3) return (ns[0]+ns[1]+ns[2])/3;
    if(ns.length===1) return ns[0];
    return 0; };
  let best=null;
  const note2=(yMin,yMax)=>{ if(!(isFinite(yMin)&&isFinite(yMax)))return;
    if(yMax<ph*0.55)return;            // footer / body content
    if(yMin<ph*0.45)return;            // spans deep into the page: bg or border
    best=(best==null)?yMin:Math.min(best,yMin); };
  const scan=(code,res,ctm0,depth)=>{ if(depth>4||!code)return;
    const toks=lex(code); let stack=[]; let ctm=ctm0.slice(); const gsk=[];
    let tm=null,tlm=null,tl=0,fs=0,trm=0,fill={w:0},stroke={w:0},path=[];
    const num=k=>{ const v=stack[stack.length-k]; return (v&&v.t==='num')?v.v:0; };
    const pushPt=(x,y)=>{ path.push(apply(ctm,x,y)); };
    for(const tk of toks){
      if(tk.t!=='op'){ stack.push(tk); if(stack.length>24)stack.shift(); continue; }
      const op=tk.v;
      switch(op){
        case 'q': gsk.push({ctm:ctm.slice(),fill:{w:fill.w},stroke:{w:stroke.w}}); break;
        case 'Q': { const g0=gsk.pop(); if(g0){ ctm=g0.ctm; fill=g0.fill; stroke=g0.stroke; } break; }
        case 'cm': ctm=mul([num(6),num(5),num(4),num(3),num(2),num(1)],ctm); break;
        case 'BT': tm=[1,0,0,1,0,0]; tlm=tm.slice(); break;
        case 'ET': tm=null; break;
        case 'Tf': fs=num(1); break;
        case 'Tm': tlm=[num(6),num(5),num(4),num(3),num(2),num(1)]; tm=tlm.slice(); break;
        case 'Td': tlm=mul([1,0,0,1,num(2),num(1)],tlm||[1,0,0,1,0,0]); tm=tlm.slice(); break;
        case 'TD': tl=-num(1); tlm=mul([1,0,0,1,num(2),num(1)],tlm||[1,0,0,1,0,0]); tm=tlm.slice(); break;
        case 'TL': tl=num(1); break;
        case 'T*': tlm=mul([1,0,0,1,0,-tl],tlm||[1,0,0,1,0,0]); tm=tlm.slice(); break;
        case 'Tr': trm=num(1); break;
        case "'": case '"': tlm=mul([1,0,0,1,0,-tl],tlm||[1,0,0,1,0,0]); tm=tlm.slice();
        /* fall through */
        case 'Tj': case 'TJ': {
          if(tm&&trm!==3&&trm!==7&&fill.w<0.85){ const M=mul(tm,ctm); const p0=apply(M,0,0),p1=apply(M,0,fs||10);
            const h=Math.abs(p1.y-p0.y)||10; note2(p0.y-0.25*h,p0.y+0.78*h); }
          break; }
        case 'g': fill={w:num(1)}; break;
        case 'G': stroke={w:num(1)}; break;
        case 'rg': fill={w:(num(3)+num(2)+num(1))/3}; break;
        case 'RG': stroke={w:(num(3)+num(2)+num(1))/3}; break;
        case 'k': fill={w:1-Math.min(1,(num(4)+num(3)+num(2))/3+num(1))}; break;
        case 'K': stroke={w:1-Math.min(1,(num(4)+num(3)+num(2))/3+num(1))}; break;
        case 'sc': case 'scn': fill={w:wOf(stack)}; break;
        case 'SC': case 'SCN': stroke={w:wOf(stack)}; break;
        case 'm': case 'l': pushPt(num(2),num(1)); break;
        case 'c': pushPt(num(6),num(5)); pushPt(num(4),num(3)); pushPt(num(2),num(1)); break;
        case 'v': case 'y': pushPt(num(4),num(3)); pushPt(num(2),num(1)); break;
        case 're': { const x=num(4),yy=num(3),w2=num(2),h2=num(1); pushPt(x,yy); pushPt(x+w2,yy); pushPt(x,yy+h2); pushPt(x+w2,yy+h2); break; }
        case 'n': path=[]; break;
        case 'f': case 'F': case 'f*': case 'b': case 'b*': case 'B': case 'B*': case 'S': case 's': {
          const stroking=(op==='S'||op==='s'); const both=(op[0]==='b'||op[0]==='B');
          const dark=stroking?(stroke.w<0.85):(fill.w<0.85||(both&&stroke.w<0.85));
          if(dark&&path.length){ let mn=1e9,mx=-1e9; path.forEach(p=>{mn=Math.min(mn,p.y);mx=Math.max(mx,p.y);}); note2(mn,mx); }
          path=[]; break; }
        case 'Do': { const nt=stack[stack.length-1]; const xn=(nt&&nt.t==='name')?nt.v:null;
          if(xn&&res){ try{ const xod=deref(res.get?res.get(PD.PDFName.of('XObject')):null);
            const xo=xod?deref(xod.get(PD.PDFName.of(xn))):null;
            if(xo&&xo.dict){ const sub=String(xo.dict.get(PD.PDFName.of('Subtype'))||'');
              if(/Image/.test(sub)){ const cs=[apply(ctm,0,0),apply(ctm,1,0),apply(ctm,0,1),apply(ctm,1,1)];
                let mn=1e9,mx=-1e9; cs.forEach(p=>{mn=Math.min(mn,p.y);mx=Math.max(mx,p.y);}); note2(mn,mx); }
              else if(/Form/.test(sub)&&depth<4){ let M=ctm; const mt=deref(xo.dict.get(PD.PDFName.of('Matrix')));
                if(mt&&mt.asArray){ const a=mt.asArray().map(x2=>{ const d2=deref(x2); return (d2&&d2.asNumber)?d2.asNumber():(parseFloat(String(d2))||0); }); if(a.length===6)M=mul(a,ctm); }
                const r2=deref(xo.dict.get(PD.PDFName.of('Resources')))||res;
                scan(streamText(xo),r2,M,depth+1); } } }catch(e){} }
          break; }
      }
      stack=[];
    } };
  scan(contentsOf(page.node), deref(page.node.Resources?page.node.Resources():null), [1,0,0,1,0,0], 0);
  if(best==null) return null;
  return Math.min(360,Math.max(110,Math.round(((ph-best)/ph)*792)+36));
}catch(e){ return null; } }
async function __genPackageRun(){
  const T=window.RCSTemplates||{};
  try{ setStatus('Generating package...'); const rec=formRec(); const logo=b64ToBytes(LOGO_B64);
    let lh=null; try{ const L=(mpdb&&activePid)?mpdb.getLetterhead(activePid):null;
      if(L&&L.data){const by=dataUrlToBytes(L.data);if(by)lh=(String(L.data).indexOf('data:application/pdf')===0)?{pdf:by}:{png:by};}
      if(lh&&lh.png){const dr=await measureLetterheadDrop(L.data);if(dr)lh.drop=dr;}
      if(lh&&lh.pdf){const dr=await measurePdfLetterheadDrop(lh.pdf);if(dr)lh.drop=dr;} }catch(e){}
    const N=get('property.name')||'Property'; const docs=[];
    docs.push({label:'Cover letter (CA)',file:'01. '+N+' - Cover Letter',bytes:await window.RCSGen.coverLetter(rec,logo)});
    docs.push({label:'Owner cover letter',file:'02. '+N+' - RCS Owner Cover Letter',bytes:await window.RCSGen.ownerLetter(rec)});
    if(T.checklist)docs.push({label:"Owner's checklist",file:"03. "+N+" - RCS Owner's Checklist",bytes:await window.RCSGen.fillChecklist(b64ToBytes(T.checklist),rec)});
    if(_rcsUpload)docs.push({label:'RCS report (uploaded)',file:'04. '+N+' - RCS Report',bytes:_rcsUpload.bytes});
    if(T.rentSchedule)docs.push({label:'Draft rent schedule',file:'05. '+N+' - Draft Rent Schedule',bytes:await window.RCSGen.fillRentSchedule(b64ToBytes(T.rentSchedule),rec)});
    docs.push({label:'Tenant notice',file:'06. '+N+' - RCS Tenant Notice',bytes:await window.RCSGen.tenantNotice(rec,lh,logo)});
    const combined=await combinePdfs(docs.map(d=>d.bytes));
    let _lhOk=false;try{const L2=(mpdb&&activePid)?mpdb.getLetterhead(activePid):null;_lhOk=!!(L2&&L2.data);}catch(e){}
    showPackageModal(get('property.name')||'Property',docs,combined,!_rcsUpload,!_lhOk,rsCapacity().msgs);
    setStatus('Package generated - '+docs.length+' documents.'+(_rcsUpload?'':' The RCS report (document 04) is missing \u2014 upload it in Section 1 to include it.'));
  }catch(e){ setStatus('Generation failed: '+((e&&e.message)||e)); }
}
/* ---- boot ------------------------------------------------------------- */
let supaClient=null;
function showAuthScreen(){show('Auth');const btn=el('authSignIn'),em=el('authEmail'),pw=el('authPassword'),err=el('authErr');if(err)err.textContent='';
  const go=async()=>{if(err)err.textContent='';const email=((em&&em.value)||'').trim(),password=(pw&&pw.value)||'';if(!email||!password){if(err)err.textContent='Enter your email and password.';return;}
    btn.disabled=true;btn.textContent='Signing in\u2026';const{error}=await supaClient.auth.signInWithPassword({email,password});btn.disabled=false;btn.textContent='Sign in';
    if(error){if(err)err.textContent=error.message||'Sign-in failed.';return;}if(pw)pw.value='';await boot();};
  if(btn)btn.onclick=go;[em,pw].forEach(f=>{if(f)f.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();go();}};});if(em)em.focus();}
async function boot(){
  mpdb=await makeSupabaseDb(supaClient);
  const ms=el('menuSearch');if(ms)ms.addEventListener('input',renderMenu);
  const bn=el('bNewProperty');if(bn)bn.onclick=createProperty;
  document.querySelectorAll('[data-sort]').forEach(b=>b.onclick=()=>{sortMode=b.getAttribute('data-sort');document.querySelectorAll('[data-sort]').forEach(x=>x.classList.toggle('on',x===b));renderMenu();});
  const be=el('bExit');if(be)be.onclick=requestExit;
  const bf=el('bFill');if(bf)bf.onclick=async()=>{form=await store.fillForm();await refreshSnap();fixSavedToggles();deriveUnits();renderBody();setStatus('Reverted to the last saved record.');};
  const bs=el('bSave');if(bs)bs.onclick=()=>requestSave(()=>{renderBody();setStatus('Saved '+relTime(new Date().toISOString())+'.');});
  const bg=el('bGenerate');if(bg)bg.onclick=genPackage;const lb=el('bLauncherBack');if(lb)lb.onclick=openMenu;
  const bc=el('bContacts');if(bc)bc.onclick=openContacts; const cb2=el('bContactsBack');if(cb2)cb2.onclick=openMenu;
  const so=el('bSignOut');if(so)so.onclick=async()=>{await supaClient.auth.signOut();};
  const sc=el('scrim');if(sc&&sc.addEventListener)sc.addEventListener('click',e=>{if(e.target===sc)closeModal();});
  openMenu();
}
window.addEventListener('DOMContentLoaded',async()=>{
  if(!(window.supabase&&window.SUPABASE_URL&&window.SUPABASE_ANON_KEY)){const e=el('authErr');if(e)e.textContent='Supabase is not configured.';show('Auth');return;}
  supaClient=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_ANON_KEY);
  supaClient.auth.onAuthStateChange((event)=>{if(event==='SIGNED_OUT')showAuthScreen();});
  const{data:{session}}=await supaClient.auth.getSession();
  if(!session){showAuthScreen();return;}
  await boot();
});
function openContacts(){renderContacts();show('Contacts');}
const DIR_SECTIONS=[
 {kind:'appraiser',title:'Appraisers',one:'appraiser',add:'+ Add appraiser',
  rows:[[['name','Name']],[['firm','Company']],[['addr_street','Street']],[['addr_city','City'],['addr_state','State',STATES,'nrw'],['addr_zip','ZIP',null,'nrw']],[['email','Email']],[['phone','Phone']]],
  sub:c=>[c.firm,dirAddrLine(c),c.email,c.phone?fmtPhone(c.phone):''].filter(Boolean).join('  \u00b7  ')},
 {kind:'ca',title:'Contract administrators',one:'contract administrator',add:'+ Add contract administrator',
  rows:[[['prefix','Prefix',['Ms.','Mr.','Dr.','Mx.'],'nrw'],['name','Name']],[['title','Position']],[['org','Organization']],[['addr_street','Street']],[['addr_city','City'],['addr_state','State',STATES,'nrw'],['addr_zip','ZIP',null,'nrw']]],
  sub:c=>[c.title,c.org,dirAddrLine(c)].filter(Boolean).join('  \u00b7  ')},
 {kind:'signatory',title:'Signatories',one:'signatory',add:'+ Add signatory',
  rows:[[['name','Name']],[['title','Title']]],
  sub:c=>c.title||''},
];
function renderContacts(){const list=mpdb.listContacts();
  const pmRows=list.map(c=>'<div class="crow2"><div class="cc-main"><div class="cc-name">'+esc(c.name||'(unnamed)')+'</div><div class="cc-sub">'+esc(c.email||'\u2014')+'  \u00b7  '+esc(c.phone?fmtPhone(c.phone):'\u2014')+'</div></div><button class="txtbtn" data-ced="'+c.id+'">Edit</button><span class="dotsep">\u00b7</span><button class="txtbtn del" data-cdel="'+c.id+'">Delete</button></div>').join('');
  let html='<div class="lhead" style="display:block"><div class="lh-name">Contacts</div><div class="lh-meta">Shared across all properties. Picking a saved contact on a property auto-fills that part of the form \u2014 PM contacts fill the point of contact, the directories below fill the appraiser, contract administrator, and signatory cells.</div></div>';
  html+='<div class="lsec"><div class="lsec-t">PM contacts</div>'+(pmRows||'<div class="mempty" style="padding:20px">No contacts yet.</div>')+'<div class="addrow" id="cAdd">+ Add PM contact</div></div>';
  DIR_SECTIONS.forEach(S=>{const rows=dirList(S.kind).map(c=>'<div class="crow2"><div class="cc-main"><div class="cc-name">'+esc(((c.prefix?c.prefix+' ':'')+(c.name||'')).trim()||'(unnamed)')+'</div><div class="cc-sub">'+esc(S.sub(c)||'\u2014')+'</div></div><button class="txtbtn" data-dired="'+c.id+'" data-dkind="'+S.kind+'">Edit</button><span class="dotsep">\u00b7</span><button class="txtbtn del" data-dirdel="'+c.id+'" data-dkind="'+S.kind+'">Delete</button></div>').join('');
    html+='<div class="lsec"><div class="lsec-t">'+S.title+'</div>'+(rows||'<div class="mempty" style="padding:20px">None saved yet.</div>')+'<div class="addrow" data-diradd="'+S.kind+'">'+S.add+'</div></div>';});
  el('contactsBody').innerHTML=html;
  const a=el('cAdd');if(a)a.onclick=()=>contactDialog(null);
  document.querySelectorAll('[data-ced]').forEach(b=>b.onclick=()=>contactDialog(mpdb.listContacts().find(x=>x.id===b.getAttribute('data-ced'))));
  document.querySelectorAll('[data-cdel]').forEach(b=>b.onclick=()=>{const id=b.getAttribute('data-cdel');const c=mpdb.listContacts().find(x=>x.id===id);dialogConfirm('Delete contact','Remove <b>'+esc(c?c.name:'this contact')+'</b> from PM contacts?','Delete',true,async()=>{try{await mpdb.deleteContact(id);renderContacts();}catch(e){saveFailedModal(e);}});});
  document.querySelectorAll('[data-diradd]').forEach(b=>b.onclick=()=>dirDialog(b.getAttribute('data-diradd'),null));
  document.querySelectorAll('[data-dired]').forEach(b=>b.onclick=()=>dirDialog(b.getAttribute('data-dkind'),dirList(b.getAttribute('data-dkind')).find(x=>x.id===b.getAttribute('data-dired'))));
  document.querySelectorAll('[data-dirdel]').forEach(b=>b.onclick=()=>{const id=b.getAttribute('data-dirdel');const S=DIR_SECTIONS.find(x=>x.kind===b.getAttribute('data-dkind'));const c=dirList(S.kind).find(x=>x.id===id);dialogConfirm('Delete '+S.one,'Remove <b>'+esc(c&&c.name?c.name:'this contact')+'</b> from '+S.title.toLowerCase()+'?','Delete',true,async()=>{try{await mpdb.deleteDir(id);renderContacts();}catch(e){saveFailedModal(e);}});});}
function dirDialog(kind,c){const S=DIR_SECTIONS.find(x=>x.kind===kind);c=c||{};const FLDS=S.rows.flat();
  const cell=f=>{const v=f[0]==='phone'&&c[f[0]]?fmtPhone(c[f[0]]):(c[f[0]]||'');
    const inner=f[2]?('<select id="dc_'+f[0]+'">'+[''].concat(f[2]).map(o=>'<option value="'+esc(o)+'"'+(String(v)===o?' selected':'')+'>'+(o===''?'\u2014':esc(o))+'</option>').join('')+'</select>')
      :('<input id="dc_'+f[0]+'" value="'+esc(v)+'" autocomplete="off">');
    return '<div class="dlg-field'+(f[3]?' '+f[3]:'')+'"><label>'+esc(f[1])+'</label>'+inner+'</div>';};
  modal('<div class="dlg-t">'+(c.id?'Edit ':'Add ')+esc(S.one)+'</div>'+S.rows.map(row=>row.length>1?('<div class="dlg-2">'+row.map(cell).join('')+'</div>'):cell(row[0])).join('')+'<div class="dlg-row"><button class="btn" id="dlgCancel">Cancel</button><span class="dlg-sp"></span><button class="btn p" id="dlgOk">Save</button></div>');
  const pp=el('dc_phone');if(pp&&pp.addEventListener)pp.addEventListener('input',()=>{pp.value=fmtPhone(pp.value);});
  FLDS.forEach(f=>{const ff=el('dc_'+f[0]);if(ff&&ff.addEventListener)ff.addEventListener('keydown',ev=>{if(ev.key!=='Enter')return;ev.preventDefault();const d=pp?(pp.value||'').replace(/\D/g,''):'';if(!pp||d.length===0||d.length===10)el('dlgOk').click();});});
  el('dlgCancel').onclick=closeModal;
  el('dlgOk').onclick=async()=>{const patch={};FLDS.forEach(f=>{patch[f[0]]=(el('dc_'+f[0]).value||'').trim();});closeModal();try{if(c.id)await mpdb.updateDir(c.id,patch);else await mpdb.addDir(kind,patch);renderContacts();}catch(e){saveFailedModal(e);}};}
function contactDialog(c){c=c||{};
  modal('<div class="dlg-t">'+(c.id?'Edit contact':'Add contact')+'</div><div class="dlg-field"><label>Name</label><input id="ccN" value="'+esc(c.name||'')+'" autocomplete="off"></div><div class="dlg-field"><label>Email</label><input id="ccE" value="'+esc(c.email||'')+'" autocomplete="off"></div><div class="dlg-field"><label>Phone</label><input id="ccP" value="'+esc(c.phone?fmtPhone(c.phone):'')+'" autocomplete="off"></div><div class="dlg-row"><button class="btn" id="dlgCancel">Cancel</button><span class="dlg-sp"></span><button class="btn p" id="dlgOk">Save</button></div>');
  { const pp=el('ccP'); if(pp){ pp.value=fmtPhone(pp.value||''); if(pp.addEventListener) pp.addEventListener('input',()=>{ pp.value=fmtPhone(pp.value); }); } }
  ['ccN','ccE','ccP'].forEach(id=>{const ff=el(id);if(ff&&ff.addEventListener)ff.addEventListener('keydown',ev=>{if(ev.key!=='Enter')return;ev.preventDefault();const d=(el('ccP').value||'').replace(/\D/g,'');if(d.length===0||d.length===10)el('dlgOk').click();});});
  el('dlgCancel').onclick=closeModal;
  el('dlgOk').onclick=async()=>{const patch={name:(el('ccN').value||'').trim(),email:(el('ccE').value||'').trim(),phone:(el('ccP').value||'').trim()};closeModal();try{if(c.id)await mpdb.updateContact(c.id,patch);else await mpdb.addContact(patch);renderContacts();}catch(e){saveFailedModal(e);}};}
if(typeof module!=='undefined')module.exports={fmtPhone,fmtDate,sMoney,sPct,sK,analysis,uaResolvedOf,uaConflict,uaUnresolved,renderMenu,renderLauncher,openMenu,openForm,openLauncher,ringSvg,niceDate,isDirty,overrideCount,isStateKey,attnFlags,pbUtil,clearUncheckedWriteins,srcOf:(k)=>srcOf(k),__openForm:(pid)=>{activePid=pid;return openForm('RCS');},__edit:(k,v)=>{form=store.editForm(form,k,v);},getVal:(k)=>get(k),modeOf:(kk)=>modeOf(kk),fieldKeys:(k)=>fieldKeys(k),keysCanSave:(ks)=>keysCanSave(ks),keysCanRevert:(ks)=>keysCanRevert(ks),keysNewDirty:(ks)=>keysNewDirty(ks),__revert:(k)=>store.revertForm(form,k),coupledKeys:(k)=>coupledKeys(k),__firstPid:()=>{const ps=mpdb?mpdb.listProperties():[];return ps.length?ps[0].id:null;},__boxes:(i)=>({ua:uaBox(i),safmr:safmrBox(i)}),__saveField:async(k)=>{form=await store.saveField(form,k);},__set:(f,u)=>{form=f;UNITS=u;}};
