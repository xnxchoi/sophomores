import { NextIntlClientProvider } from "next-intl";
import { messagesByLocale } from "@/i18n/messages";
import type { ReactNode } from "react";
import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { JSDOM } from "jsdom";
import { registerHooks } from "node:module";

let dom: JSDOM;
let ui: typeof import("@testing-library/react/pure");
let Review: typeof import("@/lib/payload/admin/recovery-review").RecoveryReview;
let Document: typeof import("../../fixtures/recovery-review-payload").ReviewPreviewDocument;
const previous = new Map<string, PropertyDescriptor | undefined>();
let styles: ReturnType<typeof registerHooks>;
before(async () => {
  styles = registerHooks({
    resolve(specifier, context, nextResolve) {
      // Only document context is synthetic. Native controls are re-exported
      // unchanged, exactly as in the browser fixture; no staff session exists.
      if (
        specifier === "@payloadcms/ui" &&
        context.parentURL &&
        new URL(context.parentURL).pathname.endsWith(
          "/lib/payload/admin/recovery-review.tsx"
        )
      ) {
        return {
          url: new URL(
            "../../fixtures/recovery-review-payload.tsx",
            import.meta.url
          ).href,
          shortCircuit: true
        };
      }
      return nextResolve(specifier, context);
    },
    load(url, context, nextLoad) {
      if (/\.(?:css|scss)$/.test(url))
        return {
          format: "commonjs",
          source: "module.exports = {};",
          shortCircuit: true
        };
      return nextLoad(url, context);
    }
  });
  dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/",
    pretendToBeVisual: true
  });
  const win = dom.window;
  for (const key of [
    "window",
    "document",
    "navigator",
    "HTMLElement",
    "Element",
    "Node",
    "MutationObserver",
    "getComputedStyle",
    "requestAnimationFrame",
    "cancelAnimationFrame"
  ]) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    const value = key === "window" ? win : win[key as keyof typeof win];
    Object.defineProperty(globalThis, key, {
      value:
        typeof value === "function" &&
        [
          "getComputedStyle",
          "requestAnimationFrame",
          "cancelAnimationFrame"
        ].includes(key)
          ? value.bind(win)
          : value,
      configurable: true,
      writable: true
    });
  }
  previous.set(
    "IS_REACT_ACT_ENVIRONMENT",
    Object.getOwnPropertyDescriptor(globalThis, "IS_REACT_ACT_ENVIRONMENT")
  );
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
    value: true,
    configurable: true,
    writable: true
  });
  ui = await import("@testing-library/react/pure");
  Review = (await import("@/lib/payload/admin/recovery-review"))
    .RecoveryReview;
  Document = (await import("../../fixtures/recovery-review-payload"))
    .ReviewPreviewDocument;
  previous.set("fetch", Object.getOwnPropertyDescriptor(globalThis, "fetch"));
});
afterEach(() => {
  ui.cleanup();
  Object.defineProperty(globalThis, "fetch", previous.get("fetch")!);
});
after(() => {
  ui?.cleanup();
  dom?.window.close();
  styles?.deregister();
  for (const [key, descriptor] of previous) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});

