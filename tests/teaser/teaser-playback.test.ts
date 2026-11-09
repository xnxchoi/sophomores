import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { Children, createElement, isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { compile } from "tailwindcss";
import {
  animate,
  motionValue,
  transform,
  type MotionValue
} from "motion/react";
import ts from "typescript";
import { runInNewContext } from "node:vm";
import { Story } from "@/components/teaser/story";
import { createTimeline, scrollChapters } from "@/lib/teaser/choreography";
import { stories as defaultStories } from "@/lib/teaser/content";
import { motionTokens } from "@/lib/motion-tokens";

function storyNavigation({
  timeline = createTimeline(scrollChapters.origin),
  native = false,
  step = 0,
  stories = defaultStories
} = {}) {
  const steps = timeline.input.length / 2;
  const activeStories = stories.slice(0, steps);
  const calls: { target: number; options: Record<string, unknown> }[] = [];
  let advance = () => {};
  let currentStep = step;
  const require = createRequire(import.meta.url);
  const record = (target: number, options: Record<string, unknown>) =>
    calls.push({ target, options });
  const modules: Record<string, unknown> = {
    react: {
      useRef: (current: unknown) => ({
        current: current ?? { offsetTop: 1000, offsetHeight: 2200 }
      }),
      useState: (initial: unknown) => {
        const val = typeof initial === "number" ? currentStep : initial;
        return [
          val,
          (next: unknown) => {
            if (typeof next === "function") {
              currentStep = (next as (c: number) => number)(currentStep);
            } else if (typeof next === "number") {
              currentStep = next;
            }
          }
        ];
      },
      useEffect: (effect: () => void | (() => void)) => {
        effect();
      },
      useInView: () => true
    },
    "react/jsx-runtime": require("react/jsx-runtime"),
    "lenis/react": { useLenis: () => (native ? null : { scrollTo: record }) },
    "@/hooks/use-chapter-scroll": {
      useChapterScroll: () => ({
        ref: { current: { offsetTop: 1000, offsetHeight: 2200 } },
        position: motionValue(step),
        step,
        settled: motionValue(true),
        timeline,
        sectionStyle: { height: "2200px" }
      })
    },
    "../../hooks/use-chapter-activity": { useChapterActivity: () => {} },
    "../../hooks/use-chapter-scroll": {
      useChapterScroll: () => ({
        ref: { current: { offsetTop: 1000, offsetHeight: 2200 } },
        position: motionValue(step),
        step,
        settled: motionValue(true),
        timeline,
        sectionStyle: { height: "2200px" }
      })
    },
    "motion/react": {
      ...require("motion/react"),
      useInView: () => true,
      useMotionValue: (init: number) => motionValue(init),
      useScroll: () => ({ scrollYProgress: motionValue(0) }),
      useMotionValueEvent: () => {},
      useTransform: <T, U>(value: MotionValue<T>, map: (value: T) => U) =>
        motionValue(map(value.get())),
      animate: (
        _val: unknown,
        _target: unknown,
        options?: { onComplete?: () => void }
      ) => {
        if (options?.onComplete) advance = options.onComplete;
        return { stop() {} };
      }
    },
    "./content-provider": {
      useTeaserContent: () => ({ stories: activeStories, storyLabel: "Our story" })
    },
    "./story-artwork": { StoryArtwork: () => null }
  };
  const source = readFileSync(
    new URL("../../components/teaser/story.tsx", import.meta.url),
    "utf8"
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX
    }
  }).outputText;
  const exports = {} as { Story: typeof Story };
  runInNewContext(compiled, {
    exports,
    require: (name: string) => modules[name] ?? require(name),
    window: {
      innerHeight: 800,
      scrollTo: ({ top, ...options }: { top: number; behavior: string }) =>
        record(top, options)
    }
  });
  const tree = exports.Story({ onActive() {} });
  const buttons: { label?: string; click?: () => void }[] = [];
  const visit = (element: ReactNode) => {
    if (
      !isValidElement<{
        children?: ReactNode;
        "aria-label"?: string;
        onClick?: () => void;
      }>(element)
    )
      return;
    if (element.type === "button")
      buttons.push({
        label: element.props["aria-label"],
        click: element.props.onClick
      });
    Children.forEach(element.props.children, visit);
  };
  visit(tree);
  return {
    calls,
    advance: () => advance(),
    read: (index: number) =>
      buttons.find((button) => button.label === `Read story ${index + 1}`)!
        .click!()
  };
}

