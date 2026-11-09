import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import * as jsx from "react/jsx-runtime";
import ts from "typescript";
import { animate as nativeAnimate, type AnimationPlaybackControlsWithThen } from "motion";

function mountLoop(path: string, name: string) {
  const slots: unknown[] = [];
  let cursor = 0;
  let starts = 0;
  let options: Record<string, unknown> = {};
  let keyframes: Record<string, unknown> = {};
  let effects: (() => void)[] = [];
  const element = {};
  const scope = { current: element };
  let playback: AnimationPlaybackControlsWithThen | undefined;
  const animate = (_: unknown, frames: typeof keyframes, timing: typeof options) => {
    starts++;
    keyframes = frames;
    options = timing;
    // Use Motion's real playback clock; only DOM measurement is adapted away.
    playback = nativeAnimate(0, 1, { ...timing, autoplay: false });
    return playback;
  };
  const react = {
    forwardRef: () => () => null,
    useRef(initial: unknown) {
      const index = cursor++;
      slots[index] ??= { current: initial };
      return slots[index];
    },
    useEffect(effect: () => (() => void) | void, deps: unknown[]) {
      const index = cursor++;
      const previous = slots[index] as { deps: unknown[]; cleanup?: () => void } | undefined;
      if (previous && deps.every((value, at) => value === previous.deps[at])) return;
      effects.push(() => {
        previous?.cleanup?.();
        slots[index] = { deps, cleanup: effect() };
      });
    },
  };
  const source = readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports: Record<string, (props: Record<string, unknown>) => unknown> = {};
  runInNewContext(`${compiled}\nexports.testLoop = ${name};`, {
    exports,
    require(module: string) {
      if (module === "react") return react;
      if (module === "react/jsx-runtime") return jsx;
      if (module === "motion/react") return { useAnimate: () => [scope, animate] };
      return {};
    },
  });
  return {
    render(props: Record<string, unknown>) {
      cursor = 0;
      effects = [];
      const output = exports.testLoop(props) as { props: Record<string, unknown> };
      for (const effect of effects) effect();
      return output;
    },
    seek(value: number) { playback!.time = value; },
    stop() { playback?.stop(); },
    snapshot: () => ({ starts, time: playback?.time, state: playback?.state, options, keyframes }),
  };
}

test("account indicators preserve their exact phase across hidden/visible changes", () => {
  for (const duration of [1, 2]) {
    const loop = mountLoop("components/Authentication/account-phase-views.tsx", "PhaseSpinner");
    const output = loop.render({ visible: true, size: 15, duration });
    assert.equal(output.props.size, 15);
    assert.equal(output.props.strokeWidth, 1.5);
    assert.equal(output.props["aria-hidden"], "true");
    assert.equal(loop.snapshot().options.duration, duration);
    assert.equal(loop.snapshot().options.ease, "linear");
    assert.equal(loop.snapshot().options.repeat, Infinity);
    assert.equal(JSON.stringify(loop.snapshot().keyframes), '{"rotate":[0,360]}');
    loop.seek(0.37);
    loop.render({ visible: false, size: 15, duration });
    assert.equal(loop.snapshot().state, "paused");
    loop.render({ visible: true, size: 15, duration });
    assert.equal(loop.snapshot().state, "running");
    assert.equal(loop.snapshot().starts, 1);
    assert.equal(loop.snapshot().time, 0.37);
    loop.stop();
  }
});

test("OTP caret keeps every CSS opacity stop and pauses native playback without resetting", () => {
  const loop = mountLoop("components/ui/input-otp.tsx", "InputOTPCaret");
  const output = loop.render({ paused: false });
  assert.equal(output.props.className, "h-4 w-px bg-foreground");
  assert.equal(output.props["data-slot"], "input-otp-caret");
  const original = loop.snapshot();
  assert.equal(JSON.stringify(original.keyframes), '{"opacity":[1,0,0,1,1]}');
  assert.equal(JSON.stringify(original.options.times), "[0,0.2,0.5,0.7,1]");
  assert.equal(JSON.stringify(original.options.ease), "[0,0,0.58,1]");
  assert.equal(original.options.duration, 1);
  assert.equal(original.options.repeat, Infinity);
  loop.seek(0.41);
  loop.render({ paused: true });
  assert.equal(loop.snapshot().state, "paused");
  loop.render({ paused: false });
  assert.equal(loop.snapshot().state, "running");
  assert.equal(loop.snapshot().starts, 1);
  assert.equal(loop.snapshot().time, 0.41);
  loop.stop();
  assert.doesNotMatch(readFileSync(new URL("../../src/styles/globals.css", import.meta.url), "utf8"), /caret-blink/);
});
