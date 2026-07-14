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
const SECTION_TITLES={1:'Source documents',2:'Property',3:'Point of contact & signatory',4:'Contract administrator',5:'Appraiser',6:'Rents & unit mix',7:'Items included in rent (Part B)',8:"Owner’s checklist",9:'Tenant notice'};
const D='database',T='this-cycle',O='overridden';
const SEED={
  'property.name':['Gates Manor Apartments',D],'property.addr_street':['1135 Wilmette Ave',D],'property.addr_city':['Wilmette',D],'property.addr_state':['IL',D],'property.addr_zip':['60091',D],'property.fha':['IL06H121063',D],
  'owner.entity_name':['Gates Manor Preservation, L.P.',D],'owner.entity_type':['Limited Partnership',D],
  'poc.name':['Claire Beatty',D],'poc.email':['cbeatty@related.com',D],'poc.phone':['(929) 618-8405',D],
  'owner.gp':['Related (GP)',D],'sig.name':['David Pearson',D],'sig.title':['Vice President',D],
  'ca.org':['National Housing Compliance',D],'ca.prefix':['Ms.',D],'ca.name':['Heather Gross',D],'ca.position':['Asset Manager',D],
  'ca.addr_street':['1975 Lakeside Parkway, Suite 310',D],'ca.addr_city':['Tucker',D],'ca.addr_state':['GA',D],'ca.addr_zip':['30084-5860',D],
  'appr.firm':['Belfry Valuation',T],'appr.name':['Aaron M. Zabel',T],'appr.email':['azabel@belfryvaluation.com',T],'appr.phone':['(708) 500-2380',T],'appr.addr_street':['',T],'appr.addr_city':['',T],'appr.addr_state':['',T],'appr.addr_zip':['',T],
  'units.0.br':['1BR',D],'units.0.ba':['1BA',D],'units.0.num_units':['51',D],'units.0.current':['1903',T],'units.0.proposed':['2725',T],
  'units.0.ua_exec':['31',T],'units.0.ua_rcs':['31',T],'units.0.ua_source':['exec',T],'units.0.ua_reviewed':['',T],'units.0.ua_custom':['',T],
  'units.0.safmr_rcs':['3435',T],'units.0.safmr_hud':['3495',T],'units.0.safmr_source':['hud',T],'units.0.safmr_reviewed':['',T],
  'rent_schedule.date_eff_rs':['2026-09-01',T],'rent_schedule.date_eff_source':['rs',T],'rent_schedule.date_eff_custom':['',T],'rent_schedule.date_rents_effective':['2026-09-01',T],
  'tenant.sender_name':['Tasha Francellno-Glenn',D],'tenant.sender_title':['Community Manager',D],'tenant.mgmt_source':['property',D],'tenant.property_alias':['',D],
  'tenant.mgmt_street':['',D],'tenant.mgmt_city':['',D],'tenant.mgmt_state':['',D],'tenant.mgmt_zip':['',D],
};
const PB_CHECK={'Range':1,'Refrigerator':1,'Carpet':1,'Heating':1,'Hot Water':1,'Cooking':1,'Parking':1};
const PB_FUEL={0:'G',1:'',2:'G',3:'G',4:''};
Object.entries(PARTB).forEach(([g,items])=>items.forEach((it,i)=>{SEED['partb.'+g+'.'+i]=[PB_CHECK[it]?'1':'',D];}));
Object.entries(PB_FUEL).forEach(([i,f])=>SEED['partb.fuel.'+i]=[f,D]);
['e1','e2','e3','e4','e5','u1','s1','s2','s3','s4','s5','s6'].forEach(id=>{SEED['partb.writein.'+id]=['',D];SEED['partb.writein.'+id+'.on']=['',D];});
SEED['partb.writein.e1']=['Microwave',D];SEED['partb.writein.e1.on']=['1',D];
SEED['partb.writein.e2']=['Mini Blinds',D];SEED['partb.writein.e2.on']=['1',D];
SEED['partb.writein.s1']=['Fitness Center',D];SEED['partb.writein.s1.on']=['1',D];
SEED['partb.writein.s2']=['Community RM',D];SEED['partb.writein.s2.on']=['1',D];
SEED['partb.writein.u1.fuel']=['',D];
CHECKLIST_FLAT.forEach((it,i)=>{const off=/scope of repair/i.test(it)||/scope of work/i.test(it);SEED['check.'+i]=[off?'':'1',D];});
const ALL_KEYS=Object.keys(SEED).map(k=>({key:k}));

let mpdb=null, activePid=null;
const bridge={getDb:async()=>mpdb?mpdb.getFlat(activePid):{},saveDb:async(m)=>mpdb.saveFlat(activePid,m),clearDb:async()=>{}};
const store=makeStore(bridge,ALL_KEYS);
let form=store.emptyForm(); let UNITS=[0]; let NONREV=[]; let _undoStack=[]; let _pending=null,_refocusSel=null,_pendingSnap=null;

const CLR={database:['#2563eb','#e8f0fe','On file'],'this-cycle':['#0f766e','#e9f5f2','Parsed/API'],overridden:['#b45309','#fbf1e6','Overridden'],'auto-calculated':['#2563eb','#e8f0fe','Auto-calc'],'new':['#64748b','#f6f7f9','New']};
const TODAY=new Date().toISOString().slice(0,10);
const el=id=>document.getElementById(id); const get=k=>form[k]?form[k].value:'';
const numf=v=>{const n=parseFloat(String(v||'').replace(/[^0-9.\-]/g,''));return isNaN(n)?0:n;};
const money=n=>'$'+Math.round(n).toLocaleString('en-US');
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
let DBSNAP={};
async function refreshSnap(){DBSNAP=await bridge.getDb();}
function keysChanged(p){const all=new Set([...Object.keys(form),...Object.keys(DBSNAP)].filter(k=>k.startsWith(p)));for(const k of all){const fv=form[k]?(form[k].value||''):'';const sv=DBSNAP[k]?(DBSNAP[k].value||''):'';if(fv!==sv)return true;}return false;}
function dbIdxSize(p){const s=new Set();Object.keys(DBSNAP).forEach(k=>{if(k.startsWith(p)&&DBSNAP[k].value!==''){const m=k.slice(p.length).match(/^(\d+)\./);if(m)s.add(m[1]);}});return s.size;}
function unitsChanged(){return UNITS.length!==dbIdxSize('units.')||keysChanged('units.');}
function nonrevChanged(){return NONREV.length!==dbIdxSize('nonrev.')||keysChanged('nonrev.');}
function modeOf(kk){const keys=Array.isArray(kk)?kk:[kk];if(keys.some(k=>srcOf(k)==='overridden'))return 'over';if(keys.some(k=>srcOf(k)==='new'&&get(k)!==''&&get(k)!=null))return 'new';return '';}
function ovIcons(kk){const keys=Array.isArray(kk)?kk:[kk];const j=keys.join(',');const m=modeOf(keys);return `<span class="ovic" data-ovic="${j}" data-mode="${m}" style="display:${m?'inline-flex':'none'}"><button class="miniic rv" data-rev="${j}" title="Revert to on-file">↺</button><button class="miniic sv" data-save1="${j}" title="Save this field to the database">✓</button></span>`;}

function deriveUnits(){const u=new Set([0]),nr=new Set();Object.keys(form).forEach(k=>{let m=k.match(/^units\.(\d+)\./);if(m)u.add(+m[1]);m=k.match(/^nonrev\.(\d+)\./);if(m)nr.add(+m[1]);});UNITS=[...u].sort((a,b)=>a-b);NONREV=[...nr].sort((a,b)=>a-b);}

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

function labelFor(k){for(const s of FIELD_SECTIONS){const f=s.fields.find(f=>f.k===k);if(f)return s.title+' — '+f.label;}
  const A={'appr.addr_street':'Appraiser Street','appr.addr_city':'Appraiser City','appr.addr_state':'Appraiser State','appr.addr_zip':'Appraiser ZIP','tenant.mgmt_source':'Tenant notice — Management address source','property.addr_street':'Property — Street','property.addr_city':'Property — City','property.addr_state':'Property — State','property.addr_zip':'Property — ZIP','ca.prefix':'Contract administrator — Name prefix','safmr.hud':'SAFMR — HUD dataset','safmr.rcs':'SAFMR — RCS report'};if(A[k])return A[k];
  let m=k.match(/^units\.(\d+)\.(.+)$/);if(m){const nm={br:'Bedrooms',ba:'Bathrooms',num_units:'Units',current:'Current rent',proposed:'Proposed rent',ua_exec:'UA (exec RS)',ua_rcs:'UA (RCS)',ua_source:'UA source chosen',ua_custom:'UA (custom)',ua_reviewed:'UA reviewed'};return 'Rents — unit '+(+m[1]+1)+' · '+(nm[m[2]]||m[2]);}
  m=k.match(/^nonrev\.(\d+)\.(.+)$/);if(m){const nm={use:'Use',br:'Bedrooms',ba:'Bathrooms',rent:'Contract rent'};return 'Non-revenue unit '+(+m[1]+1)+' · '+(nm[m[2]]||m[2]);}
  m=k.match(/^partb\.(equipment|utilities|services)\.(\d+)$/);if(m)return 'Part B '+m[1]+' — '+(PARTB[m[1]][+m[2]]||'');
  m=k.match(/^partb\.fuel\.(\d+)$/);if(m)return 'Part B fuel — '+(PARTB.utilities[+m[1]]||'');
  m=k.match(/^partb\.writein\.([a-z0-9]+)(\.on|\.fuel)?$/);if(m)return 'Part B write-in — '+m[1]+(m[2]==='.on'?' (checked)':(m[2]==='.fuel'?' (fuel)':' (label)'));
  m=k.match(/^check\.(\d+)$/);if(m)return "Owner’s checklist — "+(CHECKLIST_FLAT[+m[1]]||'');return k;}

function ovBtns(k){return `<button class="revert" data-rev="${k}">↺ revert</button><button class="save1" data-save1="${k}">✓ save this field</button>`;}
function ovNote(k){const m=modeOf(k);return `<div class="ovnote" data-ov="${k}" data-mode="${m}" style="display:${m?'flex':'none'}"><span class="om-over">changed from stored record</span><span class="om-new">new — not saved yet</span>${ovBtns(k)}</div>`;}
function ovNoteAddr(box){const keys=ADDR_GROUPS[box];const m=modeOf(keys);return `<div class="ovnote" data-ov="${box}" data-mode="${m}" style="display:${m?'flex':'none'}"><span class="om-over">changed from stored record</span><span class="om-new">new — not saved yet</span><button class="revert" data-revaddr="${box}">↺ revert</button><button class="save1" data-save1addr="${box}">✓ save this field</button></div>`;}
function csDrop(key,options,ph,cls,clearable){const cur=get(key);const has=cur!==''&&cur!=null;const lab=has?cur:(ph||'—');const menu=options.map(o=>'<div class="uaopt" data-csopt="'+esc(o)+'" data-cskey="'+key+'">'+esc(o)+'</div>').join('');const clr=(clearable&&has)?'<span class="csclear" data-csclear="'+key+'" title="Clear">✕</span>':'';return '<div class="uadrop cs '+(cls||'')+(clearable?' clearable':'')+'"><div class="uatrigger" tabindex="0" data-trigfor="'+key+'"><span class="ualab">'+esc(lab)+'</span>'+clr+'<span class="cvx">▾</span></div><div class="uamenu">'+menu+'</div></div>';}
function dateEffResolved(){const src=get('rent_schedule.date_eff_source')||(get('rent_schedule.date_eff_rs')?'rs':'custom');return src==='custom'?get('rent_schedule.date_eff_custom'):get('rent_schedule.date_eff_rs');}
function dateEffCell(){const rs=get('rent_schedule.date_eff_rs');const src=get('rent_schedule.date_eff_source')||(rs?'rs':'custom');const custom=get('rent_schedule.date_eff_custom');
  const rsLab=rs?(fmtDate(rs)+' · from RS'):'— · no RS date parsed';
  const lab=(src==='custom')?('<input class="uac-in dateeff-in" data-date="1" data-k="rent_schedule.date_eff_custom" value="'+esc(custom)+'" placeholder="mm/dd/yyyy" autocomplete="off">'):(rs?('<input class="uac-in srcedit" data-srcedit="dateeff" data-date="1" value="'+esc(fmtDate(rs))+'"><span class="srctag">· from RS</span>'):('<span class="ualab">'+esc(rsLab)+'</span>'));
  let state,c;if(src==='custom'){state=srcOf('rent_schedule.date_eff_custom');c=CLR[state]||CLR.new;}else{state=rs?'this-cycle':'new';c=CLR[state];}
  const boxKey=(src==='custom')?'rent_schedule.date_eff_custom':'rent_schedule.date_eff_source';
  const menu='<div class="uamenu"><div class="uaopt" data-deffopt="rs">'+esc(rsLab)+'</div><div class="uaopt" data-deffopt="custom">Custom…</div></div>';
  return `<div class="field"><div class="flabel">Date rents will be effective</div><div class="fbox uacell" data-box="${boxKey}" style="background:${c[1]};border-left-color:${c[0]}"><div class="uadrop" style="flex:1;min-width:0"><div class="uatrigger" tabindex="0">${lab}<span class="cvx">▾</span></div>${menu}</div>${src==='custom'?ovIcons('rent_schedule.date_eff_custom'):''}</div></div>`;}
