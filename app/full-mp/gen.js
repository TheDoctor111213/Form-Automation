/* gen.js — RCS package generation. PURE: record -> PDF bytes. Browser: window.PDFLib. */
(function(){
  function PL(){ return (typeof window!=='undefined'&&window.PDFLib)?window.PDFLib:(typeof global!=='undefined'&&global.PDFLib)?global.PDFLib:null; }
  const MON=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const monthY=d=>{ if(!d) return ''; const p=String(d).slice(0,10).split('-'); return p.length===3?MON[+p[1]-1]+' '+(+p[2])+', '+p[0]:String(d); };
  const first=n=>String(n||'').trim().split(/\s+/)[0];
  const lastWord=n=>{const p=String(n||'').trim().split(/\s+/);return p[p.length-1]||'';};
  const salutationName=(name,prefix)=>{prefix=String(prefix||'').trim();return prefix?(prefix+' '+lastWord(name)):first(name);};
  const sigTitle=t=>{t=String(t||'').trim();if(!t)return '';if(/general partner/i.test(t))return t;t=t.replace(/\s+of\s+GP\b/i,'').trim();return t+' of General Partner';};

  function resolve(rec){
    const g=k=>rec[k]!=null?String(rec[k]):'';
    const mSrc=g('tenant.mgmt_source')||'property';
    const mm={street:'property.addr_street',city:'property.addr_city',state:'property.addr_state',zip:'property.addr_zip'};
    const m=w=> mSrc==='property'?g(mm[w]):g('tenant.mgmt_'+w);
    return {
      date:monthY(g('cycle.submission_date')||new Date().toISOString().slice(0,10)),
      notice_date:monthY(g('tenant.date_of_notice')||new Date().toISOString().slice(0,10)),
      sign_date:monthY(g('checklist.sign_date')||new Date().toISOString().slice(0,10)),
      property_name:g('property.name'), tenant_alias:g('tenant.property_alias'), section8:g('property.fha'), entity:g('owner.entity_name'),
      ca_name:g('ca.name'), ca_salutation:salutationName(g('ca.name'),g('ca.prefix')), ca_position:g('ca.position'), ca_company:g('ca.org'),
      ca_address:g('ca.addr_street'), ca_csz:(g('ca.addr_city')+', '+g('ca.addr_state')+' '+g('ca.addr_zip')).replace(/^,\s*/,'').trim(),
      pm_name:g('poc.name'), pm_phone:g('poc.phone'), pm_email:g('poc.email'),
      appr_name:g('appr.name'), appr_firm:g('appr.firm'), appr_phone:g('appr.phone'), appr_email:g('appr.email'),
      appr_addr:g('appr.addr_street'), appr_csz:(g('appr.addr_city')+', '+g('appr.addr_state')+' '+g('appr.addr_zip')).replace(/^,\s*/,'').trim(),
      mgmt_addr:m('street'), mgmt_city:m('city'), mgmt_state:m('state'), mgmt_zip:m('zip'),
      sender_name:g('tenant.sender_name'), sender_title:g('tenant.sender_title'),
      sig_name:g('sig.name'), sig_title:sigTitle(g('sig.title')),
    };
  }

  /* ---- letter layout engine (Times, 1in margins, justified) ---- */
  function makeLetter(doc,R,B,I){
    const W=612,H=792,M=72,bottom=64,ink=PL().rgb(0.11,0.13,0.17),grey=PL().rgb(0.42,0.46,0.53);
    const st={doc,page:doc.addPage([W,H]),y:H-72,W,H,M,bottom,R,B,I,ink,grey};
    st.ensure=h=>{ if(st.y-h<bottom){ st.page=doc.addPage([W,H]); st.y=H-72; } };
    st.gap=h=>{ st.y-=h; };
    st.line=(t,o={})=>{ const f=o.font||R,s=o.size||11,x=o.x==null?M:o.x,c=o.color||ink; st.ensure(s*1.3); st.page.drawText(String(t),{x,y:st.y,size:s,font:f,color:c}); if(!o.stay) st.y-=(o.lead||s*1.32); };
    st.center=(t,o={})=>{ const f=o.font||R,s=o.size||11,c=o.color||ink; const w=f.widthOfTextAtSize(String(t),s); st.ensure(s*1.3); st.page.drawText(String(t),{x:(W-w)/2,y:st.y,size:s,font:f,color:c}); st.y-=(o.lead||s*1.32); };
    st.para=(t,o={})=>{ const f=o.font||R,s=o.size||11,lead=o.leading||s*1.32,al=o.align||'justify',iL=o.indentL||0,iR=o.indentR||0,c=o.color||ink,ga=o.gapAfter==null?s*0.7:o.gapAfter;
      const maxW=W-2*M-iL-iR,x0=M+iL,sp=f.widthOfTextAtSize(' ',s);
      const words=String(t).split(/\s+/).filter(Boolean); let lines=[],cur=[];
      for(const w of words){ const tt=[...cur,w].join(' '); if(f.widthOfTextAtSize(tt,s)>maxW&&cur.length){lines.push(cur);cur=[w];} else cur.push(w); } if(cur.length)lines.push(cur);
      lines.forEach((lw,idx)=>{ st.ensure(lead); const last=idx===lines.length-1; const str=lw.join(' ');
        if(al==='justify'&&!last&&lw.length>1){ const tw=f.widthOfTextAtSize(str,s); const extra=(maxW-tw)/(lw.length-1); let x=x0; lw.forEach(word=>{ st.page.drawText(word,{x,y:st.y,size:s,font:f,color:c}); x+=f.widthOfTextAtSize(word,s)+sp+extra; }); }
        else st.page.drawText(str,{x:x0,y:st.y,size:s,font:f,color:c});
        st.y-=lead; });
      st.y-=ga; return st.y; };
    st.numItem=(nStr,lead,extra=[],o={})=>{ const s=o.size||11,labelW=22; const yTop=st.y; st.page.drawText(nStr,{x:M,y:yTop,size:s,font:R,color:ink}); st.para(lead,{size:s,indentL:labelW,gapAfter:extra.length?2:s*0.55}); extra.forEach(l=>st.line(l,{x:M+labelW,size:s})); if(extra.length)st.gap(s*0.55); };
    return st;
  }

  async function coverLetter(rec, logoBytes){
    const { PDFDocument, StandardFonts } = PL(); const t=resolve(rec);
    const doc=await PDFDocument.create();
    const R=await doc.embedFont(StandardFonts.TimesRoman),B=await doc.embedFont(StandardFonts.TimesRomanBold),I=await doc.embedFont(StandardFonts.TimesRomanItalic);
    const st=makeLetter(doc,R,B,I);
    // logo centered
    if(logoBytes){ const png=await doc.embedPng(logoBytes); const w=132,h=w/(png.width/png.height); st.page.drawImage(png,{x:(612-w)/2,y:792-46-h,width:w,height:h}); st.y=792-46-h-40; } else st.y=792-120;
    st.line(t.date); st.gap(12);
    [t.ca_name,t.ca_position,t.ca_company,t.ca_address,t.ca_csz].filter(Boolean).forEach(l=>st.line(l)); st.gap(12);
    // Re block
    const tab=72+34; const yre=st.y; st.line('Re:',{stay:true}); st.line('5th Year Adjustment – Rent Comparability Study',{x:tab});
    st.line(t.property_name+' (the “Project”)',{x:tab}); st.line('Section 8 Number: '+t.section8,{x:tab}); st.gap(12);
    st.line('Dear '+t.ca_salutation+',',{}); st.gap(8);
    st.para('As outlined in the Renewal HAP contract for the above site, in Section 5b(2)(b) Contract rent adjustments:');
    st.para('“At the expiration of each 5-year period of the Renewal Contract term, the contract administrator shall compare existing contract rents with comparable market rents for the market area. At such anniversary of the Renewal Contract, the contract administrator shall make any adjustments in the monthly contract rents, as reasonably determined by the contract administrator in accordance with HUD requirements, necessary to set the contract rents for all unit sizes at comparable market rents. Such adjustment may result in a negative adjustment (decrease) or positive adjustment (increase) of the contract rents for one or more unit sizes.”');
    st.para('Should you have any questions regarding the rent adjustment request, please do not hesitate to contact '+t.pm_name+' at '+t.pm_phone+' or '+t.pm_email+'.',{gapAfter:20});
    st.line('Best Regards,'); st.gap(42); st.line(t.sig_name); st.line(t.sig_title);
    // footer
    const H=await doc.embedFont(StandardFonts.Helvetica), HB=await doc.embedFont(StandardFonts.HelveticaBold);
    const fBlue=PL().rgb(0.31,0.45,0.71), fGrey=PL().rgb(0.45,0.48,0.53), fs=8.5;
    const fb='RELATED AFFORDABLE', fr='  |  30 Hudson Yards, New York, NY 10001  |  212-801-1000  |  212-801-3731 (fax)  |  www.related.com';
    const wb=HB.widthOfTextAtSize(fb,fs), wr=H.widthOfTextAtSize(fr,fs), sx=(612-(wb+wr))/2;
    st.page.drawText(fb,{x:sx,y:42,size:fs,font:HB,color:fBlue});
    st.page.drawText(fr,{x:sx+wb,y:42,size:fs,font:H,color:fGrey});
    return await doc.save();
  }

  async function ownerLetter(rec){
    const { PDFDocument, StandardFonts } = PL(); const t=resolve(rec);
    const doc=await PDFDocument.create();
    const R=await doc.embedFont(StandardFonts.TimesRoman),B=await doc.embedFont(StandardFonts.TimesRomanBold),I=await doc.embedFont(StandardFonts.TimesRomanItalic);
    const st=makeLetter(doc,R,B,I); st.y=792-58;
    st.center((t.entity||'[Ownership Entity Name]').toUpperCase(),{font:B,size:12});
    st.center('30 Hudson Yards, 72nd Floor',{size:10}); st.center('New York, NY 10001',{size:10}); st.gap(16);
    st.line(t.date); st.gap(12);
    [t.ca_name,t.ca_position,t.ca_company,t.ca_address,t.ca_csz].filter(Boolean).forEach(l=>st.line(l)); st.gap(12);
    const tab=72+34; st.line('Re:',{stay:true}); st.line('5th Year Adjustment – Rent Comparability Study',{x:tab});
    st.line(t.property_name+' (the “Project”)',{x:tab}); st.line('Section 8 Number: '+t.section8,{x:tab}); st.gap(12);
    st.line('Dear '+t.ca_salutation+',',{}); st.gap(8);
    st.para('Enclosed please find the owner’s Rent Comparability Study (RCS) for the subject property. This RCS is being submitted, as required by HUD for the Section 8 HAP contract renewal.');
    st.para('This letter is also to certify to each of the following items, as required by the Section 8 Renewal Policy:',{gapAfter:8});
    st.numItem('1.','I have reviewed the content of the RCS and concluded that the RCS includes all material required by Chapter Nine and the Owner’s Checklist in Appendix 9-2-2.');
    st.numItem('2.','The RCS appraiser’s ('+t.appr_name+', '+t.appr_firm+') narratives and Rent Grid accurately describe the subject project and properly treat non-shelter services and their funding sources as required by Section 9-12 and Appendix 9-1-1.');
    st.numItem('3.','There is no family relationship or identity-of-interest between the principals of the subject’s Ownership or management agent entity and the principals that manage/own the projects used as comparables.');
    st.numItem('4.','I certify that: a) neither the selection of the RCS appraiser nor the RCS appraiser’s compensation was/is contingent upon the RCS appraiser reporting a predetermined rent nor direction in rent; and b) to the best of the Owner’s knowledge, the RCS appraiser meets Section 9-8.A.’s conditions regarding absence of financial, employment, and family relationships.');
    st.numItem('5.','I certify that the fee paid for the RCS is the only compensation the RCS appraiser will receive for the RCS work and there is no side agreement or other consideration.');
    st.numItem('6.','The following person is our point of contact for HUD/CA’s decision letter, or to address any questions that the HUD/CA staff may have on the RCS:');
    st.numItem('7.', t.pm_name, [t.pm_email, t.pm_phone].filter(Boolean));
    st.numItem('8.','HUD/CA may talk with the RCS appraiser directly and copy the RCS appraiser on written materials. The RCS appraiser’s contact information is provided below:', [t.appr_name,t.appr_addr,t.appr_csz,t.appr_email,t.appr_phone].filter(Boolean));
    st.numItem('9.','I certify that if I discontinue any service to tenants at this property which forms the basis of a rent adjustment in this RCS, I will inform HUD in writing within 30 days of the termination of that service.');
    st.numItem('10.','I, the undersigned, certify under penalty of perjury that the information provided above is true and correct. WARNING: Anyone who knowingly submits a false claim or makes a false statement is subject to criminal and/or civil penalties, including confinement for up to 5 years, fines, and civil and administrative penalties. (18 U.S.C. §§ 287, 1001, 1010, 1012; 31 U.S.C. §3729, 3802).');
    st.gap(6);
    st.para('I certify that the above is all true. Please send all final decision correspondence to the undersigned, rather than the appraiser.',{gapAfter:16});
    st.line('Respectfully Submitted,'); st.gap(42); st.line(t.sig_name); st.line(t.sig_title);
    return await doc.save();
  }

  async function fillChecklist(templateBytes, rec){
    const { PDFDocument, StandardFonts, TextAlignment } = PL(); const t=resolve(rec);
    const doc=await PDFDocument.load(templateBytes,{parseSpeed:Infinity}); const form=doc.getForm();
    const times=await doc.embedFont(StandardFonts.TimesRoman), timesB=await doc.embedFont(StandardFonts.TimesRomanBold);
    try{ const pn=form.getTextField('Property Name'); pn.setText(t.property_name); pn.setAlignment(TextAlignment.Center); pn.setFontSize(18); pn.updateAppearances(timesB); }catch(e){}
    try{ const d=form.getTextField('Date'); d.setText(t.sign_date); d.setFontSize(12); d.updateAppearances(times); }catch(e){}
    for(let i=0;i<17;i++){ try{ const cb=form.getCheckBox('Check Box'+(i+1)); if(String(rec['check.'+i]||'')==='1')cb.check(); else cb.uncheck(); }catch(e){} }
    try{ const pg=doc.getPages()[0]; const {rgb}=PL(); pg.drawRectangle({x:107,y:123,width:156,height:22,color:rgb(1,1,1)}); const sline=(t.sig_name+', '+t.sig_title).replace(/, $/,''); if(sline)pg.drawText(sline,{x:109,y:129,size:11,font:times,color:rgb(0.11,0.13,0.17)}); }catch(e){}
    return await doc.save();
  }


  function rentTable(st, rec){
    const rgb=PL().rgb; const R=st.R,B=st.B;
    const heads=['Type','Units','Current Rent','Requested Rent'];
    const cw=[80,58,116,126], tw=cw.reduce((a,b)=>a+b,0), rh=22, x0=(st.W-tw)/2;
    const money=n=>'$'+Math.round(Number(n)||0).toLocaleString('en-US'); const nm=v=>parseFloat(String(v||'').replace(/[^0-9.\-]/g,''))||0;
    const ftype=br=>String(br||'').replace(/(\d+)\s*BR/i,'$1 BR');
    const idx=[...new Set(Object.keys(rec).map(k=>(k.match(/^units\.(\d+)\./)||[])[1]).filter(x=>x!=null))].sort((a,b)=>a-b);
    const rows=idx.map(i=>{const n=nm(rec['units.'+i+'.num_units']),c=nm(rec['units.'+i+'.current']),p=nm(rec['units.'+i+'.proposed']); return [ftype(rec['units.'+i+'.br']), String(n||''), money(c), money(p)];}).filter(r=>r[0].trim()||r[1]);
    const navy=rgb(0.118,0.227,0.373), white=rgb(1,1,1), line=rgb(0.72,0.75,0.80);
    st.ensure(rh*(rows.length+1)+10);
    const row=(vals,hd,y)=>{let x=x0; vals.forEach((v,ci)=>{ st.page.drawRectangle({x,y:y-rh,width:cw[ci],height:rh,borderColor:line,borderWidth:0.6, color: hd?navy:undefined}); const f=hd?B:R,col=hd?white:st.ink,ss=10.5,w=f.widthOfTextAtSize(String(v),ss); st.page.drawText(String(v),{x:x+(cw[ci]-w)/2,y:y-rh+7,size:ss,font:f,color:col}); x+=cw[ci]; }); };
    let y=st.y; row(heads,true,y); y-=rh; rows.forEach(r=>{row(r,false,y);y-=rh;}); st.y=y-8;
  }
  async function tenantNotice(rec, letterheadBytes){
    const { PDFDocument, StandardFonts } = PL(); const t=resolve(rec); const nm=t.tenant_alias||t.property_name;
    const doc=await PDFDocument.create();
    const R=await doc.embedFont(StandardFonts.TimesRoman),B=await doc.embedFont(StandardFonts.TimesRomanBold),I=await doc.embedFont(StandardFonts.TimesRomanItalic);
    const st=makeLetter(doc,R,B,I); st.y=792-58;
    let placed=false;
    if(letterheadBytes){ try{ const img=await doc.embedPng(letterheadBytes); const w=168,h=w/(img.width/img.height); st.page.drawImage(img,{x:(612-w)/2,y:792-42-h,width:w,height:h}); st.y=792-42-h-24; placed=true; }catch(e){} }
    if(!placed){ st.center(nm,{font:B,size:14}); const a=[t.mgmt_addr,[t.mgmt_city,t.mgmt_state].filter(Boolean).join(', ')+' '+t.mgmt_zip].filter(x=>x&&x.trim()).join(' · '); if(a.trim())st.center(a,{size:9.5,color:st.grey}); st.gap(16); }
    st.line('Date of Notice: '+t.notice_date); st.gap(8);
    st.para('Notice to Residents of Intention to submit a request to '+t.ca_company+' for approval of increase in maximum permissible rents.');
    st.para('Take notice that on '+t.notice_date+' we plan to submit a request for approval of increase in maximum permissible rents for '+nm+' to '+t.ca_company+'.',{gapAfter:0});
    st.para('It is important to note that as long as you continue to be eligible under the applicable HUD guidelines for Section 8, your Total Tenant Payment will generally continue to be 30% of your adjusted income. It is also important to note that this rent increase only affects residents who receive subsidy under '+nm+'’s Housing Assistance Payments contract.',{font:B});
    st.para('The proposed increase is needed for the following reasons: Fifth-Year Rent Comparability Study Adjustment. The rent increases for which we have requested approval are:',{gapAfter:7});
    rentTable(st, rec); st.gap(17);
    st.para('A copy of the materials that we are submitting to '+t.ca_company+' in support of our request will be available during normal business hours at the Management Office, '+t.mgmt_addr+', '+t.mgmt_city+', '+t.mgmt_state+' '+t.mgmt_zip+', for a period of 30 days from the date of service of this notice for inspection and copying by tenants and, if tenants wish by legal or other representatives acting for them solely or as a group.');
    st.para('During a period of 30 days from the date of service, tenants of '+nm+' may submit written comments on the proposed increase to us at the Office, '+t.mgmt_addr+', '+t.mgmt_city+', '+t.mgmt_state+' '+t.mgmt_zip+'. Tenant representatives may assist tenants in preparing those comments. (If at '+t.ca_company+'’s request or otherwise, we make any material change during the comment period in the materials available for inspection or copying, we will notify the tenants of the change and the tenants will have a period of 15 days from the date of additional notice (or the remainder of any applicable period, if longer) to inspect and copy the materials as changed and to submit comments on the proposed rent increase.) The comments will be transmitted to '+t.ca_company+', along with our evaluation of them and our request for the increase.');
    st.para(t.ca_company+' will approve, adjust upward or downward, or disapprove the proposed increase upon reviewing the request and comments. When '+t.ca_company+' advises us in writing of its decision on our request, you will be notified. If the request is approved, any allowable increase will be put into effect only after a period of at least 30 days from the date you are served with that notice and in accordance with the term of the existing lease.',{gapAfter:34});
    st.line(t.sender_name); st.line(t.sender_title||'Community Manager');
    return await doc.save();
  }


  async function fillRentSchedule(templateBytes, rec){
    const { PDFDocument, StandardFonts } = PL();
    const doc=await PDFDocument.load(templateBytes,{parseSpeed:Infinity}); const form=doc.getForm();
    const font=await doc.embedFont(StandardFonts.Helvetica);
    const g=k=>rec[k]!=null?String(rec[k]):'';
    const nmv=v=>parseFloat(String(v||'').replace(/[^0-9.\-]/g,''))||0;
    const money=v=>Math.round(nmv(v)).toLocaleString('en-US');
    const dfmt=d=>{const p=String(d||'').slice(0,10).split('-');return p.length===3?p[1]+'/'+p[2]+'/'+p[0]:'';};
    const _toISO=s=>{s=String(s||'').trim();let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);if(m)return m[1]+'-'+String(m[2]).padStart(2,'0')+'-'+String(m[3]).padStart(2,'0');m=s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);if(m)return m[3]+'-'+String(m[1]).padStart(2,'0')+'-'+String(m[2]).padStart(2,'0');return s;};
    const T=(n,v)=>{ try{ const f=form.getTextField(String(n)); f.setText(String(v==null?'':v)); f.setFontSize(9); f.updateAppearances(font);}catch(e){} };
    const C=n=>{ try{ form.getCheckBox(String(n)).check(); }catch(e){} };
    const _de=(g('rent_schedule.date_eff_source')==='custom'?g('rent_schedule.date_eff_custom'):(g('rent_schedule.date_eff_rs')||g('rent_schedule.date_rents_effective')));
    const _dei=_toISO(_de);
    T(1,g('property.name')); T(2,g('property.fha')); T(3,dfmt(_dei));
    { const rp=String(_dei).slice(0,10).split('-'); if(rp.length===3){ T(4,rp[1]); T(5,rp[2]); T(6,rp[0]); } }
    const utype=(br,ba)=>{const b=String(br||'').replace(/(\d+)\s*BR/i,'$1 BR').replace(/^\s*\/?\s*$/,'').trim();const a=String(ba||'').replace(/(\d+(?:\.\d+)?)\s*BA/i,'$1 BA').trim();return (b&&a)?(b+' / '+a):(b||a);};
    const idx=[...new Set(Object.keys(rec).map(k=>(k.match(/^units\.(\d+)\./)||[])[1]).filter(x=>x!=null))].sort((a,b)=>a-b);
    let tu=0,tc=0,r=0;
    idx.forEach(i=>{ if(r>10)return; const br=g('units.'+i+'.br'),ba=g('units.'+i+'.ba'),n=nmv(g('units.'+i+'.num_units')),pro=nmv(g('units.'+i+'.proposed'));
      const us=g('units.'+i+'.ua_source')||'exec'; const ua=us==='rcs'?nmv(g('units.'+i+'.ua_rcs')):(us==='custom'?nmv(g('units.'+i+'.ua_custom')):nmv(g('units.'+i+'.ua_exec')));
      if(!n&&!pro&&!(br||ba)) return; const base=7+r*8;
      T(base, utype(br,ba)); T(base+1,n||''); T(base+2,money(pro)); T(base+3,money(n*pro)); T(base+4,ua||''); T(base+5,money(pro+ua));
      tu+=n; tc+=n*pro; r++; });
    const liA=g('lihtc.enabled')==='1'?[...new Set(Object.keys(rec).map(k=>(k.match(/^lihtc\.(\d+)\./)||[])[1]).filter(x=>x!=null))].sort((a,b)=>a-b).filter(i=>g('lihtc.'+i+'.br')||g('lihtc.'+i+'.ba')||g('lihtc.'+i+'.avg_rent')):[];
    if(liA.length&&r<=9){ r++; liA.forEach(i=>{ if(r>10)return; const base=7+r*8; T(base, utype(g('lihtc.'+i+'.br'),g('lihtc.'+i+'.ba'))); const ln=nmv(g('lihtc.'+i+'.num_units')); if(ln)T(base+1,ln); const ar=g('lihtc.'+i+'.avg_rent'); if(ar!==''&&ar!=null)T(base+2,money(ar)); tu+=ln; r++; }); }
    const nrA=[...new Set(Object.keys(rec).map(k=>(k.match(/^nonrev\.(\d+)\./)||[])[1]).filter(x=>x!=null))].sort((a,b)=>a-b).filter(i=>g('nonrev.'+i+'.use')||g('nonrev.'+i+'.br')||g('nonrev.'+i+'.ba')||g('nonrev.'+i+'.rent'));
    if(nrA.length&&r<=9){ r++; nrA.forEach(i=>{ if(r>10)return; const base=7+r*8; T(base, g('nonrev.'+i+'.use')||utype(g('nonrev.'+i+'.br'),g('nonrev.'+i+'.ba'))); const nn=nmv(g('nonrev.'+i+'.num_units'))||1; T(base+1,nn); tu+=nn; r++; }); }
    T('94a',tu||''); T('95',money(tc)); T('96',money(tc*12));
    const eq=[99,100,101,102,103,104,105]; for(let k=0;k<7;k++) if(g('partb.equipment.'+k)==='1') C(eq[k]);
    const ut=[116,118,120,122,124], ff=[117,119,121,123,125];
    for(let k=0;k<5;k++){ if(g('partb.utilities.'+k)==='1') C(ut[k]); const fu=g('partb.fuel.'+k); if(fu) T(ff[k],fu); }
    if(g('partb.writein.u1')){ if(g('partb.writein.u1.on')==='1') C(126); T(127,g('partb.writein.u1')); const uf=g('partb.writein.u1.fuel'); if(uf) T(1125,uf); }
    const sv=[129,130,131,132,141,142]; for(let k=0;k<6;k++) if(g('partb.services.'+k)==='1') C(sv[k]);
    const eqSlots=[[106,107],[108,109],[110,111],[112,113],[114,115]];
    ['e1','e2','e3','e4','e5'].filter(id=>g('partb.writein.'+id)).forEach((id,ix)=>{ if(eqSlots[ix]){ if(g('partb.writein.'+id+'.on')==='1') C(eqSlots[ix][0]); T(eqSlots[ix][1],g('partb.writein.'+id)); } });
    const svSlots=[[133,134],[135,136],[137,138],[139,140],[143,144],[145,146]];
    ['s1','s2','s3','s4','s5','s6'].filter(id=>g('partb.writein.'+id)).forEach((id,ix)=>{ if(svSlots[ix]){ if(g('partb.writein.'+id+'.on')==='1') C(svSlots[ix][0]); T(svSlots[ix][1],g('partb.writein.'+id)); } });
    T(197,g('owner.entity_name'));
    const et={'Individual':198,'Corporation':199,'General Partnership':200,'Limited Partnership':201,'Joint Tenancy/Tenants in Common':202,'Trust':203};
    if(et[g('owner.entity_type')]) C(et[g('owner.entity_type')]);
    const nrIdx=[...new Set(Object.keys(rec).map(k=>(k.match(/^nonrev\.(\d+)\./)||[])[1]).filter(x=>x!=null))].sort((a,b)=>a-b);
    const dUse=[159,162,165,168,171],dType=[160,163,166,169,172],dRent=[161,164,167,170,173]; let dr=0,trl=0;
    nrIdx.forEach(i=>{ if(dr>4)return; const use=g('nonrev.'+i+'.use'),br=g('nonrev.'+i+'.br'),ba=g('nonrev.'+i+'.ba'),rent=g('nonrev.'+i+'.rent'); if(!(use||br||ba||rent))return; T(dUse[dr],use); T(dType[dr],(String(br).replace(/(\d+)\s*BR/i,'$1 BR')+(ba?'/'+ba:'')).replace(/^\//,'')); T(dRent[dr],(rent!==''&&rent!=null)?money(rent):''); trl+=nmv(rent); dr++; });
    T(174, dr?money(trl):'');
    // Part G principals: row 1 = GP entity (left) + "General Partner" (right); row 2 = signatory + title (left)
    if(g('owner.gp')){ T(206, g('owner.gp')); T(207, 'General Partner'); }
    if(g('sig.name')) T(208, (g('sig.name')+', '+sigTitle(g('sig.title'))).replace(/, $/,''));
    try{ form.getTextField('x12').setText(''); }catch(e){}
    T(228,(g('sig.name')+', '+sigTitle(g('sig.title'))).replace(/, $/,''));
    return await doc.save();
  }

  const API={resolve,coverLetter,ownerLetter,tenantNotice,fillChecklist,fillRentSchedule};
  if(typeof module!=='undefined') module.exports=API;
  if(typeof window!=='undefined') window.RCSGen=API;
})();
