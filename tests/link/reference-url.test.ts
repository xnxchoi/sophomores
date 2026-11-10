import assert from "node:assert/strict";
import test from "node:test";
import type { ComponentProps } from "react";
import { ReferencedLink } from "@/components/core/Link/ReferencedLink";

// Legacy non-button CMS contract requires href although the component derives it.
// Omit it here so the existing rest-spread behavior is not changed by this move.
const derivedProps = (props: Omit<ComponentProps<typeof ReferencedLink>, "href">) => props as ComponentProps<typeof ReferencedLink>;

const reference = { relationTo: "posts", value: "post-1" };

test("reference links stay non-navigable without a resolver", async () => {
  const element = await ReferencedLink(derivedProps({ link: { type: "reference", reference }, label: "Reference" }));
  assert.equal(element?.type, "div");
  assert.equal(element?.props.href, undefined);
});

test("reference links delegate normalized IDs to the supplied resolver", async () => {
  const calls: unknown[] = [];
  const element = await ReferencedLink(derivedProps({
    link: { type: "reference", reference: { ...reference, value: { id: "post-1" } } },
    resolveReference: (target) => { calls.push(target); return "/read/post-1"; }
  }));
  assert.deepEqual(calls, [reference]);
  assert.equal(element?.props.href, "/read/post-1");
});

test("custom links retain their destination and empty resolver results stay non-navigable", async () => {
  const custom = await ReferencedLink(derivedProps({ link: { type: "custom", url: "/account" } }));
  assert.equal(custom?.props.href, "/account");
  const unresolved = await ReferencedLink(derivedProps({ link: { type: "reference", reference }, resolveReference: async () => null }));
  assert.equal(unresolved?.type, "div");
});
