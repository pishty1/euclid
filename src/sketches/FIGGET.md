# Figget-A-Balls: Realtime Frontier

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
