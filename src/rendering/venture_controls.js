// A thumb-position adjustment independent of arithmetic input and game state.
let heightOffset = 0;
const storageKey = 'euclid-addventure-keypad-lift';
function lift() { return heightOffset; }
function init(panel, handle) {
  if (!panel || !handle || panel.dataset.dragReady) return;
  panel.dataset.dragReady = 'true';
  try {
    const saved = Number(window.localStorage.getItem(storageKey));
    if (Number.isFinite(saved)) heightOffset = Math.max(0, saved);
  } catch (_) {}
  handle.tabIndex = 0;
  handle.setAttribute('role', 'slider');
  handle.setAttribute('aria-label', 'Keypad height. Drag up or down, or use arrow keys');
  handle.setAttribute('aria-orientation', 'vertical');
  handle.setAttribute('aria-valuemin', '0');
  let drag = null;
  function limit() {
    const style = window.getComputedStyle(document.documentElement);
    const bottom = Math.max(2, parseFloat(style.getPropertyValue('--safe-bottom')) || 0);
    const top = Math.max(100, (parseFloat(style.getPropertyValue('--safe-top')) || 0) + 100);
    return Math.max(0, window.innerHeight - bottom - (panel.offsetHeight || 205) - top);
  }
  function move(value, persist = false) {
    const maximum = limit();
    heightOffset = Math.round(Math.max(0, Math.min(maximum, value)));
    panel.style.setProperty('--keypad-lift', `${heightOffset}px`);
    handle.setAttribute('aria-valuemax', String(Math.round(maximum)));
    handle.setAttribute('aria-valuenow', String(heightOffset));
    handle.setAttribute('aria-valuetext', `${heightOffset} pixels above the bottom`);
    if (persist) try { window.localStorage.setItem(storageKey, String(heightOffset)); } catch (_) {}
  }
  handle.addEventListener('pointerdown', event => {
    if (event.button !== 0 || drag) return;
    event.preventDefault(); event.stopPropagation();
    drag = { id: event.pointerId, y: event.clientY, offset: heightOffset };
    handle.setPointerCapture(event.pointerId);
  });
  handle.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    event.preventDefault(); event.stopPropagation();
    move(drag.offset + drag.y - event.clientY);
  });
  function finish(event) {
    if (!drag || event.pointerId !== drag.id) return;
    drag = null;
    move(heightOffset, true);
    if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
  }
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) handle.addEventListener(event, finish);
  handle.addEventListener('keydown', event => {
    const value = { ArrowUp: heightOffset + 20, ArrowDown: heightOffset - 20, Home: 0, End: limit() }[event.key];
    if (value === undefined) return;
    event.preventDefault(); event.stopPropagation(); move(value, true);
  });
  const fit = () => move(heightOffset);
  window.addEventListener('resize', fit);
  window.visualViewport?.addEventListener('resize', fit);
  move(heightOffset);
  window.requestAnimationFrame(fit);
}
module.exports = { init, lift };