test("review sends strict metadata, waits for receipt, advances revision and clears note", async () => {
  let settle!: (value: Response) => void;
  const calls: RequestInit[] = [];
  globalThis.fetch = async (path, options) => {
    assert.equal(
      path,
      "/api/member/recovery/019a4000-0000-7000-8000-000000000001/review"
    );
    calls.push(options!);
    return new Promise<Response>((resolve) => {
      settle = resolve;
    });
  };
  renderWithMessages(
    <Document
      value={{
        id: "019a4000-0000-7000-8000-000000000001",
        data: { revision: 0 }
      }}
    >
      <Review />
    </Document>
  );
  const note = ui.screen.getByLabelText(
    "Internal review note (maximum 2000 characters)"
  ) as HTMLTextAreaElement;
  ui.fireEvent.click(
    ui.screen.getByRole("button", { name: "Save review metadata" })
  );
  assert.equal(calls.length, 0);
  assert.match(ui.screen.getByRole("status").textContent!, /required/);
  ui.fireEvent.change(note, { target: { value: "Synthetic review note" } });
  ui.fireEvent.click(
    ui.screen.getByRole("button", { name: "Save review metadata" })
  );
  assert.equal(calls.length, 1);
  assert.deepEqual(JSON.parse(calls[0].body as string), {
    expectedRevision: 0,
    status: "needs_proof",
    internalNote: "Synthetic review note"
  });
  assert.equal(calls[0].credentials, "same-origin");
  assert.ok(calls[0].signal);
  assert.equal(
    (
      ui.screen.getByRole("button", {
        name: "Saving review…"
      }) as HTMLButtonElement
    ).disabled,
    true
  );
  await ui.act(async () =>
    settle(Response.json({ success: true, data: { revision: 1 } }))
  );
  assert.equal(note.value, "");
  assert.ok(ui.screen.getByText("Expected revision: 1"));
  assert.match(
    ui.screen.getByRole("status").textContent!,
    /No message was sent and no account was changed/
  );
});

for (const outcome of [
  "conflict",
  "unavailable",
  "malformed",
  "network"
] as const) {
  test(`review ${outcome} retains note and never claims a saved account change`, async () => {
    globalThis.fetch = async () => {
      if (outcome === "network") throw new Error("private transport detail");
      return Response.json(
        outcome === "malformed"
          ? { success: true, data: { status: "recovered" } }
          : {},
        {
          status:
            outcome === "conflict" ? 409 : outcome === "unavailable" ? 503 : 200
        }
      );
    };
    renderWithMessages(
      <Document
        value={{
          id: "019a4000-0000-7000-8000-000000000001",
          data: { revision: 0 }
        }}
      >
        <Review />
      </Document>
    );
    const note = ui.screen.getByLabelText(
      "Internal review note (maximum 2000 characters)"
    ) as HTMLTextAreaElement;
    ui.fireEvent.change(note, { target: { value: "Synthetic retained note" } });
    ui.fireEvent.click(
      ui.screen.getByRole("button", { name: "Save review metadata" })
    );
    await ui.waitFor(() =>
      assert.match(
        ui.screen.getByRole("status").textContent!,
        outcome === "conflict" ? /changed or expired/ : /could not be saved/
      )
    );
    assert.equal(note.value, "Synthetic retained note");
    assert.ok(ui.screen.getByText("Expected revision: 0"));
    assert.doesNotMatch(
      document.body.textContent!,
      /metadata saved|private transport detail|Account ready/
    );
    assert.equal(
      (
        ui.screen.getByRole("button", {
          name: "Save review metadata"
        }) as HTMLButtonElement
      ).disabled,
      false
    );
  });
}
test("native review status has a visible associated label and no grant option", async () => {
  renderWithMessages(<Review />);
  await ui.waitFor(() => assert.ok(ui.screen.queryByRole("combobox")));
  const status = ui.screen.getByRole("combobox", { name: "Review status" });
  assert.ok(status.id);
  assert.ok(document.querySelector(`label[for="${status.id}"]`));
  assert.ok(
    ui.screen.getByLabelText("Internal review note (maximum 2000 characters)")
  );
  assert.equal(
    (
      ui.screen.getByRole("button", {
        name: "Save review metadata"
      }) as HTMLButtonElement
    ).disabled,
    true
  );
  assert.doesNotMatch(
    document.body.textContent!,
    /Approved|Grant access|Email changed/
  );
});

function Messages({ children }: { children: ReactNode }) {
  return <NextIntlClientProvider locale="en" timeZone="Asia/Seoul" messages={messagesByLocale.en}>{children}</NextIntlClientProvider>;
}
function renderWithMessages(node: ReactNode) {
  return ui.render(node, { wrapper: Messages });
}