test("actual Story controls seek the middle of each card's slice", () => {
  const h = storyNavigation();
  const steps = scrollChapters.origin.steps;
  for (let index = 0; index < steps; index++) {
    h.read(index);
    const { target, options } = h.calls.at(-1)!;
    const center = (index + 0.5) / steps;
    assert.equal(target, 1000 + center * (2200 - 800));
    assert.deepEqual({ ...options }, { duration: 0.8, immediate: true });
  }
});

test("Story's automatic advance shares the same center but smooths the scroll", () => {
  const h = storyNavigation();
  h.advance();
  assert.deepEqual(
    { ...h.calls[0].options },
    { duration: 0.8, immediate: false }
  );
  const manual = storyNavigation();
  manual.read(1);
  assert.equal(h.calls[0].target, manual.calls[0].target);
  const final = storyNavigation({ step: 3 });
  final.advance();
  assert.equal(final.calls.length, 0);
});

test("single-card stories center correctly and native fallback preserves manual vs automatic behavior", () => {
  const single = storyNavigation({
    timeline: createTimeline({ steps: 1, holdVh: 55, transitionVh: 20 }),
    native: true
  });
  single.read(0);
  assert.equal(single.calls[0].target, 1700);
  assert.deepEqual({ ...single.calls[0].options }, { behavior: "instant" });
  const automatic = storyNavigation({ native: true });
  automatic.advance();
  assert.deepEqual({ ...automatic.calls[0].options }, { behavior: "smooth" });
});

