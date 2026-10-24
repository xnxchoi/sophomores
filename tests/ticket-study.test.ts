import assert from "node:assert/strict";
import { test } from "node:test";
import {
  computeTicketTotal,
  ticketQuantityLabel,
  changeTicketQuantity
} from "../lib/tickets/tickets";
import { ticketNumberMotion } from "../lib/tickets/motion";

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

test("ticket numbers always retain the normal directional transition", () => {
  const motion = ticketNumberMotion();
  assert.deepEqual(motion.initial, { opacity: 0, y: 16 });
  assert.deepEqual(motion.animate, { opacity: 1, y: 0 });
  assert.deepEqual(motion.exit, { opacity: 0, y: -8 });
  assert.equal(motion.transition.duration, 0.18);
});
