# Figget-A-Balls: The Living Frontier

The active sketch is now entirely local: one human player and a population of
independent learning bots. No WordPress plugin, login, REST requests or game
server is used. WordPress and the older solo implementation remain archived in
source; their saved worlds are not imported or overwritten.

## Play

- Explore a 96 × 96 world. Move with arrows/WASD or the direction pad. Select a
  map tile to inspect it; Walk towards takes one cardinal step toward it.
- Gather adjacent food, timber and ore. Carry at most 30 total units. Ore mining
  costs eight health; eating food restores up to 30. Resources are finite and
  regenerate from simulation time, not clicks or wall-clock time.
- Regions differ in resource density and regrowth speed. Harvesting degrades a
  node's growing conditions; unharvested nodes gradually recover. Darker sparse
  regions and greener productive regions use the actual resource-region map.
- Build a depot on open ground for six wood and one ore. Four depots per
  character, at most 1,024 in the world. Supplying one food plus one wood adds
  food and renews the depot's eight-minute lifetime. Any character can eat from
  stocked depots. Unmaintained depots disappear; death preserves your depots.
- An adjacent attack costs one ore and causes 20 damage. A kill loots up to two
  of each carried resource, within your pack capacity. The victim loses half its
  remaining supplies and respawns at home with eight seconds of protection. The
  central sanctuary also prevents attacks. Bots avoid attacking their lineage.
- World → Activity locates recent events and shows a selected bot's intentions,
  learning updates, gathering, deliveries and combat history. World → Bots
  locates the top 80 learners; all active bots appear on the map. Map shows the
  entire world; Me returns to your character.

## Actual learning and inheritance

Each bot has its own Float32 Q table: 144 local states × nine macro actions.
States encode health, carried food, building readiness, adjacent resource/depot
and nearby rivals. Actions seek food, harvest timber, mine, build, supply, raid,
recover, explore or return home. Seeking performs physical movement and local
resource searches: it does not teleport or grant remote access.

Policies start with modest, disclosed preferences for sensible early activity.
They then use epsilon-greedy exploration and the Q-learning update
`Q(s,a) += alpha * (reward + gamma * max Q(s',.) - Q(s,a))`.
Rewards cover gathering, useful healing, construction and deliveries; failed
attempts, received damage and death are penalised. Pending transitions account
for attacks received between decisions. Death terminates the transition so its
update does not bootstrap from the respawn state. Brains survive ordinary death.

Every three simulated minutes, mature bots are ranked by recent fitness. The
lowest eighth is replaced by independent, mutated copies of policies from the
top quarter. Young brains get 90 seconds before entering selection. Descendants
inherit lineage, a copied learned table, exploration rate and aggression, with
bounded mutations. Survivor fitness decays between selection rounds. Learned
skills are experimental; neither stronger play nor biological open-ended
complexity is guaranteed. Freezing learning disables Q updates and selection
while leaving movement and the economy running.

## Performance and persistence

- Starts with 64 bots on touch devices and 128 otherwise. Auto probes every ten
  seconds, growing or retiring 32 at a time based on measured simulation and
  drawing cost, up to 512. Explicit 32/64/128/256/512 choices are under Rules.
  Retirement leaves depots to decay. Counts are device-dependent, not an FPS
  guarantee. Without Web Workers the population is limited to 128.
- A Blob Web Worker runs fixed 250ms steps and staggers bot decisions across
  four ticks, once per bot per second. Spatial tile indexes bound local searches.
  Rendering receives snapshots without Q tables, interpolates short movements,
  and never chooses actions or advances learning.
- Worker source is generated into a JS string inside the normal app bundle.
  No new deployment files, remote worker scripts, eval or server endpoints are
  needed. CSP/unsupported-worker failures use a bounded main-thread fallback.
- IndexedDB `figget-life-v1` saves the complete world, RNG and typed learning
  tables every 15 seconds and on pause. Switching sketches requests a final
  checkpoint before terminating the worker. Browser shutdown can still lose
  changes since the last completed save; storage errors are shown in Activity.
