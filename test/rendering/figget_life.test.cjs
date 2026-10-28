const { test } = require("node:test");
const assert = require("node:assert/strict");
const m = require("../../src/rendering/figget_life_model.js"),
  N = m.ACTIONS.length;
const steps = (w, n) => {
  for (let i = 0; i < n; i++) m.step(w);
  return w;
};
const act = (w, c) => {
  w.player.readyAt = 0;
  return m.playerAction(w, c);
};
const balanced = (w) =>
  assert.deepEqual(m.ledger(w), { food: 0, wood: 0, ore: 0 });
function opening(w) {
  w.stats.opening = m.totals(w);
  for (const c of ["regrown", "introduced", "consumed", "lost"])
    w.stats[c] = { food: 0, wood: 0, ore: 0 };
}
function depot(w, x = 10, y = 10) {
  const p = w.player;
  p.x = x;
  p.y = y;
  p.wood = 8;
  p.ore = 2;
  opening(w);
  assert.match(act(w, { type: "build" }), /built/);
  return w.buildings.at(-1);
}
test("seeded worlds and learning trajectories are reproducible", () => {
  const a = steps(m.fresh(12, 32), 120),
    b = steps(m.fresh(12, 32), 120);
  assert.deepEqual(a, b);
  assert.ok(m.valid(a));
  balanced(a);
});
test("Q-learning uses only legal future actions and terminal updates do not bootstrap", () => {
  const a = m.fresh(1, 8).bots[0];
  a.q.fill(0);
  a.alpha = 0.5;
  a.gamma = 0.9;
  a.q[N] = 10;
  a.q[N + 7] = 1;
  const mask = Array(N).fill(false);
  mask[7] = true;
  m.learn(a, 0, 2, 2, 1, false, mask);
  assert.ok(Math.abs(a.q[2] - 1.45) < 1e-5);
  a.q[2] = 0;
  m.learn(a, 0, 2, 2, 1, true, mask);
  assert.equal(a.q[2], 1);
});
test("independent learners change their policies and learning can be frozen separately", () => {
  const w = m.fresh(8, 16),
    old = w.bots.map((b) => new Float32Array(b.q));
  steps(w, 160);
  assert.ok(w.totalUpdates > 100);
  assert.ok(w.bots.every((b) => b.updates > 0));
  assert.ok(w.bots.some((b, i) => b.q.some((q, j) => q !== old[i][j])));
  w.learning = false;
  w.evolution = false;
  const frozen = w.bots.map((b) => new Float32Array(b.q)),
    updates = w.totalUpdates;
  steps(w, 800);
  assert.equal(w.totalUpdates, updates);
  w.bots.forEach((b, i) => assert.deepEqual(b.q, frozen[i]));
});
test("full timber inventories can be cleared, and discarded materials are accounted for", () => {
  const w = m.fresh(1, 8),
    p = w.player;
  p.wood = 30;
  p.food = 0;
  p.ore = 0;
  opening(w);
  assert.match(act(w, { type: "discard", kind: "wood" }), /Discarded 5/);
  assert.equal(p.wood, 25);
  const node = w.nodes.find((n) => n.kind === "ore");
  p.x = node.x;
  p.y = node.y;
  assert.match(
    act(w, { type: "gather", x: node.x, y: node.y }),
    /Gathered ore/,
  );
  assert.equal(p.ore, 1);
  balanced(w);
});
test("all materials can be stored and withdrawn without duplication", () => {
  const w = m.fresh(1, 8),
    b = depot(w);
  w.player.food = 6;
  w.player.wood = 9;
  w.player.ore = 6;
  opening(w);
  for (const kind of ["food", "wood", "ore"]) {
    const before = w.player[kind];
    assert.match(act(w, { type: "store", x: b.x, y: b.y, kind }), /Stored 5/);
    assert.equal(w.player[kind], before - 5);
    assert.match(act(w, { type: "take", x: b.x, y: b.y, kind }), /Took 5/);
    assert.equal(w.player[kind], before);
  }
  balanced(w);
  assert.ok(m.valid(w));
});
test("full food depots can be repaired without consuming food or changing stores", () => {
  const w = m.fresh(1, 8),
    b = depot(w);
  b.food = 12;
  b.foodOwners = Array(12).fill(null);
  b.expires = 0.25;
  opening(w);
  const wood = w.player.wood;
  assert.match(act(w, { type: "repair", x: 10, y: 10 }), /Repaired/);
  assert.equal(w.player.wood, wood - 1);
  assert.equal(b.food, 12);
  assert.match(act(w, { type: "repair", x: 10, y: 10 }), /no repair needed/);
  m.step(w);
  assert.equal(w.buildings.length, 1);
  balanced(w);
});
test("full and ore-less inventories produce distinct observations and unavailable actions are masked", () => {
  const w = m.fresh(2, 8),
    a = w.bots[0];
  a.wood = 0;
  a.ore = 1;
  let idx = m.index(w);
  const withOre = m.state(w, a, idx);
  a.ore = 0;
  assert.notEqual(m.state(w, a, idx), withOre);
  a.wood = 30;
  a.food = 0;
  idx = m.index(w);
  const mask = m.legalActions(w, a, idx);
  assert.equal(mask[0], false);
  assert.equal(mask[1], false);
  assert.equal(mask[2], false);
  assert.equal(mask[5], false);
  assert.equal(mask[9], true);
});
test("bots manage excess timber instead of remaining economically locked", () => {
  const w = m.fresh(3, 8),
    a = w.bots[0];
  a.wood = 30;
  a.food = 0;
  a.ore = 0;
  a.epsilon = 0;
  a.q.fill(-2);
  for (let s = 0; s < m.STATES; s++) a.q[s * N + 9] = 2;
  opening(w);
  steps(w, 4);
  assert.ok(a.wood < 30);
  balanced(w);
});
test("food is reserved for useful healing and emergencies still allow smaller meals", () => {
  const w = m.fresh(4, 8),
    p = w.player;
  p.health = 98;
  assert.match(act(w, { type: "eat" }), /Save food/);
  assert.equal(p.food, 2);
  p.health = 75;
  assert.match(act(w, { type: "eat" }), /Recovered 25/);
  assert.equal(p.health, 100);
  const a = w.bots[0];
  p.x = 10;
  p.y = 10;
  p.shield = 0;
  p.health = 90;
  a.x = 11;
  a.y = 10;
  a.shield = 0;
  assert.match(act(w, { type: "eat" }), /Recovered 10/);
  assert.equal(w.stats.smallMeals, 0);
});
test("a supplier receives learning credit only after another character uses its food", () => {
  const w = m.fresh(5, 8),
    b = depot(w),
    a = w.bots[0];
  a.x = 10;
  a.y = 10;
  a.food = 3;
  a.wood = 1;
  a.ore = 0;
  a.epsilon = 0;
  a.q.fill(-2);
  for (let s = 0; s < m.STATES; s++) a.q[s * N + 4] = 2;
  w.player.food = 0;
  w.player.health = 50;
  opening(w);
  m.step(w);
  assert.equal(b.food, 1);
  assert.equal(a.serviceHealth, 0);
  const record = b.foodOwners[0],
    before = a.q[record.state * N + record.action];
  assert.match(act(w, { type: "eat" }), /Recovered 30/);
  assert.equal(a.serviceHealth, 30);
  assert.ok(a.q[record.state * N + record.action] > before);
  assert.equal(w.stats.services, 1);
  balanced(w);
});
test("shots are funded in three-round charges and attacks share a one-second cadence", () => {
  const w = m.fresh(6, 8),
    p = w.player,
    b = w.bots[0];
  p.x = 10;
  p.y = 10;
  p.shield = 0;
  p.ore = 3;
  b.x = 11;
  b.y = 10;
  b.shield = 0;
  opening(w);
  assert.match(
    m.playerAction(w, { type: "attack", x: 11, y: 10 }),
    /2 shots remain/,
  );
  assert.equal(p.ore, 2);
  const health = b.health;
  assert.match(m.playerAction(w, { type: "attack", x: 11, y: 10 }), /Ready/);
  assert.equal(b.health, health);
  w.time += 1;
  assert.match(
    m.playerAction(w, { type: "attack", x: 11, y: 10 }),
    /1 shots remain/,
  );
  assert.equal(p.ore, 2);
  balanced(w);
});
test("a protected actor no longer shields vulnerable actors sharing its tile", () => {
  const w = m.fresh(7, 8),
    p = w.player,
    a = w.bots[0],
    b = w.bots[1];
  p.x = 10;
  p.y = 10;
  p.shield = 0;
  a.x = b.x = 11;
  a.y = b.y = 10;
  a.shield = 5;
  b.shield = 0;
  const health = b.health;
  act(w, { type: "attack", x: 11, y: 10 });
  assert.equal(a.health, 100);
  assert.equal(b.health, health - 20);
});
test("death loses half carried materials and preserves depots and their identities", () => {
  const w = m.fresh(8, 8),
    b = depot(w),
    p = w.player,
    n = w.nodes.find((n) => n.kind === "ore");
  p.x = n.x;
  p.y = n.y;
  p.health = 8;
  p.wood = 9;
  p.food = 3;
  p.ore = 4;
  opening(w);
  act(w, { type: "gather", x: n.x, y: n.y });
  assert.equal(p.x, 48);
  assert.equal(p.health, 100);
  assert.equal(p.deaths, 1);
  assert.equal(p.wood, 4);
  assert.equal(p.ore, 0);
  assert.equal(w.buildings[0], b);
  balanced(w);
});
test("descendants get fresh identities and cannot inherit a replaced rival’s depot limit", () => {
  const w = m.fresh(99, 16);
  w.bots.forEach((b, i) => {
    b.age = 100;
    b.serviceHealth = i * 10;
    b.food = 3;
  });
  const old = w.bots[0];
  for (let i = 0; i < 4; i++)
    w.buildings.push({
      x: 10 + i,
      y: 10,
      owner: old.id,
      lineage: old.lineage,
      food: 0,
      wood: 0,
      ore: 0,
      foodOwners: [],
      expires: 480,
      generation: 1,
      lastUsed: -1000,
      uses: 0,
    });
  opening(w);
  const max = w.nextId - 1,
    ids = new Set(w.bots.map((b) => b.id));
  m.evolve(w);
  const children = w.bots.filter((b) => !ids.has(b.id));
  assert.ok(children.length > 0);
  assert.ok(children.every((b) => b.id > max && b.generation === 2));
  assert.ok(
    w.buildings.every((b) => b.owner === old.id && b.lineage === old.lineage),
  );
  assert.ok(
    children.every(
      (c) => w.buildings.filter((b) => b.owner === c.id).length === 0,
    ),
  );
  balanced(w);
});
test("evolution cannot mint starter goods and requires food funding from parents", () => {
  const w = m.fresh(9, 16);
  w.bots.forEach((b) => {
    b.age = 100;
    b.food = 0;
  });
  opening(w);
  m.evolve(w);
  assert.equal(w.stats.births, 0);
  w.bots.forEach((b, i) => {
    b.food = 3;
    b.serviceHealth = i * 10;
  });
  opening(w);
  const before = m.totals(w);
  m.evolve(w);
  assert.ok(w.stats.births > 0);
  assert.ok(m.totals(w).food < before.food);
  assert.deepEqual(w.stats.introduced, { food: 0, wood: 0, ore: 0 });
  balanced(w);
});
test("population and resource pressure are explicit; resizing has an exact resource ledger", () => {
  const w = m.fresh(10, 64),
    interval = w.nodes[0].interval;
  m.setPopulation(w, 512);
  assert.ok(w.nodes[0].interval < interval);
  balanced(w);
  m.setPopulation(w, 64);
  balanced(w);
  const before = m.totals(w);
  m.setPressure(w, 1.5);
  assert.deepEqual(m.totals(w), before);
  balanced(w);
});
test("version-one worlds migrate without losing inventory, buildings or learned preferences", () => {
  const old = m.fresh(11, 8);
  old.version = 1;
  for (const a of [old.player, ...old.bots]) delete a.foodOrigins;
  old.player.wood = 25;
  old.player.food = 2;
  old.player.ore = 1;
  old.bots.forEach((a) => {
    a.q = new Float32Array(144 * 9).fill(0.7);
  });
  const migrated = m.restore(old);
  assert.ok(migrated && m.valid(migrated));
  assert.equal(old.version, 1);
  assert.equal(old.bots[0].q.length, 144 * 9);
  assert.equal(migrated.player.wood, 25);
  assert.ok(Math.abs(migrated.bots[0].q[0] - 0.7) < 1e-5);
  assert.equal(migrated.bots[0].q.length, m.STATES * N);
  balanced(migrated);
});
test("structured-clone saves preserve exact trajectories and corrupt policies are rejected", () => {
  const w = steps(m.fresh(12, 16), 100),
    saved = structuredClone(w);
  assert.ok(m.valid(saved));
  steps(w, 40);
  steps(saved, 40);
  assert.deepEqual(w, saved);
  const view = m.view(w);
  assert.ok(!("q" in view.bots[0]));
  saved.bots[0].q[0] = NaN;
  assert.equal(m.valid(saved), false);
  assert.equal(m.restore(saved), null);
  assert.equal(m.valid({ version: 2 }), false);
});
test("a 512-bot ten-minute world remains finite with useful meals and accountable flows", () => {
  const w = m.fresh(42, 512);
  steps(w, 2400);
  assert.ok(m.valid(w));
  balanced(w);
  assert.ok(w.totalUpdates > 100000);
  assert.ok(w.stats.healing / w.stats.meals > 20);
  assert.equal(w.stats.smallMeals, 0);
  assert.ok(w.buildings.length <= 1024);
  assert.ok(w.events.length <= 100);
});

