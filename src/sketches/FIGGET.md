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

## Implementation / limits

- `figget.cljs`: Quil lifecycle, resize, input, existing menu integration.
- `figget_world.js`: deterministic terrain and immutable action transitions.
- `figget_game.js`: Canvas 2D presentation, accessible HTML controls, local saves.
- Saves: versioned `figget-exploration-v1` localStorage key. Storage failures are
  displayed; there is no guarantee of persistence in private/blocked storage.
- This is a local prototype, **not connected multiplayer**. No fake online
  players, WordPress endpoint, credentials, or database writes are included.
- The hundred-variable profile, trading, emergent settlements, NPCs, and deeper
  investigation puzzles are future work, not features of this first slice.

For WordPress integration, implement authenticated REST actions with server-side
validation, transactional resource updates and state revisions before allowing
shared writes. Keep private perceptions separate from public map data. Local
saves must not be trusted as authoritative shared-world state. The pure action
model provides a reference for the server rules, not a security boundary.

## Verification

```
node --test test/sketches/figget_world.test.cjs
JAVA_HOME=$(/usr/libexec/java_home -v 17) PATH="$(/usr/libexec/java_home -v 17)/bin:$PATH" npx shadow-cljs release prod
```

Production browser smoke checks cover desktop/mobile presentation, keyboard
and directional-button movement, save/reload, investigation and switching
sketches without leaking controls. Serve `docs/` after the production build.

Environment note: Java 11 cannot load this project's Processing dependency;
use Java 17. In the current Chromium, the development build encounters the
existing `viewport` namespace/global collision; the optimized production build
works and was used for browser checks.
