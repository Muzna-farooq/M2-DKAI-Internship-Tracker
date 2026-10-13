const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const crypto=require('node:crypto');
const html=fs.readFileSync(__dirname+'/../dist/index.html','utf8');
// DOM/event harness executes the shipped app; no browser preview is available.
function harness(existing) {
  const ids={},all=[],fields={},storage=existing||new Map();let rejectWrites=false,download=null;
  class Element {
    constructor(attrs={}){this.attrs=attrs;this.id=attrs.id||'';this.value='';this.hidden=Object.hasOwn(attrs,'hidden');this.textContent='';this.dataset={};this.events={};this.files=[];this._html='';this.open=false;this.classSet=new Set((attrs.class||'').split(' '));this.classList={toggle:(c,b)=>b?this.classSet.add(c):this.classSet.delete(c)};Object.entries(attrs).forEach(([k,v])=>{if(k.startsWith('data-'))this.dataset[k.slice(5)]=v;});}
    addEventListener(type,fn){(this.events[type]??=[]).push(fn);}
    async dispatch(type,target=this){const event={target,preventDefault(){}};for(const fn of this.events[type]||[])await fn(event);if(type==='click'&&this.onclick)this.onclick(event);}
    getAttribute(key){return this.attrs[key]??null;}
    setAttribute(key,value){this.attrs[key]=value;}
    set innerHTML(value){this._html=value;for(const match of value.matchAll(/<select\b([^>]*)>([\s\S]*?)<\/select>/g)){const attrs=parseAttrs(match[1]);if(attrs.name&&!fields[attrs.name]){const field=new Element(attrs);field.value=(match[2].match(/<option[^>]*>(.*?)<\/option>/)||[])[1]||'';fields[attrs.name]=field;}}if(this.attrs.tag==='select'){this.value=(value.match(/<option(?: value="([^"]*)")?[^>]*>(.*?)<\/option>/)||[])[1]||'';}}
    get innerHTML(){return this._html;}
    showModal(){this.open=true;}
    close(){this.open=false;}
    click(){if(this.attrs.tag==='a')download=this.download;return this.dispatch('click');}
    remove(){}
    closest(selector){const match=selector.match(/\[data-(.*?)\]/);return match&&Object.hasOwn(this.dataset,match[1])?this:null;}
  }
  function parseAttrs(raw){const attrs={};for(const m of raw.matchAll(/([\w-]+)(?:="([^"]*)")?/g))attrs[m[1]]=m[2]??'';return attrs;}
  for(const m of html.matchAll(/<(\w+)\b([^>]*?)>/g)){const attrs={...parseAttrs(m[2]),tag:m[1]};const el=new Element(attrs);all.push(el);if(attrs.id)ids[attrs.id]=el;if(attrs.name)fields[attrs.name]=el;}
  for(const id of ['fit-filter','status-filter','location-filter','area-filter','search'])ids[id].value='';ids.sort.value='fit';
  const form=ids['opportunity-form'];form.elements={namedItem:name=>fields[name]};form.reset=()=>Object.values(fields).forEach(f=>{f.value='';});form.reportValidity=()=>Boolean(fields.employer.value&&fields.title.value);
  const document={getElementById:id=>ids[id],querySelectorAll:selector=>all.filter(e=>selector==='[data-view]'?Object.hasOwn(e.dataset,'view'):selector.startsWith('.')?e.classSet.has(selector.slice(1)):false),createElement:tag=>new Element({tag}),body:{appendChild(){}}};
  const winEvents={};const window={crypto,addEventListener:(type,fn)=>{winEvents[type]=fn;}};
  const localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>{if(rejectWrites)throw Error('quota');storage.set(k,v);}};
  class FakeFormData{constructor(){this.data=Object.entries(fields).map(([k,f])=>[k,f.value]);} [Symbol.iterator](){return this.data[Symbol.iterator]();}}
  class TestURL extends URL{}TestURL.createObjectURL=()=> 'blob:test';TestURL.revokeObjectURL=()=>{};
  const context=vm.createContext({window,document,localStorage,URL:TestURL,FormData:FakeFormData,Blob,console,Date,Math,setTimeout:()=>0,clearTimeout(){}});
  for(const file of ['core.js','seed.js','app.js'])vm.runInContext(fs.readFileSync(__dirname+'/../dist/'+file,'utf8'),context,{filename:file});
  const saved=()=>JSON.parse(storage.get(window.TrackerCore.STORAGE_KEY)||'{"opportunities":[]}').opportunities;
  const target=data=>new Element(Object.fromEntries(Object.entries(data).map(([k,v])=>['data-'+k,v])));
  return {ids,fields,window,storage,saved,target,get download(){return download;},failWrites(){rejectWrites=true;}};
}
test('actual app handlers add, edit, filter, sort, summarize, and persist across reload',async()=>{
  const h=harness(),{ids,fields}=h;assert.equal(ids['nav-count'].textContent,12);assert.match(ids['metrics'].innerHTML,/Active applications/);
  await ids['add-btn'].dispatch('click');assert.equal(ids.editor.open,true);fields.employer.value='Test NLP Lab';fields.title.value='Efficient language models';fields.location.value='Lyon, France';fields.areas.value='NLP, Frugal AI';fields.fit.value='High';fields.deadline.value='2027-02-10';fields.status.value='Preparing';fields.doc0.value='Ready';fields.nextAction.value='Send tailored motivation letter';
  await ids['opportunity-form'].dispatch('submit');assert.equal(ids.editor.open,false);assert.equal(h.saved().length,13);assert.equal(h.saved().at(-1).documents.CV,'Ready');assert.match(ids['progress-caption'].textContent,/0 submitted/);
  const id=h.saved().at(-1).id;await ids['opportunity-rows'].dispatch('click',h.target({edit:id}));assert.equal(fields.title.value,'Efficient language models');fields.status.value='Applied';fields.nextAction.value='Follow up with lab';await ids['opportunity-form'].dispatch('submit');assert.equal(h.saved().length,13);assert.equal(h.saved().at(-1).status,'Applied');assert.match(ids['progress-caption'].textContent,/1 submitted/);
  ids['location-filter'].value='Lyon, France';ids['area-filter'].value='NLP';ids['fit-filter'].value='High';ids['status-filter'].value='Applied';await ids['fit-filter'].dispatch('change');assert.match(ids['result-count'].textContent,/1 of 13/);assert.match(ids['opportunity-rows'].innerHTML,/Follow up with lab/);assert.doesNotMatch(ids['opportunity-rows'].innerHTML,/Alphaguard/);
  ids.search.value='no matching role';await ids.search.dispatch('input');assert.equal(ids['empty-state'].hidden,false);await ids['empty-clear'].dispatch('click');assert.equal(ids['empty-state'].hidden,true);assert.match(ids['result-count'].textContent,/13 of 13/);
  await ids['deadlines-tab'].dispatch('click');assert.equal(ids.sort.value,'deadline-asc');assert.match(ids['result-count'].textContent,/1 with a date/);assert.ok(ids['opportunity-rows'].innerHTML.indexOf('Test NLP Lab') < ids['opportunity-rows'].innerHTML.indexOf('Alphaguard'));
  await ids['deadline-sort'].dispatch('click');assert.equal(ids.sort.value,'deadline-desc');assert.equal(ids['deadline-arrow'].textContent,'↓');
  await ids['opportunity-rows'].dispatch('click',h.target({details:id}));assert.equal(ids.details.open,true);assert.match(ids['details-body'].innerHTML,/Frugal AI/);assert.match(ids['details-body'].innerHTML,/1 of 4 ready/);
  const reload=harness(h.storage);assert.equal(reload.ids['nav-count'].textContent,13);assert.equal(reload.saved().at(-1).status,'Applied');
});
test('backup export/import and guarded delete use actual handlers',async()=>{
  const h=harness();await h.ids['export-btn'].dispatch('click');assert.equal(h.download,'muzna-internship-tracker-2027.json');
  const item=h.window.TrackerCore.normalize({id:'imported',employer:'Imported host',title:'NLP research',status:'Interviewing'});
  h.ids['import-file'].files=[{size:100,text:async()=>JSON.stringify({version:1,opportunities:[item]})}];await h.ids['import-file'].dispatch('change');assert.equal(h.ids['confirm-dialog'].open,true);assert.equal(h.saved().length,0,'import must wait for confirmation');await h.ids['confirm-accept'].dispatch('click');assert.equal(h.saved().length,1);assert.equal(h.saved()[0].employer,'Imported host');assert.match(h.ids['progress-caption'].textContent,/1 submitted/);
  await h.ids['opportunity-rows'].dispatch('click',h.target({edit:'imported'}));await h.ids['delete-btn'].dispatch('click');assert.equal(h.saved().length,1);await h.ids['confirm-cancel'].dispatch('click');assert.equal(h.saved().length,1);await h.ids['delete-btn'].dispatch('click');await h.ids['confirm-accept'].dispatch('click');assert.equal(h.saved().length,0);assert.equal(h.ids['empty-state'].hidden,false);
});
test('malformed imports, unsafe links, HTML content, and storage failures are handled',async()=>{
  const h=harness();h.ids['import-file'].files=[{size:100,text:async()=>'{"version":1,"opportunities":[{}]}'}];await h.ids['import-file'].dispatch('change');assert.match(h.ids.toast.textContent,/Import failed/);assert.equal(h.ids['nav-count'].textContent,12);
  await h.ids['add-btn'].dispatch('click');h.fields.employer.value='<script>bad()</script>';h.fields.title.value='Test role';h.fields.areas.value='ML';h.fields.url.value='javascript:alert(1)';await h.ids['opportunity-form'].dispatch('submit');assert.equal(h.ids['form-error'].hidden,false);assert.equal(h.saved().length,0);
  h.fields.url.value='';await h.ids['opportunity-form'].dispatch('submit');assert.match(h.ids['opportunity-rows'].innerHTML,/&lt;script&gt;/);assert.doesNotMatch(h.ids['opportunity-rows'].innerHTML,/<script>bad/);
  h.failWrites();await h.ids['add-btn'].dispatch('click');h.fields.employer.value='Unsaved host';h.fields.title.value='Role';h.fields.areas.value='ML';await h.ids['opportunity-form'].dispatch('submit');assert.equal(h.saved().length,13);assert.equal(h.ids.editor.open,true);assert.equal(h.ids['storage-warning'].hidden,false);assert.doesNotMatch(h.ids['opportunity-rows'].innerHTML,/Unsaved host/);
});
test('zero records remain empty after reload rather than restoring seeds',async()=>{const h=harness(new Map([['muzna-dkai-internships-2027-v1',JSON.stringify({version:1,opportunities:[]})]]));assert.equal(h.ids['nav-count'].textContent,0);assert.equal(h.ids['empty-state'].hidden,false);assert.match(h.ids['progress-caption'].textContent,/0 submitted \/ 0/);});
