import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Spinner } from "@/components/ui/spinner";
import { ActionButton } from "@/components/settings/ActionField";
import { NextIntlClientProvider } from "next-intl";
import { VerificationStatus } from "@/components/Authentication/phone-verification/verification-status";

test("shared Spinner retains the original Phosphor SVG, dimensions and accessible status", () => {
  const element = Spinner({ className: "size-6" });
  assert.deepEqual(element.props.animate, { rotate: 360 });
  assert.deepEqual(element.props.transition, { duration: 1, ease: "linear", repeat: Infinity });
  const html = renderToStaticMarkup(element);
  assert.match(html, /^<svg /);
  assert.match(html, /viewBox="0 0 256 256"/);
  assert.match(html, /role="status"/);
  assert.match(html, /aria-label="Loading"/);
  assert.match(html, /size-6/);
  assert.doesNotMatch(html, /animate-spin/);
});

test("settings pending ring retains its span, size, track and linear period", () => {
  const element = ActionButton({ loading: true, children: "Save" });
  const ring = element.props.children[0];
  assert.deepEqual(ring.props.animate, { rotate: 360 });
  assert.deepEqual(ring.props.transition, { duration: 1, ease: "linear", repeat: Infinity });
  const html = renderToStaticMarkup(<ActionButton loading>Save</ActionButton>);
  assert.match(html, /<span class="size-3 rounded-full border border-white\/40 border-t-white"/);
  assert.match(html, /disabled=""/);
});

test("checking indicator retains its existing span geometry and partial ring", () => {
  const html = renderToStaticMarkup(
    <NextIntlClientProvider locale="en" timeZone="UTC" messages={{ VerificationTrial: { registration: { status: { checking: "Checking" } } } }}>
      <VerificationStatus state="verified" busy error={null} checked={false} expiresAt={0} onExpire={() => {}} />
    </NextIntlClientProvider>
  );
  assert.match(html, /<span data-status-indicator="checking"/);
  assert.match(html, /inline-flex size-3 items-center justify-center rounded-full border border-neutral-300 border-r-transparent/);
  assert.match(html, /role="status"/);
  assert.doesNotMatch(html, /animate-spin/);
});
