# Figget-A-Balls: The Living Frontier (rules v2)

One human and up to 512 independently learning rivals share a browser-only world.
The rule update addresses the inventory, maintenance, ownership, observation and
reward problems found in the October 2026 economy audit. No game server or
WordPress plugin is used.

## Play and materials

Move with arrows/WASD or the on-screen directions. Select a tile to inspect it;
Walk towards takes one cardinal step toward it. Movement takes half a second;
work and attacks take one second. Bots make one decision per second. Humans can
move faster, but attacks no longer have a fourfold cadence advantage.

Health drains at 0.05 per second; sanctuary prevents attacks but does not stop
hunger. Pause when away. The pack holds 30 units. Gather beside food, timber or ore. Mining costs eight
health. A meal heals 30: ordinary eating requires 25 missing health, while nearby
unprotected rivals allow emergency eating with ten missing health. Open
**Inventory & depot** to store/take up to five of any material or deliberately
discard unwanted items. Every full-pack composition has a disposal action.

Depots cost six timber and one ore, with four per character and 1,024 globally.
They store 12 food, 30 timber and 12 ore, and all characters can use them. Bots
also use nearby stocked stores as sources of materials. **Supply** transfers one
food, with no repair bundled into it. **Repair** spends one timber to add four
minutes, capped at eight minutes from now. It becomes available with four minutes
or less remaining and works even when all stores are full. Tile details show
stored goods, historical builder and remaining lifetime. Expiry destroys stored
goods; repair is consequently a meaningful choice.

One ore loads three shots, each causing 20 damage. Protection prevents both
incoming and outgoing attacks in sanctuary or shortly after respawn. An attack
can select a specific inspected actor; otherwise it prefers an eligible rival
rather than a protected actor sharing the tile. A kill loots up to two of each
material, limited by pack capacity. Death loses all remaining ore and loaded
shots, plus half food and timber, and returns the character home. This removes
profitable suicide-mining as a source of ore. Buildings remain public assets.

## Richness, population and performance

The 96 × 96 map has fixed rich and poor regions. Density and regrowth differ;
harvesting reduces local soil quality and resting ground recovers. Resource
capacity and regrowth scale with the explicitly selected population. This keeps
the material budget per actor comparable without removing local competition.
**Resource pressure** separately selects Abundant, Balanced or Scarce conditions.
Changing capacity never deletes existing node stock; surplus is spent naturally.

New games start with 128 bots on all devices. **Rival population** explicitly
chooses 32, 64, 128, 256 or 512. **Adaptive rendering** reduces drawing frequency
when necessary; it never retires bots, replaces brains or changes scarcity.
A failed/unsupported worker retains all saved bots in a main-thread fallback;
large populations can be slower there. Rendering detail is not an FPS guarantee.

The model uses fixed 250ms steps and staggers each bot's decisions across four
phases. Priority rotates within a phase to reduce fixed-ID advantages on scarce
stocks. Snapshot rendering interpolates short movements. Worker source is bundled
as a generated string, so the static deployment archive needs no new asset types.

## Learning and useful outcomes

Each bot has a separate Float32 Q table: **576 observations × ten choices**.
Observations include health, carried food, available ore, timber readiness,
remaining pack capacity, nearby resource/depot type and rival proximity. Choices
seek food, harvest, mine, build, supply, raid, recover, explore, retreat home or
manage storage/repairs. Macros still perform actual local movement and actions.

Legal-action masks exclude unaffordable, unavailable or unsuitable behaviours,
including pointless harvesting into a full pack. TD bootstrapping also masks
unavailable actions. Initial preferences provide a starting policy; they are not
pretrained opponents. Q-learning uses epsilon-greedy exploration and gamma 0.97.

Rewards track changes in useful carried reserves and health. Reserve values
saturate, so collecting surplus timber does not earn unlimited value. Merely
building, stocking or killing is not a fitness payout. Fitness values useful
reserves, recovery, actual provision to others and survival, with death penalties.
Repair rewards are limited to recently useful infrastructure. Bots retain stock
reserves and can store or discard excess instead of economically trapping
themselves.

