import assert from "node:assert/strict";
import { test } from "node:test";
import {
  authenticationViewportGeometry,
  isAuthenticationLocked,
  type AuthenticationStep,
} from "../../lib/authentication-entry";

const desktop = {
  width: 1280,
  finePointer: false,
  viewportHeight: 900,
  offsetTop: 0,
  layoutHeight: 900,
  gutter: 24,
  contentHeight: 300,
};

test("only a chosen authentication flow locks dismissal", () => {
  const expected: ReadonlyArray<readonly [AuthenticationStep, boolean]> = [
    ["chooser", false], ["login", true], ["signup", true],
  ];
  for (const [step, locked] of expected) assert.equal(isAuthenticationLocked(step), locked, step);
});

test("desktop chooser is centered without changing its compact content size", () => {
  assert.deepEqual(authenticationViewportGeometry({ ...desktop, locked: false }), {
    bottom: 300,
    maxHeight: 852,
  });
});

test("a narrow desktop window is still a centered modal with a primary fine hover pointer", () => {
  assert.deepEqual(authenticationViewportGeometry({ ...desktop, width: 496, viewportHeight: 1649, layoutHeight: 1649, finePointer: true, locked: false }), {
    bottom: 674.5, maxHeight: 1601
  });
});

test("mobile chooser stays bottom anchored and the 640px breakpoint selects the modal", () => {
  for (const width of [0, 320, 390, 639]) {
    assert.deepEqual(authenticationViewportGeometry({ ...desktop, width, locked: false }), {
      bottom: 24, maxHeight: 852
    });
  }
  for (const width of [640, 768, 1280]) {
    assert.deepEqual(authenticationViewportGeometry({ ...desktop, width, locked: false }), {
      bottom: 300, maxHeight: 852
    });
  }
});

test("focused flow centers its real content inside the visible viewport", () => {
  const result = authenticationViewportGeometry({ ...desktop, contentHeight: 420, locked: true });
  assert.deepEqual(result, { bottom: 240, maxHeight: 852 });
  const visibleTop = desktop.layoutHeight - result.bottom - 420;
  assert.equal(visibleTop, result.bottom, "focused content must have equal top and bottom breathing room");
});

test("keyboard-only visual viewport changes preserve chooser gutter and focused center", () => {
  const keyboard = { width: 390, finePointer: false, viewportHeight: 400, offsetTop: 44, layoutHeight: 844, gutter: 12, contentHeight: 260 };
  assert.deepEqual(authenticationViewportGeometry({ ...keyboard, locked: false }), { bottom: 412, maxHeight: 376 });
  assert.deepEqual(authenticationViewportGeometry({ ...keyboard, locked: true }), { bottom: 470, maxHeight: 376 });
  assert.deepEqual(authenticationViewportGeometry({ ...keyboard, width: 1280, locked: false }), { bottom: 470, maxHeight: 376 });
});

test("oversized desktop chooser is capped inside the visible viewport like a focused modal", () => {
  const result = authenticationViewportGeometry({ ...desktop, viewportHeight: 320, contentHeight: 1200, gutter: 12, locked: false });
  assert.deepEqual(result, { bottom: 592, maxHeight: 296 });
});

test("oversized focused content is viewport capped rather than pushed behind the keyboard", () => {
  const result = authenticationViewportGeometry({ ...desktop, viewportHeight: 320, contentHeight: 1200, gutter: 12, locked: true });
  assert.deepEqual(result, { bottom: 592, maxHeight: 296 });
  assert.equal(desktop.layoutHeight - result.bottom - result.maxHeight, 12);
});

test("zero usable height never creates a negative maximum height", () => {
  const result = authenticationViewportGeometry({ ...desktop, viewportHeight: 20, contentHeight: 420, gutter: 24, locked: true });
  assert.equal(result.maxHeight, 0);
  assert.ok(Number.isFinite(result.bottom));
  assert.ok(result.bottom >= 0);
});

test("geometry is deterministic and never mutates caller input", () => {
  const input = Object.freeze({ ...desktop, locked: true });
  const first = authenticationViewportGeometry(input);
  const second = authenticationViewportGeometry(input);
  assert.deepEqual(first, second);
  assert.deepEqual(input, { ...desktop, locked: true });
});
