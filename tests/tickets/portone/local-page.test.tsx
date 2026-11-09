import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { after, before, test } from "node:test";
import { isValidElement, type ReactElement } from "react";

let hooks: ReturnType<typeof registerHooks>;
let renderPage: () => ReactElement;
const imports: string[] = [];
const moduleUrl = (source: string) => `data:text/javascript,${encodeURIComponent(source)}`;

before(async () => {
  hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      if (context.parentURL?.endsWith("/app/(site)/tickets/page.tsx")) {
        imports.push(specifier);
        if (specifier === "../shop/page") return {
          url: moduleUrl("export default function ShopPage(){return null;}"), shortCircuit: true
        };
        if (/portone|next\/headers|public-capabilities|ticket-selection|seller-disclosure/.test(specifier)) {
          throw new Error("Ticket alias must not restore the retired local checkout authority.");
        }
      }
      return nextResolve(specifier, context);
    },
    load(url, context, nextLoad) {
      if (url.startsWith("data:text/javascript,")) return {
        format: "module", source: decodeURIComponent(url.slice("data:text/javascript,".length)), shortCircuit: true
      };
      return nextLoad(url, context);
    }
  });
  renderPage = (await import("@/app/(site)/tickets/page")).default;
});

after(() => hooks?.deregister());

// Legacy Host/test-pair/sale-window gates no longer authorize this route.
// Plugin authority/payment binding regressions live in tests/commerce/core
// and tests/commerce/portone; this test covers alias ownership only.
test("legacy ticket URL forwards to the sole CMS shop without local checkout props", () => {
  const page = renderPage();
  assert.ok(isValidElement(page));
  assert.ok(typeof page.type === "function" && page.type.name === "ShopPage");
  assert.deepEqual(page.props, {});
  assert.ok(imports.includes("../shop/page"));
  assert.equal(imports.some((specifier) => /portone|next\/headers|ticket-selection/.test(specifier)), false);
});