Food carries its supplier identity through storage, withdrawal, transport and
reuse. Actual consumption credits the original supplier for useful healing.
Recorded delivery state/action receives delayed learning credit, rather than an
arbitrary later movement. Unused or discarded food earns no meal credit; deleted
individuals cannot transfer old delivery credit to new children. Lineage-based
non-aggression remains a prescribed faction rule, not learned kin recognition.

**Learning** and **Evolution** are independent controls. Every three simulated
minutes, mature agents can be ranked by outcomes. Up to the lowest eighth can be
replaced by mutated descendants of the top quarter. Young brains receive 90
seconds before selection. Birth requires a funded parent: one food is consumed,
one food goes to the child and up to two timber/one ore are transferred. Nothing
is minted. If parents lack supplies or a nearby spawn site is crowded, fewer
births occur. Children have fresh IDs and copied/mutated policy tables, exploration
rate and risk tolerance. Their former rivals' properties never count toward their
building allowances. Old depots retain original builder and lineage identities.

This remains experimental learning. Stronger play on every map or against every
human strategy is not guaranteed. Resource geography is shared between seeds;
seeds change decisions and starting jitter, not terrain.

## Persistence and migration

IndexedDB database `figget-life-v1` now writes **world-v2**. The original **world**
record is left untouched as a backup. Valid v1 worlds migrate positions,
inventories, buildings, history and learned action preferences. Old 144 × 9 tables
are projected onto the new observations, with a new management action. In-flight
transitions are cleared. Legacy depots whose old slot was reused by another
individual/lineage are detached from that active owner while preserving stores
and historical lineage. New outcome telemetry starts at the migration baseline.

Full worlds, RNG, learning tables and food provenance save every 15 seconds and
on pause. Switching sketches requests a final checkpoint before worker shutdown;
returning waits for that checkpoint. Browser shutdown can still lose changes
since the last completed write. Storage errors are shown; an in-memory checkpoint
is retained even when IndexedDB is unavailable. Hidden tabs and the sketch menu
pause simulation, and long stalls do not cause offline catch-up. Reset requires
confirmation and replaces only the v2 local world, preserving the legacy record.

## Resource accounting and verification

The world records opening stocks, regeneration, explicit population introductions,
consumption and losses for food/timber/ore. Birth donations, looting, storage and
withdrawal are transfers. Meals, construction, repairs, ammunition and birth food
are consumption. Death, discarded goods, expired stores and retired/replaced
inventories are explicit losses. The conservation check is:

`opening + regrown + introduced - consumed - lost - current == 0`

Manual population additions have explicit starter grants; Auto never changes
population. Evolution cannot grant starter equipment without funding it.
Activity reports useful meals and healing, and its chart shows healing outcomes.
Per-character counters are individual; cumulative world deaths/kills survive
individual replacement.

Files:

- `figget_life_model.js`: rules, Q-learning, legal masks, migration and ledger.
- `figget_life_worker.js`: fixed-step runtime and message protocol.
- `figget_worker_source.js`: generated embedded source; do not hand edit.
- `figget_life.js`: native controls, map, adaptive drawing and persistence.
- `figget.cljs`: Quil lifecycle bridge.

**Keep save/message object keys quoted.** If formatting the model, use
`--quote-props preserve`; stripping quotes can break advanced-compiled migrations.

```
node scripts/generate-figget-worker.mjs
node scripts/generate-figget-worker.mjs --check
node --test test/rendering/figget_life.test.cjs
node scripts/benchmark-figget-life.cjs --controls --out /tmp/figget-benchmark.json
npx shadow-cljs release prod
```

The benchmark runs nine 30-minute worlds at 64/128/512 bots and seeds 7/42/99,
then six matched learning-on/off runs with evolution disabled. It checks finite
state and an exact material ledger, and records meals, healing, public services,
births and cumulative deaths. These are outcome measurements, not Q-update
counts presented as proof of intelligence.

`figget_life.browser.mjs` exercises advanced-compiled worker/fallback paths,
responsive layouts, controls, independent toggles, persistence and zero game HTTP
requests. `figget_economy.browser.mjs` adds mobile discard/store/take, full-depot
repair and actual v1 migration with an untouched backup.

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
