import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as jsxRuntime from "react/jsx-runtime";
import { AnimatePresence, motion } from "motion/react";
import type { ReactElement } from "react";
import { motionTokens } from "@/lib/motion-tokens";
import { FilmStudy } from "@/components/invitation/film-study";

type Element = ReactElement<Record<string, unknown>>;

/** Render the real open-panel element without starting media or a browser dialog. */
function filmPanel(still: boolean) {
  let stateIndex = 0;
  const modules: Record<string, unknown> = {
    react: {
      useRef: () => ({ current: null }),
      useEffect: () => {},
      useState: (initial: unknown) => [
        stateIndex++ === 0 ? true : initial,
        () => {}
      ]
    },
    "react/jsx-runtime": jsxRuntime,
    "motion/react": { AnimatePresence, motion },
    "@/lib/motion-tokens": { motionTokens }
  };
  const source = readFileSync(
    new URL("../../src/components/invitation/film-study.tsx", import.meta.url),
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
    FilmStudy(props: { still: boolean; onModalChange(): void }): Element;
  };
  runInNewContext(compiled, {
    exports,
    require: (name: string) => modules[name]
  });
  const descendants = (element: Element): Element[] => [
    element,
    ...[element.props.children]
      .flat(Infinity)
      .flatMap((child) =>
        child && typeof child === "object" && "props" in child
          ? descendants(child as Element)
          : []
      )
  ];
  const panel = descendants(
    exports.FilmStudy({ still, onModalChange() {} })
  ).find((element) => element.type === motion.div);
  assert.ok(panel);
  return JSON.parse(JSON.stringify(panel.props));
}

test("real film panel retains exact perspective, transforms, timings and ease", () => {
  const poses = filmPanel(false);
  assert.deepEqual(poses.style, { transformPerspective: 1200 });
  assert.deepEqual(poses.initial, {
    opacity: 0,
    y: "65%",
    rotateX: -24,
    scale: 0.88
  });
  assert.deepEqual(poses.animate, {
    opacity: 1,
    y: "0%",
    rotateX: 0,
    scale: 1
  });
  assert.deepEqual(poses.exit, {
    opacity: 0,
    y: "48%",
    rotateX: 18,
    scale: 0.92,
    transition: { duration: 0.35 }
  });
  assert.deepEqual(poses.transition, {
    duration: 0.6,
    ease: [0.22, 1, 0.36, 1]
  });
});

test("manually paused real film panel has only brief opacity transitions", () => {
  const poses = filmPanel(true);
  assert.deepEqual(poses.style, {});
  assert.deepEqual(poses.initial, { opacity: 0 });
  assert.deepEqual(poses.animate, { opacity: 1 });
  assert.deepEqual(poses.exit, { opacity: 0 });
  assert.deepEqual(poses.transition, { duration: 0.18 });
});

test("film owner uses direct native Motion props rather than a pose factory", () => {
  const source = readFileSync(
    new URL("../../src/components/invitation/film-study.tsx", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(source, /filmPoses|studyMotion|invitation\/motion/);
});

test("film shell is an honest, labelled study rather than a fake film", () => {
  const html = renderToStaticMarkup(
    <FilmStudy still onModalChange={() => {}} />
  );
  assert.match(html, /<dialog[^>]+aria-labelledby="film-study-heading"/);
  assert.match(html, /Close film study/);
  assert.match(html, /Motion study \/ film not produced/);
  assert.ok(!html.includes("<video"));
  assert.ok(!html.includes("<iframe"));
  assert.match(html, /Preview film transition/);
});

test("configured film is labelled and does not load media before interaction", () => {
  const html = renderToStaticMarkup(
    <FilmStudy
      still
      onModalChange={() => {}}
      media={{
        src: "/fixture.mp4",
        title: "Reference clip",
        credit: "Local reference, not our film"
      }}
    />
  );
  assert.match(html, /Watch reference clip/);
  assert.match(html, /Local reference, not our film/);
  assert.ok(!html.includes('src="/fixture.mp4"'));
});
