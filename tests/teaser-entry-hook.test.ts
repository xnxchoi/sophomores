import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as entryController from "../lib/teaser/entry-controller";
import { entryTokens } from "../lib/teaser/entry-tokens";

// Execute the real hook with deterministic React/Motion adapters: no DOM, frames,
// or real-time waits are needed to exercise preference changes and scroll events.
function mountEntry(scrollY = 0, hash = "") {
  const slots: unknown[] = [];
  let cursor = 0;
  let cleanup: (() => void) | undefined;
  let effect: (() => (() => void) | undefined) | undefined;
  const scrollListeners = new Set<(position: number) => void>();
  const visibilityListeners = new Set<() => void>();
  const window = {
    scrollY,
    location: { hash }
  };
  const document = {
    visibilityState: "visible",
    addEventListener: (_: string, listener: () => void) =>
      visibilityListeners.add(listener),
    removeEventListener: (_: string, listener: () => void) =>
      visibilityListeners.delete(listener)
  };
  const useSlot = <T>(factory: () => T): T => {
    const index = cursor++;
    slots[index] ??= factory();
    return slots[index] as T;
  };
  type Value = { get(): number; set(value: number): void };
  const tweens: { value: Value; options: Record<string, unknown> }[] = [];
  let animationCount = 0;
  const modules: Record<string, unknown> = {
    react: {
      useRef: (initial: unknown) => useSlot(() => ({ current: initial })),
      useMemo: (factory: () => unknown) => useSlot(factory),
      useEffect: (callback: typeof effect) => {
        effect = callback;
      }
    },
    "motion/react": {
      useScroll: () =>
        useSlot(() => ({
          scrollY: {
            on: (_: string, listener: (position: number) => void) => {
              scrollListeners.add(listener);
              return () => scrollListeners.delete(listener);
            }
          }
        })),
      useMotionValue: (initial: number) =>
        useSlot(() => {
          let value = initial;
          return {
            get: () => value,
            set: (next: number) => {
              value = next;
            }
          };
        }),
      animate: (
        value: Value,
        target: number | number[],
        options: Record<string, unknown>
      ) => {
        animationCount++;
        tweens.push({ value, options });
        value.set(Array.isArray(target) ? target.at(-1)! : target);
        return { state: "finished", pause() {}, play() {}, stop() {} };
      }
    },
    "@/lib/teaser/entry-tokens": { entryTokens },
    "@/lib/teaser/entry-controller": entryController
  };
  const source = readFileSync(
    new URL("../hooks/use-entry.ts", import.meta.url),
    "utf8"
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022
    }
  }).outputText;
  const exports = {} as { useEntry(reduced: boolean): Record<string, Value> };
  runInNewContext(compiled, {
    exports,
    require: (name: string) => modules[name],
    window,
    document
  });
  let values: Record<string, Value>;
  return {
    render(reduced: boolean) {
      cleanup?.();
      cursor = 0;
      values = exports.useEntry(reduced);
      cleanup = effect?.();
      return Object.fromEntries(
        Object.entries(values).map(([key, value]) => [key, value.get()])
      );
    },
    scroll(position: number) {
      window.scrollY = position;
      for (const listener of scrollListeners) listener(position);
      return Object.fromEntries(
        Object.entries(values).map(([key, value]) => [key, value.get()])
      );
    },
    animations: () => animationCount,
    tweenFor: (key: string) =>
      tweens.filter((tween) => tween.value === values[key]).at(-1)?.options,
    listeners: () => scrollListeners.size + visibilityListeners.size,
    unmount: () => cleanup?.()
  };
}

test("scrolling to the top while reduced retains clean state when motion returns", () => {
  const entry = mountEntry(200);
  assert.deepEqual(entry.render(false), entryTokens.complete);
  entry.render(true);
  const count = entry.animations();
  assert.deepEqual(
    entry.scroll(0),
    entryTokens.complete,
    "reduced content stays readable"
  );
  assert.equal(entry.animations(), count, "reduced scrolling must not animate");
  assert.deepEqual(entry.render(false), entryTokens.clean);
  assert.deepEqual(entry.scroll(0), entryTokens.clean);
  entry.unmount();
  assert.equal(entry.listeners(), 0);
});

test("entry owns layout timing but no timer or animation channel for notifications", () => {
  const entry = mountEntry();
  entry.render(false);
  assert.equal(entry.tweenFor("notification"), undefined);
  assert.equal(entry.tweenFor("layout")?.delay, 3);
  assert.equal(entry.tweenFor("layout")?.duration, 0.5);
  entry.scroll(200);
  entry.scroll(0);
  assert.equal(entry.tweenFor("notification"), undefined);
  assert.equal(entry.tweenFor("layout")?.duration, 0.5);
  entry.unmount();
});

test("scrolling away while reduced rearms an already clean entry", () => {
  const entry = mountEntry(200);
  entry.render(false);
  assert.deepEqual(entry.scroll(0), entryTokens.clean);
  entry.render(true);
  const count = entry.animations();
  assert.deepEqual(entry.scroll(200), entryTokens.complete);
  assert.equal(entry.animations(), count);
  assert.deepEqual(entry.render(false), entryTokens.complete);
  entry.unmount();
  assert.equal(entry.listeners(), 0);
});

test("cold loads still animate once and deep links start settled", () => {
  const cold = mountEntry();
  cold.render(false);
  assert.equal(cold.animations(), 5);
  cold.unmount();
  const deep = mountEntry(0, "#contacts");
  assert.deepEqual(deep.render(false), entryTokens.complete);
  assert.equal(deep.animations(), 0);
  deep.unmount();
});

test("returning top preserves dock, compressed layout and scale without a timed notification channel", () => {
  const entry = mountEntry(200);
  entry.render(false);
  assert.deepEqual(entry.scroll(0), {
    dock: 1,
    backdrop: 1,
    layout: 1,
    scale: 1,
    glyph: 1
  });
  assert.deepEqual(entry.scroll(48), {
    dock: 1,
    backdrop: 1,
    layout: 1,
    scale: 1,
    glyph: 1
  });
  entry.unmount();
});
