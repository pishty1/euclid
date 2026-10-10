# Optional WebGPU renderer

Add Venture uses a transparent WebGPU combat layer above the Quil game canvas.
Wrong nonempty answers provoke one on-screen enemy (the partial-answer target,
or the closest enemy). Its projectile costs one shield on arrival, then becomes
a ship impact effect. Addition uses a three-pulse burst, subtraction a fast rail
shot, multiplication four spread bolts, and division twin helix bolts. Player
hits use a mint shot and an operation-coloured blast. Normal shots arrive after
0.18 seconds, Twin Arc after 0.24 seconds, and Nova after 0.38 seconds. Selected
ships remain visible at their impact coordinates during flight and cannot be
targeted twice. Removal, points, blast audio, and streak rewards resolve at
arrival; a wrong answer during flight still resets the streak. Arc grows towards
its targets rather than drawing a complete beam before impact. Pausing freezes projectile
travel and damage; replay clears pending shots. Canvas draws matching weapon
patterns when WebGPU is unavailable. Arithmetic, scoring, and damage stay on the
CPU; the combat readout identifies the effect renderer.
The player ship tracks the typed-answer target and holds its firing heading after
the answer clears. Shots originate at its rotated nose. Enemy hulls have distinct
armour panels and glowing weapon mounts. Hit effects combine an initial flash,
two shockwaves, sparks, and tumbling shards, with 64 GPU sprites per impact.

Weapon-name captions are omitted under enemy ships. Stacks start at wave 4 and remain one moving target: solve the lower equation first, then apply the upper
ships’ operations and adjacent operands, in bottom-to-top order. A lower `4 + 9` with upper `× 3` needs
`39`. An upward connector indicates the order; normal arithmetic precedence
does not override it. Stacks only produce nonnegative whole-number answers,
use the upper operation for retaliation, and grant one kill/streak reward. All
hulls disappear and produce impact effects together. Spawn spacing accounts
for the taller formation, including on mobile. Waves 4–7 allow two steps,
waves 8–11 up to three, waves 12–15 up to four, and wave 16 onward up to five.
Short viewports cap the depth to keep the complete formation in view. Stacked
hull centres are 54 pixels apart. All enemy types now spawn fully above the
canvas and move into view at their normal flight speed. Stacks enter bottom
hull first, with their upper hulls following. Ships still wholly above the
canvas cannot be targeted by answers or special weapons. Enemy flight continues to the bottom edge;
a formation costs one shield only after its topmost hull has fully left the
canvas, rather than on reaching the player ship. Split keypad buttons have
8-pixel gaps (single-panel layouts use 6 pixels). Equations and stacked operands
that would sit behind a keypad shift into the clear area beside it. Split panel
backgrounds are nearly transparent, with drag bounds accounting
for the taller panels. Answers
remain within the current wave’s normal answer range, including intermediate
results; stack frequency gradually rises to 40%.

On mobile, separate enemy formations are vertically staggered across lanes.
Spawn spacing includes the full height of the formation ahead, and movement
maintains that gap so faster memory ships cannot catch up with other enemies.
This also keeps equations apart where they shift beside the touch pads. Desktop
flight spacing remains unchanged.

Memory enemies appear from wave 5, at most one pair per wave. A blue diamond
ship labelled REMEMBER M5 (for example) shows an ordinary equation. It cannot
be targeted by answers or special weapons and leaves safely without damage or
streak changes. Three game seconds after it fully exits, its purple RECALL M5
shadow is queued to return, with the equation replaced by `?`. Enter the
remembered answer to hit it; incorrect answers provoke its operation’s weapon,
and letting the shadow fully leave costs one shield. The pair occupies one
wave slot; wave completion waits for queued shadows. Pauses freeze the recall
delay, and replay clears it. Matching markers and diamond hulls connect the pair.

On viewports up to 1024px and devices with a coarse primary pointer (including
iPads in landscape), Add Venture has a single-row header: a burger-only sketch menu, compact score
(★), wave (W), shields (◆) and shield-charge counters, plus fullscreen,
start/pause/restart and Settings icons. Button titles and accessible names
describe their actions. Flight data updates through the native controls; the
old canvas HUD rows are removed on these devices. Desktop layouts retain the labelled menu, game controls,
Settings button and separate canvas HUD. Resizing updates the presentation.

During play, the current digits and cursor appear as large, faint text at the
centre of the canvas, without a box or border. The readout draws behind ships
and effects so it does not cover the action. Its position and colour do not depend
on whether an answer matches. Typing no longer highlights enemies or aims the
ship towards a matching answer; the ship aims when it actually fires. Delete
updates the readout, firing clears its digits, and menus/settings or pausing
hide it. The duplicate answer beneath the ship is suppressed during play.

Flights begin with three shields and can hold five. Every eight correct answers
restores one shield; wrong answers reset charge, while charge carries across
waves. A wave completed without wrong answers or damage restores one shield
unless that wave already granted a streak shield. Wave rewards are checked once.
At the cap, shields are never banked. The HUD shows shield charge, and restoration
has a message and rising audio cue. Replay resets reward progress.
Shield restoration also triggers a 2.2-second constellation animation: inward
sparks assemble a glowing six-sided shell around the ship, rings expand outward,
and a +1 SHIELD callout identifies the reward. The overlay is drawn on the Quil
canvas with either combat renderer. It freezes while gameplay is suspended,
expires during play, and resets on a new flight; a full shield bank triggers no
restoration animation.