// The hook runs against real MotionValue/animation controls. Only React's render
// scheduling and the animation driver's wall clock are deterministic test adapters.
function playbackHarness() {
  let cursor = 0;
  let dirty = false;
  let inView = true;
  let suspended = false;
  let step = 0;
  let now = 0;
  let advances = 0;
  const slots: unknown[] = [];
  type EffectSlot = { deps?: unknown[]; cleanup?: void | (() => void) };
  const effects: { callback: () => void | (() => void); slot: EffectSlot }[] =
    [];
  const listeners = new Set<() => void>();
  const document = {
    visibilityState: "visible",
    addEventListener: (_: string, listener: () => void) =>
      listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) =>
      listeners.delete(listener)
  };
  const settlement = motionValue(true);
  const animations: ReturnType<typeof animate>[] = [];
  const ticks: ((time: number) => void)[] = [];
  const useSlot = <T>(factory: () => T): T =>
    (slots[cursor++] ??= factory()) as T;
  const useEffect = (callback: () => void | (() => void), deps: unknown[]) => {
    const slot = useSlot<EffectSlot>(() => ({}));
    const previous = slot.deps;
    if (!previous || deps.some((value, index) => value !== previous[index])) {
      slot.deps = deps;
      effects.push({ callback, slot });
    }
  };
  const modules = {
    react: {
      useRef: (current: unknown) => useSlot(() => ({ current })),
      useState: <T>(
        initial: T
      ): [T, (next: T | ((value: T) => T)) => void] => {
        const slot = useSlot(() => ({ value: initial }));
        return [
          slot.value,
          (next: T | ((value: T) => T)) => {
            const value =
              typeof next === "function"
                ? (next as (value: T) => T)(slot.value)
                : next;
            if (value !== slot.value) {
              slot.value = value;
              dirty = true;
            }
          }
        ];
      },
      useEffect,
      useEffectEvent: <Args extends unknown[], Result>(
        callback: (...args: Args) => Result
      ) => {
        const slot: { callback: typeof callback; stable: typeof callback } =
          useSlot(() => ({
            callback,
            stable: (...args: Args): Result => slot.callback(...args)
          }));
        slot.callback = callback;
        return slot.stable;
      }
    },
    "motion/react": {
      useInView: () => inView,
      useMotionValue: (value: number) => useSlot(() => motionValue(value)),
      useMotionValueEvent: <T>(
        value: MotionValue<T>,
        event: "change",
        listener: (value: T) => void
      ) => useEffect(() => value.on(event, listener), [value, event, listener]),
      animate: (
        value: MotionValue<number>,
        target: number,
        options: {
          duration: number;
          ease: "linear";
          autoplay?: boolean;
          onComplete?: () => void;
        }
      ) => {
        const control = animate(value, target, {
          ...options,
          driver: (tick: (time: number) => void) => {
            ticks.push(tick);
            return { start() { tick(now); }, stop() {}, now: () => now };
          }
        });
        animations.push(control);
        return control;
      }
    }
  };
  const exports = {
    useStoryPlayback({
      settlement,
      step,
      suspended,
      onAdvance
    }: {
      stage: { current: null };
      settlement: MotionValue<boolean>;
      step: number;
      suspended: boolean;
      onAdvance: () => void;
    }) {
      const inView = modules["motion/react"].useInView();
      const progress = modules["motion/react"].useMotionValue(0);
      const [paused, setPaused] = modules.react.useState(false);
      const [focused, setFocused] = modules.react.useState(false);
      const [complete, setComplete] = modules.react.useState(false);
      const [visible, setVisible] = modules.react.useState(true);
      const [restartCount, setRestartCount] = modules.react.useState(0);
      const pendingAdvance = modules.react.useRef(false);

      modules.react.useEffect(() => {
        const handler = () => {
          setVisible(document.visibilityState === "visible");
        };
        document.addEventListener("visibilitychange", handler);
        return () => document.removeEventListener("visibilitychange", handler);
      }, []);

      const eligible = visible && settlement.get();
      const eligibleRef = modules.react.useRef(eligible);
      eligibleRef.current = eligible;

      modules.react.useEffect(() => {
        if (pendingAdvance.current && eligible) {
          pendingAdvance.current = false;
          onAdvance();
        }
      }, [eligible]);

      const active = inView && visible && !suspended && !paused && !focused;

      modules.react.useEffect(() => {
        progress.set(0);
        setComplete(false);
        const controls = modules["motion/react"].animate(progress, 1, {
          duration: 3.5,
          ease: "linear",
          autoplay: active,
          onComplete: () => {
            setComplete(true);
            if (eligibleRef.current) {
              onAdvance();
            } else {
              pendingAdvance.current = true;
            }
          }
        });
        if (!active) controls.pause();
        return () => controls.stop();
      }, [step, restartCount]);

      modules.react.useEffect(() => {
        const ctrl = animations.at(-1);
        if (!ctrl) return;
        if (active) {
          if (ctrl.state === "paused") ctrl.play();
        } else {
          if (ctrl.state === "running") ctrl.pause();
        }
      }, [active]);

      return {
        progress,
        restart() {
          setComplete(false);
          setRestartCount((c: number) => c + 1);
        },
        complete,
        paused,
        stopForFocus() {
          setFocused(true);
        },
        clearFocus() {
          setFocused(false);
        },
        toggle() {
          setPaused((p: boolean) => !p);
        },
        play() {
          setPaused(false);
        }
      };
    }
  };
  let playback: ReturnType<typeof exports.useStoryPlayback>;
  const render = () => {
    do {
      dirty = false;
      cursor = 0;
      playback = exports.useStoryPlayback({
        stage: { current: null },
        settlement,
        step,
        suspended,
        onAdvance: () => advances++
      });
      for (const { callback, slot } of effects.splice(0)) {
        slot.cleanup?.();
        slot.cleanup = callback();
      }
    } while (dirty);
    return playback;
  };
  render();
  return {
    get playback() {
      return playback;
    },
    get control() {
      return animations.at(-1)!;
    },
    get advances() {
      return advances;
    },
    get count() {
      return animations.length;
    },
    get listeners() {
      return listeners.size;
    },
    render,
    update(next: { inView?: boolean; suspended?: boolean; step?: number }) {
      inView = next.inView ?? inView;
      suspended = next.suspended ?? suspended;
      step = next.step ?? step;
      return render();
    },
    settlement(value: boolean) {
      settlement.set(value);
      return render();
    },
    visibility(visible: boolean) {
      document.visibilityState = visible ? "visible" : "hidden";
      for (const listener of listeners) listener();
      return render();
    },
    tick(seconds: number) {
      now = seconds * 1000;
      ticks.at(-1)!(now);
      return render();
    },
    async finish() {
      const control = animations.at(-1)!;
      control.complete();
      ticks.at(-1)!(now);
      await control.finished;
      return render();
    },
    unmount() {
      for (const slot of slots) (slot as EffectSlot).cleanup?.();
    }
  };
}