function pocSetGreen(name,email,phone){form=store.editForm(form,'poc.name',name||'');form=store.editForm(form,'poc.email',email||'');form=store.editForm(form,'poc.phone',fmtPhone(phone||''));['poc.name','poc.email','poc.phone'].forEach(kk=>{if(form[kk])form[kk].source='this-cycle';});}
function pocSelectContact(ct){form=store.editForm(form,'poc.name',ct.name||'');form=store.editForm(form,'poc.email',ct.email||'');form=store.editForm(form,'poc.phone',fmtPhone(ct.phone||''));}
function pocNote(){const m=modeOf('poc.name');return `<div class="ovnote" data-ov="poc.name" data-mode="${m}" style="display:${m?'flex':'none'}"><span class="om-over">changed from stored record</span><span class="om-new">new — not saved yet</span><button class="revert" data-rev="poc.name,poc.email,poc.phone">↺ revert</button><button class="save1" data-save1="poc.name,poc.email,poc.phone">✓ save this field</button></div>`;}
function pocApplyParsed(name){const ct=(mpdb?mpdb.listContacts():[]).find(c=>String(c.name||'').trim().toLowerCase()===String(name||'').trim().toLowerCase());if(ct){pocSetGreen(ct.name,ct.email,ct.phone);}else{form=store.editForm(form,'poc.name',name||'');form=store.editForm(form,'poc.email','');form=store.editForm(form,'poc.phone','');if(form['poc.name'])form['poc.name'].source='this-cycle';}}
function pocCell(){const k='poc.name';const contacts=(mpdb?mpdb.listContacts():[]);const cur=get(k);const c=CLR[srcOf(k)]||CLR.new;
  const menu=contacts.length?('<div class="uamenu">'+contacts.map(ct=>'<div class="uaopt" data-pocopt="'+esc(ct.id)+'">'+esc(ct.name)+(ct.email?'<span class="uasub">'+esc(ct.email)+'</span>':'')+'</div>').join('')+'</div>'):'';
  const pick=contacts.length?('<div class="uadrop pocpick"><div class="uatrigger" tabindex="0" title="Pick a saved contact"><span class="cvx">&#9662;</span></div>'+menu+'</div>'):'';
  return `<div class="field"><div class="flabel">Point of contact</div><div class="fbox poccell" data-box="${k}" style="background:${c[1]};border-left-color:${c[0]}"><input class="pocname-in" data-k="poc.name" value="${esc(cur)}" placeholder="Type a name, or pick a saved contact" autocomplete="off">${pick}</div>${pocNote()}</div>`;}
function fieldCell(f){if(f.type==='addr')return addrCell();if(f.type==='caaddr')return caAddrCell();if(f.type==='appraddr')return apprAddrCell();if(f.type==='mgmtaddr')return mgmtCell();if(f.type==='select')return selectCell(f);if(f.k==='poc.name')return pocCell();
  const s=form[f.k]||{value:'',source:'new'};const c=CLR[s.source]||CLR.new;
  const pre=f.prefix?csDrop(f.prefix,['Ms.','Mr.','Dr.','Mx.'],'—','csnarrow'):'';
  return `<div class="field"><div class="flabel">${f.label}</div><div class="fbox" data-box="${f.k}" style="background:${c[1]};border-left-color:${c[0]}">${pre}<input type="text" data-k="${f.k}"${f.type==='phone'?' data-phone="1" inputmode="tel" maxlength="14"':''} value="${esc(s.value)}" autocomplete="off"></div>${ovNote(f.k)}</div>`;}
function addrAgg(){if(ADDR.some(k=>srcOf(k)==='overridden'))return'overridden';if(ADDR.some(k=>srcOf(k)==='database'))return'database';return'new';}
function addrCell(){return compAddrCell(ADDR,'property.addr','Address');}
function caAddrCell(){return compAddrCell(CA_ADDR,'ca.addr','CA address');}
function apprAddrCell(){return compAddrCell(APPR_ADDR,'appr.addr','Appraiser address');}
function selectCell(f){const c=CLR[srcOf(f.k)]||CLR.new;return `<div class="field"><div class="flabel">${f.label}</div><div class="fbox seldrop" data-box="${f.k}" style="background:${c[1]};border-left-color:${c[0]}">${csDrop(f.k,f.opts,f.ph||'Select…')}${ovIcons(f.k)}</div>${ovNote(f.k)}</div>`;}
function compAddrCell(keys,box,label){const a=aggSrc(keys);const c=CLR[a]||CLR.new;const ov=a==='overridden';
  return `<div class="field"><div class="flabel">${label}</div><div class="fbox addr" data-box="${box}" style="background:${c[1]};border-left-color:${c[0]}">
     <input type="text" data-k="${keys[0]}" value="${esc(get(keys[0]))}" placeholder="Street" style="flex:2.2"><span class="adiv"></span>
     <input type="text" data-k="${keys[1]}" value="${esc(get(keys[1]))}" placeholder="City" style="flex:1.3"><span class="adiv"></span>
     ${csDrop(keys[2],STATES,'ST','csnarrow')}<span class="adiv"></span>
     <input type="text" data-k="${keys[3]}" value="${esc(get(keys[3]))}" placeholder="ZIP" style="width:64px"></div>
   ${ovNoteAddr(box)}</div>`;}
function mgmtCell(){const src=get('tenant.mgmt_source')||'property';const propHas=ADDR.some(k=>get(k)!=='');
  if(src==='custom'){const a=aggSrc(MGMT_ADDR);const c=CLR[a]||CLR.new;const ov=a==='overridden';
    return `<div class="field"><div class="flabel">Management address <span class="mgmtswitch" data-mgmt="property">↺ use property address</span></div><div class="fbox addr" data-box="tenant.mgmt" style="background:${c[1]};border-left-color:${c[0]}">
       <input type="text" data-k="tenant.mgmt_street" value="${esc(get('tenant.mgmt_street'))}" placeholder="Street" style="flex:2.2"><span class="adiv"></span>
       <input type="text" data-k="tenant.mgmt_city" value="${esc(get('tenant.mgmt_city'))}" placeholder="City" style="flex:1.3"><span class="adiv"></span>
       ${csDrop('tenant.mgmt_state',STATES,'ST','csnarrow')}<span class="adiv"></span>
       <input type="text" data-k="tenant.mgmt_zip" value="${esc(get('tenant.mgmt_zip'))}" placeholder="ZIP" style="width:64px"></div>
     ${ovNoteAddr('tenant.mgmt')}</div>`;}
  const pretty=propHas?(get('property.addr_street')+', '+get('property.addr_city')+' '+get('property.addr_state')+' '+get('property.addr_zip')).replace(/\s+/g,' ').replace(/^,\s*/,'').trim():'';
  const inner=propHas?('<span class="mgmtprop">'+esc(pretty)+'</span><span class="srctag">· property</span>'):('<span class="mgmtph">Set the property address in Section 2, or pick a different address</span>');
  const menu='<div class="uamenu"><div class="uaopt" data-mgmt="property">Use property address</div><div class="uaopt" data-mgmt="custom">Different address…</div></div>';
  const ovSrc=srcOf('tenant.mgmt_source')==='overridden';const c=ovSrc?CLR.overridden:CLR[propHas?'database':'new'];
  return '<div class="field"><div class="flabel">Management address</div><div class="fbox mgmtcell" data-box="tenant.mgmt_address" style="background:'+c[1]+';border-left-color:'+c[0]+'"><div class="uadrop"><div class="uatrigger" tabindex="0"><span class="ualab">'+inner+'</span><span class="cvx">▾</span></div>'+menu+'</div>'+(ovSrc?ovIcons('tenant.mgmt_source'):'')+'</div></div>';}
function renderFieldSection(sec){const cols=[[],[]];sec.fields.forEach(f=>cols[f.col].push(fieldCell(f)));return card(sec.n,sectionPill(sec.n),`<div class="cols"><div>${cols[0].join('')}</div><div>${cols[1].join('')}</div></div>`);}

function boxColor(k){return CLR[srcOf(k)]||CLR.new;}
function moneyBox(k){const c=boxColor(k);return `<div class="rbox money" data-box="${k}" style="background:${c[1]};border-left-color:${c[0]}"><span class="cur">$</span><input type="text" data-money="1" data-k="${k}" value="${esc(fmtMoney(get(k)))}">${ovIcons(k)}</div>`;}
function numBox(k,ph){const c=boxColor(k);return `<div class="rbox" data-box="${k}" style="background:${c[1]};border-left-color:${c[0]}"><input type="text" data-k="${k}" value="${esc(get(k))}" placeholder="${esc(ph||'')}">${ovIcons(k)}</div>`;}
function brbaBox(brK,baK){const st=(srcOf(brK)==='overridden'||srcOf(baK)==='overridden')?'overridden':(srcOf(brK)==='database'?'database':srcOf(brK));const c=CLR[st]||CLR.new;
  return `<div class="rbox brba" data-box="${brK}" style="background:${c[1]};border-left-color:${c[0]}">${csDrop(brK,BR_OPTS,'BR','',true)}<span class="slash">/</span>${csDrop(baK,BA_OPTS,'BA','',true)}${ovIcons([brK,baK])}</div>`;}
function uaBox(i){const src=get('units.'+i+'.ua_source')||defUaSrc(i),exec=get('units.'+i+'.ua_exec'),rcs=get('units.'+i+'.ua_rcs'),custom=get('units.'+i+'.ua_custom');
  const hasAny=numf(exec)>0||numf(rcs)>0||numf(custom)>0;
  const lab=src==='rcs'?('$<input class="uac-in srcedit" data-srcedit="ua" data-si="'+i+'" data-money="1" value="'+esc(fmtMoney(rcs))+'"><span class="srctag">· RCS report</span>'):(src==='custom'?('$<input class="uac-in" data-money="1" data-k="units.'+i+'.ua_custom" value="'+esc(fmtMoney(custom))+'" placeholder="0">'):('$<input class="uac-in srcedit" data-srcedit="ua" data-si="'+i+'" data-money="1" value="'+esc(fmtMoney(exec))+'"><span class="srctag">· Executed RS</span>'));
  let state,c;if(src==='custom'){state=srcOf('units.'+i+'.ua_custom');c=CLR[state]||CLR.new;}else{state=hasAny?'this-cycle':'new';const overSrc=srcOf('units.'+i+'.ua_source')==='overridden';if(uaUnresolved(i)||overSrc)state='overridden';c=CLR[state];}const boxKeyUA=src==='custom'?('units.'+i+'.ua_custom'):('units.'+i+'.ua_source');
  const menu='<div class="uamenu"><div class="uaopt" data-uaopt="exec" data-uai="'+i+'">$'+(exec||'—')+' · Executed RS</div><div class="uaopt" data-uaopt="rcs" data-uai="'+i+'">$'+(rcs||'—')+' · RCS report</div><div class="uaopt" data-uaopt="custom" data-uai="'+i+'">Custom…</div></div>';
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
function unitTypeCell(i){const brK='units.'+i+'.br',baK='units.'+i+'.ba';const st=typeUnresolved(i)?'overridden':((srcOf(brK)==='overridden'||srcOf(baK)==='overridden')?'overridden':(srcOf(brK)==='database'?'database':srcOf(brK)));const c=CLR[st]||CLR.new;
  return `<div class="rbox brba" data-box="${brK}" style="background:${c[1]};border-left-color:${c[0]}">${csDrop(brK,BR_OPTS,'BR','',true)}<span class="slash">/</span>${csDrop(baK,BA_OPTS,'BA','',true)}${ovIcons([brK,baK])}</div>`;}
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
  const menu='<div class="uamenu"><div class="uaopt" data-safmropt="hud" data-safmri="'+i+'">$'+(hud||'—')+' · HUD API</div><div class="uaopt" data-safmropt="rcs" data-safmri="'+i+'">$'+(rcs||'—')+' · RCS report</div><div class="uaopt" data-safmropt="custom" data-safmri="'+i+'">Custom…</div></div>';
  return '<div class="rbox uacell" data-box="'+boxKeySA+'" style="background:'+c[1]+';border-left-color:'+c[0]+'"><div class="uadrop"><div class="uatrigger" tabindex="0"><span class="ualab">'+lab+'</span><span class="cvx">▾</span></div>'+menu+'</div>'+(src==='custom'?ovIcons('units.'+i+'.safmr_custom'):ovIcons('units.'+i+'.safmr_source'))+'</div>';}
function safmrNote(i){const res=safmrResolvedOf(i),hud=numf(get('units.'+i+'.safmr_hud')),rcs=numf(get('units.'+i+'.safmr_rcs'));
  if(safmrUnresolved(i))return '<div class="ucnote warn">⚠ HUD $'+hud+' · RCS $'+rcs+' <span class="pick"><button class="urev sv" data-safmrok="'+i+'">approve $'+res+'</button></span></div>';
  if(res>0){const pro=numf(get('units.'+i+'.proposed'));if(pro>0)return '<div class="ucnote '+(pro<res?'ok':'warn')+'">'+(pro<res?'✓ ':'✗ ')+'$'+pro.toLocaleString()+(pro<res?' < ':' ≥ ')+'$'+res.toLocaleString()+' · 150% SAFMR</div>';return '<div class="ucnote ok">150% SAFMR $'+res.toLocaleString()+'</div>';}
  if(numf(get('units.'+i+'.num_units'))>0)return '<div class="ucnote warn">⚠ needed for the 150% test</div>';
  return '';}
