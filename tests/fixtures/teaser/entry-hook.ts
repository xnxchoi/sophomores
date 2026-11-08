import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import {
  animate,
  motionValue,
  type MotionValue,
  type AnimationSequence
} from "motion/react";
import { entryTokens } from "@/lib/teaser/entry-tokens";

type Values = Record<string, MotionValue<number>>;
type Segment = [
  MotionValue<number>,
  number | number[],
  Record<string, unknown>
];

/** Deterministic hook lifecycle; native mode additionally runs Motion's real engine. */
export function mountEntry(scrollY = 0, hash = "", native = false) {
  const slots: unknown[] = [];
  let cursor = 0;
  let cleanup: (() => void) | undefined;
  let effect: (() => (() => void) | undefined) | undefined;
  const scrollListeners = new Set<(position: number) => void>();
  const visibilityListeners = new Set<() => void>();
  const window = { scrollY, location: { hash } };
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
  const runs: {
    sequence: Segment[];
    control: {
      state: string;
      pause(): void;
      play(): void;
      stop(): void;
      then(callback: () => void): unknown;
    };
    finish(): void;
    nativeControl?: ReturnType<typeof animate>;
  }[] = [];
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
      useMotionValue: (initial: number) => useSlot(() => motionValue(initial)),
      animate: (
        subject: Segment[] | MotionValue<number>,
        target?: number | number[] | Record<string, unknown>,
        options?: Record<string, unknown>
      ) => {
        const sequence = Array.isArray(subject)
          ? subject
          : ([[subject, target as number | number[], options!]] as Segment[]);
        if (native) {
          const control = animate(sequence as AnimationSequence, {
            ...(target as object),
            autoplay: false
          });
          runs.push({
            sequence,
            control,
            nativeControl: control,
            finish: () => control.complete()
          });
          return control;
        }
        let complete: (() => void) | undefined;
        const control = {
          state: "running",
          pause() {
            this.state = "paused";
          },
          play() {
            this.state = "running";
          },
          stop() {
            this.state = "stopped";
          },
          then(callback: () => void) {
            complete = callback;
          }
        };
        for (const [value, destination] of sequence)
          value.set(
            Array.isArray(destination) ? destination.at(-1)! : destination
          );
        runs.push({
          sequence,
          control,
          finish: () => {
            control.state = "finished";
            complete?.();
          }
        });
        return control;
      }
    },
    "@/lib/teaser/entry-tokens": { entryTokens }
  };
  const source = readFileSync(
    new URL("../../../hooks/use-entry.ts", import.meta.url),
    "utf8"
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022
    }
  }).outputText;
  const exports = {} as { useEntry(): Values };
  runInNewContext(compiled, {
    exports,
    require: (name: string) => modules[name],
    window,
    document
  });
  let values: Values;
  const snapshot = () =>
    Object.fromEntries(
      Object.entries(values).map(([key, value]) => [key, value.get()])
    );
  return {
    runs,
    render() {
      cleanup?.();
      cursor = 0;
      values = exports.useEntry();
      cleanup = effect?.();
      return snapshot();
    },
    scroll(position: number) {
      window.scrollY = position;
      for (const listener of scrollListeners) listener(position);
      return snapshot();
    },
    visibility(state: "hidden" | "visible") {
      document.visibilityState = state;
      for (const listener of visibilityListeners) listener();
    },
    values: () => values,
    snapshot,
    animations: () => runs.length,
    segmentFor: (key: string) =>
      runs.at(-1)?.sequence.find(([value]) => value === values[key]),
    listeners: () => scrollListeners.size + visibilityListeners.size,
    unmount: () => cleanup?.()
  };
}
