/* core.js — six operations on keyed cells, via an async storage adapter.
   Save writes ALL keys (incl. empty) and records db_value, so clears/unchecks
   persist and later edits register as overrides. */
function makeStore(adapter, FIELDS) {
  const today = () => new Date().toISOString().slice(0, 10);
  const blank = () => ({ value:'', source:'new', saved_at:null, prior_value:null, prior_source:null, db_value:null });
  return {
    FIELDS,
    getDb: () => adapter.getDb(),
    clearDb: () => adapter.clearDb(),
    emptyForm(){ const f={}; for(const {key} of FIELDS) f[key]=blank(); return f; },
    async fillForm(){ const db=await adapter.getDb(); const f=this.emptyForm();
      for(const key of Object.keys(db)){ const r=db[key]; if(!r||r.value==null) continue;
        // A record saved blank keeps db_value:'' so a later entry reads as an
        // override (and revert restores the saved blank), not first-time data.
        if(r.value==='') f[key]={value:'',source:'new',saved_at:r.saved_at,prior_value:null,prior_source:null,db_value:''};
        else f[key]={value:r.value,source:'database',saved_at:r.saved_at,prior_value:null,prior_source:null,db_value:r.value}; }
      return f; },
    editForm(form,key,v){ if(!form[key]) form[key]=blank(); const cur=form[key], onFile=cur.db_value;
      if(onFile!=null && onFile!==''){ if(v===onFile) form[key]={...cur,value:v,source:'database',prior_value:null,prior_source:null};
        else form[key]={...cur,value:v,source:'overridden',prior_value:onFile,prior_source:'database'}; }
      else form[key]={...cur,value:v,source:'new',prior_value:null,prior_source:null}; return form; }, // entering into a blank field is new data, never an override
    revertForm(form,key){ const cur=form[key]; if(!cur||cur.source!=='overridden') return false;
      const v=cur.prior_value; // reverting to a saved blank shows as empty/new, not "on file"
      form[key]={...cur,value:v,source:(v==null||v==='')?'new':(cur.prior_source||'database'),prior_value:null,prior_source:null}; return true; },
    async saveField(form,key){ const db=await adapter.getDb(); const v=form[key].value; db[key]={value:(v==null?'':v),source:'database',saved_at:today()}; await adapter.saveDb(db); form[key]={value:db[key].value,source:db[key].value===''?'new':'database',saved_at:db[key].saved_at,prior_value:null,prior_source:null,db_value:db[key].value}; return form; },
    /* Batch form of saveField: one adapter round-trip (=> one backend push)
       for a group of keys saved together (contact fills, address groups). */
    async saveFields(form,keys){ const db=await adapter.getDb();
      for(const key of keys){ const v=form[key].value; db[key]={value:(v==null?'':v),source:'database',saved_at:today()}; }
      await adapter.saveDb(db);
      for(const key of keys) form[key]={value:db[key].value,source:db[key].value===''?'new':'database',saved_at:db[key].saved_at,prior_value:null,prior_source:null,db_value:db[key].value};
      return form; },
    async saveToDb(form){ const db=await adapter.getDb();
      for(const key of Object.keys(form)){ const v=form[key].value; db[key]={value:(v==null?'':v),source:'database',saved_at:today()}; }
      await adapter.saveDb(db);
      for(const key of Object.keys(form)) form[key]={value:db[key].value,source:db[key].value===''?'new':'database',saved_at:db[key].saved_at,prior_value:null,prior_source:null,db_value:db[key].value};
      return form; },
  };
}
if (typeof module !== 'undefined') module.exports = { makeStore };