The perfect-wave bonus can occur before eight correct answers (wave 1 has six
enemies); its callout explicitly says PERFECT WAVE / +1 SHIELD BONUS. The streak
rule still requires eight correct answers and resets on a wrong answer.
Twin Arc (Q or its touch button) costs one shield and destroys two distinct random
enemies; Nova Strike (W) costs two and destroys three. A weapon requires enough
targets and must leave one shield in reserve. Kills earn 50 points each, preserve
existing charge, and do not build charge or qualify the wave for a perfect bonus.
Incoming enemy projectiles remain active. Each launch has a coloured pulse,
targeted combat effects, and a distinct sound. Weapons are blocked while paused
or editing settings and unavailable outside active play.
Arc's 0.85-second effect sends branching blue lightning to its two targets.
Nova's 1.8-second sequence launches curling violet comets, three broad shockwaves,
and large gold/violet starbursts at each target, with an edge pulse on impact.
Captured target positions remap on resize and clear on a new flight.

From wave 4, Flight ended offers Power on at `death wave - 2` or Restart from
scratch at wave 1. Deaths on waves 1–3 show a simple click/Enter restart instead.
Both start a fresh flight with three shields, zero score, and cleared
enemies, projectiles, and charge; best score and control preferences remain.
Enter selects Power on, R selects Restart, and background taps do not restart
when the recovery choices are shown.
The touch pads are hidden while the recovery choices are displayed.

Add Venture also synthesizes its soundtrack and effects with Web Audio. Audio is
unlocked by a launch/resume gesture. The Settings menu offers mute and independent
music/effects levels, saved locally when storage is available. A minor-key bass
and arpeggio loop gains hats, kick, and snare in later waves. Each enemy weapon
has a distinct timbre; player shots, impacts, shield damage, sector completion,
and game over have separate cues. Impact sound follows projectile arrival.
Pausing, opening the sketch menu, hiding the page, and leaving the game stop
scheduled voices and suspend audio. Replay reuses a single AudioContext. Games
still work when the browser has no Web Audio support. No audio files are loaded.
Opening Settings automatically freezes gameplay and answer input while music keeps
playing for volume preview. The effects slider previews a short player shot.
Closing Settings resumes play, unless the game was manually paused.

On touch screens, new users get split pads: two columns and three rows on each side. Left rows are `1 2`, `3 4`,
`Delete 5`; right rows are `6 7`, `8 9`, `0 Fire`. Settings offers Split, Left, and Right layouts beside
the audio controls. Saved choices are preserved. The pads have translucent
backgrounds and only keys plus small drag grips; enemy flight passes behind
controls without reacting to their placement. Drag either grip vertically to
adjust thumb reach. Height is saved locally when storage is available and
clamped after rotation. Keyboard users can focus a grip and use Up/Down, Home,
or End. Short screens use two columns per split half. Single-pad layouts move
the ship to the opposite side; split mode centres it.
Short screens use fewer keypad rows. The sketch background extends through the large viewport behind browser chrome,
while gameplay and controls stay within the visible viewport. The sketch
respects display safe areas; the sketch menu becomes compact on phones and uses
two columns in landscape. On iPhone, use Safari's Share → Add to Home Screen,
then launch Euclid from its icon to hide Safari's address toolbar. A normal
browser tab retains browser-controlled bars.

All sketches launch and resize using the shared `viewport/canvas-height` helper,
which covers the host's large viewport. Both Canvas and GPU layers extend behind
translucent browser toolbars. Bottom captions use the visible viewport height.
Home Screen mode uses the orientation-correct screen size as a minimum when
Safari reports a shorter layout viewport. Canvas dimensions follow the measured
host; the document has no fixed-height clipping and canvases have no CSS height
cap. The document background and Safari theme colour follow the active sketch.
iPhone Safari does not allow websites to hide the URL bar automatically;
Home Screen launch is required for the standalone view.

La Cross also attempts WebGPU rendering on startup. Its vertex shader calculates
the four live segment intersections from the crosses' endpoints. Instanced light
sprites draw the intersection blooms, pulsing rings, flares, and fading trails.
The CPU retains the trail history and pointer controls. Pausing freezes the
effects as well as the geometry. The default view contains only intersections
and trails; taps cycle through the other views. Canvas provides similar glow
effects when WebGPU is unavailable. The view readout identifies the renderer.

Figget-A-Balls attempts WebGPU rendering on startup. Its FPS readout shows
`Starting WebGPU`, `WebGPU`, or `Canvas`. The simulation, population tuning,
builder, and controls remain on the CPU; this change accelerates drawing only.

The renderer draws bonds from an index buffer and cells as instanced glowing
quads. Positions and the three type colours are uploaded each frame. The existing
Canvas renderer is used while the GPU starts, when no adapter is available, or
after a GPU error or device loss. Switching sketches or reseeding destroys the
old GPU device and removes its canvas. No new package dependencies are required.

WebGPU requires a secure context (HTTPS or localhost), browser support, and an
available adapter. GitHub Pages supplies HTTPS. A browser exposing `navigator.gpu`
can still have no usable adapter, so API presence alone is not a success check.

To check a supported device, open Figget-A-Balls and confirm `WebGPU` in its
readout. Exercise the builder, colour changes, empty populations, reseeding,
resizing, and switching away and back. Inspect the console for validation errors.
Compare FPS with the same manual population and Canvas rendering before claiming
a speedup. Physics remains CPU-bound, and GPU rendering is not necessarily faster
for small populations.
