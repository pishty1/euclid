# Optional WebGPU renderer

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
