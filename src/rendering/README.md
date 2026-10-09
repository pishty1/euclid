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
