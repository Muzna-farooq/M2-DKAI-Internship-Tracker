const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../dist/core.js');
const make = fields => C.normalize({id:'base',employer:'Host',title:'Project',...fields});
const data = [
  make({id:'a',employer:'Alpha',fit:'High',location:'Paris, France',areas:['ML','NLP'],deadline:'2027-02-15',status:'Preparing',documents:{CV:'Ready'}}),
  make({id:'b',employer:'Beta',fit:'Medium',location:'Berlin, Germany',areas:['ML'],deadline:'2027-01-10',status:'Applied'}),
  make({id:'c',employer:'Gamma',fit:'High',location:'Paris, France',areas:['NLP'],deadline:'',status:'Lead'}),
  make({id:'d',employer:'Delta',fit:'Unknown',location:'To confirm',areas:['Hybrid AI'],deadline:'2026-10-01',status:'Archived'})
];
test('filters combine as an intersection, search includes next action',()=>{
  assert.deepEqual(C.filterSort(data,{fit:'High',location:'Paris, France',area:'NLP',status:'Preparing'}).map(x=>x.id),['a']);
  assert.equal(C.filterSort(data,{location:'Berlin, Germany',area:'NLP'}).length,0);
  assert.equal(C.filterSort([make({nextAction:'Contact Pierre'})],{search:'PIERRE'}).length,1);
});
test('deadlines sort chronologically in both directions, unknown dates always last',()=>{
  assert.deepEqual(C.filterSort(data,{sort:'deadline-asc'}).map(x=>x.id),['d','b','a','c']);
  assert.deepEqual(C.filterSort(data,{sort:'deadline-desc'}).map(x=>x.id),['a','b','d','c']);
  assert.equal(data[0].id,'a','sorting must not mutate the stored records');
});
test('progress counts application stages and excludes archived opportunities from urgency',()=>{
  const s=C.summary(data,'2026-10-13');
  assert.equal(s.total,4);assert.equal(s.active,2);assert.equal(s.submitted,1);assert.equal(s.highFit,2);assert.equal(s.upcoming,2);assert.equal(s.counts.Archived,1);
});
test('add and edit preserve identity, fields and document preparation',()=>{
  const next=C.upsert(data,{...data[0],status:'Interviewing',documents:{CV:'Ready','Motivation letter':'Sent'},nextAction:'Prepare technical interview'});
  assert.equal(next.length,4);assert.equal(next[0].id,'a');assert.equal(next[0].status,'Interviewing');assert.equal(C.readyDocuments(next[0]),2);assert.equal(data[0].status,'Preparing');
  const added=C.upsert(next,{employer:'New lab',title:'Efficient AI',areas:['Frugal AI','Frugal AI']});assert.equal(added.length,5);assert.deepEqual(added[4].areas,['Frugal AI']);
});
test('backup roundtrip preserves data; malformed backups and duplicate ids are rejected',()=>{
  assert.deepEqual(C.parseBackup(JSON.stringify({version:1,opportunities:data})),data);
  assert.throws(()=>C.parseBackup('{"version":2,"opportunities":[]}'),/version 1/);
  assert.throws(()=>C.parseBackup(JSON.stringify({version:1,opportunities:[data[0],data[0]]})),/duplicate/);
});
test('date and link validation rejects rollover dates and executable link schemes',()=>{
  assert.equal(C.validDate('2027-02-29'),false);assert.equal(C.validDate('2028-02-29'),true);
  assert.throws(()=>make({deadline:'2027-02-30'}),/valid deadline/);
  assert.throws(()=>make({url:'javascript:alert(1)'}),/http/);
  assert.throws(()=>make({employer:''}),/employer/);
});
