import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { subscribeToCountdown } from "../../lib/phone-verification/countdown";
import { messagesByLocale } from "../../lib/phone-verification/i18n";
import { VerificationCountdown } from "../../components/phone-verification/verification-countdown";

function eventTarget() {
  const target = new EventTarget();
  const added: string[] = [];
  const removed: string[] = [];
  return {
    added,
    removed,
    dispatch: (type: string) => target.dispatchEvent(new Event(type)),
    addEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject | null
    ) {
      added.push(type);
      target.addEventListener(type, listener);
    },
    removeEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject | null
    ) {
      removed.push(type);
      target.removeEventListener(type, listener);
    }
  };
}

function setup(expiresAt = 5_000, initialTime = 0) {
  let now = initialTime;
  let tick = () => {};
  let expirations = 0;
  const seconds: number[] = [];
  const cleared: number[] = [];
  const page = eventTarget();
  const visibility = eventTarget();
  const cleanup = subscribeToCountdown(
    {
      expiresAt,
      onTick: (value) => seconds.push(value),
      onExpire: () => expirations++
    },
    {
      now: () => now,
      setInterval(callback, delay) {
        assert.equal(delay, 1_000);
        tick = callback;
        return 42;
      },
      clearInterval: (id) => cleared.push(id),
      page,
      visibility
    }
  );
  return {
    seconds,
    cleared,
    page,
    visibility,
    cleanup,
    setTime: (time: number) => {
      now = time;
    },
    tick: () => tick(),
    expirations: () => expirations
  };
}

test("countdown synchronizes immediately and calculates each tick from absolute expiry", () => {
  const clock = setup(5_000, 900);
  assert.deepEqual(clock.seconds, [5]);
  clock.setTime(3_500);
  clock.tick();
  assert.deepEqual(clock.seconds, [5, 2]);
  clock.setTime(9_000);
  clock.tick();
  assert.equal(clock.seconds.at(-1), 0);
  assert.equal(clock.expirations(), 1);
  clock.cleanup();
});

for (const event of ["pageshow", "visibilitychange"] as const) {
  test(`${event} detects expiry after a suspended timer and notifies once`, () => {
    const clock = setup();
    clock.setTime(20_000);
    const target = event === "pageshow" ? clock.page : clock.visibility;
    target.dispatch(event);
    target.dispatch(event);
    clock.tick();
    assert.equal(clock.seconds.at(-1), 0);
    assert.equal(clock.expirations(), 1);
    clock.cleanup();
  });
}

test("an already-expired countdown notifies immediately only once", () => {
  const clock = setup(100, 200);
  assert.deepEqual(clock.seconds, [0]);
  assert.equal(clock.expirations(), 1);
  clock.tick();
  clock.page.dispatch("pageshow");
  assert.equal(clock.expirations(), 1);
  clock.cleanup();
});

test("cleanup cancels the interval, removes resume listeners, and ignores queued work", () => {
  const clock = setup();
  assert.deepEqual(clock.page.added, ["pageshow"]);
  assert.deepEqual(clock.visibility.added, ["visibilitychange"]);
  clock.cleanup();
  clock.cleanup();
  assert.deepEqual(clock.cleared, [42]);
  assert.deepEqual(clock.page.removed, ["pageshow"]);
  assert.deepEqual(clock.visibility.removed, ["visibilitychange"]);
  clock.setTime(10_000);
  clock.tick();
  clock.page.dispatch("pageshow");
  clock.visibility.dispatch("visibilitychange");
  assert.deepEqual(clock.seconds, [5]);
  assert.equal(clock.expirations(), 0);
});

for (const locale of ["en", "ko"] as const) {
  test(`${locale} countdown has a localized timer name without per-second announcements`, () => {
    const html = renderToStaticMarkup(
      // The provider requires children in its props for createElement's overload.
      // eslint-disable-next-line react/no-children-prop
      createElement(NextIntlClientProvider, {
        locale,
        messages: messagesByLocale[locale],
        timeZone: "Asia/Seoul",
        children: createElement(VerificationCountdown, {
          expiresAt: 0,
          visible: true,
          onExpire: () => {}
        })
      })
    );
    assert.match(html, /role="timer"/);
    assert.match(html, /aria-live="off"/);
    assert.ok(
      html.includes(
        locale === "en"
          ? 'aria-label="Preview time remaining: 0 seconds"'
          : 'aria-label="미리 보기 남은 시간 0초"'
      )
    );
  });
}
