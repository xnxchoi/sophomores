import assert from "node:assert/strict";
import { test } from "node:test";
import { storageAvailable } from "../../src/utilities/isLocalStorageAvailable";

test("storage detection handles success, full storage and unrelated failures", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  const detect = (failure: unknown, length: number) => {
    Object.defineProperty(globalThis, "window", { configurable: true, value: {
      localStorage: { length, setItem() { if (failure) throw failure; }, removeItem() {} }
    } });
    return storageAvailable("localStorage");
  };
  try {
    assert.equal(detect(null, 0), true);
    assert.equal(detect(new DOMException("Full", "QuotaExceededError"), 1), true);
    assert.equal(detect(new DOMException("Full", "QuotaExceededError"), 0), false);
    assert.equal(detect(new Error("Disabled"), 1), false);
    assert.equal(detect({ name: "QuotaExceededError" }, 1), false);
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
