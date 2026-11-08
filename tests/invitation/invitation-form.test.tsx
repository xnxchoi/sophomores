import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { InvitationForm } from "@/components/invitation/invitation-form";

test("first render is an honest, fully visible no-network preview", () => {
  const html = renderToStaticMarkup(<InvitationForm onExit={() => {}} still />);
  assert.match(html, /The first invitation\./);
  assert.match(html, /Local study — nothing is sent or saved\./);
  assert.match(html, /Leave an email for news of the first night\./);
  assert.match(html, /Back to study/);
  assert.match(html, /Start/);
  assert.match(html, /opacity:1/);
  assert.doesNotMatch(html, /<main|role="dialog"|<input|translate/);
});

test("SSR markup is stable with no browser globals needed", () => {
  const first = renderToStaticMarkup(
    <InvitationForm onExit={() => {}} still={false} />
  );
  const second = renderToStaticMarkup(
    <InvitationForm onExit={() => {}} still={false} />
  );
  assert.equal(first, second);
  assert.match(first, /opacity:1/);
});

test("study cannot persist, transmit or log entered personal data", () => {
  const source = readFileSync(
    new URL(
      "../../components/invitation/invitation-form.tsx",
      import.meta.url
    ),
    "utf8"
  );
  assert.doesNotMatch(
    source,
    /\b(fetch|localStorage|sessionStorage|indexedDB|sendBeacon)\b|console\./
  );
  assert.match(source, /Nothing was sent\. You are not registered\./);
  assert.match(source, /autoComplete="email"/);
  assert.match(source, /type="email"/);
  assert.match(source, /aria-describedby/);
});
