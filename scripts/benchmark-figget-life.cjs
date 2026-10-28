// Outcome benchmark. Use --controls for matched learning-on/off runs without selection.
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  crypto = require("node:crypto");
const modelPath = path.resolve(
    __dirname,
    "../src/rendering/figget_life_model.js",
  ),
  m = require(modelPath),
  args = process.argv.slice(2);
const option = (key, fallback) => {
  const i = args.indexOf(key);
  return i < 0 ? fallback : args[i + 1];
};
const seconds = Number(option("--seconds", "1800")),
  counts = option("--counts", "64,128,512").split(",").map(Number),
  seeds = option("--seeds", "7,42,99").split(",").map(Number),
  output = option("--out", "/tmp/figget-life-benchmark.json");
if (
  !Number.isFinite(seconds) ||
  seconds <= 0 ||
  counts.some((n) => !Number.isInteger(n) || n < 8 || n > 512) ||
  seeds.some((n) => !Number.isInteger(n))
)
  throw new Error("Invalid benchmark parameters");
fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
const result = {
  modelVersion: 2,
  modelHash: crypto
    .createHash("sha256")
    .update(fs.readFileSync(modelPath))
    .digest("hex"),
  seconds,
  player: "idle in sanctuary",
  terrain: "fixed spatial map; seeds vary decisions and spawn jitter",
  runs: [],
};
function run(count, seed, learning = true, evolution = true) {
  const w = m.fresh(seed, count);
  w.learning = learning;
  w.evolution = evolution;
  for (let i = 0; i < Math.ceil(seconds / m.DT); i++) m.step(w);
  const stock = {};
  for (const n of w.nodes) {
    stock[n.kind] ??= { stock: 0, capacity: 0 };
    stock[n.kind].stock += n.stock;
    stock[n.kind].capacity += n.capacity;
  }
  assert.ok(m.valid(w));
  assert.deepEqual(m.ledger(w), { food: 0, wood: 0, ore: 0 });
  const r = {
    count,
    seed,
    learning,
    evolution,
    time: w.time,
    woodLocked: w.bots.filter(
      (a) => a.wood === 30 && a.food === 0 && a.ore === 0,
    ).length,
    meals: w.stats.meals,
    meanHealing: w.stats.meals ? w.stats.healing / w.stats.meals : 0,
    smallMeals: w.stats.smallMeals,
    services: w.stats.services,
    births: w.stats.births,
    attacks: w.stats.attacks,
    kills: w.stats.kills,
    deaths: w.stats.deaths,
    depots: w.buildings.length,
    stocks: stock,
    updates: w.totalUpdates,
    meanHealth: w.bots.reduce((n, a) => n + a.health, 0) / count,
    ledger: m.ledger(w),
    valid: true,
  };
  result.runs.push(r);
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify({ ...r, stocks: undefined }));
}
for (const count of counts) for (const seed of seeds) run(count, seed);
if (args.includes("--controls"))
  for (const seed of seeds) {
    run(128, seed, true, false);
    run(128, seed, false, false);
  }
