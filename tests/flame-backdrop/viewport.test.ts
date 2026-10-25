import assert from 'node:assert/strict';
import test from 'node:test';
import { watchViewport, validateViewportOptions, type ViewportActivation } from '../../components/flame-backdrop/viewport';

function fixture(mode: ViewportActivation = 'once', threshold = .3, previousStarted = false, previousInView = false) {
  const target = {} as Element;
  let callback: IntersectionObserverCallback = () => {};
  let options: IntersectionObserverInit | undefined;
  let observed: Element | undefined;
  let disconnected = false;
  let changes = 0;
  class Observer {
    constructor(fn: IntersectionObserverCallback, init?: IntersectionObserverInit) { callback = fn; options = init; }
    observe(element: Element) { observed = element; }
    disconnect() { disconnected = true; }
  }
  const controller = watchViewport({ target, mode, threshold, previousStarted, previousInView,
    Observer, onChange: () => { changes++; } });
  const emit = (isIntersecting: boolean, intersectionRatio: number, element = target) => callback([
    { target: element, isIntersecting, intersectionRatio } as IntersectionObserverEntry,
  ], {} as IntersectionObserver);
  return { controller, emit, options: () => options, observed: () => observed,
    disconnected: () => disconnected, changes: () => changes };
}

test('observed activation begins unknown and dark, starts at threshold, and ignores threshold jitter', () => {
  const f = fixture();
  assert.deepEqual(f.controller.state, { inView: false, started: false });
  assert.deepEqual(f.options()?.threshold, [0, .3]);
  assert.ok(f.observed());
  f.emit(true, .299); assert.equal(f.changes(), 0);
  f.emit(true, .3); assert.deepEqual(f.controller.state, { inView: true, started: true });
  f.emit(true, .1); assert.deepEqual(f.controller.state, { inView: true, started: true });
  assert.equal(f.changes(), 1);
});

test('once keeps ignition after actual exit and recreation but waits for an observed return', () => {
  const f = fixture(); f.emit(true, .5); f.emit(false, 0);
  assert.deepEqual(f.controller.state, { inView: false, started: true });
  f.emit(true, .1); assert.equal(f.controller.state.inView, false);
  f.emit(true, .3); assert.deepEqual(f.controller.state, { inView: true, started: true });
  const recreated = fixture('once', .3, f.controller.state.started);
  assert.deepEqual(recreated.controller.state, { inView: false, started: true });
  recreated.emit(true, .3); assert.equal(recreated.controller.state.started, true);
});

test('repeat rearms only on actual exit, never on threshold jitter', () => {
  const f = fixture('repeat'); f.emit(true, .4); f.emit(true, .01);
  assert.deepEqual(f.controller.state, { inView: true, started: true });
  f.emit(false, 0); assert.deepEqual(f.controller.state, { inView: false, started: false });
  f.emit(true, .29); assert.equal(f.controller.state.started, false);
  f.emit(true, .3); assert.equal(f.controller.state.started, true);
});

test('recreation preserves the prior activation latch until a real exit even below the threshold', () => {
  for (const mode of ['once', 'repeat'] as const) {
    const f = fixture(mode, .3, true, true);
    assert.equal(f.controller.state.inView, false); // Unknown remains hidden until a fresh entry.
    f.emit(true, .1); assert.deepEqual(f.controller.state, { inView: true, started: true });
    f.emit(false, 0); f.emit(true, .1); assert.equal(f.controller.state.inView, false);
    f.emit(true, .3); assert.equal(f.controller.state.inView, true);
  }
});

test('rapid successive recreation retains the checkpoint before a fresh observer delivery', () => {
  const pending = fixture('once', .3, true, true);
  assert.deepEqual(pending.controller.checkpoint, { inView: true, started: true });
  const next = fixture('once', .3, pending.controller.checkpoint.started, pending.controller.checkpoint.inView);
  next.emit(true, .1); assert.equal(next.controller.state.inView, true);
  next.emit(false, 0); assert.deepEqual(next.controller.checkpoint, { inView: false, started: true });
});

test('unsupported observers and disabled activation fail open without subscribing', () => {
  for (const mode of ['none', 'once', 'repeat'] as const) {
    const controller = watchViewport({ target: {} as Element, mode, threshold: .08, onChange: () => assert.fail('no observer callback') });
    assert.deepEqual(controller.state, { inView: true, started: true });
    assert.equal(controller.initialProgress, 1);
    controller.disconnect(); controller.disconnect();
  }
  const none = fixture('none');
  assert.equal(none.observed(), undefined);
  assert.deepEqual(none.controller.state, { inView: true, started: true });
});

test('disconnect and unrelated entries cannot change a mounted successor or call stale handlers', () => {
  const f = fixture(); f.emit(true, 1, {} as Element); assert.equal(f.changes(), 0);
  assert.equal(f.controller.initialProgress, 0);
  f.controller.disconnect(); f.controller.disconnect();
  assert.equal(f.disconnected(), true);
  f.emit(true, 1); assert.equal(f.changes(), 0);
  assert.deepEqual(f.controller.state, { inView: false, started: false });
});

test('activation validates modes and finite closed threshold range', () => {
  for (const threshold of [0, .08, .3, 1]) assert.doesNotThrow(() => validateViewportOptions('once', threshold));
  for (const threshold of [-.001, 1.001, Infinity, NaN, null, undefined, '0.3']) {
    assert.throws(() => validateViewportOptions('once', threshold as never), /viewportThreshold/);
  }
  for (const mode of ['', 'invalid', null, undefined, false]) {
    assert.throws(() => validateViewportOptions(mode as never, .08), /viewportActivation/);
  }
  const zero = fixture('repeat', 0); zero.emit(false, 0); assert.equal(zero.controller.state.started, false);
  zero.emit(true, 0); assert.equal(zero.controller.state.started, true);
  const full = fixture('once', 1); full.emit(true, .999); assert.equal(full.controller.state.started, false);
  full.emit(true, 1); assert.equal(full.controller.state.started, true);
});
