// Thumb position and keypad layout are independent of arithmetic input.
let heightOffset = 0, mode = 'split', applyLayout = null, owner = null;
const storageKey = 'euclid-addventure-keypad-lift', layoutKey = 'euclid-addventure-keypad-layout';
const modes = ['left', 'right', 'split'];
function lift() { return heightOffset; }
function layout() { return mode; }
function padHeight() { return owner?.offsetHeight || 0; }
function setLayout(value) { if (modes.includes(value)) { mode = value; applyLayout?.(); } }
function init(panel, handle) {
  if (!panel || !handle || panel.dataset["dragReady"]) return;
  panel.dataset["dragReady"] = 'true'; owner = panel;
  try {
    const saved = Number(window.localStorage.getItem(storageKey));
    if (Number.isFinite(saved)) heightOffset = Math.max(0, saved);
    const savedMode = window.localStorage.getItem(layoutKey);
    if (modes.includes(savedMode)) mode = savedMode;
  } catch (_) {}
  const buttons = [...panel.querySelectorAll('button[data-key]')];
  const keys = new Map(buttons.map(button => [button.dataset["key"], button]));
  const right = document.createElement('div');
  right.id = 'venture-keypad-right'; right.className = 'venture-keypad'; right.dataset["side"] = 'right';
  right.setAttribute('role', 'group'); right.setAttribute('aria-label', 'Right answer keypad: 5 to 9 and Fire');
  const rightHandle = document.createElement('div');
  rightHandle.className = 'command-display'; rightHandle.textContent = ''; right.appendChild(rightHandle);
  panel.parentElement.appendChild(right);
  const panels = [panel, right], handles = [handle, rightHandle];
  let drag = null;
  function limit() {
    const style = window.getComputedStyle(document.documentElement);
    const bottom = Math.max(2, parseFloat(style.getPropertyValue('--safe-bottom')) || 0);
    const top = Math.max(100, (parseFloat(style.getPropertyValue('--safe-top')) || 0) + 100);
    return Math.max(0, window.innerHeight - bottom - (panel.offsetHeight || (mode === 'split' ? 289 : 205)) - top);
  }
  function move(value, persist = false) {
    const maximum = limit();
    heightOffset = Math.round(Math.max(0, Math.min(maximum, value)));
    for (const part of panels) part.style.setProperty('--keypad-lift', `${heightOffset}px`);
    for (const grip of handles) {
      grip.setAttribute('aria-valuemax', String(Math.round(maximum)));
      grip.setAttribute('aria-valuenow', String(heightOffset));
      grip.setAttribute('aria-valuetext', `${heightOffset} pixels above the bottom`);
    }
    if (persist) try { window.localStorage.setItem(storageKey, String(heightOffset)); } catch (_) {}
  }
  applyLayout = () => {
    drag = null;
    panel.dataset["layout"] = right.dataset["layout"] = mode;
    panel.dataset["side"] = mode === 'right' ? 'right' : 'left';
    right.hidden = mode !== 'split';
    handle.firstChild.nodeValue = '';
    const choice = document.getElementById('venture-pad-layout');
    if (choice) choice.value = mode;
    panel.setAttribute('aria-label', mode === 'split' ? 'Left answer keypad: 0 to 4 and Delete' : 'Answer keypad');
    if (mode === 'split') {
      for (const key of ['0','1','2','3','4','Backspace']) panel.appendChild(keys.get(key));
      for (const key of ['5','6','7','8','9','Enter']) right.appendChild(keys.get(key));
    } else for (const button of buttons) panel.appendChild(button);
    move(heightOffset);
    try { window.localStorage.setItem(layoutKey, mode); } catch (_) {}
  };
  for (const grip of handles) {
    grip.tabIndex = 0; grip.setAttribute('role', 'slider');
    grip.setAttribute('aria-label', 'Keypad height. Drag up or down, or use arrow keys');
    grip.setAttribute('aria-orientation', 'vertical'); grip.setAttribute('aria-valuemin', '0');
    grip.addEventListener('pointerdown', event => {
      if (event.button !== 0 || drag) return;
      event.preventDefault(); event.stopPropagation();
      drag = { id: event.pointerId, y: event.clientY, offset: heightOffset };
      grip.setPointerCapture(event.pointerId);
    });
    grip.addEventListener('pointermove', event => {
      if (!drag || event.pointerId !== drag.id) return;
      event.preventDefault(); event.stopPropagation(); move(drag.offset + drag.y - event.clientY);
    });
    const finish = event => {
      if (!drag || event.pointerId !== drag.id) return;
      drag = null; move(heightOffset, true);
      if (grip.hasPointerCapture(event.pointerId)) grip.releasePointerCapture(event.pointerId);
    };
    for (const event of ['pointerup','pointercancel','lostpointercapture']) grip.addEventListener(event, finish);
    grip.addEventListener('keydown', event => {
      const value = { ArrowUp: heightOffset + 20, ArrowDown: heightOffset - 20, Home: 0, End: limit() }[event.key];
      if (value === undefined) return;
      event.preventDefault(); event.stopPropagation(); move(value, true);
    });
  }
  const fit = () => move(heightOffset);
  window.addEventListener('resize', fit); window.visualViewport?.addEventListener('resize', fit);
  applyLayout(); window.requestAnimationFrame(fit);
}
function settings(content) {
  if (!content || document.getElementById('venture-pad-layout')) return;
  const label = document.createElement('label'); label.textContent = 'Keypad layout';
  const choice = document.createElement('select'); choice.id = 'venture-pad-layout';
  for (const value of ['split','left','right']) {
    const option = document.createElement('option'); option.value = value;
    option.textContent = value[0].toUpperCase() + value.slice(1); choice.appendChild(option);
  }
  choice.value = mode; choice.addEventListener('change', () => setLayout(choice.value));
  label.appendChild(choice); content.prepend(label);
}
module.exports = { init, lift, layout, setLayout, padHeight, settings };