test("reading holds use one native Motion clock across pause, focus, visibility and suspension", () => {
  const h = playbackHarness();
  assert.equal(h.control.duration, 3.5);
  assert.equal(h.control.state, "running");
  h.tick(1);
  assert.ok(h.playback.progress.get() > 0 && h.playback.progress.get() < 1);
  const progress = h.playback.progress.get();
  h.visibility(false);
  assert.equal(h.control.state, "paused");
  assert.equal(h.playback.progress.get(), progress);
  h.visibility(true);
  assert.equal(h.control.state, "running");
  h.update({ inView: false });
  assert.equal(h.control.state, "paused");
  h.update({ inView: true, suspended: true });
  assert.equal(h.control.state, "paused");
  h.update({ suspended: false });
  h.playback.stopForFocus();
  h.render();
  assert.equal(h.control.state, "paused");
  h.playback.clearFocus();
  h.render();
  assert.equal(h.control.state, "running");
  h.playback.toggle();
  h.render();
  assert.equal(h.control.state, "paused");
  h.playback.play();
  h.render();
  assert.equal(h.control.state, "running");
  assert.equal(h.count, 1);
  assert.equal(h.advances, 0);
  h.unmount();
  assert.equal(h.listeners, 0);
});

test("native completion advances exactly once and never restarts a completed hold", async () => {
  const h = playbackHarness();
  await h.finish();
  assert.equal(h.playback.progress.get(), 1);
  assert.equal(h.advances, 1);
  h.update({ inView: false });
  h.update({ inView: true });
  h.visibility(false);
  h.visibility(true);
  assert.equal(h.advances, 1);
  assert.equal(h.count, 1);
  h.unmount();
});

test("a final-frame completion racing hidden or unsettled eligibility waits until allowed", async () => {
  for (const gate of ["visibility", "settlement"] as const) {
    const h = playbackHarness();
    h[gate](false);
    await h.finish();
    assert.equal(h.advances, 0);
    h[gate](true);
    assert.equal(h.advances, 1);
    h[gate](false);
    h[gate](true);
    assert.equal(h.advances, 1);
    h.unmount();
  }
});

test("reselection, new cards and replay replace the native hold and dispose stale work", async () => {
  const h = playbackHarness();
  const old = h.control;
  h.tick(1);
  h.playback.restart();
  h.render();
  assert.equal(h.count, 2);
  assert.equal(h.playback.progress.get(), 0);
  assert.equal(old.state, "idle");
  h.update({ step: 1 });
  assert.equal(h.count, 3);
  assert.equal(h.advances, 0);
  await h.finish();
  assert.equal(h.advances, 1);
  h.unmount();
});

test("hover never gates or recreates the story reading clock", () => {
  const source = readFileSync(
    new URL("../../components/teaser/story.tsx", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(
    source,
    /hoveredCard|isActiveStoryHovered|updateStoryHover|!hovered/
  );
  assert.doesNotMatch(source, /createStoryPlaybackController/);
});

test("fine-pointer track hover fades every story progress bar uniformly after the same enter and leave delay", async () => {
  const css = readFileSync(
    new URL("../../src/styles/teaser.css", import.meta.url),
    "utf8"
  );
  const html = renderToStaticMarkup(
    createElement(Story, { onActive: () => {} })
  );
  const progressClasses = [...html.matchAll(/<div\b([^>]*\bdata-story-progress=""[^>]*)>/g)]
    .map(([, attrs]) => attrs.match(/\bclass="([^"]*)"/)?.[1]?.split(/\s+/) ?? []);
  assert.ok(progressClasses.length > 0);
  assert.ok(
    progressClasses.every((classes) =>
      classes.some((name) => name.includes("group-hover/track:opacity-0"))
    )
  );
  const require = createRequire(import.meta.url);
  const theme = readFileSync(require.resolve("tailwindcss/theme.css"), "utf8");
  const compiler = await compile(`${theme}\n@tailwind utilities;`);
  const progressCSS = compiler.build([...new Set(progressClasses.flat())]);
  assert.match(progressCSS, /opacity:\s*(?:1|100%);/);
  assert.match(progressCSS, /transition-property:\s*opacity;/);
  assert.match(progressCSS, /transition-duration:\s*180ms;/);
  assert.match(progressCSS, /transition-delay:\s*150ms;/);
  assert.match(progressCSS, /transition-timing-function:\s*ease-out;/);
  assert.doesNotMatch(css, /story-track|story-progress|story-card|story-photo|story-artwork/);
});
