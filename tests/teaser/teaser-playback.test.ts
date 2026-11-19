import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { Children, isValidElement, type ReactNode } from "react";
import { motionValue, type MotionValue } from "motion/react";
import ts from "typescript";
import { runInNewContext } from "node:vm";
import { Story } from "@/components/teaser/story";
import { createTimeline, scrollChapters } from "@/lib/teaser/choreography";
import { stories as defaultStories } from "@/lib/teaser/content";
import { createTranslator } from "next-intl";
import messages from "../../messages/en.json";

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
    "next-intl": { useTranslations: () => createTranslator({ locale: "en", messages, namespace: "System" }) },
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
    new URL("../../src/components/teaser/story.tsx", import.meta.url),
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
