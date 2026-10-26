# Figget-A-Balls: The Quiet Atlas

The existing sketch entry now runs a solo-first exploration prototype rather
than the cellular-sea simulation. Its name and menu position are unchanged.

## Play

Tap terrain to take one step towards it, use arrows/WASD, or use the directional
buttons. Investigate your tile with E or the button. Rest anywhere to recover;
there is no death or offline penalty. Mark interesting places and consult the
field journal. New expedition asks before erasing progress.

The deterministic world is 512 × 512 tiles, drawn only around the player with
persistent fog of exploration. Begin at 256,256. Study and extract two ore at
252,253, restore the workshop at 262,259, visit the tower at 267,248, then find
Hidden hollow at 273,242. A scanner expands sight and bypasses mineral study.
Orchards regrow after twelve actions; deposits are finite. No human collaborator
is needed to finish the expedition.

## Play against one bot

Choose **Play vs bot** from the exploration controls. This opens a separate,
local 7 × 7 contested-quarry encounter; exploration energy is not used.

- Mint outposts are yours; orange outposts belong to one automated opponent.
- Place on an empty intersection, then the bot responds. Placement is allowed
  anywhere empty, not only adjacent to an existing outpost.
- Orthogonally connected groups share liberties (empty neighboring spaces).
  Numbers show those shared liberties. Select an outpost to highlight them.
- Groups with zero liberties are captured. Capturing the marked camp wins.
- Suicide and repeating any prior board position are prohibited (positional
  superko). Capturing happens before checking your own liberties.
- Two passes or 80 actions end by score: surviving stones + captured stones,
  plus 3 for occupying the central quarry. This is not standard Go scoring.
- The bot uses a deterministic one-response lookahead, prioritizing captures
  and camp safety. It is a small tactical opponent, not a Go engine.
- Back to exploration / Escape pauses; Retreat safely concedes. Neither loses
  your explorer's resources. Rematch resets only the encounter.
- Encounters save separately under `figget-siege-v1`; interrupted bot turns
  resume when the encounter is reopened. No bot actions run while closed.

This encounter is a rules prototype, not yet a map settlement: roads,
workshops, shared building, alliances, resource rewards and persistent world
ownership are not implemented. It does not change the exploration map's size.

## Implementation / limits

- `figget.cljs`: Quil lifecycle, resize, input, existing menu integration.
- `figget_world.js`: deterministic terrain and immutable action transitions.
- `figget_game.js`: Canvas 2D presentation, accessible HTML controls, local saves.
- `figget_siege.js`: pure group/liberty/capture rules, scoring and tactical bot.
- `figget_siege_ui.js`: modal encounter board, turn controls and separate saves.
- Saves: versioned `figget-exploration-v1` localStorage key. Storage failures are
  displayed; there is no guarantee of persistence in private/blocked storage.
- This is a local prototype, **not connected multiplayer**. No fake online
  players, WordPress endpoint, credentials, or database writes are included.
- The hundred-variable profile, trading, emergent settlements, world NPCs, and deeper
  investigation puzzles are future work, not features of this first slice.

For WordPress integration, implement authenticated REST actions with server-side
validation, transactional resource updates and state revisions before allowing
shared writes. Keep private perceptions separate from public map data. Local
saves must not be trusted as authoritative shared-world state. The pure action
model provides a reference for the server rules, not a security boundary.

## Verification

```
node --test test/sketches/figget*.test.cjs
JAVA_HOME=$(/usr/libexec/java_home -v 17) PATH="$(/usr/libexec/java_home -v 17)/bin:$PATH" npx shadow-cljs release prod
```

Production browser smoke checks cover desktop/mobile presentation, keyboard
and directional-button movement, save/reload, investigation and switching
sketches without leaking controls. Encounter checks cover bot replies, liberty
highlights, input isolation from exploration, save/reload, pause/resume, retreat,
rematch, pass scoring, camp-capture victory, and mobile portrait/landscape.
Serve `docs/` after the production build.

Environment note: Java 11 cannot load this project's Processing dependency;
use Java 17. In the current Chromium, the development build encounters the
existing `viewport` namespace/global collision; the optimized production build
works and was used for browser checks.
