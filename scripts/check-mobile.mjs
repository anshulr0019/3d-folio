import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { setMaxListeners } from 'node:events';
import ts from 'typescript';
import * as THREE from 'three';

// Unit-level input/lifecycle checks; this does not emulate physical touch hardware.
const require = createRequire(import.meta.url);
const cleanups = [];
const fakeWindow = new EventTarget();
const fakeDocument = new EventTarget();
fakeDocument.hidden = false;
setMaxListeners(0, fakeWindow, fakeDocument);
let time = 0, nextFrame = 0;
const frames = new Map();
const runtime = {
  window: fakeWindow, document: fakeDocument, AbortController,
  performance: { now: () => time },
  requestAnimationFrame: callback => { frames.set(++nextFrame, callback); return nextFrame; },
  cancelAnimationFrame: id => frames.delete(id),
  ResizeObserver: class { observe() {} disconnect() {} },
};
function load(file, overrides = {}) {
  const source = ts.transpileModule(fs.readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  const context = vm.createContext({ ...runtime, module, exports: module.exports, require: name => name in overrides ? overrides[name] : require(name) });
  vm.runInContext(source, context, { filename: file });
  return module.exports;
}
const { PhotoGesture } = load('../src/portfolio/PhotoGesture.ts');
const gesture = new PhotoGesture();
assert.equal(gesture.begin(1, 100, 100), true);
assert.equal(gesture.move(1, 115, 120).dx, 15);
assert.equal(gesture.begin(2, 215, 120), true);
assert.equal(gesture.begin(3, 400, 400), false);
assert.equal(gesture.move(2, 315, 120).zoom, 0.5); // spreading fingers zooms in
assert.equal(gesture.move(1, 115, 120).dx, 0); // pinch does not orbit
assert.equal(gesture.move(3, 0, 0), null);
gesture.end(2);
assert.equal(gesture.move(1, 120, 120).dx, 5); // no jump when one finger lifts
gesture.clear();
assert.equal(gesture.move(1, 0, 0), null);

const react = { useRef: current => ({ current }), useCallback: fn => fn, useEffect: effect => cleanups.push(effect()) };
const { MobileJoystick, HoldControl } = load('../src/portfolio/TouchControls.tsx', {
  react, './InterfaceIcon': { InterfaceIcon() {} },
});
let vector = [0, 0];
const joystick = MobileJoystick({ onMove: (x, y) => { vector = [x, y]; } }).props;
const keys = new Set();
const onKey = (code, held) => held ? keys.add(code) : keys.delete(code);
const run = HoldControl({ label: 'Run', code: 'ShiftLeft', icon: 'arrow', onKey }).props;
const jump = HoldControl({ label: 'Jump', code: 'Space', icon: 'jump', onKey }).props;
let prevented = 0;
function pointer(id, x = 0, y = 0) { return { pointerId: id, clientX: x, clientY: y, button: 0, preventDefault() { prevented++; }, currentTarget: { setPointerCapture() {} } }; }
joystick.onPointerDown(pointer(1));
joystick.onPointerMove(pointer(1, 60, -60));
assert.ok(Math.abs(Math.hypot(...vector) - 1) < 1e-9);
run.onPointerDown(pointer(2));
jump.onPointerDown(pointer(3));
assert.equal(keys.size, 2); // movement + run + jump have independent owners
assert.ok(Math.hypot(...vector) > 0);
assert.equal(prevented, 3); // all starts suppress browser focus transfer
joystick.onPointerUp(pointer(9));
run.onPointerUp(pointer(9));
assert.ok(Math.hypot(...vector) > 0);
assert.ok(keys.has('ShiftLeft'));
jump.onPointerUp(pointer(3));
assert.ok(!keys.has('Space') && keys.has('ShiftLeft'));
run.onLostPointerCapture(pointer(2));
assert.equal(keys.size, 0);
joystick.onPointerCancel(pointer(1));
assert.equal(Math.hypot(...vector), 0);
run.onPointerDown(pointer(4));
joystick.onPointerDown(pointer(5));
joystick.onPointerMove(pointer(5, 10, 10));
fakeDocument.hidden = true;
fakeDocument.dispatchEvent(new Event('visibilitychange'));
assert.equal(keys.size, 0);
assert.equal(Math.hypot(...vector), 0);
fakeDocument.hidden = false;
for (const cleanup of cleanups) cleanup?.();

const { EventEmitter } = load('../src/portfolio/EventEmitter.ts');
class Renderer {
  shadowMap = {};
  info = {};
  setPixelRatio() {} setSize() {} dispose() {} forceContextLoss() {}
}
class Canvas extends EventTarget {
  clientWidth = 390; clientHeight = 844; style = {};
  setPointerCapture() {}
}
const { Experience } = load('../src/portfolio/Experience.ts', {
  three: { ...THREE, WebGLRenderer: Renderer },
  'three/examples/jsm/postprocessing/EffectComposer.js': {},
  'three/examples/jsm/postprocessing/RenderPass.js': {},
  'three/examples/jsm/postprocessing/UnrealBloomPass.js': {},
  'three/examples/jsm/postprocessing/OutputPass.js': {},
  './World': {}, './Character': {}, './EventEmitter': { EventEmitter },
  './Audio': { sound: {} }, './Weather': {}, './content': {},
  gsap: { killTweensOf() {} }, './dispose': {}, './renderBudget': load('../src/portfolio/renderBudget.ts'), './islandLayout': load('../src/portfolio/islandLayout.ts'), './Campus': {},
  './quality': { resolveQuality: () => 'balanced', SETTINGS: { balanced: { fps: 60, bloom: false }, low: { fps: 30, bloom: false } } },
  './PhotoGesture': { PhotoGesture },
});
const canvas = new Canvas();
const exp = new Experience(canvas);
let updates = 0;
exp.update = () => updates++;
exp.state = 'ROOM';
exp.startLoop();
function tick(ms) { time += ms; const scheduled = [...frames.values()]; frames.clear(); for (const callback of scheduled) callback(time); }
tick(17); assert.equal(updates, 1);
exp.setInterfaceOpen(true); tick(100); assert.equal(updates, 1);
exp.setInterfaceOpen(false); tick(17); assert.equal(updates, 2);
exp.quality = 'low';
for (const step of [1000 / 60, 16.5, 16.8]) {
  const beforeLite = updates;
  for (let i = 0; i < 600; i++) tick(step);
  const target = step * 600 * 30 / 1000;
  assert.ok(Math.abs(updates - beforeLite - target) <= 1, `Lite rendered ${updates - beforeLite} frames instead of approximately ${target}`);
}
exp.keys.add('Space'); exp.joystick.x = 1;
let contextEvents = 0;
exp.on('contextLost', () => contextEvents++);
canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
assert.equal(contextEvents, 1); assert.equal(exp.keys.size, 0); assert.equal(exp.joystick.x, 0);
assert.equal(frames.size, 0);
fakeDocument.dispatchEvent(new Event('visibilitychange'));
assert.equal(frames.size, 0); // fatal failures never restart on tab visibility
exp.listeners.abort(); exp.resizeObserver.disconnect();
console.log('PASS: photo orbit/pinch ownership; simultaneous movement/run/jump; unrelated releases; cancellation/hidden-tab reset; jittered Lite frame cap; guide rendering pause; fatal-context resume guard.');
