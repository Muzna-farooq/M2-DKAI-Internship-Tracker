(function (root) {
  'use strict';
  const STATUSES = ['Lead', 'Preparing', 'Applied', 'Interviewing', 'Offer', 'Rejected', 'Archived'];
  const FITS = ['High', 'Medium', 'Low', 'Unknown'];
  const DOCS = ['CV', 'Motivation letter', 'Transcript', 'Enrolment certificate'];
  const DOC_STATES = ['Not started', 'Draft requested', 'Draft', 'To review', 'Ready', 'Sent'];
  const APPROVALS = ['To confirm', 'Approved', 'Not eligible'];
  const STORAGE_KEY = 'muzna-dkai-internships-2027-v1';
  const text = (value, limit = 3000) => typeof value === 'string' ? value.trim().slice(0, limit) : '';
  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
    const date = new Date(value + 'T12:00:00Z');
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }
  function safeUrl(value) {
    try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : ''; } catch { return ''; }
  }
  function normalize(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('An opportunity must be a record.');
    const employer = text(input.employer, 160), title = text(input.title, 240);
    if (!employer || !title) throw Error('Please provide an employer and a project or role title.');
    if (input.deadline && !validDate(input.deadline)) throw Error('Please enter a valid deadline, or leave it blank.');
    if (input.url && !safeUrl(input.url)) throw Error('Please use a complete http:// or https:// link.');
    const areas = [...new Set((Array.isArray(input.areas) ? input.areas : text(input.areas, 300).split(',')).map(v => text(v, 80)).filter(Boolean))].slice(0, 12);
    const documents = {};
    for (const doc of DOCS) documents[doc] = DOC_STATES.includes(input.documents?.[doc]) ? input.documents[doc] : 'Not started';
    return { id: text(input.id, 120) || (root.crypto?.randomUUID?.() || 'op-' + Date.now() + '-' + Math.random().toString(36).slice(2)), employer, title, location: text(input.location, 160) || 'To confirm', preferredStart: text(input.preferredStart, 120) || 'April 2027 preferred', hostStart: text(input.hostStart, 160) || 'To confirm', duration: text(input.duration, 120) || 'To confirm (6 months required)', areas: areas.length ? areas : ['To confirm'], fit: FITS.includes(input.fit) ? input.fit : 'Unknown', fitReason: text(input.fitReason, 1600), deadline: input.deadline || '', status: STATUSES.includes(input.status) ? input.status : 'Lead', approval: APPROVALS.includes(input.approval) ? input.approval : 'To confirm', documents, nextAction: text(input.nextAction, 500) || 'Confirm the opening and host requirements', url: safeUrl(input.url), notes: text(input.notes), updatedAt: Number.isFinite(Number(input.updatedAt)) ? Number(input.updatedAt) : Date.now() };
  }
  function validateList(value) {
    if (!Array.isArray(value) || value.length > 1000) throw Error('The backup must contain an opportunities list with at most 1,000 records.');
    const result = value.map(normalize);
    if (new Set(result.map(x => x.id)).size !== result.length) throw Error('The backup contains duplicate opportunity IDs.');
    return result;
  }
  function parseBackup(raw) {
    const obj = JSON.parse(raw);
    if (!obj || obj.version !== 1 || !Array.isArray(obj.opportunities)) throw Error('Choose a version 1 tracker JSON backup.');
    return validateList(obj.opportunities);
  }
  function filterSort(records, options = {}) {
    const q = (options.search || '').trim().toLowerCase();
    let list = records.filter(x => (!options.fit || x.fit === options.fit) && (!options.location || x.location === options.location) && (!options.area || x.areas.includes(options.area)) && (!options.status || x.status === options.status) && (!q || [x.title, x.employer, x.location, ...x.areas, x.fitReason, x.nextAction, x.notes].join(' ').toLowerCase().includes(q)));
    const fitRank = {High: 0, Medium: 1, Low: 2, Unknown: 3};
    list.sort((a, b) => {
      const alphabetical = a.employer.localeCompare(b.employer) || a.title.localeCompare(b.title);
      if ((options.sort || '').startsWith('deadline')) {
        if (!a.deadline && !b.deadline) return alphabetical;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return (options.sort === 'deadline-desc' ? -1 : 1) * a.deadline.localeCompare(b.deadline) || alphabetical;
      }
      if (options.sort === 'employer') return alphabetical;
      if (options.sort === 'updated') return b.updatedAt - a.updatedAt || alphabetical;
      return fitRank[a.fit] - fitRank[b.fit] || alphabetical;
    });
    return list;
  }
  function summary(records, today) {
    const counts = Object.fromEntries(STATUSES.map(s => [s, 0]));
    records.forEach(r => counts[r.status]++);
    return { total: records.length, counts, highFit: records.filter(r => r.fit === 'High' && !['Archived', 'Rejected'].includes(r.status)).length, active: records.filter(r => ['Preparing', 'Applied', 'Interviewing', 'Offer'].includes(r.status)).length, submitted: counts.Applied + counts.Interviewing + counts.Offer + counts.Rejected, upcoming: records.filter(r => r.deadline && r.deadline >= today && !['Rejected', 'Archived', 'Offer'].includes(r.status)).length, known: records.filter(r => r.deadline).length };
  }
  function upsert(records, input) { const item = normalize(input); const index = records.findIndex(x => x.id === item.id); const next = records.slice(); if (index >= 0) next[index] = item; else next.push(item); return next; }
  function readyDocuments(record) { return DOCS.filter(d => ['Ready', 'Sent'].includes(record.documents[d])).length; }
  root.TrackerCore = {STATUSES, FITS, DOCS, DOC_STATES, STORAGE_KEY, validDate, safeUrl, normalize, validateList, parseBackup, filterSort, summary, upsert, readyDocuments};
  if (typeof module !== 'undefined' && module.exports) module.exports = root.TrackerCore;
})(typeof window !== 'undefined' ? window : globalThis);
