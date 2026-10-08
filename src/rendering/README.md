# Optional WebGPU renderer

Ad Venture uses a transparent WebGPU combat layer above the Quil game canvas.
Wrong nonempty answers provoke one on-screen enemy (the partial-answer target,
or the closest enemy). Its projectile costs one shield on arrival, then becomes
a ship impact effect. Addition uses a three-pulse burst, subtraction a fast rail
shot, multiplication four spread bolts, and division twin helix bolts. Player
hits use a mint shot and an operation-coloured blast. Pausing freezes projectile
travel and damage; replay clears pending shots. Canvas draws matching weapon
patterns when WebGPU is unavailable. Arithmetic, scoring, and damage stay on the
CPU; the combat readout identifies the effect renderer.

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
