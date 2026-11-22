const {test} = require('node:test');
const assert = require('node:assert/strict');
const m = require('../../src/rendering/figget_life_model.js');
const {comparison} = require('../../src/rendering/figget_family.js');

test('births record real parents and preserve relatives after retirement and reload', () => {
  const w = m.fresh(81, 8);
  for (const b of w.bots) b.age = 180;
  w.time = 180;
  const original = w.bots.map(b=>b.id);
  m.evolve(w);
  const child = w.bots.find(b => !original.includes(b.id));
  assert.ok(child);
  const parent = w.bots.find(b => b.id === child.family.parentId);
  assert.equal(child.generation, parent.generation+1);
  assert.equal(child.family.bornAt,180);
  assert.equal(w.familyArchive.length,1);
  assert.ok(original.includes(w.familyArchive[0].id));
  assert.equal(w.familyArchive[0].retiredAt,180);
  assert.equal('q' in w.familyArchive[0], false);
  const resumed = m.restore(structuredClone(w));
  assert.deepEqual(resumed.familyArchive,w.familyArchive);
  assert.deepEqual(resumed.bots.map(b=>b.family),w.bots.map(b=>b.family));
});

test('retired family records have a fixed upper bound across population edits', () => {
  const w = m.fresh(82, 300);
  m.setPopulation(w, 8);
  assert.equal(w.familyArchive.length,256);
  assert.equal(w.familyArchive.at(-1).id,300);
  assert.equal(w.bots.length,8);
  m.setPopulation(w,32);
  m.setPopulation(w,8);
  assert.equal(w.familyArchive.length,256);
  assert.equal(w.familyArchive.at(-1).id,324);
});

test('same-age measurements freeze after five observed minutes', () => {
  const w = m.fresh(83,8);
  w.evolution=false;
  const before=w.bots[0];
  for(let i=0;i<1200;i++)m.step(w);
  assert.equal(before.family.early.minutes.length,5);
  assert.ok(before.family.early.moves>0);
  assert.ok(before.family.early.gathers>0);
  const atFive=structuredClone(before.family.early);
  for(let i=0;i<30;i++)m.step(w);
  assert.deepEqual(before.family.early,atFive);
  const child=w.bots[1];
  child.family.early.minutes = child.family.early.minutes.slice(0,2);
  const pair=comparison(before,child);
  assert.equal(pair.minutes,2);
  assert.deepEqual(pair.parent,atFive.minutes[1]);
  assert.deepEqual(pair.child,child.family.early.minutes[1]);
});

test('legacy saves preserve bots without inventing parentage or early-life samples', () => {
  const w=m.fresh(84,8);
  m.step(w);
  for(const b of w.bots) delete b.family;
  delete w.familyArchive;
  const restored=m.restore(w);
  assert.equal(restored.bots[0].family.parentId,null);
  assert.equal(restored.bots[0].family.early,null);
  assert.deepEqual(restored.familyArchive,[]);
  assert.equal(comparison(restored.bots[0],restored.bots[1]),null);
  m.setPopulation(restored,9);
  assert.deepEqual(restored.bots.at(-1).family.early.minutes,[]);
});