function refreshFlags(){document.querySelectorAll('[data-pill]').forEach(p=>{const n=+p.getAttribute('data-pill');const st=sectionStatus(n);p.className='pill '+(st==='warn'?'warn':'ok');p.textContent=st==='warn'?'review':'confirmed';});renderRail();renderAttention();}
function unitCard(i,pos){const trash=UNITS.length>1?`<button class="trash" data-delunit="${i}" title="Delete this unit type">🗑</button>`:'';
  const _c=numf(get('units.'+i+'.current')),_p=numf(get('units.'+i+'.proposed'));const _d=_p-_c,_pc=_c>0?Math.round(_d/_c*100):0;
  const metric=(_c>0&&_p>0)?`<span class="ucmetric" data-metric="${i}" style="color:${_d>=0?'#166534':'#b91c1c'}">${sMoney(_d)} / unit · ${sPct(_pc)}</span>`:`<span class="ucmetric" data-metric="${i}"></span>`;
  const notes=[typeNote(i),numNote(i),uaNoteCell(i),safmrNote(i)].filter(Boolean).join('');
  const sub=((_c>0&&_p>0)||notes)?`<div class="urnotes"><div class="urnmetric">${metric}</div><div class="urnsub">${notes}</div></div>`:'';
  return `<div class="urow"><div class="ucells">${unitTypeCell(i)}${unitCountCell(i)}${moneyBox('units.'+i+'.current')}${moneyBox('units.'+i+'.proposed')}${uaBox(i)}${safmrBox(i)}<div class="urx">${trash}</div></div>${sub}</div>`;}