- Pause, the sketch menu and hidden tabs suspend time. Long gaps are discarded;
  there is no offline catch-up. Starting a new world requires confirmation and
  affects only this new local save. Legacy local and WordPress saves are kept.

## Implementation and checks

- `figget_life_model.js`: seeded model, resource economy, combat, Q-learning,
  inheritance, bounded views and structured-clone save validation.
- `figget_life_worker.js`: fixed-step worker runtime and message protocol.
- `figget_worker_source.js`: generated embedded worker; do not hand edit.
- `figget_life.js`: native interface, Canvas map, adaptive population, worker
  fallback, IndexedDB saves and lifecycle cleanup.
- `figget.cljs`: Quil lifecycle bridge in the existing menu slot.

```
node scripts/generate-figget-worker.mjs
node scripts/generate-figget-worker.mjs --check
node --test test/rendering/figget_life.test.cjs
npx shadow-cljs release prod
```

The build workflow checks the generated worker and model tests. `npm run dev`
and `npm run release` regenerate it automatically. The existing static release
archive is unchanged; plugin packaging and plugin CI checks are no longer part
of the active app deployment.

`test/rendering/figget_life.browser.mjs` covers advanced-compiled worker and
fallback paths, desktop/mobile layouts, actual map pixels, movement, population
controls, learning toggle, pause/menu suspension, IndexedDB save/resume and zero
HTTP game requests. A 512-bot model stress test covers ten simulated minutes,
multiple selections and hundreds of thousands of learning updates.

---

## Archived earlier solo prototype

### Realtime Frontier

One continuous exploration map, one player character and one local bot. The
separate 7×7 encounter has been removed: movement, construction, capture and
sieges now happen directly on the map. The app name and menu slot are unchanged.

## Play

- Mint dot: you. Orange dot: the bot. Squares: outposts; dashed tiles: paths.
- Select **Walk** and tap terrain or a direction button to take one cardinal
  step. Arrow keys / WASD always walk, even when a building tool is selected.
- Select **Outpost** or **Path**, then tap an adjacent tile or a direction
  button. You must physically walk beside a site before building there.
- An outpost costs 2 timber; a path costs 1. **Gather wood** salvages 3 timber
  from the surroundings, capped at 30. Both characters use the same costs.
- **Inspect** reports the selected structure's group liberties. The bot keeps
  acting while you inspect. **Remove** dismantles a nearby structure for 1 timber.
- The bot acts independently every **1.5 seconds**, even when you stand still.
  Clicking faster does not accelerate it. Movement has a **250ms cooldown**;
  building/gathering have a **1.5s cooldown**. Other actions have short cooldowns
  shown as `Ready in…`. Failed actions do not start a cooldown.
- **Pause / Resume** freezes both characters, cooldowns and siege timers.
  The sketch menu, hidden tab and switching sketches pause automatically.
  Returning never replays elapsed offline time. Inspection/tools work while
  manually paused, but movement and construction do not.
- The bot can walk one tile, build adjacent to itself, gather timber or wait.
  It tries to defend threatened groups, finish captures and close your exits
  when you are within 12 tiles and outside your refuge. Otherwise it expands
  around its camp. It is a simple local heuristic, not a strategic Go engine.
- Simulation runs while this sketch is visible and unpaused, including while
  you are idle. There is no separate combat screen. The bot is explicitly
  automated, not an online player.

## Territory and defeat

Orthogonally connected outposts of one owner share their empty neighboring tiles
(liberties). Paths count as empty for this rule and never join outpost groups.
A placement removes adjacent enemy groups with zero liberties, then checks that
the new friendly group has breathing room. Suicidal placements are rejected.
Captures return 1 timber per captured outpost and increment the capture count.
These are Go-inspired rules, not full Go: there are no global alternating stone
turns, territory scores or superko restrictions in the walking world.

Enemy outposts, enemy refuges and the other character block movement; your own
outposts do not.
All terrain is currently traversable. Movement is cardinal, so a diagonal gap
cannot be used to escape a closed fence. Characters are not stones: their siege
rule searches for a walkable route out of the enemy fence, not just adjacent
liberties. Large empty pockets inside a closed fence still count as surrounded.

