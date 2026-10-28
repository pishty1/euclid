// Version 2: local learning, accountable resource flows and useful services.
// Quoted save/message keys stay stable under advanced compilation.
const SIZE = 96,
  DT = 0.25,
  MAX_BOTS = 512,
  STATES = 576;
const ACTIONS = [
  "forage",
  "harvest",
  "mine",
  "build",
  "supply",
  "raid",
  "recover",
  "explore",
  "home",
  "manage",
];
const N = ACTIONS.length;
const COLORS = [
  "#e4b37e",
  "#a6c9ff",
  "#b6df99",
  "#dab0ed",
  "#ed9fac",
  "#91d7d5",
  "#dbd387",
  "#bca996",
];
const KINDS = ["food", "wood", "ore"],
  TARGET = { "food": 3, "wood": 8, "ore": 3 },
  LIMIT = { "food": 12, "wood": 30, "ore": 12 };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const key = (x, y) => y * SIZE + x;
const distance = (a, b) =>
  Math.abs(a["x"] - b["x"]) + Math.abs(a["y"] - b["y"]);
const pack = (a) => a["wood"] + a["food"] + a["ore"];
const empty = () => ({ "food": 0, "wood": 0, "ore": 0 });
function random(w) {
  let n = w["rng"] | 0;
  n ^= n << 13;
  n ^= n >>> 17;
  n ^= n << 5;
  w["rng"] = n >>> 0;
  return w["rng"] / 4294967296;
}
function hash(x, y) {
  let n = Math.imul(x + 137, 374761393) ^ Math.imul(y + 71, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
function region(x, y) {
  return hash(Math.floor(x / 12), Math.floor(y / 12));
}
function actor(id, x, y, lineage = 0) {
  return {
    "id": id,
    "x": x,
    "y": y,
    "homeX": x,
    "homeY": y,
    "lineage": lineage,
    "generation": 1,
    "health": 100,
    "wood": 4,
    "food": 2,
    "ore": 1,
    "fitness": 0,
    "age": 0,
    "kills": 0,
    "deaths": 0,
    "gathers": 0,
    "delivered": 0,
    "built": 0,
    "last": -1,
    "readyAt": 0,
    "charges": 0,
    "shield": 5,
    "intent": "explore",
    "epsilon": 0.2,
    "alpha": 0.14,
    "gamma": 0.97,
    "aggression": 1,
    "q": id ? new Float32Array(STATES * N) : null,
    "updates": 0,
    "pending": null,
    "decision": null,
    "visited": [],
    "foodOrigins": [],
    "healed": 0,
    "serviceHealth": 0,
    "losses": 0,
    "lastHurt": -100,
  };
}
function event(w, a, text, x = a["x"], y = a["y"]) {
  w["events"].push({
    "id": ++w["eventId"],
    "time": w["time"],
    "actor": a["id"],
    "lineage": a["lineage"],
    "generation": a["generation"],
    "text": text,
    "x": x,
    "y": y,
  });
  if (w["events"].length > 100) w["events"].shift();
}
function stats() {
  return {
    "opening": empty(),
    "regrown": empty(),
    "introduced": empty(),
    "consumed": empty(),
    "lost": empty(),
    "meals": 0,
    "healing": 0,
    "smallMeals": 0,
    "services": 0,
    "repairs": 0,
    "births": 0,
    "attacks": 0,
    "kills": 0,
    "populationChanges": 0,
    "deaths": 0,
  };
}
function book(w, category, kind, amount) {
  if (amount > 0 && w["stats"]) w["stats"][category][kind] += amount;
}
function totals(w) {
  const t = empty();
  for (const a of [w["player"], ...w["bots"], ...w["buildings"]])
    for (const k of KINDS) t[k] += a[k] || 0;
  for (const n of w["nodes"]) t[n["kind"]] += n["stock"];
  return t;
}
function ledger(w) {
  const t = totals(w),
    s = w["stats"],
    result = {};
  for (const k of KINDS)
    result[k] =
      s["opening"][k] +
      s["regrown"][k] +
      s["introduced"][k] -
      s["consumed"][k] -
      s["lost"][k] -
      t[k];
  return result;
}
function decode(s) {
  return {
    "health": Math.floor(s / 192),
    "food": Math.floor(s / 96) % 2,
    "ore": Math.floor(s / 48) % 2,
    "wood": Math.floor(s / 24) % 2,
    "full": Math.floor(s / 12) % 2,
    "tile": Math.floor(s / 2) % 6,
    "rival": s % 2,
  };
}
function initBrain(a) {
  for (let s = 0; s < STATES; s++) {
    const d = decode(s),
      i = s * N;
    a["q"][i] = d["food"] ? 0 : 0.4;
    a["q"][i + 1] = d["wood"] ? 0 : 0.3;
    a["q"][i + 2] = d["ore"] ? 0.05 : 0.4;
    a["q"][i + 3] = d["ore"] && d["wood"] ? 0.2 : -0.2;
    a["q"][i + 4] = 0.04;
    a["q"][i + 5] = d["rival"] && d["health"] === 2 ? 0.12 : -0.15;
    a["q"][i + 6] = d["health"] < 2 ? 0.7 : -0.2;
    a["q"][i + 7] = 0.04;
    a["q"][i + 8] = -0.1;
    a["q"][i + 9] = d["full"] ? 0.8 : 0.05;
  }
}
function spawn(w, id) {
  const clan = 1 + ((id - 1) % 8),
    angle = ((clan - 1) * Math.PI) / 4,
    r = 17 + ((clan * 7) % 15),
    hx = clamp(Math.round(48 + Math.cos(angle) * r), 5, 90),
    hy = clamp(Math.round(48 + Math.sin(angle) * r), 5, 90);
  const a = actor(
    id,
    clamp(hx + Math.floor(random(w) * 13) - 6, 1, 94),
    clamp(hy + Math.floor(random(w) * 13) - 6, 1, 94),
    clan,
  );
  a["homeX"] = hx;
  a["homeY"] = hy;
  a["epsilon"] = 0.12 + random(w) * 0.2;
  a["aggression"] = 0.6 + random(w) * 0.8;
  initBrain(a);
  return a;
}
function rescale(w) {
  const scale = clamp(w["bots"].length / 128, 0.25, 4) / (w["pressure"] || 1);
  for (const n of w["nodes"]) {
    const r = region(n["x"], n["y"]);
    n["baseInterval"] =
      (n["kind"] === "food" ? 90 : n["kind"] === "wood" ? 45 : 55) /
      (r < 0.3 ? 0.45 : r > 0.7 ? 1.6 : 1);
    n["interval"] = n["baseInterval"] / scale;
    n["targetCapacity"] = Math.max(2, Math.ceil(5 * scale));
    n["capacity"] = Math.max(n["stock"], n["targetCapacity"]);
    n["next"] = Math.min(n["next"], w["time"] + n["interval"] / n["soil"]);
  }
}
function fresh(seed = 42, count = 128) {
  const w = {
    "version": 2,
    "rng": seed >>> 0 || 42,
    "seed": seed >>> 0,
    "time": 0,
    "tick": 0,
    "player": actor(0, 48, 48),
    "bots": [],
    "nodes": [],
    "buildings": [],
    "events": [],
    "eventId": 0,
    "nextId": 1,
    "generation": 1,
    "nextEvolution": 180,
    "learning": true,
    "evolution": true,
    "history": [],
    "nextHistory": 0,
    "retired": 0,
    "totalUpdates": 0,
    "pressure": 1,
    "stats": null,
  };
  for (let y = 2; y < SIZE - 1; y += 3)
    for (let x = 2; x < SIZE - 1; x += 3) {
      if (Math.abs(x - 48) + Math.abs(y - 48) < 5) continue;
      const r = region(x, y);
      if (hash(x, y) < (r < 0.3 ? 0.6 : 0.12)) continue;
      const kind =
        hash(x + 202, y + 91) < 0.45
          ? "food"
          : hash(x + 67, y + 11) < 0.7
            ? "wood"
            : "ore";
      w["nodes"].push({
        "x": x,
        "y": y,
        "kind": kind,
        "stock": 0,
        "next": 0,
        "interval": 1,
        "soil": 1,
      });
    }
  setPopulation(w, count);
  for (const n of w["nodes"]) {
    n["stock"] = n["capacity"];
    n["next"] = n["interval"];
  }
  w["stats"] = stats();
  w["stats"]["opening"] = totals(w);
  event(w, w["player"], "arrived at the sanctuary");
  return w;
}
function setPopulation(w, count) {
  count = clamp(Math.round(Number(count) || 32), 8, MAX_BOTS);
  const before = w["bots"].length;
  while (w["bots"].length < count) {
    const a = spawn(w, w["nextId"]++);
    w["bots"].push(a);
    for (const k of KINDS) book(w, "introduced", k, a[k]);
  }
  if (w["bots"].length > count) {
    for (const a of w["bots"].slice(count))
      for (const k of KINDS) book(w, "lost", k, a[k]);
    w["retired"] += w["bots"].length - count;
    w["bots"].length = count;
  }
  rescale(w);
  if (w["stats"] && before !== count) {
    w["stats"]["populationChanges"]++;
    event(
      w,
      w["player"],
      "population changed by you: " + before + " → " + count,
    );
  }
  return count;
}
function setPressure(w, value) {
  w["pressure"] = clamp(Number(value) || 1, 0.5, 2);
  rescale(w);
}
function index(w) {
  const agents = new Map(),
    nodes = new Map(),
    buildings = new Map(),
    byId = new Map();
  for (const a of [w["player"], ...w["bots"]]) {
    const k = key(a["x"], a["y"]);
    if (!agents.has(k)) agents.set(k, []);
    agents.get(k).push(a);
    byId.set(a["id"], a);
  }
  for (const n of w["nodes"]) nodes.set(key(n["x"], n["y"]), n);
  for (const b of w["buildings"]) buildings.set(key(b["x"], b["y"]), b);
  return { agents, nodes, buildings, byId };
}
function safe(a) {
  return Math.abs(a["x"] - 48) + Math.abs(a["y"] - 48) <= 3 || a["shield"] > 0;
}
function enemy(a, b) {
  return (
    a["id"] !== b["id"] &&
    (a["id"] === 0 || b["id"] === 0 || a["lineage"] !== b["lineage"])
  );
}
function nearest(map, a, predicate, radius = 12) {
  if (!map.size) return null;
  for (let r = 0; r <= radius; r++) {
    for (let dx = -r; dx <= r; dx++)
      for (const dy of r - Math.abs(dx) === 0
        ? [0]
        : [r - Math.abs(dx), -(r - Math.abs(dx))]) {
        const x = a["x"] + dx,
          y = a["y"] + dy;
        if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) continue;
        const entry = map.get(key(x, y));
        if (entry)
          for (const p of Array.isArray(entry) ? entry : [entry])
            if (predicate(p)) return p;
      }
  }
  return null;
}
function move(w, a, dx, dy, idx) {
  if (
    !Number.isInteger(dx) ||
    !Number.isInteger(dy) ||
    Math.abs(dx) + Math.abs(dy) !== 1
  )
    return false;
  const x = a["x"] + dx,
    y = a["y"] + dy;
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return false;
  const dest = idx.agents.get(key(x, y)) || [];
  if (dest.length >= 4) return false;
  const old = idx.agents.get(key(a["x"], a["y"]));
  if (old) {
    const i = old.indexOf(a);
    if (i >= 0) old.splice(i, 1);
  }
  a["x"] = x;
  a["y"] = y;
  dest.push(a);
  idx.agents.set(key(x, y), dest);
  return true;
}
function towards(w, a, target, idx) {
  const dx = target["x"] - a["x"],
    dy = target["y"] - a["y"];
  if (!dx && !dy) return true;
  const choices =
    Math.abs(dx) >= Math.abs(dy)
      ? [
          [Math.sign(dx), 0],
          [0, Math.sign(dy)],
        ]
      : [
          [0, Math.sign(dy)],
          [Math.sign(dx), 0],
        ];
  for (const [x, y] of choices)
    if ((x || y) && move(w, a, x, y, idx)) return true;
  return false;
}
function respawn(w, a, idx) {
  const old = idx.agents.get(key(a["x"], a["y"]));
  if (old) {
    const i = old.indexOf(a);
    if (i >= 0) old.splice(i, 1);
  }
  event(w, a, "died and respawned");
  a["health"] = 100;
  a["deaths"]++;
  w["stats"]["deaths"]++;
  a["losses"] += 3;
  a["charges"] = 0;
  for (const k of KINDS) {
    const kept = k === "ore" ? 0 : Math.floor(a[k] / 2);
    book(w, "lost", k, a[k] - kept);
    a[k] = kept;
    if (k === "food") a["foodOrigins"] = a["foodOrigins"].slice(0, kept);
  }
  a["x"] = a["homeX"];
  a["y"] = a["homeY"];
  a["shield"] = 8;
  const k = key(a["x"], a["y"]);
  if (!idx.agents.has(k)) idx.agents.set(k, []);
  idx.agents.get(k).push(a);
}
function utility(a) {
  return (
    a["health"] * 0.015 +
    Math.min(3, a["food"]) * 0.22 +
    Math.min(8, a["wood"]) * 0.1 +
    Math.min(3, a["ore"]) * 0.22 +
    a["charges"] * 0.07
  );
}
function fitness(a) {
  return (
    utility(a) +
    a["healed"] * 0.005 +
    a["serviceHealth"] * 0.015 +
    Math.min(180, a["age"]) / 900 -
    a["losses"]
  );
}
function gather(w, a, n) {
  if (!n || distance(a, n) > 1 || n["stock"] < 1 || pack(a) >= 30)
    return {
      "reward": -0.08,
      "message":
        "Stand beside stocked resources. Pack full? Use Inventory to store or discard materials.",
    };
  n["stock"]--;
  n["capacity"] = Math.max(n["stock"], n["targetCapacity"]);
  n["soil"] = Math.max(0.45, n["soil"] - 0.06);
  a[n["kind"]]++;
  a["gathers"]++;
  if (a["id"] !== 0 && a["gathers"] % 12 === 1)
    event(w, a, "gathered " + n["kind"]);
  if (n["kind"] === "ore") a["health"] -= 8;
  return {
    "reward": 0,
    "message":
      "Gathered " + n["kind"] + (n["kind"] === "ore" ? " · −8 health." : "."),
  };
}
function buildable(w, a, idx) {
  return (
    a["wood"] >= 6 &&
    a["ore"] >= 1 &&
    w["buildings"].filter((b) => b["owner"] === a["id"]).length < 4 &&
    w["buildings"].length < 1024 &&
    Math.abs(a["x"] - 48) + Math.abs(a["y"] - 48) > 3 &&
    !idx.nodes.has(key(a["x"], a["y"])) &&
    !idx.buildings.has(key(a["x"], a["y"]))
  );
}
function build(w, a, idx) {
  if (!buildable(w, a, idx))
    return {
      "reward": -0.08,
      "message":
        "Build on open ground: 6 wood + 1 ore; four depots per character.",
    };
  a["wood"] -= 6;
  a["ore"]--;
  book(w, "consumed", "wood", 6);
  book(w, "consumed", "ore", 1);
  a["built"]++;
  const b = {
    "x": a["x"],
    "y": a["y"],
    "owner": a["id"],
    "lineage": a["lineage"],
    "food": 0,
    "wood": 0,
    "ore": 0,
    "foodOwners": [],
    "expires": w["time"] + 480,
    "generation": a["generation"],
    "lastUsed": -1000,
    "uses": 0,
  };
  w["buildings"].push(b);
  idx.buildings.set(key(b["x"], b["y"]), b);
  event(w, a, "built a depot");
  return {
    "reward": 0.02,
    "message":
      "Depot built. Store any material here; repair it separately with timber.",
  };
}
function contribution(w, a, b = null) {
  return {
    "id": a["id"],
    "state": a["decision"]?.["state"] ?? -1,
    "action": a["decision"]?.["action"] ?? -1,
    "time": w["time"],
    "x": b ? b["x"] : null,
    "y": b ? b["y"] : null,
  };
}
function transfer(w, a, b, kind, withdraw = false, amount = 5) {
  if (!KINDS.includes(kind) || !b || distance(a, b) > 1)
    return {
      "reward": -0.08,
      "message": "Select an adjacent depot and a material.",
    };
  const qty = Math.max(
    0,
    Math.min(
      amount,
      withdraw ? b[kind] : a[kind],
      withdraw ? 30 - pack(a) : LIMIT[kind] - b[kind],
    ),
  );
  if (!qty)
    return {
      "reward": -0.05,
      "message": withdraw
        ? "No room in your pack, or this store is empty."
        : "No material to store, or this depot is full.",
    };
  if (withdraw) {
    b[kind] -= qty;
    a[kind] += qty;
    if (kind === "food")
      a["foodOrigins"].push(...b["foodOwners"].splice(0, qty));
  } else {
    a[kind] -= qty;
    b[kind] += qty;
    if (kind === "food")
      for (let i = 0; i < qty; i++) {
        const origin = a["foodOrigins"].shift() || contribution(w, a, b);
        b["foodOwners"].push({ ...origin, "x": b["x"], "y": b["y"] });
      }
  }
  return {
    "reward": 0,
    "message": (withdraw ? "Took " : "Stored ") + qty + " " + kind + ".",
  };
}
function discard(w, a, kind, amount = 5) {
  if (!KINDS.includes(kind))
    return { "reward": -0.08, "message": "Choose food, timber or ore." };
  const qty = Math.min(amount, a[kind]);
  if (!qty)
    return { "reward": -0.05, "message": "None of that material is carried." };
  a[kind] -= qty;
  if (kind === "food") a["foodOrigins"].splice(0, qty);
  book(w, "lost", kind, qty);
  return {
    "reward": -0.02,
    "message": "Discarded " + qty + " " + kind + " to free pack space.",
  };
}
function supply(w, a, b) {
  if (!b || distance(a, b) > 1 || a["food"] < 1 || b["food"] >= 12)
    return {
      "reward": -0.06,
      "message":
        "Supply one food to an adjacent depot. Use Repair when its food store is full.",
    };
  transfer(w, a, b, "food", false, 1);
  a["delivered"]++;
  if (a["id"] === 0 || a["delivered"] % 4 === 1)
    event(w, a, "stocked a depot", b["x"], b["y"]);
  return {
    "reward": 0,
    "message":
      "Food stocked. Useful meals earn the supplier credit; stocking does not repair the building.",
  };
}
function repair(w, a, b) {
  if (!b || distance(a, b) > 1 || a["wood"] < 1)
    return {
      "reward": -0.06,
      "message": "Repair an adjacent depot with one timber.",
    };
  if (b["expires"] - w["time"] > 240)
    return {
      "reward": -0.03,
      "message": "This depot has over four minutes left; no repair needed yet.",
    };
  a["wood"]--;
  book(w, "consumed", "wood", 1);
  b["expires"] = Math.min(w["time"] + 480, b["expires"] + 240);
  w["stats"]["repairs"]++;
  return {
    "reward": b["lastUsed"] > w["time"] - 120 ? 0.08 : 0,
    "message": "Repaired for one timber, including when the stores are full.",
  };
}
function canEat(w, a, idx) {
  return (
    a["health"] <= 75 ||
    (a["health"] <= 90 &&
      !!nearest(idx.agents, a, (b) => enemy(a, b) && !safe(b), 2))
  );
}
function eat(w, a, b, idx) {
  if (!canEat(w, a, idx))
    return {
      "reward": -0.04,
      "message": "Save food for 25 missing health, or 10 during nearby danger.",
    };
  let donor = null,
    fromDepot = false;
  if (a["food"] > 0) {
    a["food"]--;
    donor = a["foodOrigins"].shift() || null;
  } else if (b && distance(a, b) <= 1 && b["food"] > 0) {
    b["food"]--;
    fromDepot = true;
    donor = b["foodOwners"].shift();
    b["lastUsed"] = w["time"];
    b["uses"]++;
    w["stats"]["services"]++;
  } else
    return {
      "reward": -0.06,
      "message": "Gather food or find a stocked depot.",
    };
  book(w, "consumed", "food", 1);
  const restored = Math.min(30, 100 - a["health"]);
  a["health"] += restored;
  a["healed"] += restored;
  w["stats"]["meals"]++;
  w["stats"]["healing"] += restored;
  if (restored < 5) w["stats"]["smallMeals"]++;
  if (donor && donor["id"] !== a["id"]) {
    if (!fromDepot) {
      w["stats"]["services"]++;
      if (Number.isInteger(donor["x"]) && Number.isInteger(donor["y"])) {
        const source = idx.buildings.get(key(donor["x"], donor["y"]));
        if (source) {
          source["lastUsed"] = w["time"];
          source["uses"]++;
        }
      }
    }
    const provider = idx.byId.get(donor["id"]);
    if (provider) {
      provider["serviceHealth"] += restored;
      if (
        w["learning"] &&
        provider["q"] &&
        donor["state"] >= 0 &&
        donor["state"] < STATES &&
        donor["action"] >= 0 &&
        donor["action"] < N
      ) {
        const i = donor["state"] * N + donor["action"];
        provider["q"][i] = clamp(
          provider["q"][i] +
            provider["alpha"] *
              restored *
              0.01 *
              Math.pow(
                provider["gamma"],
                Math.min(30, w["time"] - donor["time"]),
              ),
          -20,
          20,
        );
        provider["updates"]++;
        w["totalUpdates"]++;
      }
    }
  }
  return {
    "reward": 0,
    "message": "Recovered " + Math.round(restored) + " health.",
  };
}
function attack(w, a, target, idx) {
  if (!target || distance(a, target) > 1 || !enemy(a, target))
    return { "reward": -0.08, "message": "Stand next to a rival to attack." };
  if (safe(a) || safe(target))
    return {
      "reward": -0.08,
      "message": "Sanctuary and newly spawned characters are protected.",
    };
  if (!a["charges"]) {
    if (a["ore"] < 1)
      return { "reward": -0.06, "message": "One ore loads three shots." };
    a["ore"]--;
    book(w, "consumed", "ore", 1);
    a["charges"] = 3;
  }
  a["charges"]--;
  target["health"] -= 20;
  target["lastHurt"] = w["time"];
  w["stats"]["attacks"]++;
  event(
    w,
    a,
    "attacked " + (target["id"] === 0 ? "you" : "bot " + target["id"]),
    target["x"],
    target["y"],
  );
  let reward = 0;
  if (target["health"] <= 0) {
    for (const k of KINDS) {
      const loot = Math.min(2, target[k], 30 - pack(a));
      a[k] += loot;
      target[k] -= loot;
      if (k === "food")
        a["foodOrigins"].push(...target["foodOrigins"].splice(0, loot));
    }
    a["kills"]++;
    w["stats"]["kills"]++;
    respawn(w, target, idx);
  }
  return {
    reward,
    "message": "Hit rival · 20 damage · " + a["charges"] + " shots remain.",
  };
}
function state(w, a, idx) {
  const h = a["health"] < 35 ? 0 : a["health"] < 75 ? 1 : 2,
    food = a["food"] > 0 ? 1 : 0,
    ore = a["ore"] > 0 ? 1 : 0,
    wood = a["wood"] >= 6 ? 1 : 0,
    full = pack(a) >= 27 ? 1 : 0,
    n = nearest(idx.nodes, a, (n) => n["stock"] > 0, 1),
    b = nearest(idx.buildings, a, () => true, 1),
    tile = b
      ? b["lineage"] === a["lineage"]
        ? 4
        : 5
      : n
        ? { "food": 1, "wood": 2, "ore": 3 }[n["kind"]]
        : 0,
    rival = nearest(idx.agents, a, (b) => enemy(a, b) && !safe(b), 2) ? 1 : 0;
  return (
    (((((h * 2 + food) * 2 + ore) * 2 + wood) * 2 + full) * 6 + tile) * 2 +
    rival
  );
}
function excess(a) {
  return KINDS.some((k) => a[k] > TARGET[k]);
}
function legalActions(w, a, idx) {
  const room = 30 - pack(a),
    reserve = (a["food"] === 0 ? 1 : 0) + (a["ore"] === 0 ? 1 : 0),
    depot = idx.buildings.size
      ? nearest(
          idx.buildings,
          a,
          (b) => b["food"] < 4 && b["expires"] - w["time"] > 30,
        )
      : null,
    healing = idx.buildings.size
      ? nearest(idx.buildings, a, (b) => b["food"] > 0)
      : null,
    maintenance = idx.buildings.size
      ? nearest(
          idx.buildings,
          a,
          (b) =>
            b["expires"] - w["time"] <= 240 &&
            (b["food"] > 0 ||
              b["wood"] > 0 ||
              b["ore"] > 0 ||
              b["lastUsed"] > w["time"] - 120),
        )
      : null,
    target =
      !safe(a) &&
      (a["ore"] > 0 || a["charges"] > 0) &&
      a["health"] >= clamp(65 - 30 * a["aggression"], 20, 55)
        ? nearest(idx.agents, a, (b) => enemy(a, b) && !safe(b), 8)
        : null;
  return [
    room > 0 && a["food"] < 4,
    room > reserve && a["wood"] < 10,
    room > 0 && a["ore"] < 3 && a["health"] > 20,
    buildable(w, a, idx) &&
      !nearest(idx.buildings, a, () => true, 4) &&
      !!nearest(idx.nodes, a, (n) => n["stock"] > 0, 4),
    a["food"] > 1 && !!depot,
    !!target,
    canEat(w, a, idx) && (a["food"] > 0 || !!healing),
    true,
    a["health"] < 50 &&
      a["lastHurt"] > w["time"] - 15 &&
      (a["x"] !== a["homeX"] || a["y"] !== a["homeY"]),
    excess(a) || (a["wood"] > 0 && !!maintenance),
  ];
}
function choose(w, a, s, mask) {
  const options = [];
  for (let k = 0; k < N; k++) if (mask[k]) options.push(k);
  if (random(w) < a["epsilon"])
    return options[Math.floor(random(w) * options.length)];
  let best = -Infinity,
    chosen = 7,
    ties = 0;
  for (const k of options) {
    const v = a["q"][s * N + k];
    if (v > best + 1e-6) {
      best = v;
      chosen = k;
      ties = 1;
    } else if (Math.abs(v - best) < 1e-6 && random(w) < 1 / ++ties) chosen = k;
  }
  return chosen;
}
function learn(a, s, action, reward, next, terminal = false, mask = null) {
  if (
    !Number.isInteger(s) ||
    s < 0 ||
    s >= STATES ||
    !Number.isInteger(next) ||
    next < 0 ||
    next >= STATES ||
    action < 0 ||
    action >= N
  )
    return;
  let max = -Infinity;
  for (let i = 0; i < N; i++)
    if (!mask || mask[i]) max = Math.max(max, a["q"][next * N + i]);
  if (!Number.isFinite(max)) max = 0;
  const i = s * N + action;
  a["q"][i] = clamp(
    a["q"][i] +
      a["alpha"] * (reward + (terminal ? 0 : a["gamma"] * max) - a["q"][i]),
    -20,
    20,
  );
  a["updates"]++;
}
function wander(w, a, idx) {
  const dir = Math.floor(random(w) * 4),
    dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
  return move(w, a, ...dirs[dir], idx);
}
function manage(w, a, idx) {
  const needed = nearest(
    idx.buildings,
    a,
    (b) =>
      b["expires"] - w["time"] <= 240 &&
      (b["food"] + b["wood"] + b["ore"] > 0 || b["lastUsed"] > w["time"] - 120),
  );
  if (needed && a["wood"] > 0) {
    if (distance(a, needed) <= 1) return repair(w, a, needed)["reward"];
    return towards(w, a, needed, idx) ? 0 : -0.05;
  }
  const kind = [...KINDS]
    .sort((x, y) => a[y] - TARGET[y] - (a[x] - TARGET[x]))
    .find((k) => a[k] > TARGET[k]);
  if (!kind) return -0.03;
  const b = nearest(idx.buildings, a, (b) => b[kind] < LIMIT[kind]);
  if (b) {
    if (distance(a, b) <= 1)
      return transfer(
        w,
        a,
        b,
        kind,
        false,
        Math.min(5, a[kind] - TARGET[kind]),
      )["reward"];
    return towards(w, a, b, idx) ? 0 : -0.05;
  }
  return discard(w, a, kind, Math.min(5, a[kind] - TARGET[kind]))["reward"];
}
function macro(w, a, choice, idx) {
  a["intent"] = ACTIONS[choice];
  if (choice < 3) {
    const kind = ["food", "wood", "ore"][choice],
      n = nearest(idx.nodes, a, (n) => n["kind"] === kind && n["stock"] > 0);
    const store = nearest(idx.buildings, a, (b) => b[kind] > 0);
    if (store && (!n || distance(a, store) < distance(a, n))) {
      if (distance(a, store) <= 1)
        return transfer(
          w,
          a,
          store,
          kind,
          true,
          Math.max(1, Math.min(3, TARGET[kind] - a[kind])),
        )["reward"];
      return towards(w, a, store, idx) ? 0 : -0.05;
    }
    if (!n) {
      wander(w, a, idx);
      return -0.02;
    }
    return distance(a, n) <= 1
      ? gather(w, a, n)["reward"]
      : towards(w, a, n, idx)
        ? 0
        : -0.05;
  }
  if (choice === 3) return build(w, a, idx)["reward"];
  if (choice === 4) {
    const b = nearest(
      idx.buildings,
      a,
      (b) => b["food"] < 4 && b["expires"] - w["time"] > 30,
    );
    return b
      ? distance(a, b) <= 1
        ? supply(w, a, b)["reward"]
        : towards(w, a, b, idx)
          ? 0
          : -0.05
      : -0.05;
  }
  if (choice === 5) {
    const b = nearest(idx.agents, a, (b) => enemy(a, b) && !safe(b), 8);
    return b
      ? distance(a, b) <= 1
        ? attack(w, a, b, idx)["reward"]
        : towards(w, a, b, idx)
          ? 0
          : -0.05
      : -0.05;
  }
  if (choice === 6) {
    if (a["food"] > 0) return eat(w, a, null, idx)["reward"];
    const b = nearest(idx.buildings, a, (b) => b["food"] > 0);
    return b
      ? distance(a, b) <= 1
        ? eat(w, a, b, idx)["reward"]
        : towards(w, a, b, idx)
          ? 0
          : -0.05
      : -0.05;
  }
  if (choice === 8)
    return towards(w, a, { "x": a["homeX"], "y": a["homeY"] }, idx) ? 0 : -0.05;
  if (choice === 9) return manage(w, a, idx);
  const k = key(a["x"], a["y"]),
    novel = !a["visited"].includes(k);
  a["visited"].push(k);
  if (a["visited"].length > 32) a["visited"].shift();
  return wander(w, a, idx) ? (novel ? 0.005 : 0) : -0.05;
}
function evolve(w) {
  if (!w["evolution"] || w["bots"].length < 8) return;
  const ranked = w["bots"]
    .filter((a) => a["age"] >= 90)
    .sort((a, b) => fitness(b) - fitness(a));
  if (ranked.length < 8) return;
  const parents = ranked.slice(0, Math.max(2, Math.ceil(ranked.length * 0.25))),
    n = Math.max(1, Math.floor(ranked.length * 0.125));
  let born = 0;
  for (const old of ranked.slice(-n)) {
    const funded = parents.filter((a) => a["food"] >= 2 && a["health"] >= 35);
    if (!funded.length) break;
    const parent = funded[Math.floor(random(w) * funded.length)],
      site = [
        { "x": parent["x"], "y": parent["y"] },
        { "x": parent["x"] - 1, "y": parent["y"] },
        { "x": parent["x"] + 1, "y": parent["y"] },
        { "x": parent["x"], "y": parent["y"] - 1 },
        { "x": parent["x"], "y": parent["y"] + 1 },
      ].find(
        (p) =>
          p["x"] >= 0 &&
          p["y"] >= 0 &&
          p["x"] < SIZE &&
          p["y"] < SIZE &&
          [w["player"], ...w["bots"]].filter(
            (a) => a["x"] === p["x"] && a["y"] === p["y"],
          ).length < 4,
      );
    if (!site) continue;
    const child = spawn(w, w["nextId"]++);
    child["food"] = 1;
    child["wood"] = Math.min(2, parent["wood"]);
    child["ore"] = Math.min(1, parent["ore"]);
    parent["food"] -= 2;
    parent["foodOrigins"].splice(0, 2);
    child["foodOrigins"] = [contribution(w, parent)];
    parent["wood"] -= child["wood"];
    parent["ore"] -= child["ore"];
    book(w, "consumed", "food", 1);
    for (const k of KINDS) book(w, "lost", k, old[k]);
    child["q"] = new Float32Array(parent["q"]);
    child["lineage"] = parent["lineage"];
    child["homeX"] = parent["homeX"];
    child["homeY"] = parent["homeY"];
    child["x"] = site["x"];
    child["y"] = site["y"];
    child["generation"] = parent["generation"] + 1;
    child["epsilon"] = clamp(
      parent["epsilon"] + (random(w) - 0.5) * 0.04,
      0.05,
      0.4,
    );
    child["aggression"] = clamp(
      parent["aggression"] + (random(w) - 0.5) * 0.15,
      0.3,
      1.8,
    );
    for (let i = 0; i < child["q"].length; i++)
      if (random(w) < 0.02)
        child["q"][i] = clamp(child["q"][i] + (random(w) - 0.5) * 0.2, -20, 20);
    w["bots"][w["bots"].indexOf(old)] = child;
    born++;
  }
  for (const a of w["bots"]) {
    a["healed"] *= 0.5;
    a["serviceHealth"] *= 0.5;
    a["losses"] *= 0.5;
    a["fitness"] = fitness(a);
  }
  if (born) {
    w["stats"]["births"] += born;
    w["generation"]++;
    event(
      w,
      w["player"],
      born + " resource-funded descendants joined the frontier",
    );
  }
}
function step(w) {
  w["time"] += DT;
  w["tick"]++;
  for (const n of w["nodes"]) {
    n["soil"] = Math.min(1, n["soil"] + 0.0005);
    if (w["time"] >= n["next"]) {
      if (n["stock"] < n["capacity"]) {
        n["stock"]++;
        book(w, "regrown", n["kind"], 1);
      }
      n["next"] = w["time"] + n["interval"] / n["soil"];
    }
  }
  w["buildings"] = w["buildings"].filter((b) => {
    if (b["expires"] > w["time"]) return true;
    for (const k of KINDS) book(w, "lost", k, b[k]);
    return false;
  });
  const idx = index(w);
  for (const a of [w["player"], ...w["bots"]]) {
    a["age"] += DT;
    a["shield"] = Math.max(0, a["shield"] - DT);
    a["health"] -= 0.0125;
    if (a["health"] <= 0) respawn(w, a, idx);
  }
  const cohort = w["bots"].filter((a) => a["id"] % 4 === w["tick"] % 4),
    start = cohort.length ? Math.floor(w["tick"] / 4) % cohort.length : 0;
  for (let i = 0; i < cohort.length; i++) {
    const a = cohort[(i + start) % cohort.length],
      s = state(w, a, idx),
      mask = legalActions(w, a, idx),
      prior = a["pending"];
    if (prior && w["learning"]) {
      learn(
        a,
        prior["state"],
        prior["choice"],
        prior["reward"] -
          Math.max(0, prior["health"] - a["health"]) * 0.015 -
          (a["deaths"] - prior["deaths"]) * 3,
        s,
        a["deaths"] !== prior["deaths"],
        mask,
      );
      w["totalUpdates"]++;
    }
    const choice = choose(w, a, s, mask),
      before = utility(a),
      health = a["health"],
      deaths = a["deaths"];
    a["decision"] = { "state": s, "action": choice };
    let reward = macro(w, a, choice, idx) - 0.006;
    a["decision"] = null;
    if (a["health"] <= 0) respawn(w, a, idx);
    reward +=
      choice === 9
        ? Math.min(0, (a["health"] - health) * 0.015)
        : utility(a) - before;
    if (a["deaths"] !== deaths) {
      if (w["learning"]) {
        learn(a, s, choice, reward - 3, state(w, a, idx), true);
        w["totalUpdates"]++;
      }
      a["pending"] = null;
    } else
      a["pending"] = w["learning"]
        ? {
            "state": s,
            "choice": choice,
            "reward": reward,
            "health": a["health"],
            "deaths": a["deaths"],
          }
        : null;
    a["fitness"] = fitness(a);
  }
  if (w["time"] >= w["nextEvolution"]) {
    evolve(w);
    w["nextEvolution"] += 180;
  }
  if (w["time"] >= w["nextHistory"]) {
    w["history"].push({
      "time": w["time"],
      "updates": w["totalUpdates"],
      "healing": w["stats"]["healing"],
      "services": w["stats"]["services"],
      "depots": w["buildings"].length,
      "generation": w["generation"],
    });
    if (w["history"].length > 120) w["history"].shift();
    w["nextHistory"] = w["time"] + 10;
  }
  return w;
}
function playerAction(w, command) {
  const a = w["player"],
    type = command["type"];
  if (w["time"] < a["readyAt"])
    return "Ready in " + (a["readyAt"] - w["time"]).toFixed(1) + "s.";
  const idx = index(w);
  let result;
  const b = idx.buildings.get(key(command["x"], command["y"]));
  if (type === "move")
    result = {
      "message": move(w, a, command["dx"], command["dy"], idx)
        ? "Moved."
        : "That route is blocked.",
    };
  else if (type === "gather")
    result = gather(w, a, idx.nodes.get(key(command["x"], command["y"])));
  else if (type === "build") result = build(w, a, idx);
  else if (type === "supply") result = supply(w, a, b);
  else if (type === "repair") result = repair(w, a, b);
  else if (type === "store") result = transfer(w, a, b, command["kind"]);
  else if (type === "take") result = transfer(w, a, b, command["kind"], true);
  else if (type === "discard") result = discard(w, a, command["kind"]);
  else if (type === "eat")
    result = eat(
      w,
      a,
      nearest(idx.buildings, a, (b) => b["food"] > 0, 1),
      idx,
    );
  else if (type === "attack") {
    const targets = (
        idx.agents.get(key(command["x"], command["y"])) || []
      ).filter((b) => enemy(a, b)),
      specific = targets.find((b) => b["id"] === command["target"]);
    result = attack(
      w,
      a,
      specific || targets.find((b) => !safe(b)) || targets[0],
      idx,
    );
  } else return "Choose a valid action.";
  if (a["health"] <= 0) respawn(w, a, idx);
  a["last"] = w["time"];
  a["readyAt"] = w["time"] + (type === "move" ? 0.5 : 1);
  if (type !== "move") event(w, a, result["message"]);
  return result["message"];
}
function view(w) {
  const strip = (a) => {
    const {
      "q": q,
      "visited": visited,
      "pending": pending,
      "decision": decision,
      "foodOrigins": origins,
      ...rest
    } = a;
    return rest;
  };
  return {
    "version": 2,
    "time": w["time"],
    "seed": w["seed"],
    "player": strip(w["player"]),
    "bots": w["bots"].map(strip),
    "nodes": w["nodes"],
    "buildings": w["buildings"].map((b) => {
      const { "foodOwners": owners, ...rest } = b;
      return rest;
    }),
    "events": w["events"],
    "generation": w["generation"],
    "learning": w["learning"],
    "evolution": w["evolution"],
    "pressure": w["pressure"],
    "updates": w["totalUpdates"],
    "history": w["history"],
    "stats": w["stats"],
  };
}
function validLegacy(w) {
  if (
    !w ||
    typeof w["learning"] !== "boolean" ||
    !Array.isArray(w["history"]) ||
    w["history"].length > 120 ||
    ![
      "tick",
      "seed",
      "nextId",
      "generation",
      "nextEvolution",
      "totalUpdates",
      "eventId",
      "nextHistory",
    ].every((k) => Number.isFinite(w[k])) ||
    w["version"] !== 1 ||
    !Number.isFinite(w["time"]) ||
    w["time"] < 0 ||
    !Number.isInteger(w["rng"]) ||
    !Number.isInteger(w["nextId"]) ||
    !Array.isArray(w["bots"]) ||
    w["bots"].length > MAX_BOTS ||
    !Array.isArray(w["nodes"]) ||
    w["nodes"].length > 1100 ||
    !Array.isArray(w["buildings"]) ||
    w["buildings"].length > 1024 ||
    !Array.isArray(w["events"]) ||
    w["events"].length > 100
  )
    return false;
  const point = (p) =>
    p &&
    Number.isInteger(p["x"]) &&
    Number.isInteger(p["y"]) &&
    p["x"] >= 0 &&
    p["x"] < SIZE &&
    p["y"] >= 0 &&
    p["y"] < SIZE;
  const agent = (a) =>
    point(a) &&
    Number.isInteger(a["id"]) &&
    [
      "health",
      "food",
      "wood",
      "ore",
      "age",
      "fitness",
      "epsilon",
      "alpha",
      "gamma",
      "aggression",
      "shield",
      "last",
      "homeX",
      "homeY",
      "generation",
      "updates",
      "gathers",
      "deaths",
      "kills",
      "built",
      "delivered",
    ].every((k) => Number.isFinite(a[k])) &&
    a["health"] > 0 &&
    a["health"] <= 100 &&
    a["food"] >= 0 &&
    a["wood"] >= 0 &&
    a["ore"] >= 0 &&
    a["food"] + a["wood"] + a["ore"] <= 30 &&
    a["homeX"] >= 0 &&
    a["homeX"] < SIZE &&
    a["homeY"] >= 0 &&
    a["homeY"] < SIZE &&
    a["epsilon"] >= 0 &&
    a["epsilon"] <= 1 &&
    a["alpha"] > 0 &&
    a["alpha"] <= 1 &&
    Number.isInteger(a["homeX"]) &&
    Number.isInteger(a["homeY"]) &&
    ["food", "wood", "ore"].every((k) => Number.isInteger(a[k])) &&
    (a["pending"] === null ||
      (a["pending"] &&
        ["state", "choice", "reward", "health", "deaths"].every((k) =>
          Number.isFinite(a["pending"][k]),
        ) &&
        Number.isInteger(a["pending"]["state"]) &&
        a["pending"]["state"] >= 0 &&
        a["pending"]["state"] < 144 &&
        Number.isInteger(a["pending"]["choice"]) &&
        a["pending"]["choice"] >= 0 &&
        a["pending"]["choice"] < 9)) &&
    Array.isArray(a["visited"]) &&
    a["visited"].length <= 32;
  if (
    !agent(w["player"]) ||
    w["player"]["id"] !== 0 ||
    !w["bots"].every(
      (a) =>
        agent(a) &&
        a["q"] instanceof Float32Array &&
        a["q"].length === 144 * 9 &&
        a["id"] > 0 &&
        a["q"].every((n) => Number.isFinite(n) && Math.abs(n) <= 20),
    )
  )
    return false;
  if (new Set(w["bots"].map((a) => a["id"])).size !== w["bots"].length)
    return false;
  if (
    !w["events"].every(
      (e) =>
        e &&
        typeof e["text"] === "string" &&
        e["text"].length < 1000 &&
        ["id", "time", "actor", "x", "y"].every((k) => Number.isFinite(e[k])),
    ) ||
    !w["history"].every(
      (p) =>
        p &&
        ["time", "updates", "gathers", "depots", "generation"].every((k) =>
          Number.isFinite(p[k]),
        ),
    )
  )
    return false;
  return (
    w["nodes"].every(
      (n) =>
        point(n) &&
        ["food", "wood", "ore"].includes(n["kind"]) &&
        Number.isInteger(n["stock"]) &&
        n["stock"] >= 0 &&
        n["stock"] <= 5 &&
        Number.isFinite(n["interval"]) &&
        n["interval"] > 0 &&
        Number.isFinite(n["next"]) &&
        Number.isFinite(n["soil"]) &&
        n["soil"] >= 0.45 &&
        n["soil"] <= 1,
    ) &&
    w["buildings"].every(
      (b) =>
        point(b) &&
        Number.isFinite(b["expires"]) &&
        Number.isInteger(b["food"]) &&
        b["food"] >= 0 &&
        b["food"] <= 12,
    )
  );
}
function restore(input) {
  if (valid(input)) return input;
  if (!validLegacy(input)) return null;
  const w = structuredClone(input);
  w["version"] = 2;
  w["evolution"] = w["learning"];
  w["pressure"] = 1;
  w["history"] = [];
  w["stats"] = stats();
  w["migratedFrom"] = 1;
  for (const a of [w["player"], ...w["bots"]]) {
    const old = a["q"];
    a["readyAt"] = w["time"];
    a["foodOrigins"] = [];
    a["charges"] = 0;
    a["decision"] = null;
    a["pending"] = null;
    a["gamma"] = 0.97;
    a["healed"] = 0;
    a["serviceHealth"] = 0;
    a["losses"] = 0;
    a["lastHurt"] = -100;
    if (old) {
      a["q"] = new Float32Array(STATES * N);
      initBrain(a);
      for (let s = 0; s < STATES; s++) {
        const d = decode(s),
          prior =
            (((d["health"] * 2 + d["food"]) * 2 +
              (d["ore"] && d["wood"] ? 1 : 0)) *
              6 +
              d["tile"]) *
              2 +
            d["rival"];
        for (let k = 0; k < 9; k++) a["q"][s * N + k] = old[prior * 9 + k];
      }
    }
  }
  const byId = new Map(w["bots"].map((a) => [a["id"], a]));
  for (const b of w["buildings"]) {
    const owner = byId.get(b["owner"]);
    if (
      b["owner"] !== 0 &&
      (!owner ||
        owner["lineage"] !== b["lineage"] ||
        owner["generation"] !== b["generation"])
    )
      b["owner"] = -(b["owner"] + 1);
    b["wood"] = 0;
    b["ore"] = 0;
    b["foodOwners"] = Array.from({ "length": b["food"] }, () => null);
    b["lastUsed"] = -1000;
    b["uses"] = 0;
  }
  w["nextId"] = Math.max(w["nextId"], ...w["bots"].map((a) => a["id"] + 1));
  rescale(w);
  w["stats"]["opening"] = totals(w);
  event(
    w,
    w["player"],
    "world upgraded: inventory tools, independent repairs and richer observations",
  );
  return valid(w) ? w : null;
}
function valid(w) {
  if (
    !w ||
    w["version"] !== 2 ||
    typeof w["learning"] !== "boolean" ||
    typeof w["evolution"] !== "boolean" ||
    ![
      "time",
      "tick",
      "rng",
      "nextId",
      "nextEvolution",
      "generation",
      "totalUpdates",
      "pressure",
    ].every((k) => Number.isFinite(w[k])) ||
    w["time"] < 0 ||
    !Array.isArray(w["bots"]) ||
    w["bots"].length > MAX_BOTS ||
    !Array.isArray(w["nodes"]) ||
    w["nodes"].length > 1100 ||
    !Array.isArray(w["buildings"]) ||
    w["buildings"].length > 1024 ||
    !Array.isArray(w["events"]) ||
    w["events"].length > 100 ||
    !Array.isArray(w["history"]) ||
    w["history"].length > 120
  )
    return false;
  const point = (p) =>
    p &&
    Number.isInteger(p["x"]) &&
    Number.isInteger(p["y"]) &&
    p["x"] >= 0 &&
    p["x"] < SIZE &&
    p["y"] >= 0 &&
    p["y"] < SIZE;
  const agent = (a) =>
    point(a) &&
    Number.isInteger(a["id"]) &&
    [
      "health",
      "wood",
      "food",
      "ore",
      "charges",
      "readyAt",
      "homeX",
      "homeY",
      "age",
      "fitness",
      "epsilon",
      "alpha",
      "gamma",
      "aggression",
      "generation",
      "updates",
      "healed",
      "serviceHealth",
      "losses",
      "shield",
      "lastHurt",
    ].every((k) => Number.isFinite(a[k])) &&
    a["health"] > 0 &&
    a["health"] <= 100 &&
    KINDS.every((k) => Number.isInteger(a[k]) && a[k] >= 0) &&
    pack(a) <= 30 &&
    Number.isInteger(a["charges"]) &&
    a["charges"] >= 0 &&
    a["charges"] <= 3 &&
    Array.isArray(a["visited"]) &&
    a["visited"].length <= 32 &&
    Array.isArray(a["foodOrigins"]) &&
    a["foodOrigins"].length <= a["food"] &&
    (a["pending"] === null ||
      (a["pending"] &&
        ["state", "choice", "reward", "health", "deaths"].every((k) =>
          Number.isFinite(a["pending"][k]),
        ) &&
        Number.isInteger(a["pending"]["state"]) &&
        a["pending"]["state"] >= 0 &&
        a["pending"]["state"] < STATES &&
        Number.isInteger(a["pending"]["choice"]) &&
        a["pending"]["choice"] >= 0 &&
        a["pending"]["choice"] < N));
  if (
    !agent(w["player"]) ||
    w["player"]["id"] !== 0 ||
    !w["bots"].every(
      (a) =>
        agent(a) &&
        a["id"] > 0 &&
        a["q"] instanceof Float32Array &&
        a["q"].length === STATES * N &&
        a["q"].every((q) => Number.isFinite(q) && Math.abs(q) <= 20),
    ) ||
    new Set(w["bots"].map((a) => a["id"])).size !== w["bots"].length ||
    w["nextId"] <= Math.max(0, ...w["bots"].map((a) => a["id"]))
  )
    return false;
  if (
    !w["nodes"].every(
      (n) =>
        point(n) &&
        KINDS.includes(n["kind"]) &&
        [
          "stock",
          "capacity",
          "targetCapacity",
          "interval",
          "next",
          "soil",
        ].every((k) => Number.isFinite(n[k])) &&
        Number.isInteger(n["stock"]) &&
        n["stock"] >= 0 &&
        n["stock"] <= n["capacity"] &&
        n["interval"] > 0 &&
        n["soil"] >= 0.45 &&
        n["soil"] <= 1,
    ) ||
    !w["buildings"].every(
      (b) =>
        point(b) &&
        Number.isInteger(b["owner"]) &&
        Number.isFinite(b["expires"]) &&
        Number.isFinite(b["lastUsed"]) &&
        KINDS.every(
          (k) => Number.isInteger(b[k]) && b[k] >= 0 && b[k] <= LIMIT[k],
        ) &&
        Array.isArray(b["foodOwners"]) &&
        b["foodOwners"].length === b["food"],
    )
  )
    return false;
  const s = w["stats"];
  return (
    !!s &&
    ["opening", "regrown", "introduced", "consumed", "lost"].every(
      (k) =>
        s[k] && KINDS.every((n) => Number.isFinite(s[k][n]) && s[k][n] >= 0),
    ) &&
    [
      "meals",
      "healing",
      "smallMeals",
      "services",
      "repairs",
      "births",
      "attacks",
      "kills",
      "populationChanges",
      "deaths",
    ].every((k) => Number.isFinite(s[k]) && s[k] >= 0)
  );
}
module.exports = {
  SIZE,
  DT,
  MAX_BOTS,
  STATES,
  ACTIONS,
  COLORS,
  fresh,
  step,
  playerAction,
  setPopulation,
  setPressure,
  view,
  valid,
  restore,
  learn,
  evolve,
  index,
  state,
  legalActions,
  choose,
  random,
  region,
  totals,
  ledger,
  utility,
  fitness,
  canEat,
};
