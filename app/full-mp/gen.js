/* gen.js — RCS package generation. PURE: record -> PDF bytes. Browser: window.PDFLib. */
(function(){
  function PL(){ return (typeof window!=='undefined'&&window.PDFLib)?window.PDFLib:(typeof global!=='undefined'&&global.PDFLib)?global.PDFLib:null; }
  const MON=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const monthY=d=>{ if(!d) return ''; const p=String(d).slice(0,10).split('-'); return p.length===3?MON[+p[1]-1]+' '+(+p[2])+', '+p[0]:String(d); };
  const first=n=>String(n||'').trim().split(/\s+/)[0];
  const lastWord=n=>{const p=String(n||'').trim().split(/\s+/);return p[p.length-1]||'';};
  const salutationName=(name,prefix)=>{prefix=String(prefix||'').trim();return prefix?(prefix+' '+lastWord(name)):first(name);};
  const sigTitle=(t,p)=>{t=String(t||'').trim();p=String(p||'').trim();if(t&&p)return t+' of the '+p;return t||p||'';};

  function resolve(rec){
    const g=k=>rec[k]!=null?String(rec[k]):'';
    const mSrc=g('tenant.mgmt_source')||'property';
    const mm={street:'property.addr_street',city:'property.addr_city',state:'property.addr_state',zip:'property.addr_zip'};
    const m=w=> mSrc==='property'?g(mm[w]):g('tenant.mgmt_'+w);
    return {
      date:monthY(g('cycle.submission_date')||new Date().toISOString().slice(0,10)),
      notice_date:monthY(g('tenant.date_of_notice')||new Date().toISOString().slice(0,10)),
      sign_date:monthY(g('checklist.sign_date')||new Date().toISOString().slice(0,10)),
      property_name:g('property.name'), tenant_alias:g('tenant.property_alias'), section8:g('property.s8'), entity:g('owner.entity_name'),
      ca_name:g('ca.name'), ca_salutation:salutationName(g('ca.name'),g('ca.prefix')), ca_position:g('ca.position'), ca_company:g('ca.org'),
      ca_address:g('ca.addr_street'), ca_csz:(g('ca.addr_city')+', '+g('ca.addr_state')+' '+g('ca.addr_zip')).replace(/^,\s*/,'').trim(),
      pm_name:g('poc.name'), pm_phone:g('poc.phone'), pm_email:g('poc.email'),
      appr_name:g('appr.name'), appr_firm:g('appr.firm'), appr_phone:g('appr.phone'), appr_email:g('appr.email'),
      appr_addr:g('appr.addr_street'), appr_csz:(g('appr.addr_city')+', '+g('appr.addr_state')+' '+g('appr.addr_zip')).replace(/^,\s*/,'').trim(),
      mgmt_addr:m('street'), mgmt_city:m('city'), mgmt_state:m('state'), mgmt_zip:m('zip'),
      sender_name:g('tenant.sender_name'), sender_title:g('tenant.sender_title'),
      sig_name:g('sig.name'), sig_title:sigTitle(g('sig.title'),g('sig.principal')),
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
    st.rich=(segs,o={})=>{ const s=o.size||11,lead=(o.leading||s*1.32)*(st.leadScale||1),al=o.align||'justify',c=o.color||ink,ga=(o.gapAfter==null?s*0.7:o.gapAfter)*(st.gaScale||1);
      const maxW=W-2*M; const sp=R.widthOfTextAtSize(' ',s); const words=[];
      segs.forEach(sg=>{ String(sg.text).split(/\s+/).filter(Boolean).forEach(w=>words.push({w,f:sg.font||R})); });
      let lines=[],cur=[],curW=0;
      for(const it of words){ const ww=it.f.widthOfTextAtSize(it.w,s); const need=cur.length?curW+sp+ww:ww;
        if(need>maxW&&cur.length){ lines.push({items:cur,w:curW}); cur=[it]; curW=ww; } else { cur.push(it); curW=need; } }
      if(cur.length)lines.push({items:cur,w:curW});
      lines.forEach((ln,idx)=>{ st.ensure(lead); const last=idx===lines.length-1;
        let extra=0; if(al==='justify'&&!last&&ln.items.length>1) extra=(maxW-ln.w)/(ln.items.length-1);
        let x=M; ln.items.forEach(it=>{ st.page.drawText(it.w,{x,y:st.y,size:s,font:it.f,color:c}); x+=it.f.widthOfTextAtSize(it.w,s)+sp+extra; });
        st.y-=lead; });
      st.y-=ga; };
    st.para=(t,o={})=>{ const f=o.font||R,s=o.size||11,lead=(o.leading||s*1.32)*(st.leadScale||1),al=o.align||'justify',iL=o.indentL||0,iR=o.indentR||0,c=o.color||ink,ga=(o.gapAfter==null?s*0.7:o.gapAfter)*(st.gaScale||1);
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
    return await doc.save({objectsPerTick:Infinity});
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
    return await doc.save({objectsPerTick:Infinity});
  }

  async function fillChecklist(templateBytes, rec){
    const { PDFDocument, StandardFonts, TextAlignment } = PL(); const t=resolve(rec);
    const doc=await PDFDocument.load(templateBytes,{parseSpeed:Infinity}); const form=doc.getForm();
    const times=await doc.embedFont(StandardFonts.TimesRoman), timesB=await doc.embedFont(StandardFonts.TimesRomanBold);
    try{ const pn=form.getTextField('Property Name'); pn.setText(t.property_name); pn.setAlignment(TextAlignment.Center); pn.setFontSize(18); pn.updateAppearances(timesB); }catch(e){}
    try{ const d=form.getTextField('Date'); d.setText(t.sign_date); d.setFontSize(12); d.updateAppearances(times); }catch(e){}
    for(let i=0;i<17;i++){ try{ const cb=form.getCheckBox('Check Box'+(i+1)); if(String(rec['check.'+i]||'')==='1')cb.check(); else cb.uncheck(); }catch(e){} }
    try{ const pg=doc.getPages()[0]; const {rgb}=PL(); pg.drawRectangle({x:107,y:123,width:156,height:22,color:rgb(1,1,1)}); const sline=(t.sig_name+', '+t.sig_title).replace(/, $/,''); if(sline)pg.drawText(sline,{x:109,y:129,size:11,font:times,color:rgb(0.11,0.13,0.17)}); }catch(e){}
    return await doc.save({objectsPerTick:Infinity});
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
  async function tenantNotice(rec, letterhead, logoBytes){
    const { PDFDocument, StandardFonts } = PL(); const t=resolve(rec); const nm=t.tenant_alias||t.property_name;
    // The notice must stay on ONE page. Font and table sizes never change,
    // and the text never climbs into the letterhead header: lh.drop (the
    // measured bottom of the header art, when available) fixes the start
    // line, and overflow is absorbed by trimming paragraph gaps, the
    // signature gap, and finally a hair of leading. The top drop shrinks
    // only for unmeasured (PDF) letterheads, and only as a last resort.
    const baseDrop=(letterhead&&letterhead.drop)?letterhead.drop:((letterhead&&letterhead.pdf)?180:150);
    const measured=!!(letterhead&&letterhead.drop);
    const LEVELS=[{ga:1,lead:1,sig:34,dd:0},{ga:0.8,lead:1,sig:24,dd:0},{ga:0.6,lead:1,sig:18,dd:0},{ga:0.45,lead:0.97,sig:14,dd:0},{ga:0.45,lead:0.95,sig:12,dd:10},{ga:0.4,lead:0.93,sig:10,dd:20}];
    let out=null;
    for(const L of LEVELS){
      const doc=await PDFDocument.create();
      const R=await doc.embedFont(StandardFonts.TimesRoman),B=await doc.embedFont(StandardFonts.TimesRomanBold),I=await doc.embedFont(StandardFonts.TimesRomanItalic);
      const st=makeLetter(doc,R,B,I); st.gaScale=L.ga; st.leadScale=L.lead; st.y=792-58; const drop=Math.max(96,baseDrop-(measured?0:L.dd));
      let placed=false;
      // Letterhead is an underlay: the first page prints ON it (continuation
      // pages stay plain, like feeding letterhead paper for page 1 only).
      const lh=letterhead&&(letterhead.pdf||letterhead.png)?letterhead:(letterhead?{png:letterhead}:null);
      if(lh&&lh.pdf){ try{ const srcDoc=await PDFDocument.load(lh.pdf,{parseSpeed:Infinity}); const [lp]=await doc.embedPdf(srcDoc); st.page.drawPage(lp,{x:0,y:0,width:612,height:792}); st.y=792-drop; placed=true; }catch(e){} }
      else if(lh&&lh.png){ try{ const img=await doc.embedPng(lh.png);
        if(img.height>=img.width){ st.page.drawImage(img,{x:0,y:0,width:612,height:792}); st.y=792-drop; placed=true; }
        else { const ar=img.width/img.height; let h=110,w=h*ar; const maxW=612-2*72; if(w>maxW){w=maxW;h=w/ar;}
          st.page.drawImage(img,{x:(612-w)/2,y:792-42-h,width:w,height:h}); st.y=792-42-h-24; placed=true; } }catch(e){} }
      if(!placed){ if(logoBytes){ try{ const png=await doc.embedPng(logoBytes); const w=132,h=w/(png.width/png.height); st.page.drawImage(png,{x:(612-w)/2,y:st.y-h,width:w,height:h}); st.y-=h+14; }catch(e){} }
        st.center(nm,{font:B,size:14}); const a=[t.mgmt_addr,[t.mgmt_city,t.mgmt_state].filter(Boolean).join(', ')+' '+t.mgmt_zip].filter(x=>x&&x.trim()).join(' · '); if(a.trim())st.center(a,{size:9.5,color:st.grey}); st.gap(16); }
      st.line('Date of Notice: '+t.notice_date); st.gap(8*L.ga);
      st.para('Notice to Residents of Intention to submit a request to '+t.ca_company+' for approval of increase in maximum permissible rents.');
      st.rich([
        {text:'Take notice that on '+t.notice_date+' we plan to submit a request for approval of increase in maximum permissible rents for '+nm+' to '+t.ca_company+'.'},
        {text:'It is important to note that as long as you continue to be eligible under the applicable HUD guidelines for Section 8, your Total Tenant Payment will generally continue to be 30% of your adjusted income. It is also important to note that this rent increase only affects residents who receive subsidy under '+nm+'’s Housing Assistance Payments contract.',font:B}]);
      st.para('The proposed increase is needed for the following reasons: Fifth-Year Rent Comparability Study Adjustment. The rent increases for which we have requested approval are:',{gapAfter:7});
      rentTable(st, rec); st.gap(17*L.ga);
      st.para('A copy of the materials that we are submitting to '+t.ca_company+' in support of our request will be available during normal business hours at the Management Office, '+t.mgmt_addr+', '+t.mgmt_city+', '+t.mgmt_state+' '+t.mgmt_zip+', for a period of 30 days from the date of service of this notice for inspection and copying by tenants and, if tenants wish by legal or other representatives acting for them solely or as a group.');
      st.para('During a period of 30 days from the date of service, tenants of '+nm+' may submit written comments on the proposed increase to us at the Office, '+t.mgmt_addr+', '+t.mgmt_city+', '+t.mgmt_state+' '+t.mgmt_zip+'. Tenant representatives may assist tenants in preparing those comments. (If at '+t.ca_company+'’s request or otherwise, we make any material change during the comment period in the materials available for inspection or copying, we will notify the tenants of the change and the tenants will have a period of 15 days from the date of additional notice (or the remainder of any applicable period, if longer) to inspect and copy the materials as changed and to submit comments on the proposed rent increase.) The comments will be transmitted to '+t.ca_company+', along with our evaluation of them and our request for the increase.');
      st.para(t.ca_company+' will approve, adjust upward or downward, or disapprove the proposed increase upon reviewing the request and comments. When '+t.ca_company+' advises us in writing of its decision on our request, you will be notified. If the request is approved, any allowable increase will be put into effect only after a period of at least 30 days from the date you are served with that notice and in accordance with the term of the existing lease.',{gapAfter:L.sig});
      st.line(t.sender_name); st.line(t.sender_title||'Community Manager');
      out=doc;
      if(doc.getPageCount()===1) break;
    }
    return await out.save({objectsPerTick:Infinity});
  }


  async function fillRentSchedule(templateBytes, rec){
    const { PDFDocument, StandardFonts, PDFName, rgb } = PL();
    const doc=await PDFDocument.load(templateBytes,{parseSpeed:Infinity}); const form=doc.getForm();
    const font=await doc.embedFont(StandardFonts.Helvetica);
    const g=k=>rec[k]!=null?String(rec[k]):'';
    const nmv=v=>parseFloat(String(v||'').replace(/[^0-9.\-]/g,''))||0;
    const money=v=>Math.round(nmv(v)).toLocaleString('en-US');
    const dfmt=d=>{const p=String(d||'').slice(0,10).split('-');return p.length===3?p[1]+'/'+p[2]+'/'+p[0]:'';};
    const _toISO=s=>{s=String(s||'').trim();let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);if(m)return m[1]+'-'+String(m[2]).padStart(2,'0')+'-'+String(m[3]).padStart(2,'0');m=s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);if(m)return m[3]+'-'+String(m[1]).padStart(2,'0')+'-'+String(m[2]).padStart(2,'0');return s;};
    const T=(n,v)=>{ try{ const f=form.getTextField(String(n)); f.setText(String(v==null?'':v)); f.setFontSize(9); f.updateAppearances(font);}catch(e){} };
    const C=n=>{ try{ form.getCheckBox(String(n)).check(); }catch(e){} };
    const _de=(g('rent_schedule.date_eff_source')==='custom'?(g('rent_schedule.date_eff_custom')||g('rent_schedule.date_eff_rs')||g('rent_schedule.date_rents_effective')):(g('rent_schedule.date_eff_rs')||g('rent_schedule.date_eff_custom')||g('rent_schedule.date_rents_effective')));
    const _dei=_toISO(_de);
    T(1,g('property.name')); T(2,g('property.fha')); T(3,dfmt(_dei));
    { const rp=String(_dei).slice(0,10).split('-'); if(rp.length===3){ T(4,rp[1]); T(5,rp[2]); T(6,rp[0]); } }
    const utype=(br,ba)=>{const b=String(br||'').replace(/(\d+)\s*BR/i,'$1 BR').replace(/^\s*\/?\s*$/,'').trim();const a=String(ba||'').replace(/(\d+(?:\.\d+)?)\s*BA/i,'$1 BA').trim();return (b&&a)?(b+' / '+a):(b||a);};
    // Part A layout: Section 8 rev rows, then a full-width "Non- Section 8
    // Rents" banner + the non-Section-8 rows, then a blank spacer row + the
    // non-revenue rows. Over 11 rows: drop the spacer first, then the
    // non-rev rows (they stay fully listed in Part D).
    const s8A=[...new Set(Object.keys(rec).map(k=>(k.match(/^units\.(\d+)\./)||[])[1]).filter(x=>x!=null))].sort((a,b)=>a-b)
      .filter(i=>nmv(g('units.'+i+'.num_units'))||nmv(g('units.'+i+'.proposed'))||g('units.'+i+'.br')||g('units.'+i+'.ba'));
    const liA=g('ns8.enabled')==='1'?[...new Set(Object.keys(rec).map(k=>(k.match(/^ns8\.(\d+)\./)||[])[1]).filter(x=>x!=null))].sort((a,b)=>a-b).filter(i=>g('ns8.'+i+'.br')||g('ns8.'+i+'.ba')||g('ns8.'+i+'.avg_rent')||nmv(g('ns8.'+i+'.num_units'))):[];
    const nrA=[...new Set(Object.keys(rec).map(k=>(k.match(/^nonrev\.(\d+)\./)||[])[1]).filter(x=>x!=null))].sort((a,b)=>a-b).filter(i=>g('nonrev.'+i+'.use')||g('nonrev.'+i+'.br')||g('nonrev.'+i+'.ba')||g('nonrev.'+i+'.rent')||nmv(g('nonrev.'+i+'.num_units')));
    const mkPlan=(blank,withNr)=>{ const p=[]; s8A.forEach(i=>p.push(['s8',i]));
      if(liA.length){ p.push(['banner']); liA.forEach(i=>p.push(['li',i])); }
      if(withNr&&nrA.length){ if(blank)p.push(['blank']); nrA.forEach(i=>p.push(['nr',i])); } return p; };
    let plan=mkPlan(true,true);
    if(plan.length>11)plan=mkPlan(false,true);
    if(plan.length>11)plan=mkPlan(false,false);
    if(plan.length>11)plan=plan.slice(0,11);
    let bannerRow=null;
    plan.forEach((row,r)=>{ const base=7+r*8;
      if(row[0]==='banner'){ bannerRow=r; return; }
      if(row[0]==='blank') return;
      const i=row[1];
      if(row[0]==='s8'){ const br=g('units.'+i+'.br'),ba=g('units.'+i+'.ba'),n=nmv(g('units.'+i+'.num_units')),pro=nmv(g('units.'+i+'.proposed'));
        const us=g('units.'+i+'.ua_source')||'exec'; const ua=us==='rcs'?nmv(g('units.'+i+'.ua_rcs')):(us==='custom'?nmv(g('units.'+i+'.ua_custom')):nmv(g('units.'+i+'.ua_exec')));
        T(base, utype(br,ba)); T(base+1,n||''); T(base+2,money(pro)); T(base+3,money(n*pro)); T(base+4,ua||''); T(base+5,money(pro+ua)); }
      else if(row[0]==='li'){ const n=nmv(g('ns8.'+i+'.num_units')),ar=g('ns8.'+i+'.avg_rent');
        T(base, utype(g('ns8.'+i+'.br'),g('ns8.'+i+'.ba'))); if(n)T(base+1,n);
        if(ar!==''&&ar!=null){ const rv=nmv(ar); T(base+2,money(rv)); T(base+3,money(n*rv)); T(base+5,money(rv)); } }
      else { const nn=nmv(g('nonrev.'+i+'.num_units'))||1; T(base, g('nonrev.'+i+'.use')||utype(g('nonrev.'+i+'.br'),g('nonrev.'+i+'.ba'))); T(base+1,nn); }
    });
    // Totals count every unit — non-S8 rents add into the contract rent
    // potential like S8 rows, and non-rev units count even when trimmed
    // from Part A for space.
    let tu=0,tc=0;
    s8A.forEach(i=>{ const n=nmv(g('units.'+i+'.num_units')); tu+=n; tc+=n*nmv(g('units.'+i+'.proposed')); });
    liA.forEach(i=>{ const n=nmv(g('ns8.'+i+'.num_units')); tu+=n; tc+=n*nmv(g('ns8.'+i+'.avg_rent')); });
    nrA.forEach(i=>{ tu+=nmv(g('nonrev.'+i+'.num_units'))||1; });
    T('94a',tu||''); T('95',money(tc)); T('96',money(tc*12));
    // Full-width banner: remove that row's fields (so no viewer redraws a "0"
    // over it), white out the row band, and print the centered bold label.
    if(bannerRow!=null){ try{
      const HB=await doc.embedFont(StandardFonts.HelveticaBold);
      const colRect=rr=>{ try{ return form.getTextField(String(7+rr*8)).acroField.getWidgets()[0].getRectangle(); }catch(e){ return null; } };
      let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9,pgRef=null;
      for(let k=0;k<8;k++){ try{ const f=form.getTextField(String(7+bannerRow*8+k)); const w=f.acroField.getWidgets()[0];
        const rc=w.getRectangle(); if(!pgRef)pgRef=w.P();
        x0=Math.min(x0,rc.x); x1=Math.max(x1,rc.x+rc.width); y0=Math.min(y0,rc.y); y1=Math.max(y1,rc.y+rc.height);
        try{ f.setText(''); f.updateAppearances(font); }catch(e){}
        form.removeField(f); }catch(e){} }
      if(x1>x0){ const pg=doc.getPages().find(p=>p.ref===pgRef)||doc.getPage(0);
        // Band spans the row cell fully: midway to the neighbor rows' widgets,
        // stopping short of the printed grid rules above and below.
        const ab=colRect(bannerRow-1), be=colRect(bannerRow+1);
        const bandTop=ab?((y1+ab.y)/2-0.5):(y1+1.5), bandBot=be?((y0+be.y+be.height)/2+0.5):(y0-1.5);
        pg.drawRectangle({x:x0-3,y:bandBot,width:(x1-x0)+6,height:bandTop-bandBot,color:rgb(1,1,1)});
        const lbl='Non- Section 8 Rents',fs=9.5,twd=HB.widthOfTextAtSize(lbl,fs);
        pg.drawText(lbl,{x:x0+((x1-x0)-twd)/2,y:(bandTop+bandBot)/2-fs*0.36,size:fs,font:HB}); } }catch(e){} }
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
    if(g('owner.entity_type')==='Other (specify)'){ C(204); T(205,g('owner.entity_type_other')); }
    const nrIdx=[...new Set(Object.keys(rec).map(k=>(k.match(/^nonrev\.(\d+)\./)||[])[1]).filter(x=>x!=null))].sort((a,b)=>a-b);
    const dUse=[159,162,165,168,171],dType=[160,163,166,169,172],dRent=[161,164,167,170,173]; let dr=0,trl=0;
    nrIdx.forEach(i=>{ if(dr>4)return; const use=g('nonrev.'+i+'.use'),br=g('nonrev.'+i+'.br'),ba=g('nonrev.'+i+'.ba'),rent=g('nonrev.'+i+'.rent'); if(!(use||br||ba||rent||nmv(g('nonrev.'+i+'.num_units'))))return; T(dUse[dr],use); T(dType[dr],(String(br).replace(/(\d+)\s*BR/i,'$1 BR')+(ba?'/'+ba:'')).replace(/^\//,'')); T(dRent[dr],(rent!==''&&rent!=null)?money(rent):''); trl+=nmv(rent); dr++; });
    T(174, dr?money(trl):'');
    // Part G: the principals roster fills the name (left) / title (right) rows in order
    { const gL=[206,208,210,212,214,216,218,220,222,224,226], gR=[207,209,211,213,215,217,219,221,223,225,227];
      const pIdx=[...new Set(Object.keys(rec).map(k=>(k.match(/^principals\.(\d+)\./)||[])[1]).filter(x=>x!=null))].sort((a,b)=>a-b);
      let pr=0; pIdx.forEach(i=>{ if(pr>=gL.length)return; const nm=g('principals.'+i+'.name'), tt=g('principals.'+i+'.title'); if(!(nm||tt))return; T(gL[pr],nm); T(gR[pr],tt); pr++; });
      if(!pr && g('owner.gp')){ T(206,g('owner.gp')); T(207,'General Partner'); } // no roster on file yet: the General Partner row
    }
    try{ form.getTextField('x12').setText(''); }catch(e){}
    T(228,(g('sig.name')+', '+sigTitle(g('sig.title'),g('sig.principal'))).replace(/, $/,''));
    try{ form.acroForm.dict.delete(PDFName.of('CO')); }catch(e){}
    form.getFields().forEach(f=>{ try{ f.acroField.dict.delete(PDFName.of('AA')); }catch(e){} });
    for(let q=7;q<=96;q++){ try{ const f=form.getTextField(String(q)); f.setFontSize(9); f.updateAppearances(font); }catch(e){} }
    try{ const f=form.getTextField('94a'); f.setFontSize(9); f.updateAppearances(font); }catch(e){}
    return await doc.save({objectsPerTick:Infinity});
  }


  /* ================= OCAF / UAF package documents =================
     Same principle as the RCS docs: clean, corrected documents of our own
     that CAs accept — computed from the cycle exactly as the form shows. */
  const nmv2=v=>parseFloat(String(v||'').replace(/[^0-9.\-]/g,''))||0;
  const m0=n=>'$'+Math.round(Number(n)||0).toLocaleString('en-US');
  const m2=n=>'$'+(Number(n)||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  const idxOf=(rec,pre)=>[...new Set(Object.keys(rec).map(k=>(k.match(new RegExp('^'+pre+'\\.(\\d+)\\.'))||[])[1]).filter(x=>x!=null))].sort((a,b)=>a-b);
  const utype2=(br,ba)=>{const b=String(br||'').replace(/(\d+)\s*BR/i,'$1 BR').trim();const a=String(ba||'').replace(/(\d+(?:\.\d+)?)\s*BA/i,'$1 BA').trim();return (b&&a)?(b+' / '+a):(b||a||'—');};
  const effOf=rec=>{const g=k=>rec[k]!=null?String(rec[k]):'';const de=(g('rent_schedule.date_eff_source')==='custom'?(g('rent_schedule.date_eff_custom')||g('rent_schedule.date_eff_rs')||g('rent_schedule.date_rents_effective')):(g('rent_schedule.date_eff_rs')||g('rent_schedule.date_eff_custom')||g('rent_schedule.date_rents_effective')));
    const s=String(de||'').trim();let m=s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);if(m)return monthY(m[3]+'-'+('0'+m[1]).slice(-2)+'-'+('0'+m[2]).slice(-2));return monthY(s);};
  const UAF_UTILS_G=[['oil','Oil'],['gas','Natural Gas'],['electric','Electric'],['water','Water / Sewer / Trash']];
  function ocafCalcRec(rec){
    const g=k=>rec[k]!=null?String(rec[k]):'';
    let e=0; const rows=[];
    idxOf(rec,'units').forEach(i=>{const n=nmv2(g('units.'+i+'.num_units')),c=nmv2(g('units.'+i+'.current'));
      if(n||c||g('units.'+i+'.br'))rows.push({br:g('units.'+i+'.br'),ba:g('units.'+i+'.ba'),n,c,pro:nmv2(g('units.'+i+'.proposed'))});e+=n*c;});
    const F=e*12,G=nmv2(g('ocaf.g'));
    let h=0; if(g('ns8.enabled')==='1')idxOf(rec,'ns8').forEach(i=>{h+=nmv2(g('ns8.'+i+'.num_units'))*nmv2(g('ns8.'+i+'.avg_rent'));});
    const H=h*12,I=F+G+H,J=I>0?F/I:0;
    const fl=/floating/i.test(g('ocaf.rate_type')||'Fixed rate');
    const t12=nmv2(g('ocaf.ds_t12')),f12=nmv2(g('ocaf.ds_f12'));
    const K=fl?((t12>0&&f12>0)?Math.min(t12,f12):(t12||f12)):nmv2(g('ocaf.ds_annual'));
    const L=J*K,M=F-L;
    const src=g('ocaf.factor_src')||(g('ocaf.factor_pub')?'fr':'custom');
    const pct=src==='custom'?nmv2(g('ocaf.factor_custom')):nmv2(g('ocaf.factor_pub'));
    const N=pct>0?1+pct/100:0,O=M*N,P=L+O,Q=P;
    const R=(F>0&&N>0)?Math.round(Q/F*1000)/1000:0;
    return {rows,e,F,G,H,I,J,K,L,M,pct,N,O,P,Q,R,fl,t12,f12,src,fy:g('ocaf.factor_fy'),pub:g('ocaf.factor_pubdate'),state:g('property.addr_state')};
  }
  function uafCalcRec(rec){
    const g=k=>rec[k]!=null?String(rec[k]):'';
    const rows=idxOf(rec,'units').map(i=>{
      const parts=UAF_UTILS_G.map(x=>{const cur=nmv2(g('units.'+i+'.uac_'+x[0]));const f=nmv2(g('uaf.f_'+x[0]));const raw=(cur>0&&f>0)?cur*f:0;return{u:x[0],label:x[1],cur,f,raw,rounded:raw?Math.round(raw):0};});
      const curSum=parts.reduce((s,p)=>s+p.cur,0),newSum=parts.reduce((s,p)=>s+p.rounded,0);
      return {i,br:g('units.'+i+'.br'),ba:g('units.'+i+'.ba'),n:nmv2(g('units.'+i+'.num_units')),parts,curSum,newSum};
    }).filter(r=>r.curSum>0);
    return {rows,dec:rows.filter(r=>r.newSum>0&&r.newSum<r.curSum),
      factors:UAF_UTILS_G.map(x=>({u:x[0],label:x[1],f:nmv2(g('uaf.f_'+x[0]))})).filter(x=>x.f>0),
      fy:g('uaf.factor_fy'),pub:g('uaf.factor_pubdate'),state:g('property.addr_state')};
  }
  function simpleTable(st,heads,rows,cw,opts){
    const rgb=PL().rgb;const o=opts||{};const R=st.R,B=st.B;const rh=o.rh||21,ss=o.size||10;
    const tw=cw.reduce((a,b)=>a+b,0),x0=(st.W-tw)/2;
    const navy=rgb(0.118,0.227,0.373),white=rgb(1,1,1),line=rgb(0.72,0.75,0.80);
    const draw=(vals,hd,y,bold)=>{let x=x0;vals.forEach((v,ci)=>{st.page.drawRectangle({x,y:y-rh,width:cw[ci],height:rh,borderColor:line,borderWidth:0.6,color:hd?navy:undefined});
      const f=(hd||bold)?B:R,col=hd?white:st.ink,w=f.widthOfTextAtSize(String(v),ss);
      st.page.drawText(String(v),{x:x+(cw[ci]-w)/2,y:y-rh+(rh-ss)/2+1.5,size:ss,font:f,color:col});x+=cw[ci];});};
    st.ensure(rh*2); let y=st.y; draw(heads,true,y); y-=rh;
    rows.forEach(r=>{ if(y-rh<st.bottom){st.page=st.doc.addPage([st.W,st.H]);y=st.H-72;draw(heads,true,y);y-=rh;} draw(r.cells||r,false,y,r.bold);y-=rh;});
    st.y=y-10;
  }
  function wsLine(st,code,label,val,opts){
    const o=opts||{};const s=10.5,lead=17;st.ensure(lead);
    const rgb=PL().rgb;const navy=rgb(0.118,0.227,0.373);
    st.page.drawText('('+code+')',{x:st.M,y:st.y,size:s,font:st.B,color:navy});
    st.page.drawText(String(label),{x:st.M+30,y:st.y,size:s,font:o.bold?st.B:st.R,color:st.ink});
    const v=String(val);const f=o.bold?st.B:st.R;const w=f.widthOfTextAtSize(v,s);
    st.page.drawText(v,{x:st.W-st.M-w,y:st.y,size:s,font:f,color:st.ink});
    st.y-=lead;
  }
  function sigBlock(st,t,label){
    st.gap(16);
    st.line(label||'Respectfully submitted,'); st.gap(34);
    const rgb=PL().rgb;const line=rgb(0.45,0.48,0.53);
    st.page.drawLine({start:{x:st.M,y:st.y+11},end:{x:st.M+230,y:st.y+11},thickness:0.7,color:line});
    st.line(t.sig_name||''); st.line(t.sig_title||''); st.gap(4);
    st.page.drawLine({start:{x:st.M,y:st.y+11},end:{x:st.M+120,y:st.y+11},thickness:0.7,color:line});
    st.line('Date',{color:st.grey,size:9.5});
  }
  async function ocafWorksheet(rec){
    const { PDFDocument, StandardFonts } = PL(); const t=resolve(rec); const C=ocafCalcRec(rec);
    const doc=await PDFDocument.create();
    const R=await doc.embedFont(StandardFonts.TimesRoman),B=await doc.embedFont(StandardFonts.TimesRomanBold),I=await doc.embedFont(StandardFonts.TimesRomanItalic);
    const st=makeLetter(doc,R,B,I); st.doc=doc; st.y=792-64;
    st.center('OCAF RENT ADJUSTMENT WORKSHEET',{font:B,size:14});
    st.center('Prepared per form HUD-9625 — Contract Renewals: Option One (Mark-Up-To-Market) / Option Two',{size:9,color:st.grey}); st.gap(10);
    st.line('Project: '+t.property_name,{font:B}); st.line('Section 8 Contract Number: '+t.section8);
    st.line('Rents effective: '+effOf(rec));
    st.line('Published OCAF: '+(C.pct?(C.pct+'%'+(C.fy?' (FY'+C.fy:'')+(C.state?' · '+C.state:'')+(C.fy?')':'')+(C.pub?' — published '+monthY(C.pub):'')):'—')); st.gap(10);
    st.line('Step 1 · Current annual Section 8 rent potential',{font:B,size:11}); st.gap(2);
    simpleTable(st,['Unit type','Units','Current rent','Monthly potential'],
      C.rows.filter(r=>r.n||r.c).map(r=>[utype2(r.br,r.ba),String(r.n||''),m0(r.c),m0(r.n*r.c)]).concat([{cells:['Total (E)','','',m0(C.e)],bold:true}]),[150,60,110,130]);
    st.line('Step 2 · Debt-service carve-out and OCAF application',{font:B,size:11}); st.gap(4);
    wsLine(st,'F','Annual expiring Section 8 contract rent potential (E × 12)',m0(C.F));
    wsLine(st,'G','Annual rent potential, non-expiring Section 8 contracts',m0(C.G));
    wsLine(st,'H','Annual rent potential, non-Section 8 units',m0(C.H));
    wsLine(st,'I','Total annual project rent potential (F + G + H)',m0(C.I));
    wsLine(st,'J','Expiring Section 8 share of the project (F ÷ I)',C.I>0?C.J.toFixed(4):'—');
    wsLine(st,'K','Total annual project debt service'+(C.fl?' (lesser of trailing-12 / forward-12)':' (P&I + MIP)'),m2(C.K));
    wsLine(st,'L','Section 8 share of debt service (J × K)',m2(C.L));
    wsLine(st,'M','Section 8 potential less debt-service share (F - L)',m2(C.M));
    wsLine(st,'N','Published OCAF adjustment factor','× '+(C.N>0?C.N.toFixed(3):'—'));
    wsLine(st,'O','Operating portion adjusted by OCAF (M × N)',m2(C.O));
    wsLine(st,'P','Adjusted contract rent potential (L + O)',m2(C.P));
    wsLine(st,'Q','Adjusted potential carried forward (line Q takes line P; RCS: N/A)',m2(C.Q),{bold:true});
    wsLine(st,'R','Contract rent increase factor (Q ÷ F, 3 decimals)',C.R>0?C.R.toFixed(3):'—',{bold:true});
    st.gap(8);
    st.line('Step 3 · Adjusted contract rents (current × R, rounded to whole dollars)',{font:B,size:11}); st.gap(2);
    simpleTable(st,['Unit type','Units','Current rent','Adjusted rent'],
      C.rows.filter(r=>r.c>0).map(r=>[utype2(r.br,r.ba),String(r.n||''),m0(r.c),m0(r.pro>0?r.pro:Math.round(r.c*C.R))]),[150,60,110,110]);
    st.para('Owner certification: I certify that the debt service and non-Section 8 rent potential figures used above are true and accurate, and that the adjusted contract rents were computed by applying the published Operating Cost Adjustment Factor in accordance with HUD requirements. WARNING: Anyone who knowingly submits a false claim or makes a false statement is subject to criminal and/or civil penalties (18 U.S.C. §§ 287, 1001; 31 U.S.C. § 3729).',{size:9,color:st.grey});
    sigBlock(st,t);
    return await doc.save({objectsPerTick:Infinity});
  }
  async function exhibitA(rec){
    const { PDFDocument, StandardFonts } = PL(); const t=resolve(rec); const C=ocafCalcRec(rec);
    const doc=await PDFDocument.create();
    const R=await doc.embedFont(StandardFonts.TimesRoman),B=await doc.embedFont(StandardFonts.TimesRomanBold),I=await doc.embedFont(StandardFonts.TimesRomanItalic);
    const st=makeLetter(doc,R,B,I); st.doc=doc; st.y=792-72;
    st.center('EXHIBIT A',{font:B,size:15}); st.gap(2);
    st.center('Identification of Contract Units by Bedroom Size and Applicable Contract Rents',{size:10.5,color:st.grey}); st.gap(14);
    st.line('Project: '+t.property_name,{font:B}); st.line('Section 8 Contract Number: '+t.section8);
    st.line('Contract rents effective: '+effOf(rec),{font:B}); st.gap(12);
    simpleTable(st,['Unit type','Contract units','Current contract rent','Adjusted contract rent'],
      C.rows.filter(r=>r.c>0||r.n).map(r=>[utype2(r.br,r.ba),String(r.n||''),m0(r.c),m0(r.pro>0?r.pro:(C.R>0?Math.round(r.c*C.R):r.c))]),[130,90,130,140]);
    st.gap(6);
    st.para('The adjusted contract rents shown above reflect the application of the published FY'+(C.fy||'—')+' Operating Cost Adjustment Factor'+(C.state?' for '+C.state:'')+' ('+(C.pct?C.pct+'%':'—')+'), applied per the accompanying OCAF Rent Adjustment Worksheet.',{size:10});
    sigBlock(st,t);
    return await doc.save({objectsPerTick:Infinity});
  }
  async function uafCert(rec){
    const { PDFDocument, StandardFonts } = PL(); const t=resolve(rec); const U=uafCalcRec(rec);
    const doc=await PDFDocument.create();
    const R=await doc.embedFont(StandardFonts.TimesRoman),B=await doc.embedFont(StandardFonts.TimesRomanBold),I=await doc.embedFont(StandardFonts.TimesRomanItalic);
    const st=makeLetter(doc,R,B,I); st.doc=doc; st.y=792-64;
    st.center('FACTOR-BASED UTILITY ALLOWANCE ANALYSIS',{font:B,size:13.5}); st.gap(1);
    st.center('Owner Certification and Per-Utility Breakdown',{size:10.5,color:st.grey}); st.gap(12);
    st.line('Project: '+t.property_name,{font:B}); st.line('Section 8 Contract Number: '+t.section8);
    st.line('Utility allowances effective: '+effOf(rec));
    st.line('Applied factors: FY'+(U.fy||'—')+' HUD Utility Allowance Factors'+(U.state?' — '+U.state:'')+(U.pub?' (file dated '+monthY(U.pub)+')':'')); st.gap(4);
    if(U.factors.length){ st.line(U.factors.map(f=>f.label+' × '+f.f).join('   ·   '),{size:9.5,color:st.grey}); st.gap(8); }
    st.line('Per-utility computation — each utility factored separately, rounded to whole dollars, then summed:',{size:10}); st.gap(4);
    const rows=[];
    U.rows.forEach(r=>{ r.parts.filter(p=>p.cur>0).forEach((p,pi)=>rows.push([pi===0?utype2(r.br,r.ba):'',p.label,m0(p.cur),p.f>0?('× '+p.f):'—',p.raw?m2(p.raw):'—',p.rounded?m0(p.rounded):'—']));
      rows.push({cells:['','Total — '+utype2(r.br,r.ba),m0(r.curSum),'','',m0(r.newSum)],bold:true}); });
    simpleTable(st,['Unit type','Utility','Current UA','Factor','Result','Rounded'],rows,[92,128,76,68,76,68],{size:9.5,rh:19});
    const anyDec=U.dec.length>0;
    st.para('The owner elects to accept the factor-based adjustment of utility allowances computed above, in lieu of submitting a utility analysis.',{size:10.5});
    if(anyDec) st.para('The adjustment decreases the utility allowance for '+U.dec.map(r=>utype2(r.br,r.ba)).join(', ')+'. The required 30-day notice to tenants under 24 CFR § 245.420 has been issued, and the owner’s certification of compliance with the tenant comment procedures accompanies this submission.',{size:10.5});
    st.para('Owner certification: I certify that the current utility allowances and their per-utility components shown above are true and accurate. WARNING: Anyone who knowingly submits a false claim or makes a false statement is subject to criminal and/or civil penalties (18 U.S.C. §§ 287, 1001; 31 U.S.C. § 3729).',{size:9,color:st.grey});
    sigBlock(st,t);
    return await doc.save({objectsPerTick:Infinity});
  }
  async function dsEvidence(rec){
    const { PDFDocument, StandardFonts } = PL(); const t=resolve(rec); const C=ocafCalcRec(rec);
    const doc=await PDFDocument.create();
    const R=await doc.embedFont(StandardFonts.TimesRoman),B=await doc.embedFont(StandardFonts.TimesRomanBold),I=await doc.embedFont(StandardFonts.TimesRomanItalic);
    const st=makeLetter(doc,R,B,I); st.doc=doc; st.y=792-72;
    st.center('ANNUAL DEBT SERVICE DETERMINATION — FLOATING RATE',{font:B,size:13}); st.gap(2);
    st.center('Trailing-12 vs. forward-12 comparison, anchored to the rent-effective date',{size:10,color:st.grey}); st.gap(14);
    st.line('Project: '+t.property_name,{font:B}); st.line('Section 8 Contract Number: '+t.section8);
    st.line('Rents effective: '+effOf(rec)); st.gap(10);
    simpleTable(st,['Measure','Annual debt service'],[
      ['Trailing 12 months (actual)',C.t12?m2(C.t12):'—'],
      ['Forward 12 months (SOFR forward curve)',C.f12?m2(C.f12):'—'],
      {cells:['Used on worksheet line (K) — the lesser',m2(C.K)],bold:true}],[280,170]);
    st.gap(4);
    st.para('The project’s mortgage carries a floating interest rate. Annual debt service for OCAF worksheet line (K) is determined as the lesser of (a) the trailing twelve months of actual debt service and (b) the forward twelve months projected from the SOFR forward curve (source: Chatham Financial), both anchored to the contract rent effective date shown above. Supporting rate-curve and amortization detail is retained and available on request.',{size:10});
    sigBlock(st,t,'Prepared and certified by,');
    return await doc.save({objectsPerTick:Infinity});
  }
  async function uaTenantNotice(rec, letterhead, logoBytes){
    const { PDFDocument, StandardFonts } = PL(); const t=resolve(rec); const U=uafCalcRec(rec); const nm=t.tenant_alias||t.property_name;
    const baseDrop=(letterhead&&letterhead.drop)?letterhead.drop:((letterhead&&letterhead.pdf)?180:150);
    const measured=!!(letterhead&&letterhead.drop);
    const LEVELS=[{ga:1,lead:1,sig:34,dd:0},{ga:0.8,lead:1,sig:24,dd:0},{ga:0.6,lead:1,sig:18,dd:0},{ga:0.45,lead:0.97,sig:14,dd:0},{ga:0.45,lead:0.95,sig:12,dd:10},{ga:0.4,lead:0.93,sig:10,dd:20}];
    let out=null;
    for(const L of LEVELS){
      const doc=await PDFDocument.create();
      const R=await doc.embedFont(StandardFonts.TimesRoman),B=await doc.embedFont(StandardFonts.TimesRomanBold),I=await doc.embedFont(StandardFonts.TimesRomanItalic);
      const st=makeLetter(doc,R,B,I); st.doc=doc; st.gaScale=L.ga; st.leadScale=L.lead; st.y=792-58; const drop=Math.max(96,baseDrop-(measured?0:L.dd));
      let placed=false;
      const lh=letterhead&&(letterhead.pdf||letterhead.png)?letterhead:(letterhead?{png:letterhead}:null);
      if(lh&&lh.pdf){ try{ const srcDoc=await PDFDocument.load(lh.pdf,{parseSpeed:Infinity}); const [lp]=await doc.embedPdf(srcDoc); st.page.drawPage(lp,{x:0,y:0,width:612,height:792}); st.y=792-drop; placed=true; }catch(e){} }
      else if(lh&&lh.png){ try{ const img=await doc.embedPng(lh.png);
        if(img.height>=img.width){ st.page.drawImage(img,{x:0,y:0,width:612,height:792}); st.y=792-drop; placed=true; }
        else { const ar=img.width/img.height; let h=110,w=h*ar; const maxW=612-2*72; if(w>maxW){w=maxW;h=w/ar;}
          st.page.drawImage(img,{x:(612-w)/2,y:792-42-h,width:w,height:h}); st.y=792-42-h-24; placed=true; } }catch(e){} }
      if(!placed){ if(logoBytes){ try{ const png=await doc.embedPng(logoBytes); const w=132,h=w/(png.width/png.height); st.page.drawImage(png,{x:(612-w)/2,y:st.y-h,width:w,height:h}); st.y-=h+14; }catch(e){} }
        st.center(nm,{font:B,size:14}); const a=[t.mgmt_addr,[t.mgmt_city,t.mgmt_state].filter(Boolean).join(', ')+' '+t.mgmt_zip].filter(x=>x&&x.trim()).join(' · '); if(a.trim())st.center(a,{size:9.5,color:st.grey}); st.gap(16); }
      st.line('Date of Notice: '+t.notice_date); st.gap(8*L.ga);
      st.para('Notice to Residents of Intention to submit a request to '+t.ca_company+' for approval of a decrease in utility allowances (24 CFR § 245.420).');
      st.rich([
        {text:'Take notice that on '+t.notice_date+' we plan to submit a request for approval of a decrease in utility allowances for '+nm+' to '+t.ca_company+'. The proposed change results from the annual factor-based utility allowance adjustment, applying HUD’s published FY'+(U.fy||'')+' Utility Allowance Factors to each utility.'},
        {text:'It is important to note that as long as you continue to be eligible under the applicable HUD guidelines for Section 8, your Total Tenant Payment will generally continue to be 30% of your adjusted income.',font:B}]);
      st.para('The present and proposed utility allowances are:',{gapAfter:7});
      simpleTable(st,['Unit type','Present allowance','Proposed allowance'],U.rows.map(r=>[utype2(r.br,r.ba),m0(r.curSum),m0(r.newSum)]),[120,140,140],{rh:20,size:10});
      st.gap(6*L.ga);
      st.para('A copy of the materials that we are submitting to '+t.ca_company+' in support of our request will be available during normal business hours at the Management Office, '+t.mgmt_addr+', '+t.mgmt_city+', '+t.mgmt_state+' '+t.mgmt_zip+', for a period of 30 days from the date of service of this notice for inspection and copying by tenants and, if tenants wish, by legal or other representatives acting for them solely or as a group.');
      st.para('During a period of 30 days from the date of service, tenants of '+nm+' may submit written comments on the proposed decrease to us at the Office, '+t.mgmt_addr+', '+t.mgmt_city+', '+t.mgmt_state+' '+t.mgmt_zip+'. Tenant representatives may assist tenants in preparing those comments. The comments will be transmitted to '+t.ca_company+', along with our evaluation of them and our request for the adjustment.');
      st.para(t.ca_company+' will approve, adjust, or disapprove the proposed change upon reviewing the request and comments. When '+t.ca_company+' advises us in writing of its decision, you will be notified.',{gapAfter:L.sig});
      st.line(t.sender_name); st.line(t.sender_title||'Community Manager');
      out=doc;
      if(doc.getPageCount()===1) break;
    }
    return await out.save({objectsPerTick:Infinity});
  }
  async function tenantCommentCert(rec){
    const { PDFDocument, StandardFonts } = PL(); const t=resolve(rec);
    const doc=await PDFDocument.create();
    const R=await doc.embedFont(StandardFonts.TimesRoman),B=await doc.embedFont(StandardFonts.TimesRomanBold),I=await doc.embedFont(StandardFonts.TimesRomanItalic);
    const st=makeLetter(doc,R,B,I); st.doc=doc; st.y=792-58;
    st.center((t.entity||'[Ownership Entity Name]').toUpperCase(),{font:B,size:12});
    st.center('30 Hudson Yards, 72nd Floor',{size:10}); st.center('New York, NY 10001',{size:10}); st.gap(16);
    st.line(t.date); st.gap(12);
    [t.ca_name,t.ca_position,t.ca_company,t.ca_address,t.ca_csz].filter(Boolean).forEach(l=>st.line(l)); st.gap(12);
    const tab=72+34; st.line('Re:',{stay:true}); st.line('Certification of Compliance with Tenant Comment Procedures',{x:tab});
    st.line(t.property_name+' (the “Project”)',{x:tab}); st.line('Section 8 Number: '+t.section8,{x:tab}); st.gap(12);
    st.line('Dear '+t.ca_salutation+',',{}); st.gap(8);
    st.para('In connection with the proposed adjustment of utility allowances for the Project, the undersigned owner certifies that it has complied with the tenant notification and comment procedures required by 24 CFR Part 245, Subpart B, including § 245.420:');
    st.numItem('1.','The required notice of the proposed decrease in utility allowances was served to the tenants of the Project on '+t.notice_date+', in the manner required by 24 CFR § 245.15.');
    st.numItem('2.','The materials submitted in support of the request were made available at the management office for inspection and copying by tenants and their representatives for a period of 30 days from the date of service of the notice.');
    st.numItem('3.','All tenant comments received during the comment period, if any, were considered and are transmitted with this submission together with the owner’s evaluation of them.');
    st.para('I, the undersigned, certify under penalty of perjury that the information provided above is true and correct. WARNING: Anyone who knowingly submits a false claim or makes a false statement is subject to criminal and/or civil penalties (18 U.S.C. §§ 287, 1001, 1010, 1012; 31 U.S.C. § 3729, 3802).',{size:9.5,color:st.grey});
    sigBlock(st,t);
    return await doc.save({objectsPerTick:Infinity});
  }

  const API={resolve,coverLetter,ownerLetter,tenantNotice,fillChecklist,fillRentSchedule,ocafWorksheet,exhibitA,uafCert,dsEvidence,uaTenantNotice,tenantCommentCert,ocafCalcRec,uafCalcRec};
  if(typeof module!=='undefined') module.exports=API;
  if(typeof window!=='undefined') window.RCSGen=API;
})();
