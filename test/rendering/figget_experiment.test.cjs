const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const engine = require('../../src/rendering/figget_life_model.js');
const runtime = fs.readFileSync(path.join(__dirname, '../../src/rendering/figget_life_worker.js'), 'utf8');

function simulate(snapshot, pressures, seconds) {
  const messages = [];
  const worker = {postMessage: message => messages.push(structuredClone(message))};
  vm.runInNewContext(runtime, {self: worker, engine, structuredClone});
  // Browser Worker.postMessage snapshots the payload before the worker handles it.
  worker.onmessage({data: structuredClone({type:'compare', world:snapshot, pressures, seconds})});
  return messages;
}

test('paired worker runs two isolated forks for exactly the selected time', () => {
  const original = engine.fresh(833, 8);
  for (let n = 0; n < 24; n++) engine.step(original);
  original.stats.deaths = 9;
  original.stats.services = 12;
  const saved = structuredClone(original);
  const pressures = [0.75, 1.5];
  const messages = simulate(original, pressures, 60);
  const result = messages.pop();
  assert.deepEqual(original, saved);
  assert.equal(result.startTime, saved.time);
  assert.equal(result.seconds, 60);
  assert.equal(result.type, 'results');
  assert.equal(messages.at(-1).value, 1);
  for (let i = 0; i < 2; i++) {
    const reference = structuredClone(saved);
    engine.setPressure(reference, pressures[i]);
    for (let n = 0; n < 60/engine.DT; n++) engine.step(reference);
    assert.deepEqual(result.worlds[i], {
      meals: reference.stats.services - saved.stats.services,
      deaths: reference.stats.deaths - saved.stats.deaths,
      lineages: new Set(reference.bots.map(bot => bot.lineage)).size
    });
  }
});

test('identical pressures reproduce identical outcomes and runs are bounded', () => {
  const original = engine.fresh(345, 8);
  const result = simulate(original, [1, 1], 60).at(-1);
  assert.deepEqual(result.worlds[0], result.worlds[1]);
  assert.throws(() => simulate(original, [1, 1.5], 100000), /Unknown experiment settings/);
});
