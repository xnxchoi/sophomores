import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { after, before, mock } from "node:test";
import { readHomepageBoundaryAttempts } from "./homepage-ssr-boundary";

/** Use the real Home/Warp tree, replacing only Home's request/config boundary.
 * Native Node hooks already used by operator-ui-dom avoid a new test dependency.
 * The real catalogue is import-safe; no UI or production module is rewritten.
 */
export function homepageSSRFixture() {
  let Home: typeof import("../../src/app/(site)/page").default;
  let transportAttempts = 0;
  let restoreTransport: (() => void) | undefined;
  const pageURL = new URL("../../src/app/(site)/page.tsx", import.meta.url).href;
  const boundaryURL = new URL("./homepage-ssr-boundary.ts", import.meta.url).href;

  before(async () => {
    const transport = mock.method(globalThis, "fetch", () => {
      transportAttempts += 1;
      throw new Error("Homepage SSR fixture forbids network transport");
    });
    restoreTransport = () => transport.mock.restore();
    const hooks = registerHooks({
      resolve(specifier, context, nextResolve) {
        if (context.parentURL === pageURL &&
          ["next/server", "payload", "@payload-config"].includes(specifier)) {
          return { url: boundaryURL, shortCircuit: true };
        }
        return nextResolve(specifier, context);
      }
    });
    try {
      ({ default: Home } = await import("../../src/app/(site)/page"));
      assert.equal(readHomepageBoundaryAttempts().payload, 0);
      assert.equal(transportAttempts, 0);
    } finally {
      hooks.deregister();
    }
  });

  after(() => {
    restoreTransport?.();
    assert.equal(transportAttempts, 0, "SSR must not attempt network transport");
  });

  return {
    get Home() { return Home; },
    readAttempts: () => ({ ...readHomepageBoundaryAttempts(), transport: transportAttempts })
  };
}