After **12 seconds continuously surrounded**, a character is defeated and
respawns at its own camp, losing half its timber. The same rule applies to the
bot. Discoveries, ore, fruit and tools survive. Each camp and its four entrances
are protected: enemies cannot enter or build there, and reaching your own
refuge ends a siege. Respawns therefore cannot land on the other character.
Escaping resets the timer. **Retreat to camp** bypasses action cooldowns while
unpaused, with the same half-timber cost.

## Exploration

The deterministic atlas is now **2,048 × 2,048 = 4,194,304 tiles**. Terrain is
computed on demand; only the viewport is drawn. Only discovered tile keys and
changes are saved. Terrain is procedural, not Google Maps or OpenStreetMap data.
Tactical objects (characters and structures) are visible in the viewport even
on uncharted terrain, so combat does not rely on invisible walls. The HUD gives
the bot's relative position. Zoom controls are under Rules, journal & map controls.

Normal movement costs 2 energy. Rest anywhere to recover; the Rest button is
highlighted when exhausted. Walking onto a path costs no energy, including
paths built by the bot. Roads are public infrastructure, not exclusive territory.

The original solo expedition remains: study/extract two ore at 252,253; restore
the workshop at 262,259; investigate the tower at 267,248; find Hidden hollow at
273,242. The scanner increases sight and bypasses mineral study. Orchards regrow
after twelve successful world actions, including building; deposits are finite.

## Saves / implementation

- `figget.cljs`: Quil lifecycle, per-frame clock update, resize and input bridge.
- `figget_world.js`: deterministic terrain, exploration and original expedition.
- `figget_frontier.js`: pure world actions, sparse structures, bot, captures,
  encirclement, fixed 250ms simulation steps, cooldowns and save migration.
- `figget_clock.js`: session-local monotonic clock, frame-rate independent steps,
  suspension/reset and long-gap protection. Gaps over 1s are discarded rather
  than replayed as a dangerous catch-up burst.
- `figget_game.js`: Canvas 2D world rendering, pause controls, clock integration
  and local persistence. Autosaves every 2s while running, immediately after
  player actions, and flushes on pause, menu, visibility change and sketch exit.
- Saves still use `figget-exploration-v1`. Existing exploration progress is
  retained; migration establishes your refuge at your saved position and the
  bot's refuge six tiles away. Old separate `figget-siege-v1` saves are ignored.
- Restarting the sketch or reloading restores the world. **New expedition**
  asks before clearing the local world. Storage failures are shown in the UI.
- Frontier saves migrate from v1 (turn-based) to v2 (realtime), retaining
  characters, buildings and resources while resetting old action-based siege
  counts. Realtime timers are stored as simulation durations, never wall-clock
  deadlines. Reload starts unpaused, without any offline advancement.

The prototype caps total structures at 256. Characters cannot build on another
character, and the bot never places structures remotely. Enclosure checks use
sparse enemy bounds plus unobstructed-ray exits to avoid flooding the entire
atlas. There is no server, online multiplayer, WordPress connection, city import,
hundred-variable character profile, alliance system or building production yet.
Do not treat browser saves as authoritative state for future multiplayer.

## Verification

```
node --test test/sketches/figget*.test.cjs
JAVA_HOME=$(/usr/libexec/java_home -v 17) PATH="$(/usr/libexec/java_home -v 17)/bin:$PATH" npx shadow-cljs release prod
```

Use Java 17 (Processing does not load under Java 11). Serve `docs/` after the
production build for browser checks. The existing development `viewport`
namespace/global collision in Chromium is avoided by the production build.

Tests cover migration, independent bot timing, input cooldowns, frame rates,
pause/resume and long clock gaps, adjacent construction, bot movement,
movement blocking, captures, suicide, fence openings and map edges, sparse huge
maps, both characters' siege/respawn, paths, dismantling, protected camps and
save validation, as well as the original solo expedition.
