import assert from "node:assert/strict";
import { test } from "node:test";
import { Posts } from "@/payload/collections/posts";

type Validate = (value: string | null | undefined, options: unknown) => true | string | Promise<true | string>;

// What Payload hands a text field's validate: its own settings plus the request, whose t() names the message.
const options = { required: true, req: { payload: { config: {} }, t: (key: string) => key } };

test("an essay slug keeps Payload's text rules and can't be the listing route's 'in'", async () => {
  const slug = Posts.fields.find((field) => "name" in field && field.name === "slug");
  assert.ok(slug && "validate" in slug && typeof slug.validate === "function");
  const validate = slug.validate as Validate;
  assert.equal(await validate("in", options), "The essay listing uses “in”. Choose another slug.");
  assert.equal(await validate("", options), "validation:required");
  assert.equal(await validate(undefined, options), "validation:required");
  assert.equal(await validate("in-the-room", options), true);
  assert.equal(await validate("lights-low", options), true);
});