test("bots draw timber and ore from nearby public stores instead of ignoring useful stock", () => {
  const w = m.fresh(14, 8),
    b = depot(w),
    a = w.bots[0];
  b.wood = 10;
  b.ore = 5;
  a.x = 10;
  a.y = 10;
  a.wood = 0;
  a.ore = 0;
  a.epsilon = 0;
  a.q.fill(-2);
  for (let s = 0; s < m.STATES; s++) a.q[s * N + 1] = 2;
  opening(w);
  m.step(w);
  assert.equal(a.wood, 3);
  assert.equal(b.wood, 7);
  a.q.fill(-2);
  for (let s = 0; s < m.STATES; s++) a.q[s * N + 2] = 2;
  steps(w, 4);
  assert.equal(a.ore, 3);
  assert.equal(b.ore, 2);
  balanced(w);
});
test("withdrawn food retains its original supplier credit until it is actually eaten", () => {
  const w = m.fresh(15, 8),
    b = depot(w),
    a = w.bots[0];
  a.x = 10;
  a.y = 10;
  a.food = 3;
  a.epsilon = 0;
  a.q.fill(-2);
  for (let s = 0; s < m.STATES; s++) a.q[s * N + 4] = 2;
  w.player.food = 0;
  w.player.health = 50;
  opening(w);
  m.step(w);
  assert.equal(b.food, 1);
  act(w, { type: "take", kind: "food", x: 10, y: 10 });
  assert.equal(b.food, 0);
  assert.equal(a.serviceHealth, 0);
  w.player.y = 9;
  act(w, { type: "eat" });
  assert.equal(a.serviceHealth, 30);
  assert.equal(w.stats.services, 1);
  assert.ok(b.lastUsed >= 0);
  balanced(w);
  assert.ok(m.valid(w));
});
