const {test} = require('node:test');
const assert = require('node:assert/strict');
const {bindKey} = require('../../src/rendering/venture_controls.js');

global.window = {PointerEvent: class {}, setTimeout: () => 1, clearTimeout() {}};
function button() {
  const target = new EventTarget();
  const classes = new Set();
  target.classList = {add: name => classes.add(name), remove: name => classes.delete(name),
    contains: name => classes.has(name)};
  return target;
}
function send(target, type, properties = {}) {
  const event = new Event(type, {cancelable: true});
  Object.assign(event, {button: 0, detail: 1}, properties);
  target.dispatchEvent(event);
  return event;
}

test('contact registers immediately, even when movement cancels the click', () => {
  const key = button(), inputs = [];
  bindKey(key, () => inputs.push('2'));
  assert.equal(send(key, 'pointerdown').defaultPrevented, true);
  assert.deepEqual(inputs, ['2']);
  send(key, 'pointermove'); send(key, 'pointercancel');
  assert.deepEqual(inputs, ['2']);
  assert.equal(key.classList.contains('is-pressed'), true);
});
test('100 rapid taps produce exactly 100 inputs despite compatibility clicks', () => {
  const key = button(), inputs = [];
  bindKey(key, () => inputs.push('2'));
  for (let i = 0; i < 100; i++) {
    send(key, 'pointerdown'); send(key, 'pointerup'); send(key, 'click');
  }
  assert.equal(inputs.length, 100);
});
test('both split pads can register simultaneous fingers', () => {
  const left = button(), right = button(), inputs = [];
  bindKey(left, () => inputs.push('2'));
  bindKey(right, () => inputs.push('7'));
  send(left, 'pointerdown', {pointerId: 1, isPrimary: true});
  send(right, 'pointerdown', {pointerId: 2, isPrimary: false});
  assert.deepEqual(inputs, ['2', '7']);
});
test('keyboard and assistive-technology clicks register once', () => {
  const key = button(), inputs = [];
  bindKey(key, () => inputs.push('2'));
  send(key, 'click', {detail: 0});
  assert.deepEqual(inputs, ['2']);
});
test('disabled buttons, right clicks and rejected actions do not flash', () => {
  const key = button(), inputs = [];
  bindKey(key, () => inputs.push('2'));
  send(key, 'pointerdown', {button: 2});
  key.disabled = true; send(key, 'pointerdown'); send(key, 'click', {detail: 0});
  assert.deepEqual(inputs, []);
  assert.equal(key.classList.contains('is-pressed'), false);
  const blocked = button(); bindKey(blocked, () => false);
  send(blocked, 'pointerdown');
  assert.equal(blocked.classList.contains('is-pressed'), false);
});
test('browsers without Pointer Events retain click input', () => {
  window.PointerEvent = undefined;
  try {
    const key = button(), inputs = [];
    bindKey(key, () => inputs.push('2'));
    send(key, 'click');
    assert.deepEqual(inputs, ['2']);
  } finally { window.PointerEvent = class {}; }
});
