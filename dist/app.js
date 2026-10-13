(function () {
  'use strict';
  const C = window.TrackerCore, $ = id => document.getElementById(id);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const colors = {Lead:'#c5d5b6', Preparing:'#d4be87', Applied:'#97b8ca', Interviewing:'#b1a1cf', Offer:'#73a867', Rejected:'#d3a093', Archived:'#ced0c8'};
  const form = $('opportunity-form');
  let records, view = 'opportunities', selectedId = null, toastTimer, storageHealthy = true, customData = false;
  const today = () => { const d = new Date(); return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'); };
  function storageWarning(message) { storageHealthy = false; $('storage-warning').textContent = message; $('storage-warning').hidden = false; $('save-state').textContent = 'Storage needs attention'; }
  try {
    const raw = localStorage.getItem(C.STORAGE_KEY);
    records = raw ? C.parseBackup(raw) : C.validateList(window.TRACKER_SEEDS);
    customData = Boolean(raw);
  } catch {
    records = C.validateList(window.TRACKER_SEEDS);
    storageWarning('Your saved tracker could not be read. The supplied leads are shown for now. Export a backup before editing; saving or importing will replace any unreadable data.');
  }
  function commit(next) {
    const valid = C.validateList(next);
    try {
      localStorage.setItem(C.STORAGE_KEY, JSON.stringify({version:1,opportunities:valid}));
      records = valid; storageHealthy = true; customData = true;
      $('storage-warning').hidden = true; $('save-state').textContent = 'Saved in this browser';
      render(); return true;
    } catch {
      storageWarning('This browser could not save your change. The change has not been applied. Export a backup, then enable browser storage or free space and try again.');
      toast('Change not saved. Check the storage message.'); return false;
    }
  }
  function toast(message) { clearTimeout(toastTimer); $('toast').textContent = message; $('toast').hidden = false; toastTimer = setTimeout(() => {$('toast').hidden = true;}, 4200); }
  function options() { return {search:$('search').value,fit:$('fit-filter').value,location:$('location-filter').value,area:$('area-filter').value,status:$('status-filter').value,sort:$('sort').value}; }
  function selectOptions(id, values, first) {
    const select = $(id), current = select.value;
    select.innerHTML = `<option value="">${escape(first)}</option>` + values.map(v => `<option value="${escape(v)}">${escape(v)}</option>`).join('');
    select.value = values.includes(current) ? current : '';
  }
  function dateLabel(value) { return new Date(value + 'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}); }
  function deadlineMarkup(record) {
    if (!record.deadline) return '<span class="deadline-unknown">To confirm</span><span class="deadline-sub">No date supplied</span>';
    const days = Math.round((new Date(record.deadline+'T12:00:00') - new Date(today()+'T12:00:00')) / 86400000);
    const closed = ['Archived','Rejected','Offer'].includes(record.status);
    const note = closed ? 'Recorded deadline' : days < 0 ? `${Math.abs(days)} day${days === -1 ? '' : 's'} past` : days === 0 ? 'Due today' : `${days} day${days === 1 ? '' : 's'} left`;
    return `<span class="${!closed && days < 0 ? 'deadline-overdue' : !closed && days <= 7 ? 'deadline-urgent' : ''}">${dateLabel(record.deadline)}</span><span class="deadline-sub">${note}</span>`;
  }
  function render() {
    selectOptions('location-filter', [...new Set(records.map(r=>r.location))].sort(), 'All locations');
    selectOptions('area-filter', [...new Set(records.flatMap(r=>r.areas))].sort(), 'All areas');
    const s = C.summary(records,today());
    $('nav-count').textContent = s.total; $('all-count').textContent = s.total;
    const metrics = [['Total opportunities',s.total,'Including archived references','▦'],['Active applications',s.active,'Preparing, applied, interviewing, or offer','↗'],['High-fit leads',s.highFit,'Provisional fit with your interests','◎'],['Upcoming deadlines',s.upcoming,s.known ? 'Confirmed dates on active opportunities' : 'Add a date once the host confirms it','◷']];
    $('metrics').innerHTML = metrics.map(([label,value,note,icon])=>`<article class="metric"><div class="metric-label">${label}<span class="metric-icon" aria-hidden="true">${icon}</span></div><div class="metric-value">${value}</div><div class="metric-note">${note}</div></article>`).join('');
    $('progress-caption').textContent = `${s.submitted} submitted / ${s.total} opportunities`;
    $('pipeline-track').innerHTML = C.STATUSES.filter(x=>s.counts[x]).map(x=>`<span class="pipeline-segment" style="width:${s.total ? s.counts[x]/s.total*100 : 0}%;background:${colors[x]}"></span>`).join('');
    $('pipeline-legend').innerHTML = C.STATUSES.map(x=>`<button class="pipeline-status" data-status="${x}" aria-label="Filter ${x}: ${s.counts[x]} opportunities"><span class="pipeline-dot" style="background:${colors[x]}"></span>${x}<strong>${s.counts[x]}</strong></button>`).join('');
    const opts = options(), visible = C.filterSort(records,opts), knownVisible = visible.filter(r=>r.deadline).length;
    $('result-count').textContent = `${visible.length} of ${records.length} opportunities${view === 'deadlines' ? ` · ${knownVisible} with a date; unconfirmed dates appear last` : ''}`;
    $('clear-filters').hidden = ![opts.search,opts.fit,opts.location,opts.area,opts.status].some(Boolean);
    $('deadline-arrow').textContent = opts.sort === 'deadline-asc' ? '↑' : opts.sort === 'deadline-desc' ? '↓' : '↕';
    $('opportunity-rows').innerHTML = visible.map(r=>`<tr><td><div class="role-cell"><span class="host-icon" aria-hidden="true">${escape(r.employer.split(/[\s/]+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase())}</span><div><button class="role-button" data-details="${escape(r.id)}">${escape(r.title)}</button><span class="host-name">${escape(r.employer)}</span></div></div></td><td>${escape(r.location)}<span class="research-text">${escape(r.areas.join(' · '))}</span></td><td><span class="badge fit-${r.fit}">${r.fit === 'High' ? '↗ ' : ''}${r.fit}</span></td><td>${deadlineMarkup(r)}</td><td><span class="badge status-${r.status}">${r.status}</span><span class="documents-line">${C.readyDocuments(r)} / ${C.DOCS.length} docs ready</span></td><td class="next-action">${escape(r.nextAction)}</td><td><button class="icon-button" data-edit="${escape(r.id)}" aria-label="Edit ${escape(r.employer)} opportunity">✎</button></td></tr>`).join('');
    $('empty-state').hidden = visible.length !== 0;
    $('dataset-caption').textContent = customData ? 'Your tracker. Confirm host terms and M2 approval before applying.' : 'Leads from your earlier discussions. Openings and dates need confirmation.';
  }
  function setView(next) {
    view = next;
    document.querySelectorAll('[data-view]').forEach(el=>{const active=el.dataset.view===view;el.classList.toggle('active',active);if(el.getAttribute('role')==='tab')el.setAttribute('aria-selected',String(active));});
    if(view === 'deadlines') $('sort').value = 'deadline-asc';
    else if($('sort').value.startsWith('deadline')) $('sort').value = 'fit';
    render();
  }
  function clearFilters() { ['search','fit-filter','location-filter','area-filter','status-filter'].forEach(id=>{$(id).value='';});render(); }
  function editor(record) {
    form.reset(); $('form-error').hidden=true;
    const item = record || {id:'',employer:'',title:'',location:'',preferredStart:'April 2027 preferred',hostStart:'',duration:'',deadline:'',areas:[],fit:'Unknown',fitReason:'',status:'Lead',approval:'To confirm',nextAction:'',url:'',notes:'',documents:{}};
    for (const field of ['id','employer','title','location','preferredStart','hostStart','duration','deadline','fit','fitReason','status','approval','nextAction','url','notes']) form.elements.namedItem(field).value=item[field];
    form.elements.namedItem('areas').value=item.areas.join(', ');
    C.DOCS.forEach((doc,i)=>{form.elements.namedItem('doc'+i).value=item.documents[doc] || 'Not started';});
    $('editor-title').textContent = record ? 'Edit opportunity' : 'Add opportunity';
    $('delete-btn').hidden = !record; $('editor').showModal();
  }
  function details(id) {
    const r=records.find(x=>x.id===id);if(!r)return;selectedId=id;
    $('details-host').textContent=r.employer; $('details-title').textContent=r.title;
    const fields=[['Location',r.location],['Research area',r.areas.join(' · ')],['Your preferred start',r.preferredStart],['Host’s start timing',r.hostStart],['Duration / host terms',r.duration],['Application deadline',r.deadline?dateLabel(r.deadline):'To confirm — no date supplied'],['M2 / 30 ECTS approval',r.approval],['Application documents',`${C.readyDocuments(r)} of ${C.DOCS.length} ready`]];
    $('details-body').innerHTML=`<div class="detail-tags"><span class="badge fit-${r.fit}">${r.fit} fit</span><span class="badge status-${r.status}">${r.status}</span></div><dl class="details-grid">${fields.map(([k,v])=>`<div><dt>${k}</dt><dd>${escape(v)}</dd></div>`).join('')}</dl><section class="detail-section"><h3>Why it fits</h3><p>${escape(r.fitReason||'Assess fit once the project description is available.')}</p></section><section class="detail-section"><h3>Next action</h3><p>${escape(r.nextAction)}</p></section><section class="detail-section"><h3>Documents prepared</h3>${C.DOCS.map(d=>`<div class="detail-doc"><span>${d}</span><strong>${escape(r.documents[d])}</strong></div>`).join('')}</section>${r.url?`<a class="detail-link" href="${escape(C.safeUrl(r.url))}" target="_blank" rel="noopener noreferrer">Open opportunity reference ↗</a>`:''}<section class="detail-section"><h3>Source / notes</h3><p>${escape(r.notes||'No notes yet.')}</p></section>`;
    $('details').showModal();
  }
  function confirmAction(title,message,accept,onAccept) {
    $('confirm-title').textContent=title;$('confirm-message').textContent=message;$('confirm-accept').textContent=accept;
    $('confirm-accept').onclick=()=>{$('confirm-dialog').close();onAccept();};$('confirm-dialog').showModal();
  }
  selectOptions('status-filter',C.STATUSES,'All statuses');
  form.elements.namedItem('status').innerHTML=C.STATUSES.map(s=>`<option>${s}</option>`).join('');
  $('document-fields').innerHTML=C.DOCS.map((d,i)=>`<label>${d}<select name="doc${i}">${C.DOC_STATES.map(s=>`<option>${s}</option>`).join('')}</select></label>`).join('');
  $('add-btn').addEventListener('click',()=>editor());
  document.querySelectorAll('[data-view]').forEach(el=>el.addEventListener('click',()=>setView(el.dataset.view)));
  ['search','fit-filter','location-filter','area-filter','status-filter','sort'].forEach(id=>$(id).addEventListener(id==='search'?'input':'change',render));
  $('clear-filters').addEventListener('click',clearFilters);$('empty-clear').addEventListener('click',clearFilters);
  $('deadline-sort').addEventListener('click',()=>{$('sort').value=$('sort').value==='deadline-asc'?'deadline-desc':'deadline-asc';render();});
  $('pipeline-legend').addEventListener('click',e=>{const button=e.target.closest('[data-status]');if(button){$('status-filter').value=button.dataset.status;render();}});
  $('opportunity-rows').addEventListener('click',e=>{const edit=e.target.closest('[data-edit]'), detail=e.target.closest('[data-details]');if(edit)editor(records.find(r=>r.id===edit.dataset.edit));else if(detail)details(detail.dataset.details);});
  document.querySelectorAll('.close-dialog').forEach(el=>el.addEventListener('click',()=>{$('editor').close();}));
  document.querySelectorAll('.close-details').forEach(el=>el.addEventListener('click',()=>{$('details').close();}));
  $('details-edit').addEventListener('click',()=>{$('details').close();editor(records.find(x=>x.id===selectedId));});
  form.addEventListener('submit',e=>{
    e.preventDefault(); if(!form.reportValidity()) return;
    const input=Object.fromEntries(new FormData(form)),documents={}; C.DOCS.forEach((d,i)=>{documents[d]=input['doc'+i];});
    try{const next=C.upsert(records,{...input,documents,areas:input.areas.split(','),updatedAt:Date.now()});if(commit(next)){$('editor').close();toast(input.id?'Opportunity updated.':'Opportunity added.');}}
    catch(error){$('form-error').textContent=error.message;$('form-error').hidden=false;}
  });
  $('delete-btn').addEventListener('click',()=>{const id=form.elements.namedItem('id').value;confirmAction('Delete this opportunity?','This removes the opportunity from this browser’s tracker. Export a backup first if you need to keep it.','Delete opportunity',()=>{if(commit(records.filter(r=>r.id!==id))){$('editor').close();toast('Opportunity deleted.');}});});
  $('confirm-cancel').addEventListener('click',()=>{$('confirm-dialog').close();});
  $('export-btn').addEventListener('click',()=>{
    const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),opportunities:records},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='muzna-internship-tracker-2027.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Tracker backup downloaded.');
  });
  $('import-btn').addEventListener('click',()=>{$('import-file').click();});
  $('import-file').addEventListener('change',async e=>{
    const file=e.target.files[0];if(!file)return;
    try{if(file.size>3000000)throw Error('Please choose a tracker backup smaller than 3 MB.');const imported=C.parseBackup(await file.text());confirmAction('Replace this browser’s tracker?',`Import ${imported.length} opportunities from your backup. This replaces the current ${records.length} records. Export your current tracker first if you need to keep it.`,'Import backup',()=>{if(commit(imported))toast('Backup imported.');});}
    catch(error){toast('Import failed: '+error.message);}finally{$('import-file').value='';}
  });
  window.addEventListener('storage',e=>{
    if(e.key!==C.STORAGE_KEY)return;
    try{records=e.newValue?C.parseBackup(e.newValue):C.validateList(window.TRACKER_SEEDS);customData=Boolean(e.newValue);render();toast('Tracker refreshed from another tab.');}catch{storageWarning('Another tab saved unreadable data. Export a backup before making further changes.');}
  });
  render();
})();