function renderRents(){
  const cards=UNITS.map((i,pos)=>unitCard(i,pos)).join('');
  let pd=`<div class="pdhead">Non-revenue units (Part D) <span class="sub">from the prior rent schedule — model / manager’s unit, etc.; excluded from rent totals</span></div>`;
  if(NONREV.length){pd+=`<div class="rgh"><span style="grid-column:1">Unit type</span><span style="grid-column:2/4">Use</span><span style="grid-column:4">Contract rent</span></div>`+NONREV.map(i=>`<div class="pdrow"><div style="grid-column:1">${brbaBox('nonrev.'+i+'.br','nonrev.'+i+'.ba')}</div><div style="grid-column:2/4">${numBox('nonrev.'+i+'.use',"e.g. Manager’s unit")}</div><div style="grid-column:4">${moneyBox('nonrev.'+i+'.rent')}</div><div class="urx" style="grid-column:7"><button class="trash" data-delnonrev="${i}" title="Delete">🗑</button></div></div>`).join('');}
  pd+=`<div class="addrow" id="addNonrev">+ Add non-revenue unit</div>`;
  const rgHead='<div class="rgh"><span>Type</span><span>Units</span><span>Current rent</span><span>Proposed rent</span><span>Utility allowance</span><span>150% SAFMR</span><span></span></div>';
  return card(6,sectionPill(6),`<div class="reseff">${dateEffCell()}</div><div class="ucards">${UNITS.length?rgHead:''}${cards}</div><div class="addrow" id="addUnit">+ Add unit type</div>${_undoStack.length?(' <span class="addrow ghostlink" id="undoUnit">↩ Undo delete'+(_undoStack.length>1?(' ('+_undoStack.length+')'):'')+'</span><button class="undocommit" id="undoCommit" title="Keep deletions — dismiss undo">✓</button>'):''}<div class="partd">${pd}</div>`);}

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
  return card(7,sectionPill(7),`<div class="pbnote">Preprinted labels check-only; dashed slots are write-ins — the box checks itself when you type in it.</div>
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
function renderSources(){return card(1,'<span class="pill neutral">this cycle</span>',`<div class="srcrow"><span class="ok">✓</span><div><b>RCS report.pdf</b> <span class="parsed">parsed</span><div class="sub">→ proposed rents · appraiser · SAFMR · UA (backup)</div></div><button class="btn sm">Replace</button></div>
  <div class="srcrow"><span class="ok">✓</span><div><b>2025 executed rent schedule.pdf</b> <span class="parsed">parsed</span><div class="sub">→ current rents · UA · unit mix · Part B · Part D</div></div><button class="btn sm">Replace</button></div>
  <div class="srcfoot"><button class="btn teal">↻ Re-parse files</button><span class="sub">Extracted 18 fields · <span class="warnt">⚠ 1 conflict: UA differs between the RCS report and the executed rent schedule.</span></span></div>
  <div class="ph">Upload + AI parsing is a later phase — these are placeholders.</div>`);}

function sectionKeys(n){if(n===6)return UNITS.flatMap(i=>['units.'+i+'.br','units.'+i+'.ba','units.'+i+'.num_units','units.'+i+'.current','units.'+i+'.proposed','units.'+i+'.ua_source','units.'+i+'.safmr_source']);const fs=FIELD_SECTIONS.find(s=>s.n===n);return fs?fs.fields.flatMap(f=>f.type==='addr'?ADDR:(f.type==='caaddr'?CA_ADDR:(f.type==='appraddr'?APPR_ADDR:(f.type==='mgmtaddr'?MGMT_ADDR:[f.k])))):[];}
function sectionStatus(n){const over=sectionKeys(n).some(k=>srcOf(k)==='overridden');if(n===6&&(UNITS.some(uaUnresolved)||UNITS.some(safmrUnresolved)||UNITS.some(typeUnresolved)||UNITS.some(numUnresolved)||UNITS.some(i=>srcOf('units.'+i+'.ua_source')==='overridden')||UNITS.some(i=>srcOf('units.'+i+'.safmr_source')==='overridden')||UNITS.some(i=>{const r=safmrResolvedOf(i),p=numf(get('units.'+i+'.proposed'));return r>0&&p>0&&p>=r;})))return'warn';return over?'warn':'ok';}
function sectionPill(n){return sectionStatus(n)==='warn'?'<span class="pill warn" data-pill="'+n+'">review</span>':'<span class="pill ok" data-pill="'+n+'">confirmed</span>';}
function card(n,pill,body){return `<div class="card"><div class="chead"><span class="cnum">${n}</span><span class="ctitle">${SECTION_TITLES[n]}</span>${pill}<span class="chev">▾</span></div><div class="cbody">${body}</div></div>`;}

function renderCommand(){const a=analysis();const pCur=a.ceil>0?clamp(a.cg/a.ceil*100):0,pPro=a.ceil>0?clamp(a.pg/a.ceil*100):0;
  const conf=UNITS.filter(uaConflict).length,unres=UNITS.filter(uaUnresolved).length;
  const ua=conf===0?['ok','exec & RCS agree']:(unres===0?['ok','UA conflicts resolved per unit type']:['warn',unres+' of '+conf+' unit type'+(conf>1?'s':'')+' need'+(unres===1?'s':'')+' a UA source']);
  el('cc').innerHTML=`
   <div class="ccard afford"><div class="cck">AFFORDABILITY PROOF</div><div class="cctitle">${a.ceil>0?('Proposed rents '+(a.pass?'clear':'exceed')+' the 150% SAFMR ceiling'):'Enter or parse a SAFMR to run the 150% test'}</div><div class="ccsub">Monthly gross rent potential (rent + UA)</div>
     <div class="afrow"><div class="afbar">
        <div class="gauge"><div class="seg dark" style="width:${pCur}%"></div><div class="seg light" style="left:${pCur}%;width:${Math.max(0,pPro-pCur)}%"></div><div class="oend"></div></div>
        <div class="glabels"><div class="gl l"><b style="color:#2f7d57">${money(a.cg)}</b><i>current</i></div><div class="gl c"><b style="color:#47a377">${money(a.pg)}</b><i>proposed</i></div><div class="gl r"><b>${a.ceil>0?money(a.ceil):'—'}</b><i>150% ceiling · HUD SAFMR</i>${a.safmrConflict?`<i class="amber">⚠ RCS differs on ≥1 type</i>`:(a.safmrMissing?`<i class="amber">⚠ SAFMR needed</i>`:'')}</div></div>
       </div>
       ${a.ceil>0?`<div class="passbox" style="background:${a.pass?'#dcfce7':'#fee2e2'};color:${a.pass?'#166534':'#b91c1c'};border-color:${a.pass?'#86efac':'#fca5a5'}">${a.pass?'✓ PASS':'✗ OVER'}<small>${money(Math.abs(a.headroom))} ${a.pass?'headroom':'over'}</small></div>`:`<div class="passbox" style="background:#f1f4f9;color:#64748b;border-color:#d7deea">SAFMR needed<small>enter or parse SAFMR</small></div>`}</div>
     <div class="lift"><b>RCS LIFT vs current rent roll</b><div class="liftnums"><span><b class="teal">${sPct(a.pct)}</b><i>increase</i></span><span><b>${sMoney(a.perUnit)}</b><i>per unit</i></span><span><b>${sMoney(a.dMo)}</b><i>portfolio/mo</i></span><span><b>${sK(a.dYr)}</b><i>annualized</i></span></div></div>
   </div>
   <div class="ccard"><div class="cck">CROSS-DOCUMENT CHECKS</div><div class="chkgrid">
     ${chk('ok','Property name','identical on both uploads & record')}${chk('ok','FHA / Section 8 #','matches the stored record')}${chk('ok','Signatory (Part H)','David Pearson on prior & new')}
     ${chk(ua[0],'Utility allowance',ua[1])}${chk(a.safmrMissing?'warn':(a.safmrOver?'warn':(a.safmrConflict?'info':'ok')),'SAFMR (150% ceiling)',a.safmrMissing?'enter/parse SAFMR per unit type':(a.safmrOver?(a.safmrOver+' type'+(a.safmrOver>1?'s':'')+' over 150% SAFMR'):(a.safmrConflict?'HUD vs RCS differ — using HUD':'per unit type · HUD')))}</div></div>
   <div class="ccard"><div class="cck">THIS PACKAGE</div><div class="cctitle" style="font-size:15px">2 sources parsed</div><div class="ccsub">RCS report · prior executed rent schedule</div>
     <div class="ccsub" style="margin-top:7px;color:#33405c"><b>Generates 6 review-ready drafts</b></div><div class="drafts">${['Cover letter (CA)','Owner cover letter','Owner’s checklist','RCS report','Draft rent schedule','Tenant notice'].map(d=>'<span>✓ '+d+'</span>').join('')}</div>
     <div class="wb">When the package is generated, your inputs are written back to the database and date-stamped.</div></div>`;}
function chk(st,name,note){const ic=st==='warn'?'⚠':(st==='info'?'ⓘ':'✓');const cl=st==='warn'?'warn':(st==='info'?'info':'ok');return `<div class="chk"><span class="${cl}">${ic}</span><div><b>${name}</b><div class="sub">${note}</div></div></div>`;}

function isStateKey(k){return /\.(ua_reviewed|safmr_reviewed|type_reviewed|num_reviewed|ua_custom|safmr_custom)$/.test(k)||k==='tenant.mgmt_source'||k==='poc.mode'||/^poc\.custom_/.test(k)||k==='rent_schedule.date_eff_source'||k==='rent_schedule.date_eff_custom';}
function overrideCount(){const grouped=new Set();for(const b in ADDR_GROUPS)ADDR_GROUPS[b].forEach(k=>grouped.add(k));UNITS.forEach(i=>{grouped.add('units.'+i+'.br');grouped.add('units.'+i+'.ba');});
  for(let i=0;i<5;i++){grouped.add('partb.utilities.'+i);grouped.add('partb.fuel.'+i);}
  const wiBases=new Set();Object.keys(form).forEach(k=>{const m=k.match(/^partb\.writein\.([a-z0-9]+)(\.on|\.fuel)?$/);if(m){grouped.add(k);wiBases.add(m[1]);}});
  let c=Object.keys(form).filter(k=>form[k].source==='overridden'&&!isStateKey(k)&&!grouped.has(k)).length;
  for(const b in ADDR_GROUPS)if(ADDR_GROUPS[b].some(k=>srcOf(k)==='overridden'))c++;
  UNITS.forEach(i=>{if(srcOf('units.'+i+'.br')==='overridden'||srcOf('units.'+i+'.ba')==='overridden')c++;});
  for(let i=0;i<5;i++){if(srcOf('partb.utilities.'+i)==='overridden'||srcOf('partb.fuel.'+i)==='overridden')c++;}
  wiBases.forEach(b=>{if(srcOf('partb.writein.'+b)==='overridden'||srcOf('partb.writein.'+b+'.on')==='overridden'||srcOf('partb.writein.'+b+'.fuel')==='overridden')c++;});
  return c;}
function attnFlags(){const f=[];const u=UNITS.filter(uaUnresolved).length;if(u)f.push(u+' UA conflict'+(u>1?'s':'')+' to resolve');const sf=UNITS.filter(safmrUnresolved).length;if(sf)f.push(sf+' SAFMR conflict'+(sf>1?'s':'')+' to resolve');const tc=UNITS.filter(i=>typeUnresolved(i)||numUnresolved(i)).length;if(tc)f.push(tc+' unit type/count conflict'+(tc>1?'s':'')+' to resolve');const A=analysis();if(A.safmrMissing)f.push('SAFMR needed for the 150% test');if(A.safmrOver)f.push(A.safmrOver+' unit type'+(A.safmrOver>1?'s':'')+' over 150% SAFMR');const ov=overrideCount();if(ov)f.push(ov+' unsaved override'+(ov>1?'s':''));return f;}
function renderRail(){const st={};[1,7].forEach(n=>st[n]='ok');[2,3,4,5,6,8,9].forEach(n=>st[n]=sectionStatus(n));let conf=0;for(let n=1;n<=9;n++)if(st[n]!=='warn')conf++;const need=9-conf;
  el('rail').innerHTML=[1,2,3,4,5,6,7,8,9].map(n=>`<div class="railitem"><span class="ri ${st[n]==='warn'?'warn':'ok'}">${st[n]==='warn'?'!':'✓'}</span><span class="rname">${n}. ${SECTION_TITLES[n]}</span></div>`).join('');
  el('railprog').innerHTML=`<b>${conf} of 9 confirmed</b>${need?`<div class="warnt">${need} need your review</div>`:''}<div class="track sm"><div style="width:${conf/9*100}%;background:#166534"></div></div>`;
  const fl=attnFlags();el('railattn').style.display=fl.length?'block':'none';el('railattn').innerHTML=fl.length?`⚠ <b>${fl.length} to review</b><div class="sub">${fl.join(' · ')}</div>`:'';}
function renderAttention(){const f=attnFlags();el('attn').style.display=f.length?'block':'none';const n=f.length;el('attn').innerHTML=n?`⚠ <b>${n} thing${n>1?'s':''} ${n>1?'need':'needs'} your attention</b><div class="sub">Flagged in amber below — ${f.join(' and ')}. (Resolve UA by picking a source; clear an override with Update database or revert.)</div>`:'';}

function renderBar(){const a=analysis();const pCur=a.ceil>0?clamp(a.cg/a.ceil*100):0,pPro=a.ceil>0?clamp(a.pg/a.ceil*100):0;const conf=UNITS.filter(uaConflict).length,unres=UNITS.filter(uaUnresolved).length;const uaOk=conf===0||unres===0;
 const bc=(st,l)=>{const ic=st==='warn'?'⚠':(st==='info'?'ⓘ':'✓');const c=st==='warn'?'#b45309':(st==='info'?'#2563eb':'#166534');return `<span class="bchip"><b style="color:${c}">${ic}</b> ${l}</span>`;};
 el('ccbar').innerHTML=`<div class="bl"><div class="minigauge"><div class="seg dark" style="width:${pCur}%"></div><div class="seg light" style="left:${pCur}%;width:${Math.max(0,pPro-pCur)}%"></div><div class="oend"></div></div><div class="mn"><b style="color:#2f7d57">${money(a.cg)}</b> current · <b style="color:#47a377">${money(a.pg)}</b> proposed · <b>${a.ceil>0?money(a.ceil):'—'}</b> ceiling · <b class="teal">${sPct(a.pct)}</b> RCS boost</div></div><div class="bchks">${bc('ok','Name')}${bc('ok','FHA')}${bc('ok','Signatory')}${bc(uaOk?'ok':'warn','UA')}${bc(a.safmrMissing||a.safmrOver?'warn':(a.safmrConflict?'info':'ok'),'SAFMR')}</div><div class="bpass" style="color:${a.ceil>0?(a.pass?'#166534':'#b91c1c'):'#64748b'}">${a.ceil>0?((a.pass?'✓ PASS':'✗ OVER')+' · '+money(Math.abs(a.headroom))):'SAFMR needed'}</div>`;}
function renderBody(){const _sy=window.scrollY;const _anchorSel=(_refocusSel&&!_mouseFocus)?_refocusSel:null;let _anchorTop=null;if(_anchorSel){try{const _ac=document.querySelector(_anchorSel);if(_ac)_anchorTop=_ac.getBoundingClientRect().top;}catch(e){}}el('sections').innerHTML=renderSources()+renderFieldSection(FIELD_SECTIONS[0])+renderFieldSection(FIELD_SECTIONS[1])+renderFieldSection(FIELD_SECTIONS[2])+renderFieldSection(FIELD_SECTIONS[3])+renderRents()+renderPartB()+renderChecklist()+renderFieldSection(FIELD_SECTIONS[4]);
  wireBody();renderCommand();renderBar();renderRail();renderAttention();
  if(_refocusSel&&!_mouseFocus){try{const _f=document.querySelector(_refocusSel);if(_f&&_f.focus){_f.focus({preventScroll:true});if(/^(INPUT|TEXTAREA)$/.test(_f.tagName)&&typeof _f.setSelectionRange==='function'){const _L=(_f.value||'').length;try{_f.setSelectionRange(_L,_L);}catch(_e){}}}}catch(e){}}_refocusSel=null;
  if(_anchorSel&&_anchorTop!=null){try{const _a2=document.querySelector(_anchorSel);if(_a2){const _nt=_a2.getBoundingClientRect().top;window.scrollTo(0,window.scrollY+(_nt-_anchorTop));}else window.scrollTo(0,_sy);}catch(e){try{window.scrollTo(0,_sy);}catch(_z){}}}else{try{window.scrollTo(0,_sy);}catch(e){}}}
async function commitPending(){if(!_pending||!_pending.length)return;const keys=_pending;_pending=null;if(keys.indexOf('poc.phone')>=0){const _d=(get('poc.phone')||'').replace(/\D/g,'');if(_d.length!==0&&_d.length!==10){setStatus('Enter a complete 10-digit phone before saving.');return;}}keys.forEach(k=>{const m=k.match(/^partb\.writein\.(e1|e2|e3|e4|e5|s1|s2|s3|s4|s5|s6)(\.on)?$/);if(m)clearUncheckedWriteins([m[1]]);});for(const k of keys){const gb=groupOf(k);if(gb){for(const kk of ADDR_GROUPS[gb])form=await store.saveField(form,kk);}else{form=await store.saveField(form,k);}}await refreshSnap();_pendingSnap=null;_refocusSel=refocusSelForKey(keys[0]);renderBody();setStatus('Saved this field to the database.');}
function revertCellIfOver(cell){if(!cell)return false;const inIc=cell.querySelector('.ovic[data-mode="over"] [data-rev]');if(inIc){inIc.click();return true;}const box=cell.getAttribute('data-box');if(box){const note=document.querySelector('.ovnote[data-ov="'+box+'"][data-mode="over"]');if(note){const b=note.querySelector('[data-rev],[data-revaddr]');if(b){b.click();return true;}}}return false;}
function isToggleKey(k){return /^(check\.\d+|partb\.(equipment|utilities|services)\.\d+|partb\.fuel\.\d+|partb\.writein\.[a-z0-9]+\.(on|fuel))$/.test(k);}
function fixSavedToggles(){Object.keys(DBSNAP||{}).forEach(k=>{if(isToggleKey(k)){const dv=(DBSNAP[k]&&DBSNAP[k].value!=null)?DBSNAP[k].value:'';form[k]={value:dv,source:'database',saved_at:(DBSNAP[k]&&DBSNAP[k].saved_at)||null,prior_value:null,prior_source:null,db_value:dv};}});}
function snapOf(keys){const s={};keys.forEach(k=>{s[k]=form[k]?Object.assign({},form[k]):null;});return s;}
function fieldKeys(k){const gb=groupOf(k);if(gb)return ADDR_GROUPS[gb].slice();if(k.indexOf('partb.writein.')===0&&k.indexOf('.',14)<0){const ks=[k,k+'.on'];if(k.slice(14)==='u1'||(k+'.fuel') in form)ks.push(k+'.fuel');return ks;}return [k];}
function coupledKeys(k){if(k.indexOf('units.')===0){if(k.slice(-10)==='.ua_custom')return [k,k.slice(0,-10)+'.ua_source'];if(k.slice(-13)==='.safmr_custom')return [k,k.slice(0,-13)+'.safmr_source'];}if(k==='rent_schedule.date_eff_custom')return [k,'rent_schedule.date_eff_source'];return [k];}
function keysCanRevert(keys){return keys.some(k=>srcOf(k)==='overridden');}
function keysNewDirty(keys){return !keysCanRevert(keys)&&keys.some(k=>srcOf(k)==='new'&&String(get(k)==null?'':get(k)).trim()!=='');}
function keysCanSave(keys){return keysCanRevert(keys)||keysNewDirty(keys);}
function refocusSelForKey(k){if(/^(check\.\d+|partb\.(equipment|utilities|services)\.\d+)$/.test(k))return '[data-cb="'+k+'"]';const w=k.match(/^(partb\.writein\.[a-z0-9]+)\.on$/);if(w)return '[data-wibox="'+w[1]+'"]';const gb=groupOf(k);if(gb)return '[data-box="'+gb+'"] input,[data-box="'+gb+'"] .uatrigger';return '[data-trigfor="'+k+'"],[data-box="'+k+'"] .uatrigger,[data-k="'+k+'"]';}
function revertPending(){if(!_pending||!_pending.length)return false;const keys=_pending;const snap=_pendingSnap;_pending=null;_pendingSnap=null;let any=false;if(snap){Object.keys(snap).forEach(k=>{const b=snap[k];const nv=form[k]?form[k].value:undefined;const bv=b?b.value:undefined;if(b)form[k]=b;else delete form[k];if(bv!==nv)any=true;});}else{keys.forEach(k=>{const gb=groupOf(k);if(gb){ADDR_GROUPS[gb].forEach(kk=>{if(store.revertForm(form,kk))any=true;});}else{if(store.revertForm(form,k))any=true;}});}if(any){_refocusSel=refocusSelForKey(keys[0]);renderBody();}setStatus('Reverted your last change.');return true;}
function paintAddr(){const c=CLR[addrAgg()]||CLR.new;const box=document.querySelector('[data-box="property.addr"]');if(box){box.style.background=c[1];box.style.borderLeftColor=c[0];}const ov=document.querySelector('[data-ov="property.addr"]');if(ov)ov.style.display=addrAgg()==='overridden'?'flex':'none';}
function aggSrc(keys){if(keys.some(k=>srcOf(k)==='overridden'))return'overridden';if(keys.some(k=>srcOf(k)==='database'))return'database';if(keys.some(k=>srcOf(k)==='this-cycle'))return'this-cycle';return'new';}
function groupOf(k){for(const b in ADDR_GROUPS){if(ADDR_GROUPS[b].indexOf(k)>=0)return b;}return null;}
function paintGroup(b){const keys=ADDR_GROUPS[b];const a=aggSrc(keys);const c=CLR[a]||CLR.new;const box=document.querySelector('[data-box="'+b+'"]');if(box){box.style.background=c[1];box.style.borderLeftColor=c[0];}const ov=document.querySelector('[data-ov="'+b+'"]');if(ov){const m=modeOf(keys);ov.setAttribute('data-mode',m);ov.style.display=m?'flex':'none';}}
function paintCell(k){const gb=groupOf(k);if(gb)return paintGroup(gb);const s=form[k];if(!s)return;const _sr=(k==='rent_schedule.date_rents_effective'&&s.source==='database')?'this-cycle':s.source;const c=CLR[_sr]||CLR.new;const box=document.querySelector('[data-box="'+k+'"]');if(box){box.style.background=c[1];box.style.borderLeftColor=c[0];}const ov=document.querySelector('[data-ov="'+k+'"]');if(ov){const m=modeOf(k);ov.setAttribute('data-mode',m);ov.style.display=m?'flex':'none';}document.querySelectorAll('[data-ovic]').forEach(o=>{const ks=o.getAttribute('data-ovic').split(',');if(ks.indexOf(k)>=0){const m=modeOf(ks);o.setAttribute('data-mode',m);o.style.display=m?'inline-flex':'none';}});}
function clearUncheckedWriteins(ids){ids.forEach(id=>{if(get('partb.writein.'+id)&&get('partb.writein.'+id+'.on')!=='1'){form=store.editForm(form,'partb.writein.'+id,'');form=store.editForm(form,'partb.writein.'+id+'.on','');}});}
function wireArrowNav(){document.querySelectorAll('.fbox:not(.uacell),.rbox:not(.uacell)').forEach(cell=>{const items=[...cell.querySelectorAll('input[data-k],.uatrigger')];if(items.length<2)return;items.forEach((it,idx)=>{it.addEventListener('keydown',e=>{if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;const isInput=/^(INPUT|TEXTAREA)$/.test(it.tagName);if(isInput){const v=(it.value||'');const at0=it.selectionStart===0&&it.selectionEnd===0;const atE=it.selectionStart===v.length&&it.selectionEnd===v.length;if(e.key==='ArrowLeft'&&!at0)return;if(e.key==='ArrowRight'&&!atE)return;}else{const dd=it.closest('.uadrop');if(dd&&dd.classList.contains('open'))dd.classList.remove('open');}const ni=e.key==='ArrowRight'?items[idx+1]:items[idx-1];if(!ni)return;e.preventDefault();ni.focus({preventScroll:true});if(/^(INPUT|TEXTAREA)$/.test(ni.tagName)){try{const L=(ni.value||'').length;const pos=e.key==='ArrowRight'?0:L;ni.setSelectionRange(pos,pos);}catch(_e){}}});});});}
function wireBody(){
  document.querySelectorAll('input[data-k]').forEach(inp=>{const k=inp.getAttribute('data-k'),wion=inp.getAttribute('data-wion');
    inp.addEventListener('input',()=>{let v=inp.value;if(inp.getAttribute('data-phone')){v=fmtPhone(v);inp.value=v;}else if(inp.getAttribute('data-money')){v=cleanNum(v);inp.value=fmtMoney(v);}else if(inp.getAttribute('data-date')){v=fmtDateInput(v);inp.value=v;}form=store.editForm(form,k,v);if(k==='property.name'&&el('hdrProp'))el('hdrProp').textContent=(v||'(unnamed property)');
      if(wion){const on=v.length>0;form=store.editForm(form,wion,on?'1':'');const cbEl=inp.closest('.cb');if(cbEl){cbEl.classList.remove('empty','unchecked','checked');cbEl.classList.add(!v?'empty':(on?'checked':'unchecked'));const bx=cbEl.querySelector('.box');if(bx){bx.textContent=on?'✓':'';bx.style.color=provColor(wion);}}}else if(inp.getAttribute('data-util')){if(v===''){form=store.editForm(form,k+'.on','');form=store.editForm(form,k+'.fuel','');}const cbEl=inp.closest('.cb');const stillOn=v!==''&&get(k+'.on')==='1';if(cbEl){cbEl.classList.remove('empty','unchecked','checked');cbEl.classList.add(!v?'empty':(stillOn?'checked':'unchecked'));const bx=cbEl.querySelector('.box');if(bx){bx.textContent=stillOn?'✓':'';bx.style.color=provColor(k+'.on');}const f3=cbEl.querySelector('[data-fuel3]');if(f3){const fk=k+'.fuel',fv=get(fk),fhas=fv!==''&&fv!=null,fc=CLR[fhas?srcOf(fk):'new']||CLR.new;f3.textContent=fhas?fv:'-';f3.style.color=fc[0];f3.style.borderColor=fc[0];f3.style.background=fc[1];}}}
      paintCell(k);refreshFlags();if(/^units\.|^nonrev\./.test(k)){renderCommand();renderBar();const mm=k.match(/^units\.(\d+)\.(current|proposed)$/);if(mm){const ui=mm[1],me=document.querySelector('[data-metric="'+ui+'"]');if(me){const cc=numf(get('units.'+ui+'.current')),pp=numf(get('units.'+ui+'.proposed'));if(cc>0&&pp>0){me.textContent=sMoney(pp-cc)+' / unit · '+sPct(Math.round((pp-cc)/cc*100));me.style.color=(pp-cc)>=0?'#166534':'#b91c1c';}else me.textContent='';}}}setStatus('Editing — on-file changes show Overridden until you Update or Revert.');});inp.addEventListener('keydown',async e=>{if(e.key!=='Enter'&&e.key!=='Escape')return;const _keys=fieldKeys(k);if(e.key==='Escape'){if(keysCanRevert(_keys)){e.preventDefault();e.stopPropagation();_keys.forEach(kk=>store.revertForm(form,kk));_refocusSel='[data-k="'+k+'"]';renderBody();setStatus('Reverted your change to the on-file value.');}else if(srcOf(k)==='new'&&(inp.value||'')!==''){e.preventDefault();e.stopPropagation();const _clr=groupOf(k)?[k]:_keys;_clr.forEach(kk=>store.editForm(form,kk,''));_refocusSel='[data-k="'+k+'"]';renderBody();setStatus('Cleared your unsaved entry.');}return;}e.preventDefault();if(k==='poc.phone'){const _d=(inp.value||'').replace(/[^0-9]/g,'');if(_d.length!==0&&_d.length!==10){setStatus('Enter a complete 10-digit phone before saving.');return;}}if(!keysCanSave(_keys))return;_keys.forEach(kk=>{if(kk.indexOf('partb.writein.')===0&&kk.indexOf('.',14)<0&&kk.slice(14)!=='u1')clearUncheckedWriteins([kk.slice(14)]);});const _sk=[];_keys.forEach(kk=>coupledKeys(kk).forEach(x=>{if(_sk.indexOf(x)<0)_sk.push(x);}));if(groupOf(k)==='tenant.mgmt'&&_sk.indexOf('tenant.mgmt_source')<0)_sk.push('tenant.mgmt_source');for(const kk of _sk)form=await store.saveField(form,kk);await refreshSnap();_refocusSel='[data-k="'+k+'"]';renderBody();setStatus('Saved this field to the database.');});if(wion)inp.addEventListener('focus',()=>{if(inp.value&&get(wion)!=='1'){form=store.editForm(form,wion,'1');const cb=inp.closest('.cb');if(cb){cb.classList.remove('unchecked','empty');cb.classList.add('checked');const bx=cb.querySelector('.box');if(bx)bx.textContent='✓';}}});});
  document.querySelectorAll('select[data-k]').forEach(sel=>{const k=sel.getAttribute('data-k');sel.addEventListener('change',()=>{form=store.editForm(form,k,sel.value);paintCell(k);renderRail();renderAttention();});});
  document.querySelectorAll('input[data-cb]').forEach(c=>{const k=c.getAttribute('data-cb');c.addEventListener('change',()=>{_pendingSnap=snapOf([k]);form=store.editForm(form,k,c.checked?'1':'');_pending=[k];_refocusSel='[data-cb="'+k+'"]';renderBody();});});
  document.querySelectorAll('[data-fuel]').forEach(fl=>fl.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const k=fl.getAttribute('data-fuel');const cur=(form[k]&&form[k].value)||'';const nx=cur===''?'E':(cur==='E'?'G':'');_pendingSnap=snapOf([k]);form=store.editForm(form,k,nx);_pending=[k];renderBody();}));
  document.querySelectorAll('[data-fuel3]').forEach(fl=>fl.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const k=fl.getAttribute('data-fuel3');const base=k.slice(0,k.lastIndexOf('.fuel'));if(!get(base))return;const cur=(form[k]&&form[k].value)||'';const nx=cur===''?'E':(cur==='E'?'G':'');_pendingSnap=snapOf([k]);form=store.editForm(form,k,nx);_pending=[k];renderBody();}));
  document.querySelectorAll('[data-wibox]').forEach(bx=>bx.addEventListener('click',e=>{e.preventDefault();const base=bx.getAttribute('data-wibox');if(!get(base))return;const on=get(base+'.on')==='1';_pendingSnap=snapOf([base+'.on']);form=store.editForm(form,base+'.on',on?'':'1');_pending=[base+'.on'];_refocusSel='[data-wibox="'+base+'"]';renderBody();}));
  document.querySelectorAll('button[data-rev]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();b.getAttribute('data-rev').split(',').forEach(k=>coupledKeys(k).forEach(x=>store.revertForm(form,x)));renderBody();setStatus('Reverted to the on-file value.');}));
  document.querySelectorAll('button[data-revaddr]').forEach(b=>b.addEventListener('click',()=>{const _box=b.getAttribute('data-revaddr');const g=ADDR_GROUPS[_box]||ADDR;g.forEach(k=>store.revertForm(form,k));if(_box==='tenant.mgmt')store.revertForm(form,'tenant.mgmt_source');renderBody();setStatus('Address reverted.');}));
  document.querySelectorAll('button[data-save1]').forEach(b=>b.addEventListener('click',async e=>{e.preventDefault();e.stopPropagation();const keys=[];b.getAttribute('data-save1').split(',').forEach(_k=>coupledKeys(_k).forEach(x=>{if(keys.indexOf(x)<0)keys.push(x);}));if(keys.indexOf('poc.phone')>=0){const _d=(get('poc.phone')||'').replace(/\D/g,'');if(_d.length!==0&&_d.length!==10){setStatus('Enter a complete 10-digit phone before saving.');return;}}keys.forEach(k=>{const m=k.match(/^partb\.writein\.(e1|e2|e3|e4|e5|s1|s2|s3|s4|s5|s6)(\.on)?$/);if(m)clearUncheckedWriteins([m[1]]);});for(const k of keys)form=await store.saveField(form,k);await refreshSnap();renderBody();setStatus('Saved just that field to the database.');}));
  document.querySelectorAll('button[data-save1addr]').forEach(b=>b.addEventListener('click',async()=>{const _box=b.getAttribute('data-save1addr');const g=ADDR_GROUPS[_box]||ADDR;for(const k of g)form=await store.saveField(form,k);if(_box==='tenant.mgmt')form=await store.saveField(form,'tenant.mgmt_source');await refreshSnap();renderBody();setStatus('Saved the address to the database.');}));
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
  document.querySelectorAll('.uaopt').forEach(o=>o.addEventListener('click',e=>{e.stopPropagation();const i=o.getAttribute('data-uai');if(i===null)return;const v=o.getAttribute('data-uaopt');_pendingSnap=snapOf(['units.'+i+'.ua_source','units.'+i+'.ua_reviewed']);form=store.editForm(form,'units.'+i+'.ua_source',v);form=store.editForm(form,'units.'+i+'.ua_reviewed','1');_pending=['units.'+i+'.ua_source'];_refocusSel='[data-box="units.'+i+'.ua_source"] .uatrigger';renderBody();setStatus('UA source set — conflict resolved.');}));document.querySelectorAll('[data-mgmt]').forEach(o=>o.addEventListener('click',e=>{e.stopPropagation();_pendingSnap=snapOf(['tenant.mgmt_source']);form=store.editForm(form,'tenant.mgmt_source',o.getAttribute('data-mgmt'));_pending=['tenant.mgmt_source'];_refocusSel='[data-box="tenant.mgmt_address"] .uatrigger';renderBody();}));document.querySelectorAll('[data-csopt]').forEach(o=>o.addEventListener('click',e=>{e.stopPropagation();const _ck=o.getAttribute('data-cskey');const _cb=o.closest('[data-box]');_pendingSnap=snapOf([_ck]);form=store.editForm(form,_ck,o.getAttribute('data-csopt'));_pending=[_ck];_refocusSel='[data-trigfor="'+_ck+'"]';renderBody();}));document.querySelectorAll('[data-csclear]').forEach(x=>x.addEventListener('click',e=>{e.stopPropagation();e.preventDefault();form=store.editForm(form,x.getAttribute('data-csclear'),'');renderBody();setStatus('Cleared to blank.');}));document.querySelectorAll('[data-uaok]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();form=store.editForm(form,'units.'+b.getAttribute('data-uaok')+'.ua_reviewed','1');renderBody();setStatus('UA conflict resolved — approved the shown value.');}));document.querySelectorAll('[data-safmropt]').forEach(o=>o.addEventListener('click',e=>{e.stopPropagation();const i=o.getAttribute('data-safmri'),v=o.getAttribute('data-safmropt');_pendingSnap=snapOf(['units.'+i+'.safmr_source','units.'+i+'.safmr_reviewed']);form=store.editForm(form,'units.'+i+'.safmr_source',v);form=store.editForm(form,'units.'+i+'.safmr_reviewed','1');_pending=['units.'+i+'.safmr_source'];_refocusSel='[data-box="units.'+i+'.safmr_source"] .uatrigger';renderBody();setStatus('SAFMR source set.');}));
  document.querySelectorAll('[data-safmrok]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();form=store.editForm(form,'units.'+b.getAttribute('data-safmrok')+'.safmr_reviewed','1');renderBody();setStatus('SAFMR conflict resolved.');}));
  document.querySelectorAll('[data-typ]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();const i=b.getAttribute('data-ci'),w=b.getAttribute('data-typ');if(w==='rcs'){const brR=get('units.'+i+'.br_rcs'),baR=get('units.'+i+'.ba_rcs');if(brR)form=store.editForm(form,'units.'+i+'.br',brR);if(baR)form=store.editForm(form,'units.'+i+'.ba',baR);}form=store.editForm(form,'units.'+i+'.type_reviewed','1');renderBody();setStatus('Unit type resolved — using '+(w==='rcs'?'RCS':'RS')+'.');}));
  document.querySelectorAll('[data-num]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();const i=b.getAttribute('data-ci'),w=b.getAttribute('data-num');if(w==='rcs'){const nR=get('units.'+i+'.num_rcs');if(nR)form=store.editForm(form,'units.'+i+'.num_units',nR);}form=store.editForm(form,'units.'+i+'.num_reviewed','1');renderBody();setStatus('Units resolved — using '+(w==='rcs'?'RCS':'RS')+'.');}));
  document.querySelectorAll('.uac-in,.mgmt-in').forEach(inp=>{inp.addEventListener('mousedown',e=>e.stopPropagation());inp.addEventListener('click',e=>e.stopPropagation());});
  document.querySelectorAll('.srcedit').forEach(inp=>{inp.addEventListener('input',()=>{const fam=inp.getAttribute('data-srcedit'),i=inp.getAttribute('data-si');let key,val;if(fam==='dateeff'){val=fmtDateInput(inp.value);form=store.editForm(form,'rent_schedule.date_eff_source','custom');form=store.editForm(form,'rent_schedule.date_eff_custom',val);key='rent_schedule.date_eff_custom';}else{val=cleanNum(inp.value);form=store.editForm(form,'units.'+i+'.'+fam+'_source','custom');form=store.editForm(form,'units.'+i+'.'+fam+'_custom',val);key='units.'+i+'.'+fam+'_custom';}renderBody();const ni=document.querySelector('[data-k="'+key+'"]');if(ni){ni.focus({preventScroll:true});try{const L=(ni.value||'').length;ni.setSelectionRange(L,L);}catch(e){}}});});
  document.querySelectorAll('[data-pocopt]').forEach(o=>o.addEventListener('click',e=>{e.stopPropagation();const ct=mpdb.listContacts().find(x=>x.id===o.getAttribute('data-pocopt'));_pendingSnap=snapOf(['poc.name','poc.email','poc.phone']);if(ct)pocSelectContact(ct);_pending=['poc.name','poc.email','poc.phone'];_refocusSel='[data-box="poc.name"] .pocname-in';renderBody();}));
  document.querySelectorAll('[data-deffopt]').forEach(o=>o.addEventListener('click',e=>{e.stopPropagation();_pendingSnap=snapOf(['rent_schedule.date_eff_source']);form=store.editForm(form,'rent_schedule.date_eff_source',o.getAttribute('data-deffopt'));_pending=['rent_schedule.date_eff_source'];_refocusSel='[data-box="rent_schedule.date_eff_source"] .uatrigger';renderBody();}));
  document.querySelectorAll('[data-delunit]').forEach(b=>b.addEventListener('click',()=>{const i=+b.getAttribute('data-delunit');const wasEmpty=!unitHasData(i)&&numf(get('units.'+i+'.num_units'))<=0;const snap={};Object.keys(form).forEach(k=>{if(k.indexOf('units.'+i+'.')===0){snap[k]=form[k];delete form[k];}});UNITS=UNITS.filter(x=>x!==i);if(wasEmpty){renderBody();setStatus('Empty unit type removed.');}else{_undoStack.push({i,snap});renderBody();setStatus('Unit type deleted — undo available below.');}}));
  document.querySelectorAll('[data-delnonrev]').forEach(b=>b.addEventListener('click',()=>{const i=+b.getAttribute('data-delnonrev');['use','br','ba','rent'].forEach(s=>delete form['nonrev.'+i+'.'+s]);NONREV=NONREV.filter(x=>x!==i);renderBody();setStatus('');}));
  const add=el('addUnit');if(add)add.onclick=()=>{_undoStack=[];const nx=(UNITS.length?Math.max.apply(null,UNITS):-1)+1;form=store.editForm(form,'units.'+nx+'.br','');UNITS.push(nx);renderBody();setStatus('');};
  const addn=el('addNonrev');if(addn)addn.onclick=()=>{NONREV.push(NONREV.length?Math.max.apply(null,NONREV)+1:0);renderBody();setStatus('');};
  const uu=el('undoUnit');if(uu)uu.onclick=()=>{if(!_undoStack.length)return;const e=_undoStack.pop();Object.keys(e.snap).forEach(k=>{form[k]=e.snap[k];});if(UNITS.indexOf(e.i)<0)UNITS.push(e.i);UNITS.sort((a,b)=>a-b);renderBody();setStatus('Unit type restored.');};
  const uc=el('undoCommit');if(uc)uc.onclick=()=>{_undoStack=[];renderBody();setStatus('Deletions kept.');};
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
let _mouseFocus=false;document.addEventListener('mousedown',()=>{_mouseFocus=true;setTimeout(()=>{_mouseFocus=false;},60);},true);
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
function openMenu(){renderMenu();show('Menu');}
function renderMenu(){
  const q=((el('menuSearch')&&el('menuSearch').value)||'').toLowerCase();
  const all=mpdb.listProperties();
  const props=all.filter(p=>!q||(p.name+' '+p.fha+' '+(p.city_state||'')).toLowerCase().indexOf(q)>=0);if(sortMode==='updated'){const idn=x=>parseInt(String(x).replace(/\D/g,''),10)||0;props.sort((a,b)=>String(b.updated_at||'').localeCompare(String(a.updated_at||''))||(idn(b.id)-idn(a.id)));}
  const need=all.filter(p=>p.completeness<1).length;
  if(el('menuCount'))el('menuCount').textContent=all.length+(all.length===1?' property':' properties')+(all.length?(need?'  ·  '+need+' need'+(need===1?'s':'')+' review':'  ·  all complete'):'');
  const card=p=>{const pct=Math.round(p.completeness*100);
    return '<button class="pcard" data-open="'+p.id+'"><div class="pc-top"><div class="pc-name">'+esc(p.name)+'</div>'+ringSvg(pct)+'</div>'
      +'<div class="pc-meta">'+esc(p.fha)+(p.city_state?' &middot; '+esc(p.city_state):'')+'</div><div class="pc-div"></div>'
      +'<div class="pc-foot"><span class="pc-units">'+p.total_units+' unit'+(p.total_units===1?'':'s')+(p.unit_types?' &middot; '+p.unit_types+' type'+(p.unit_types===1?'':'s'):'')+'</span><span class="pc-upd" title="'+esc(updTitle(p.updated_at))+'">Updated '+relTime(p.updated_at)+'</span></div></button>';};
  const newTile='<button class="pcard newcard" id="tileNew"><span class="plus">+</span><span>New property</span></button>';
  const empty='<div class="mempty">No properties match &ldquo;'+esc(q)+'&rdquo;. <span class="link" id="mClear">Clear search</span></div>';
  el('menuGrid').innerHTML=(props.length?props.map(card).join(''):'')+(q&&!props.length?empty:'')+(q?'':newTile);
  document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openLauncher(b.getAttribute('data-open')));
  const tn=el('tileNew');if(tn)tn.onclick=createProperty;
  const mc=el('mClear');if(mc)mc.onclick=()=>{if(el('menuSearch'))el('menuSearch').value='';renderMenu();};
}
function createProperty(){dialogInput('New property','Property name','','Create',nm=>{const r=mpdb.createProperty((nm||'').trim());openLauncher(r.pid);});}

/* ---- LAUNCHER: property summary + program picker --------------------- */
function openLauncher(pid){activePid=pid;renderLauncher();show('Launcher');}
function docIcon(){return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c86a2" stroke-width="1.6" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>';}
function rcsAffPane(a){
  if(!a.total_units)return '<div class="aff-empty">Add unit types &amp; rents to see the affordability check.</div>';
  if(a.safmr_missing||!a.ceiling)return '<div class="aff-empty">Enter a 150% SAFMR to run the affordability check.</div>';
  const pCur=clamp(a.current_gpr/a.ceiling*100),pPro=clamp(a.proposed_gpr/a.ceiling*100);const dMo=a.proposed_gpr-a.current_gpr,dYr=dMo*12;
  return '<div class="aff"><div class="aff-top"><span class="aff-k">AFFORDABILITY CHECK</span><span class="aff-pass '+(a.pass?'ok':'over')+'">'+(a.pass?'&#10003; PASS':'&#10007; OVER')+' &middot; '+money(Math.abs(a.headroom))+(a.pass?' headroom':' over')+'</span></div>'
    +'<div class="aff-body"><div class="aff-left"><div class="aff-gauge"><div class="seg dark" style="width:'+pCur+'%"></div><div class="seg light" style="left:'+pCur+'%;width:'+Math.max(0,pPro-pCur)+'%"></div><div class="oend"></div></div>'
      +'<div class="aff-anchors"><span><b style="color:#2f7d57">'+money(a.current_gpr)+'</b><i>current</i></span><span><b style="color:#47a377">'+money(a.proposed_gpr)+'</b><i>proposed</i></span><span><b>'+money(a.ceiling)+'</b><i>150% ceiling</i></span></div></div>'
    +'<div class="aff-right"><span><b class="teal">'+sPct(a.pct)+'</b><i>increase</i></span><span><b>'+sMoney(a.per_unit)+'</b><i>per unit</i></span><span><b>'+sMoney(dMo)+'</b><i>/mo</i></span><span><b>'+sK(dYr)+'</b><i>/yr</i></span></div></div></div>';}
function renderLauncher(){
  const p=mpdb.listProperties().find(x=>x.id===activePid);if(!p){openMenu();return;}
  const pct=Math.round(p.completeness*100);const a=mpdb.propertyAnalysis(activePid);const lh=mpdb.getLetterhead(activePid);
  const rcsLine=(a.total_units&&a.proposed_gpr)?((a.pass?'PASS':'OVER')+' &middot; '+sPct(a.pct)+' &middot; '+money(a.proposed_gpr)+'/mo'):(a.total_units?'rents not entered yet':'set up units &amp; rents');
  const soon=(code,name)=>'<div class="progcard soon"><div class="pg-h"><span class="pg-code">'+code+'</span><span class="soonchip">Coming soon</span></div><div class="pg-name">'+name+'</div></div>';
  const letter=lh.name
    ?'<div class="letter has"><div class="lh-doc">'+(lh.thumb?'<img src="'+esc(lh.thumb)+'">':docIcon())+'</div><div class="lh-info"><b>'+esc(lh.name)+'</b><i>Property letterhead &middot; reused on every package</i></div><div class="lh-act"><button class="btn sm" id="lhReplace">Replace</button><button class="btn sm" id="lhRemove">Remove</button></div></div>'
    :'<div class="letter empty"><div class="lh-doc">'+docIcon()+'</div><div class="lh-info"><b>Add the property letterhead</b><i>Used on the tenant notice &middot; PNG, JPG or PDF, stored once</i></div><button class="btn sm" id="lhAdd">Upload</button></div>';
  el('launcherBody').innerHTML=
    '<div class="lhead"><div class="lh-left"><div class="lh-name">'+esc(p.name)+'</div>'
      +'<div class="lh-meta">'+esc(p.fha)+(p.city_state?' &middot; '+esc(p.city_state):'')+(p.total_units?' &middot; '+p.total_units+' units':'')+'</div>'
      +(p.entity?'<div class="lh-entity">'+esc(p.entity)+'</div>':'')+'</div>'
      +'<div class="lh-right"><div class="lh-tools"><button class="txtbtn" id="pRename">Rename</button><span class="dotsep">&middot;</span><button class="txtbtn del" id="pDelete">Delete</button></div><div class="lh-ring">'+ringSvg(pct,46)+'</div><div class="lh-rlab">'+pct+'% complete</div></div></div>'
    +'<div class="lsec"><div class="lsec-t">Property letterhead</div>'+letter+'<div class="lh-note">The Related Affordable cover-letter and ownership-entity letterheads are constant &mdash; built into the templates. Only the property&rsquo;s own letterhead (used on the tenant notice) is uploaded here.</div><input type="file" id="lhFile" accept="image/*,.pdf" style="display:none"></div>'
    +'<div class="lsec"><div class="lsec-t">Choose a program</div>'
      +'<button class="progcard active" id="openRCS"><div class="pg-h"><span class="pg-code">RCS</span><span class="pg-arrow">Open &rarr;</span></div><div class="pg-name">Rent Comparability Study</div>'+rcsAffPane(a)+'</button>'
      +'<div class="progrow">'+soon('OCAF','Operating Cost Adjustment Factor')+soon('UAF','Utility Allowance Factor')+soon('BBRA','Budget-Based Rent Adjustment')+'</div></div>';
  el('openRCS').onclick=()=>openForm('RCS');
  el('pRename').onclick=()=>dialogInput('Rename property','Property name',p.name,'Save',async nm=>{if(!nm)return;await mpdb.renameProperty(activePid,nm);renderLauncher();});
  el('pDelete').onclick=()=>dialogConfirm('Delete property','This permanently removes <b>'+esc(p.name)+'</b> and its stored record.','Delete',true,async()=>{await mpdb.deleteProperty(activePid);openMenu();});
  wireLetterhead();
}
function wireLetterhead(){
  const file=el('lhFile');const pick=()=>file&&file.click&&file.click();
  ['lhAdd','lhReplace'].forEach(id=>{const b=el(id);if(b)b.onclick=pick;});
  const rm=el('lhRemove');if(rm)rm.onclick=async()=>{await mpdb.setLetterhead(activePid,'','');renderLauncher();};
  if(file)file.onchange=()=>{const f=file.files&&file.files[0];if(!f)return;
    if(/^image\//.test(f.type)){const rd=new FileReader();rd.onload=e=>makeThumb(e.target.result,async t=>{await mpdb.setLetterhead(activePid,f.name,t);renderLauncher();});rd.readAsDataURL(f);}
    else mpdb.setLetterhead(activePid,f.name,'').then(renderLauncher);};
}
function makeThumb(dataUrl,cb){try{const img=new Image();img.onload=()=>{const s=Math.min(1,120/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.width*s));c.height=Math.max(1,Math.round(img.height*s));c.getContext('2d').drawImage(img,0,0,c.width,c.height);cb(c.toDataURL('image/jpeg',0.72));};img.onerror=()=>cb('');img.src=dataUrl;}catch(e){cb('');}}

/* ---- FORM: open the RCS form for the active property ----------------- */
function nonrevEmpty(i){return ['use','br','ba','rent'].every(s=>{const v=get('nonrev.'+i+'.'+s);return v===''||v==null;});}
function unitHasData(i){return ['br','ba','current','proposed','ua_exec','ua_rcs','ua_custom','safmr_hud','safmr_rcs','safmr_custom'].some(s=>{const v=get('units.'+i+'.'+s);return v!==''&&v!=null;});}
function countlessUnits(){return UNITS.filter(i=>numf(get('units.'+i+'.num_units'))<=0);}
async function saveNow(afterSave){clearUncheckedWriteins(['e1','e2','e3','e4','e5','s1','s2','s3','s4','s5','s6']);
  countlessUnits().forEach(i=>Object.keys(form).forEach(k=>{if(k.indexOf('units.'+i+'.')===0)delete form[k];}));
  NONREV.filter(nonrevEmpty).forEach(i=>Object.keys(form).forEach(k=>{if(k.indexOf('nonrev.'+i+'.')===0)delete form[k];}));
  deriveUnits();form=await store.saveToDb(form);
  if(mpdb&&activePid)await mpdb.pruneUnitRows(activePid,UNITS,NONREV);
  await refreshSnap();deriveUnits();if(afterSave)afterSave();}
function requestSave(afterSave){const meaningful=countlessUnits().filter(unitHasData);
  if(meaningful.length){dialogConfirm('Delete '+meaningful.length+' unit type'+(meaningful.length>1?'s':'')+' with no unit count?','Saving will remove unit type'+(meaningful.length>1?'s':'')+' that have entered data but no unit count. This cannot be undone after saving.','Save anyway',true,()=>saveNow(afterSave));}
  else saveNow(afterSave);}
// New-property checklist default: all §8 boxes on except Scope of repair(2) & Scope of work(4),
// applied as source 'new' (grey/unsaved) only when the property has never saved a checklist.
function applyChecklistDefaults(){if(Object.keys(DBSNAP).some(k=>/^check\.\d+$/.test(k)))return;for(let i=0;i<17;i++)form=store.editForm(form,'check.'+i,(i===2||i===4)?'':'1');}
async function openForm(program){activeProgram=program||'RCS';await mpdb.setActive(activePid);await refreshSnap();form=await store.fillForm();fixSavedToggles();applyChecklistDefaults();deriveUnits();renderFormHeader();renderBody();show('Form');window.scrollTo(0,0);}
function renderFormHeader(){if(el('hdrProp'))el('hdrProp').textContent=(get('property.name')||'(unnamed property)');if(el('hdrProgram'))el('hdrProgram').textContent=activeProgram+' Package';}

/* ---- EXIT: save or discard, then back to the menu -------------------- */
function isDirty(){const keys=new Set([...Object.keys(form),...Object.keys(DBSNAP)]);for(const k of keys){const fv=form[k]?(form[k].value==null?'':String(form[k].value)):'';const sv=DBSNAP[k]?(DBSNAP[k].value==null?'':String(DBSNAP[k].value)):'';if(fv!==sv)return true;}return false;}
function requestExit(){if(isDirty())openExit();else openLauncher(activePid);}
function openExit(){const nm=get('property.name')||'this property';
  modal('<div class="dlg-t">Save changes before leaving?</div><div class="dlg-b">You have unsaved edits to <b>'+esc(nm)+'</b>. Save them to the database so they pre-fill your next submission, or discard them and keep the last saved record.</div><div class="dlg-row"><button class="btn" id="dlgKeep">Keep editing</button><span class="dlg-sp"></span><button class="btn danger" id="dlgDiscard">Discard changes</button><button class="btn p" id="dlgSave">Save &amp; exit</button></div>');
  el('dlgKeep').onclick=closeModal;
  el('dlgDiscard').onclick=async()=>{form=await store.fillForm();await refreshSnap();fixSavedToggles();deriveUnits();closeModal();openLauncher(activePid);setStatus('');};
  el('dlgSave').onclick=()=>requestSave(()=>{closeModal();openLauncher(activePid);});
}

/* ---- generation (client-side, offline via pdf-lib) ------------------- */
const LOGO_B64="iVBORw0KGgoAAAANSUhEUgAAA0MAAAC8CAYAAAC67HW+AAAACXBIWXMAAC4jAAAuIwF4pT92AAAQpklEQVR4nO3dTXLcRpoG4A8T3lNzAmpOIHqHnconMOcE4iyxavoEgk5geVXLpk4w1Ama3NWuqRN06QRDngCzKJRbkkVJRCYKKOTzRDCa7nBmpSQLxJtf/lRd1wUAAEBp/mPqAQAAAExBGAIAAIokDAEAAEUShgAAgCIJQwAAQJGEIQAAoEjCEAAAUCRhCAAAKJIwBAAAFEkYAgAAiiQMAQAARRKGAACAIglDAABAkYQhAACgSMIQAABQJGEIAAAokjAEAAAUSRgCAACKJAwBAABFEoYAAIAiCUMAAECRhCEAAKBIwhAAAFAkYQgAACiSMAQAABRJGAIAAIokDAEAAEUShgAAgCIJQwAAQJGEIQAAoEjCEAAAUCRhCAAAKJIwBAAAFEkYAgAAiiQMAQAARRKGAACAIglDAABAkYQhAACgSMIQAABQJGEIAAAokjAEAAAUSRgCAACKJAwBAABFEoYAAIAiCUMAAECRhCEAAKBIwhAAAFAkYQgAACiSMAQAABRJGAIAAIokDAEAAEUShgAAgCIJQwAAQJGEIQAAoEjCEAAAUCRhCAAAKNJPUw/gkKq6OYuIZ1OP40hsu816O/UgAABgLEWFoYh4GxEvpx7EkXgTEe2hP7Sqm1VE/OPQnzuiDxFx339/039/FxF33WZ9/1ijOVjgn0WSbrOucvZX1U0bEa8HNv+l26xv8o2GVFXdXETE3zN09Z9TPxuqurkJPytT3Xab9SpHR1XddDn6WYisz74j+jn3ELt3h+j/d/8uce9nQbrSwhAc2otPvv/s5aKqm4+xe5hdR8SNShwctTZTP5cZ+wKW4ST+/Q7x5btExG7i9S52k67eJ55IGILpnPZfv0ZEVHXzIXbVy+upZ4aBH9dXhU4zdXdZ1c1bzwDgCV70X68i/pxsvY6Iq26zvvtWQxygAHPyInbLbLZV3bRV3djfBsehzdjXSeyqQwBDnUbE3yLin1Xd7N8pnk88ptkShmB+TmK3l+SuqpvzqQcDPC5zVWjv0mQIkMlp7N4p/lXVzZVQ9FfCEMzXaUT8b1U3b6ceCPCodoQ+VYeAMbwKoegvhCGYv79VdXM19SCAz41UFdpTHQLGsg9FluSHMATH4pVABLPTjti36hAwtv2S/LOpBzIlYQiOx6v+bhpgYiNXhfZUh4CxncbuoIViJ1+EITgur0ufwYGZaA/wGScR4RAV4BB+L3UFijAEx8eBCjChA1WF9toDfQ5AkUvyhSE4Pi+rullNPQgoWHvAzzrtwxfAIRQXiH6aegCQ0buIuJrw85/3XxERzyLirP/nMWaQLyPiZoR+c3mICLdesziJVaF30d8Q/0RtHPbZNoe/u89j+O/zx4jYZhvJMHP4PYyIuJ16AJndTz2AT4zx39mz2F3APrVXVd1Et1lfTD2QQxCGWJJtt1nfTD2IL/UboFexW/s/5EXoa36t6uZZt1nP6QfDp+66zXo19SBgBBcD272P3STGeez2Aj3FaVU3F91mfTXws5+k26wn30jdHxbzemDzq26zbvON5nh5Do9q9P/OPlkFcha7oLTqv3/qM2SIV1Xd3HWb9eKX5gtDMLI+sFxHxHV/WksbEX/L0PV5TFsJg6L0LyYvBzZ/223W91XdXMdxVIeAiX0ywXvz6f/fX5h6Fv+eaB1rD+PvVd3cdJv1XCqdo7BnCA6o26zv+1nXX2K3lCzFKn1EwBO0A9vdfvJSM7QPe4eAiIjoNuttt1lfd5v1ZbdZP4+InyPij9gt3cvteulH/AtDMIH+xSj1yFxHbMOBJFaF2v033Wa9jd3eoaR+APa6zfruk2D0P5E3FJ3Gwi+AFoZgIn0gGvpSFDGPTZZQinZgu49f2cs4tK/Tqm7cOwQ8qtusr/pQ9Fukr0DZe90vzVskYQimlbQxcckPJ5iLXFWhvb469H5gf4ueoQXy6A8+OIuID5m6bDP1MzvCEEyo35SYUs5+nmkowOPage0+fuMEuKETIe4ZA35Iv7foLNJWoey9WuoErDAE09tOPQDg63JXhfb6pXND74B5tF+AL/X3BeUIRIusTAtDML2bqQcAPKod2O7hB+4FGtq36hDwJH0gSr2E9yJ9JPMjDAHAV6TeK/S9f6GvDg1dz98ObAeU6zzSDlU4WeIhLsIQAHxdO7DdQ/z4niB7h4CD6C+BT13qJgwB2T2fegDA51KrQv1Lx3f1S+mGHqLSDmwHFCrxmRMhDAEjSLk89YdeuIAnaxPaPrXaM/SzVIeAIdqEtidV3Szq0ndhCCZU1c2zSLg8tT+aG8gosSr07kerQnv9TO3QdfwXA9sBhUp85kRErPKMZB6EIZhWytrdXBepAZ9rJ2g7dO/QYu/+AEZ1ndB2lWsQcyAMwUT6qlBKGFIVgswyVIW2A9u+jeEzte3AdkC5UsLQ81yDmIOfph4AlKgPQjcRcZLQzU2WwYzj2RHuZbi37JBIW3Y2tLoT3WZ9X9XN24h4PaD5q6pu2oQgxkId4XN4f+Q847tJaDt4ef8cCUNwYP3Gw6tIf5ikzOqM7UVE/GPqQTzRbSys9M/T9MvNXg1sfpshTA8NQxG76tBF4uezPMf2HI6IqKYeQAn6CZiPEXE6pH1VN2dLmUC0TA4OpKqbVVU3VxHxz0gPQk/epA18VztR24j48w6QdwOb2zsEPNU2oe2zXIOYmsoQZNYvgTuL3YPirP9aRdqSuC9dZewLipehKnSTaShtwjjaUB0CftxdDN8jKQzBDL2u6mboEpNjkvPFC9hpE9oO3iv0pW6z3lZ18y6GBSJ7h4CnSFlhchbzXq7/wyyTg+NzMfUAYEkSq0Ifu8069wtBSrhqcw0CoATCEByXN2Z9Ibt2orZf1W9Kvh3Y/LxfqgvwPTdTD2AOLJOb1i+WO/EEt91m3U49CFiSDFWhq3yj+Uwbw04CO4nd/WVtzsEALJXKEByHDxFxPvUgYIHahLbZ9gp9qZ8oG1odulQdAvgxwhDM34eIWDlKG/JKrAo9xPinOg4NW/vqEADfIQzBvL0PQQjG0ia0fTv238v+YIaPA5urDgHfczb1AOZAGIJ5eoiI37rN+lwQgvwyVIVGWyL3hXZgO9Uh4HtMmIQDFGapqpvV1GOIiK1TyybzPiIu/f7DqNqEtleHmqToNuurqm7aiDgd0PyyqpvRK1hAkW6mHkAuwtA8DTlBKLc34TSiQ3sXu6U3d1MPJIOPMf5+ity2Uw+Aw0isCkUcriq010bE3we0c7Icb6YeALO2mnoAcyAMwXQeYjezch0R1wubvd06BpwZaxPavpugansduwB2MqCtMFQwz2G+I2WZ3DbXIKYmDMHhPMTuxWQbliHCJDJUhdo8I/lx3WZ9X9XN24h4PaD5SVU3FyPehwQcof6AlRdD2y/pHUYYYkluY7w1rGcR8WtiHycR8cxFuzCpNrH9v6q6yTGOQ2rj+JatAuNaJbT9kGsQcyAMsSQ3Yy4JqOrmLhJmUXq/V3Vzs5B9QXBU+pnQEi8vPlUdAr6wSmi7qHcYR2vDjzuP3VK3VNfu/4BJXMawfTdL0E49AGBWUiaGhCEoUb8+9iJDV6dhyQocVD8BUfK9O6dV3VxMPQhgelXdnMew4/r3bjINZRaEIXiC/kb4PzJ09WtVNyW/mMGhlVwV2munHgAwCynvHw9LW+ovDMETdZv1ZeTZPPh7VTdnGfoBvkFV6E+qQ1C4qm5WEfEyoYvrTEOZDWEIhrkI+4fgWKgK/Vs79QCAafTvG1eJ3QhDQERfIs4x02z/EIxIVegvTvuZYaA8byNtr9BDv11gUYQhGKg/pvZdhq7sH4LxqAr9VTv1AIDD6pfIplw4HbELU4sjDEEa+4dgplSFHvVSdQjK0Qehv2fo6ipDH7MjDEGCbrO+D/uHYK5UhR7XTj0AYHxV3bSRJwi9668YWRxhCBL1+4faDF2dxgI3JsIUVIW+S3UIFqyqm2dV3dxExOtMXbaZ+pmdn6YeACxBt1m/7V8sfk3s6mVVN223Wbfpo4KipVSFHuJ4blh/FhEvBrZtI2KVbSTALPTVoJyV8TdLrQpFCEOQ00XsXqBSTmqJiHhd1c1Nt1nfJI8ICpShKnTZH5Aye/2v9f8GNn9Z1c3KswaOX/8suIjdsy/1PeRTH2OhByfsWSYHmfT7h84zdWf/EAyXVBU6liAU8edzJ+VUyzbTUIAJVHVzXtXNVewmRX6PvEEoIuKif84slsoQZNRt1ndV3fwWuwdSipPY7R9aJQ8KCpKhKnSMM6BtDD8y92VVN2f93kdg5vol+fuvlyN/3B8lVI6FIcis3z90HukPKfuHeMxZVTdTj2EM2wzr0lP3Ch1dGOo2621VN+9j+J7Fy9gtrwEm9snBJs8iYn/lxioinkf+qs+33HabdRGH0AhDMI7ziNhG+ubFY90/9LKqm27qQYzgl5n8WaRWHufqTaQv27pIaHt1xMtB3sbwMPSqn3jZZhwPM7DQ5/CbmUwSvq7qJtdJbXPzIfIt+589e4ZgBPYPweH1FwumzJweXVVorw/ptwldtHlGAhy5DxGxOuKJoScThmAk/cvJmwxd7fcPAd/WJrRdwoWCVwltX1V18zzTOIDjVFwQihCGYFR9KT9ltnbvZX9vAPAVGapCbZ6RTKc/Be9jQhdtnpEAR6jIIBQhDMEhXMRuY3aq126Mh0e1CW1vF1AV2msT2qoOQZn+6DbrsxKDUIQwBKPrX7IuMnVn/xB8QVXoM9eRNvnSZhoHMH8PEfHfpZwa9xhhCA6g26yvI+KPDF3ZPwR/1Sa0/TCTEwKz6Gd2Uw6CUB2CMryLiOf9+0nRhCE4kH7m5UOGruwfgl7JJ8h9Q+qvqehZYli424j4udusL0pdFvclYQgO6zzsH4Kc2oS2H/tDBxalf8F5l9DFheW4sDjvY3dX3qrbrO+mHsycCENwQPYPQT72Cn1Tm9D2JFSHYAk+xm6J/n91m/X5kpYE5yQMwYH163NTZm337B+idG1C24dY8N+ffuLlfUIXlyZb4CjtA9DP3Wb9vNusLxd0WuYofpp6AFCoy4g4i4gXif28rOqm7e8zgmLk2CtUwHr5txHx68C2++pQm200wBhuI+Ku/7oRfJ6utDA0tzWSj/0gznFJZ6rtRJ97H8N//duM4xhVt1nf9y9zOTZvr6q6ORthDXDKn8VS5Xx53obf3y9tn/DvriLt92+JByd8ptusb6q6eRcRzwd2cZZxOE+1jQJ+Fvwgz4nPbTP2dUw/57b9133s3mfv7f3Jo+q6buoxAAAAHJw9QwAAQJGEIQAAoEjCEAAAUCRhCAAAKJIwBAAAFEkYAgAAiiQMAQAARRKGAACAIglDAABAkYQhAACgSMIQAABQJGEIAAAokjAEAAAUSRgCAACKJAwBAABFEoYAAIAiCUMAAECRhCEAAKBIwhAAAFAkYQgAACiSMAQAABRJGAIAAIokDAEAAEUShgAAgCIJQwAAQJGEIQAAoEjCEAAAUCRhCAAAKJIwBAAAFEkYAgAAiiQMAQAARRKGAACAIglDAABAkYQhAACgSMIQAABQJGEIAAAokjAEAAAUSRgCAACKJAwBAABFEoYAAIAiCUMAAECRhCEAAKBIwhAAAFAkYQgAACiSMAQAABRJGAIAAIokDAEAAEUShgAAgCIJQwAAQJGEIQAAoEjCEAAAUCRhCAAAKJIwBAAAFEkYAgAAivT/tqNfP0iEke0AAAAASUVORK5CYII=";
function b64ToBytes(b64){if(!b64)return null;try{const bin=atob(b64);const a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);return a;}catch(e){return null;}}
function dlPdf(bytes,name){const blob=new Blob([bytes],{type:'application/pdf'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(url);a.remove();},1500);}
function formRec(){const rec={};for(const k in form)rec[k]=form[k].value;return rec;}
async function genCoverLetter(){if(!(window.RCSGen&&window.PDFLib)){setStatus('Generator still loading \u2014 try again in a moment.');return;}try{setStatus('Generating cover letter\u2026');const bytes=await window.RCSGen.coverLetter(formRec(),b64ToBytes(LOGO_B64));dlPdf(bytes,(get('property.name')||'Property')+' \u2014 Cover Letter.pdf');setStatus('Cover letter downloaded.');}catch(e){setStatus('Generation failed: '+((e&&e.message)||e));}}
function dataUrlToBytes(u){try{const i=String(u||'').indexOf(',');if(i<0)return null;return b64ToBytes(u.slice(i+1));}catch(e){return null;}}
async function combinePdfs(list){const {PDFDocument}=window.PDFLib;const out=await PDFDocument.create();for(const b of list){if(!b)continue;const src=await PDFDocument.load(b);const pages=await out.copyPages(src,src.getPageIndices());pages.forEach(p=>out.addPage(p));}return await out.save();}
function showPackageModal(nm,docs,combined){
  const rows=docs.map((d,i)=>'<button class="btn sm" data-dldoc="'+i+'" style="justify-content:flex-start">'+esc(d.label)+'</button>').join('');
  modal('<div class="dlg-t">Package generated</div><div class="dlg-b">'+esc(nm)+' - '+docs.length+' documents. Download the combined file, or any individual document.</div><div style="display:flex;flex-direction:column;gap:7px;margin-top:14px"><button class="btn p" id="dlCombined">Combined package (PDF)</button>'+rows+'</div><div class="dlg-row"><span class="dlg-sp"></span><button class="btn" id="dlgCancel">Close</button></div>');
  el('dlgCancel').onclick=closeModal;
  const cbn=el('dlCombined');if(cbn)cbn.onclick=()=>dlPdf(combined,nm+' - RCS Package.pdf');
  document.querySelectorAll('[data-dldoc]').forEach(b=>b.onclick=()=>{const d=docs[+b.getAttribute('data-dldoc')];dlPdf(d.bytes,d.file+'.pdf');});
}
async function genPackage(){
  if(!(window.RCSGen&&window.PDFLib)){setStatus('Generator still loading - try again in a moment.');return;}
  const T=window.RCSTemplates||{};
  try{ setStatus('Generating package...'); const rec=formRec(); const logo=b64ToBytes(LOGO_B64);
    let lh=null; try{ const L=(mpdb&&activePid)?mpdb.getLetterhead(activePid):null; if(L&&L.thumb)lh=dataUrlToBytes(L.thumb); }catch(e){}
    const N=get('property.name')||'Property'; const docs=[];
    docs.push({label:'Cover letter (CA)',file:'01. '+N+' - Cover Letter',bytes:await window.RCSGen.coverLetter(rec,logo)});
    docs.push({label:'Owner cover letter',file:'02. '+N+' - RCS Owner Cover Letter',bytes:await window.RCSGen.ownerLetter(rec)});
    if(T.checklist)docs.push({label:"Owner's checklist",file:"03. "+N+" - RCS Owner's Checklist",bytes:await window.RCSGen.fillChecklist(b64ToBytes(T.checklist),rec)});
    if(T.rentSchedule)docs.push({label:'Draft rent schedule',file:'05. '+N+' - Draft Rent Schedule',bytes:await window.RCSGen.fillRentSchedule(b64ToBytes(T.rentSchedule),rec)});
    docs.push({label:'Tenant notice',file:N+' - RCS Tenant Notice',bytes:await window.RCSGen.tenantNotice(rec,lh)});
    const combined=await combinePdfs(docs.map(d=>d.bytes));
    showPackageModal(get('property.name')||'Property',docs,combined);
    setStatus('Package generated - '+docs.length+' documents.');
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
function renderContacts(){const list=mpdb.listContacts();
  const rows=list.map(c=>'<div class="crow2"><div class="cc-main"><div class="cc-name">'+esc(c.name||'(unnamed)')+'</div><div class="cc-sub">'+esc(c.email||'—')+'  ·  '+esc(c.phone?fmtPhone(c.phone):'—')+'</div></div><button class="txtbtn" data-ced="'+c.id+'">Edit</button><span class="dotsep">·</span><button class="txtbtn del" data-cdel="'+c.id+'">Delete</button></div>').join('');
  el('contactsBody').innerHTML='<div class="lhead" style="display:block"><div class="lh-name">PM Contacts</div><div class="lh-meta">Shared across all properties. Choosing a contact on a property auto-fills the point-of-contact email &amp; phone.</div></div><div class="lsec"><div class="lsec-t">Contacts</div>'+(rows||'<div class="mempty" style="padding:20px">No contacts yet.</div>')+'<div class="addrow" id="cAdd">+ Add contact</div></div>';
  const a=el('cAdd');if(a)a.onclick=()=>contactDialog(null);
  document.querySelectorAll('[data-ced]').forEach(b=>b.onclick=()=>contactDialog(mpdb.listContacts().find(x=>x.id===b.getAttribute('data-ced'))));
  document.querySelectorAll('[data-cdel]').forEach(b=>b.onclick=()=>{const id=b.getAttribute('data-cdel');const c=mpdb.listContacts().find(x=>x.id===id);dialogConfirm('Delete contact','Remove <b>'+esc(c?c.name:'this contact')+'</b> from PM contacts?','Delete',true,async()=>{await mpdb.deleteContact(id);renderContacts();});});}
function contactDialog(c){c=c||{};
  modal('<div class="dlg-t">'+(c.id?'Edit contact':'Add contact')+'</div><div class="dlg-field"><label>Name</label><input id="ccN" value="'+esc(c.name||'')+'" autocomplete="off"></div><div class="dlg-field"><label>Email</label><input id="ccE" value="'+esc(c.email||'')+'" autocomplete="off"></div><div class="dlg-field"><label>Phone</label><input id="ccP" value="'+esc(c.phone?fmtPhone(c.phone):'')+'" autocomplete="off"></div><div class="dlg-row"><button class="btn" id="dlgCancel">Cancel</button><span class="dlg-sp"></span><button class="btn p" id="dlgOk">Save</button></div>');
  { const pp=el('ccP'); if(pp){ pp.value=fmtPhone(pp.value||''); if(pp.addEventListener) pp.addEventListener('input',()=>{ pp.value=fmtPhone(pp.value); }); } }
  ['ccN','ccE','ccP'].forEach(id=>{const ff=el(id);if(ff&&ff.addEventListener)ff.addEventListener('keydown',ev=>{if(ev.key!=='Enter')return;ev.preventDefault();const d=(el('ccP').value||'').replace(/\D/g,'');if(d.length===0||d.length===10)el('dlgOk').click();});});
  el('dlgCancel').onclick=closeModal;
  el('dlgOk').onclick=async()=>{const patch={name:(el('ccN').value||'').trim(),email:(el('ccE').value||'').trim(),phone:(el('ccP').value||'').trim()};closeModal();if(c.id)await mpdb.updateContact(c.id,patch);else await mpdb.addContact(patch);renderContacts();};}
if(typeof module!=='undefined')module.exports={fmtPhone,fmtDate,sMoney,sPct,sK,analysis,uaResolvedOf,uaConflict,uaUnresolved,renderMenu,renderLauncher,openMenu,openForm,openLauncher,ringSvg,niceDate,isDirty,overrideCount,isStateKey,attnFlags,pbUtil,clearUncheckedWriteins,srcOf:(k)=>srcOf(k),__openForm:(pid)=>{activePid=pid;return openForm('RCS');},__edit:(k,v)=>{form=store.editForm(form,k,v);},getVal:(k)=>get(k),modeOf:(kk)=>modeOf(kk),fieldKeys:(k)=>fieldKeys(k),keysCanSave:(ks)=>keysCanSave(ks),keysCanRevert:(ks)=>keysCanRevert(ks),keysNewDirty:(ks)=>keysNewDirty(ks),__revert:(k)=>store.revertForm(form,k),coupledKeys:(k)=>coupledKeys(k),__firstPid:()=>{const ps=mpdb?mpdb.listProperties():[];return ps.length?ps[0].id:null;},__boxes:(i)=>({ua:uaBox(i),safmr:safmrBox(i)}),__saveField:async(k)=>{form=await store.saveField(form,k);},__set:(f,u)=>{form=f;UNITS=u;}};
