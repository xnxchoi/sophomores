import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as jsxRuntime from "react/jsx-runtime";
import { AnimatePresence, motion } from "motion/react";
import type { ReactElement } from "react";
import * as registration from "../../lib/invitation/registration";

type Element = ReactElement<Record<string, unknown>>;

/** Inspect the real form's Motion props and callbacks without replacing its transition policy. */
function mountForm(still = false) {
  const slots: unknown[] = [];
  let cursor = 0;
  let tree: Element;
  let values = {
    email: "reader@example.com",
    preferredName: "Reader",
    consent: true
  };
  let resets = 0;
  const useSlot = <T>(factory: () => T): [T, number] => {
    const index = cursor++;
    slots[index] ??= factory();
    return [slots[index] as T, index];
  };
  const modules: Record<string, unknown> = {
    react: {
      useState(initial: unknown) {
        const [value, index] = useSlot(() => initial);
        return [
          value,
          (next: unknown) => {
            slots[index] = next;
          }
        ];
      },
      useRef: (initial: unknown) => useSlot(() => ({ current: initial }))[0],
      useEffect: () => {}
    },
    "react/jsx-runtime": jsxRuntime,
    "motion/react": { AnimatePresence, motion },
    "@tanstack/react-form": {
      useForm: () => ({
        state: { values },
        reset: () => {
          resets++;
          values = registration.initialRegistration();
        },
        Field: () => null,
        Subscribe: () => null
      })
    },
    "../../lib/invitation/registration": registration
  };
  const source = readFileSync(
    new URL("../../components/invitation/invitation-form.tsx", import.meta.url),
    "utf8"
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX
    }
  }).outputText;
  const exports = {} as {
    InvitationForm(props: { onExit(): void; still: boolean }): Element;
  };
  runInNewContext(compiled, {
    exports,
    require: (name: string) => modules[name]
  });
  const descendants = (element: Element): Element[] => {
    const children = [element.props.children].flat(Infinity);
    return [
      element,
      ...children.flatMap((child) =>
        child && typeof child === "object" && "props" in child
          ? descendants(child as Element)
          : []
      )
    ];
  };
  const find = (predicate: (element: Element) => boolean) => {
    const element = descendants(tree).find(predicate);
    assert.ok(element);
    return element;
  };
  return {
    render() {
      cursor = 0;
      tree = exports.InvitationForm({ still, onExit() {} });
    },
    panel: () => find((element) => element.type === motion.div),
    stage: () =>
      find((element) => element.props.className === "invitation-form-stage"),
    start: () =>
      (
        find((element) => element.props.className === "invitation-form-primary")
          .props.onClick as () => void
      )(),
    submit: () =>
      (
        find((element) => element.type === "form").props.onSubmit as (event: {
          preventDefault(): void;
        }) => void
      )({ preventDefault() {} }),
    arrive(definition = "visible") {
      (
        find((element) => element.type === motion.div).props
          .onAnimationComplete as (definition: string) => void
      )(definition);
    },
    exit: () =>
      (
        find((element) => element.type === AnimatePresence).props
          .onExitComplete as () => void
      )(),
    resets: () => resets
  };
}

function variants(form: ReturnType<typeof mountForm>) {
  // VM objects have a distinct prototype; JSON normalizes only the declarative native Motion data.
  return JSON.parse(JSON.stringify(form.panel().props.variants));
}

test("normal panels retain exact departure, breath, arrival, distances and easing", () => {
  const form = mountForm();
  form.render();
  assert.deepEqual(variants(form), {
    hidden: { opacity: 0, y: 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, delay: 0.08, ease: [0.45, 0, 0.25, 1] }
    },
    exit: {
      opacity: 0,
      y: -8,
      transition: { duration: 0.38, ease: [0.45, 0, 0.25, 1] }
    }
  });
});

test("existing explicit manual-pause mode retains its brief stationary fades", () => {
  const form = mountForm(true);
  form.render();
  assert.deepEqual(variants(form), {
    hidden: { opacity: 0, y: 0 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.12, delay: 0, ease: [0.45, 0, 0.25, 1] }
    },
    exit: {
      opacity: 0,
      y: 0,
      transition: { duration: 0.12, ease: [0.45, 0, 0.25, 1] }
    }
  });
});

test("real pending guard rejects repeated navigation and stale completions until incoming arrival", () => {
  const form = mountForm();
  form.render();
  const staleIntroArrival = form.panel().props.onAnimationComplete as (
    definition: string
  ) => void;
  form.start();
  form.start();
  form.render();
  assert.equal(form.panel().key, "email");
  assert.equal(form.stage().props.inert, true);
  staleIntroArrival("visible");
  form.arrive("exit");
  form.submit();
  form.render();
  assert.equal(form.panel().key, "email");
  assert.equal(form.stage().props.inert, true);
  form.arrive();
  form.render();
  assert.equal(form.stage().props.inert, false);
  form.submit();
  form.render();
  assert.equal(form.panel().key, "name");
  form.arrive();
  form.render();
  form.submit();
  form.render();
  assert.equal(form.panel().key, "review");
  form.arrive();
  form.render();
  form.submit();
  form.render();
  assert.equal(form.panel().key, "complete");
  assert.equal(form.resets(), 0);
  form.exit();
  assert.equal(form.resets(), 1);
});

test("native presence owns the entire inert panel while Back to study remains outside", () => {
  const source = readFileSync(
    new URL("../../components/invitation/invitation-form.tsx", import.meta.url),
    "utf8"
  );
  assert.match(source, /mode="wait"/);
  assert.match(source, /inert=\{transitioning\}/);
  assert.doesNotMatch(
    source,
    /ReducedMotion|invitationStepVariants|canStartStepTransition|hasStepArrived|invitation\/step-motion/
  );
  assert.ok(
    source.indexOf("<motion.div") < source.indexOf('aria-label="Preview steps"')
  );
  assert.ok(
    source.indexOf("invitation-form-exit") <
      source.indexOf("inert={transitioning}")
  );
});
