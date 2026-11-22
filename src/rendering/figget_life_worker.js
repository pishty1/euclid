// Appended to the model by scripts/generate-figget-worker.mjs.
let world = null,
  paused = true,
  clock = null,
  last = 0,
  pending = 0,
  lastView = 0,
  stepMs = 0,
  run = 0;
function publish(message = "") {
  self.postMessage({
    type: "view",
    run: run,
    view: engine.view(world),
    message: message,
    stepMs: stepMs,
  });
  lastView = performance.now();
}
function checkpoint(requestId) {
  self.postMessage({ type: "save", run: run, world: world, "requestId": requestId });
}
// This command runs in a separate, disposable worker. postMessage already
// cloned the snapshot on entry; clone it once more before changing either arm.
function compareWorlds(data) {
  const seconds = data["seconds"];
  const pressures = data["pressures"];
  if (![60, 180, 300].includes(seconds) || !Array.isArray(pressures) ||
      pressures.length !== 2 || !pressures.every(p => [0.75, 1, 1.5].includes(p))) {
    throw new Error("Unknown experiment settings");
  }
  const first = data["world"];
  const forks = [first, structuredClone(first)];
  const initialMeals = first["stats"]["services"];
  const initialDeaths = first["stats"]["deaths"];
  const startTime = first["time"];
  for (let i = 0; i < forks.length; i++) {
    if (pressures[i] !== forks[i]["pressure"]) engine.setPressure(forks[i], pressures[i]);
  }
  const steps = seconds / engine.DT;
  for (let n = 1; n <= steps; n++) {
    for (const fork of forks) engine.step(fork);
    if (n % (steps / 10) === 0) self.postMessage({"type": "progress", "value": n / steps});
  }
  self.postMessage({
    "type": "results",
    "startTime": startTime,
    "seconds": seconds,
    "worlds": forks.map(fork => ({
      "meals": fork["stats"]["services"] - initialMeals,
      "deaths": fork["stats"]["deaths"] - initialDeaths,
      "lineages": new Set(fork["bots"].map(bot => bot["lineage"])).size
    }))
  });
}

self.onmessage = function (event) {
  const data = event.data;
  if (data["type"] === "compare") {
    if (world) return;
    compareWorlds(data);
    return;
  }
  if (data["type"] === "init" || data["type"] === "reset") {
    run = data["run"];
    world =
      engine.restore(data["world"]) ||
      engine.fresh(data["seed"], data["count"]);
    paused = !!data["paused"];
    pending = 0;
    last = performance.now();
    publish();
    checkpoint();
    if (!clock)
      clock = setInterval(() => {
        if (!world) return;
        const now = performance.now(),
          delta = now - last;
        last = now;
        if (paused || delta > 1000) {
          pending = 0;
          return;
        }
        pending += Math.max(0, delta) / 1000;
        let steps = 0;
        while (pending >= engine.DT && steps < 4) {
          const start = performance.now();
          engine.step(world);
          stepMs = stepMs * 0.9 + (performance.now() - start) * 0.1;
          pending -= engine.DT;
          steps++;
        }
        if (steps && now - lastView >= 400) publish();
      }, 50);
    return;
  }
  if (!world || data["run"] !== run) return;
  if (data["type"] === "experiment-snapshot") {
    self.postMessage({"type":"experiment-snapshot", "run":run, "requestId":data["requestId"], "world":world});
    return;
  }
  if (data["type"] === "close") {
    paused = true;
    checkpoint(data["requestId"]);
  } else if (data["type"] === "pause") {
    paused = !!data["value"];
    pending = 0;
    last = performance.now();
    publish();
    if (paused) checkpoint();
  } else if (data["type"] === "action" && !paused)
    publish(engine.playerAction(world, data["action"]));
  else if (data["type"] === "population") {
    engine.setPopulation(world, data["count"]);
    publish();
  } else if (data["type"] === "pressure") {
    engine.setPressure(world, data["value"]);
    publish();
  } else if (data["type"] === "evolution") {
    world["evolution"] = !!data["value"];
    publish();
  } else if (data["type"] === "learning") {
    world["learning"] = !!data["value"];
    for (const a of world["bots"]) a["pending"] = null;
    publish();
  } else if (data["type"] === "save") checkpoint();
};
