import assert from "node:assert/strict";
import { test } from "node:test";
import {
  computeTicketTotal,
  ticketQuantityLabel,
  changeTicketQuantity
} from "@/lib/tickets/tickets";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as jsxRuntime from "react/jsx-runtime";
import type { ReactElement } from "react";
import { AnimatePresence, motion } from "motion/react";
import { motionTokens } from "@/lib/motion-tokens";
import * as tickets from "@/lib/tickets/tickets";

test("unknown prices remain unknown at every valid study quantity", () => {
  for (let quantity = 1; quantity <= 6; quantity += 1) {
    assert.equal(computeTicketTotal(null, quantity), null);
  }
});

test("amounts are multiplied as integer minor units, including actual zero", () => {
  assert.equal(computeTicketTotal(50000, 3), 150000);
  assert.equal(computeTicketTotal(1, 6), 6);
  assert.equal(computeTicketTotal(0, 1), 0);
  assert.equal(
    computeTicketTotal(Number.MAX_SAFE_INTEGER, 1),
    Number.MAX_SAFE_INTEGER
  );
});

test("reject malformed, unsafe or negative amounts and overflow", () => {
  for (const amount of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => computeTicketTotal(amount, 1), RangeError);
  }
  assert.throws(
    () => computeTicketTotal(Number.MAX_SAFE_INTEGER, 2),
    RangeError
  );
});

test("study bounds are explicit and reject malformed quantities even without prices", () => {
  for (const quantity of [0, -1, 7, 1.5, NaN, Infinity]) {
    assert.throws(() => computeTicketTotal(null, quantity), RangeError);
    assert.throws(() => ticketQuantityLabel(quantity), RangeError);
    assert.throws(() => changeTicketQuantity(quantity, 1), RangeError);
  }
});

test("changes clamp at the declared demo bounds and preserve integer counts", () => {
  assert.equal(changeTicketQuantity(1, -1), 1);
  assert.equal(changeTicketQuantity(6, 1), 6);
  assert.equal(changeTicketQuantity(3, 1), 4);
  assert.equal(changeTicketQuantity(3, -1), 2);
  assert.throws(() => changeTicketQuantity(2, 3 as 1), RangeError);
});

test("count labels are literal, not status or personality scores", () => {
  assert.equal(ticketQuantityLabel(1), "1 ticket");
  assert.equal(ticketQuantityLabel(2), "2 tickets");
});

test("real ticket number retains its native directional transition", () => {
  type Element = ReactElement<Record<string, unknown>>;
  const modules: Record<string, unknown> = {
    react: { useState: (initial: unknown) => [initial, () => {}] },
    "react/jsx-runtime": jsxRuntime,
    "motion/react": { AnimatePresence, motion },
    "@phosphor-icons/react": { UserIcon: () => null },
    "../invitation/film-study": { FilmStudy: () => null },
    "@/lib/invitation/reference-media": { referenceFilm: undefined },
    "@/lib/motion-tokens": { motionTokens },
    "@/lib/brand": { BrandMark: () => null },
    "@/lib/tickets/tickets": tickets
  };
  const source = readFileSync(
    new URL("../../components/tickets/ticket-study.tsx", import.meta.url),
    "utf8"
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX
    }
  }).outputText;
  const exports = {} as { TicketStudy(): Element };
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
  const number = descendants(exports.TicketStudy()).find(
    (element) => element.type === motion.span && element.props.children === "01"
  );
  assert.ok(number);
  const props = JSON.parse(JSON.stringify(number.props));
  assert.deepEqual(props.initial, { opacity: 0, y: 16 });
  assert.deepEqual(props.animate, { opacity: 1, y: 0 });
  assert.deepEqual(props.exit, { opacity: 0, y: -8 });
  assert.deepEqual(props.transition, {
    duration: 0.18,
    ease: [0.22, 1, 0.36, 1]
  });
});

test("ticket owner uses direct native Motion props rather than a zero-argument factory", () => {
  const source = readFileSync(
    new URL("../../components/tickets/ticket-study.tsx", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(source, /ticketNumberMotion|tickets\/motion/);
});
