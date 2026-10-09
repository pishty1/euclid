# Optional WebGPU renderer

Add Venture uses a transparent WebGPU combat layer above the Quil game canvas.
Wrong nonempty answers provoke one on-screen enemy (the partial-answer target,
or the closest enemy). Its projectile costs one shield on arrival, then becomes
a ship impact effect. Addition uses a three-pulse burst, subtraction a fast rail
shot, multiplication four spread bolts, and division twin helix bolts. Player
hits use a mint shot and an operation-coloured blast. Pausing freezes projectile
travel and damage; replay clears pending shots. Canvas draws matching weapon
patterns when WebGPU is unavailable. Arithmetic, scoring, and damage stay on the
CPU; the combat readout identifies the effect renderer.
The player ship tracks the typed-answer target and holds its firing heading after
the answer clears. Shots originate at its rotated nose. Enemy hulls have distinct
armour panels and glowing weapon mounts. Hit effects combine an initial flash,
two shockwaves, sparks, and tumbling shards, with 64 GPU sprites per impact.

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

On touch screens, new users get split pads: 0–4 and Delete on the left, with
5–9 and Fire on the right. Settings offers Split, Left, and Right layouts beside
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
