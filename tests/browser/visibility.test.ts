import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import {
  serverSnapshot, subscribeVisibility,
} from '@/utils/browser/visibility';

test('server snapshots do not require a browser document', () => {
  assert.equal(typeof document, 'undefined');
  assert.equal(serverSnapshot(), false);
});

test('shared visibility subscription notifies distinct consumers and removes each listener', () => {
  const dom = new JSDOM('');
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { value: dom.window.document, configurable: true });
  try {
    let flameChanges = 0;
    let accountChanges = 0;
    const unsubscribeFlame = subscribeVisibility(() => { flameChanges += 1; });
    const unsubscribeAccount = subscribeVisibility(() => { accountChanges += 1; });
    dom.window.document.dispatchEvent(new dom.window.Event('visibilitychange'));
    assert.equal(flameChanges, 1);
    assert.equal(accountChanges, 1);
    unsubscribeFlame();
    dom.window.document.dispatchEvent(new dom.window.Event('visibilitychange'));
    assert.equal(flameChanges, 1);
    assert.equal(accountChanges, 2);
    unsubscribeAccount();
    dom.window.document.dispatchEvent(new dom.window.Event('visibilitychange'));
    assert.equal(accountChanges, 2);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'document', previous);
    else Reflect.deleteProperty(globalThis, 'document');
    dom.window.close();
  }
});
