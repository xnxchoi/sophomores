import assert from "node:assert/strict";
import test, { after, afterEach, before } from "node:test";
import { createRequire, registerHooks } from "node:module";
import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { readFile } from "node:fs/promises";

let StaffLoginForm: typeof import("@/lib/payload/admin/staff-login-form").StaffLoginForm;
let ui: typeof import("@testing-library/react/pure");
let dom: JSDOM;
let respond: typeof fetch = async () => {
  throw new Error("Unexpected staff-login HTTP request");
};
const previous = new Map<string, PropertyDescriptor | undefined>();

before(async () => {
  // Payload's actual controls import vendor styles. DOM/SSR tests inspect
  // behavior only; the live browser remains the visual acceptance gate.
  registerHooks({
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
    url: "http://localhost/admin/login",
    pretendToBeVisual: true
  });
  const win = dom.window;
  for (const key of [
    "window",
    "document",
    "navigator",
    "HTMLElement",
    "HTMLInputElement",
    "HTMLButtonElement",
    "Element",
    "Node",
    "MutationObserver",
    "CustomEvent",
    "Event",
    "getComputedStyle",
    "requestAnimationFrame",
    "cancelAnimationFrame",
    "IS_REACT_ACT_ENVIRONMENT",
    "fetch"
  ]) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    const value =
      key === "window"
        ? win
        : key === "IS_REACT_ACT_ENVIRONMENT"
          ? true
          : key === "fetch"
            ? (input: RequestInfo | URL, init?: RequestInit) =>
                respond(input, init)
            : win[key as keyof typeof win];
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
  ui = await import("@testing-library/react/pure");
  StaffLoginForm = (await import("@/lib/payload/admin/staff-login-form"))
    .StaffLoginForm;
});
afterEach(() => {
  ui.cleanup();
  respond = async () => {
    throw new Error("Unexpected staff-login HTTP request");
  };
});
after(() => {
  dom.window.close();
  for (const [key, descriptor] of previous) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});

test("unavailable staff email login renders a truthful notice and disabled actions", () => {
  const html = renderToStaticMarkup(
    <StaffLoginForm nextPath="/admin" available={false} />
  );
  const view = new JSDOM(html);
  try {
    assert.match(html, /Sign-in is unavailable\. Try again shortly\./);
    assert.equal(
      view.window.document.querySelectorAll("button[disabled]").length,
      2
    );
  } finally {
    view.window.close();
  }
});

test("configured staff email login keeps its existing enabled actions", () => {
  const html = renderToStaticMarkup(
    <StaffLoginForm nextPath="/admin" available />
  );
  const view = new JSDOM(html);
  try {
    assert.doesNotMatch(html, /Sign-in is unavailable/);
    assert.equal(
      view.window.document.querySelectorAll("button[disabled]").length,
      0
    );
    assert.match(html, /Email a code/);
    assert.match(html, /Email a magic link/);
  } finally {
    view.window.close();
  }
});

test("unavailable staff actions and direct form submission never call authentication", async () => {
  let requests = 0;
  respond = async () => {
    requests++;
    return Response.json({ success: true });
  };
  const view = ui.render(
    <StaffLoginForm nextPath="/admin" available={false} />
  );
  ui.fireEvent.change(view.getByLabelText(/Email/), {
    target: { value: "person@sophomores.co" }
  });
  ui.fireEvent.click(view.getByRole("button", { name: "Email a code" }));
  ui.fireEvent.click(view.getByRole("button", { name: "Email a magic link" }));
  ui.fireEvent.submit(view.container.querySelector("form")!);
  await ui.act(async () => {});
  assert.equal(requests, 0);
  assert.match(
    view.getByRole("status").textContent ?? "",
    /Sign-in is unavailable/
  );
});

test("available staff actions request a code and normalize valid alphanumeric verification", async () => {
  const requests: Array<{ path: string; body: Record<string, unknown> }> = [];
  respond = async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init);
    requests.push({
      path: new URL(request.url).pathname,
      body: (await request.json()) as Record<string, unknown>
    });
    return request.url.includes("send-verification-otp")
      ? Response.json({ success: true })
      : Response.json(
          { code: "INVALID_OTP", message: "Test code rejected" },
          { status: 400 }
        );
  };
  const view = ui.render(<StaffLoginForm nextPath="/admin" available />);
  ui.fireEvent.change(view.getByLabelText(/Email/), {
    target: { value: "person@sophomores.co" }
  });
  ui.fireEvent.click(view.getByRole("button", { name: "Email a code" }));
  await ui.waitFor(() => assert.ok(view.getByLabelText(/Sign-in code/)));
  assert.equal(requests.length, 1);
  assert.equal(requests[0].body.email, "person@sophomores.co");
  for (const code of ["ABC12", "ABC!23", "ABC1234"]) {
    ui.fireEvent.change(view.getByLabelText(/Sign-in code/), {
      target: { value: code }
    });
    ui.fireEvent.submit(view.container.querySelector("form")!);
    await ui.act(async () => {});
    assert.equal(requests.length, 1);
  }
  for (const code of ["ABC123", "abc123"]) {
    const expected = requests.length + 1;
    ui.fireEvent.change(view.getByLabelText(/Sign-in code/), {
      target: { value: code }
    });
    ui.fireEvent.submit(view.container.querySelector("form")!);
    await ui.waitFor(() => assert.equal(requests.length, expected));
    await ui.waitFor(() =>
      assert.equal(
        (view.getByRole("button", { name: "Verify code" }) as HTMLButtonElement)
          .disabled,
        false
      )
    );
    assert.equal(requests.at(-1)?.body.otp, "ABC123");
  }
});

test("server staff login passes only the actual mailer availability to its client", async () => {
  const [{ StaffLogin }, { getAuthMailer }] = await Promise.all([
    import("@/lib/payload/admin/staff-login"),
    import("@/lib/auth/options")
  ]);
  const result = StaffLogin({
    initPageResult: { req: { payload: { config: {} } } }
  });
  assert.equal(result.props.children.props.available, Boolean(getAuthMailer()));
});

test("available magic-link action retains its admin callback", async () => {
  const bodies: Record<string, unknown>[] = [];
  respond = async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init);
    assert.equal(new URL(request.url).pathname, "/api/auth/sign-in/magic-link");
    bodies.push((await request.json()) as Record<string, unknown>);
    return Response.json({ success: true });
  };
  const view = ui.render(<StaffLoginForm nextPath="/admin" available />);
  ui.fireEvent.change(view.getByLabelText(/Email/), {
    target: { value: "person@sophomores.co" }
  });
  ui.fireEvent.click(view.getByRole("button", { name: "Email a magic link" }));
  await ui.waitFor(() => assert.equal(bodies.length, 1));
  await ui.waitFor(() =>
    assert.equal(
      (
        view.getByRole("button", {
          name: "Email a magic link"
        }) as HTMLButtonElement
      ).disabled,
      false
    )
  );
  assert.equal(bodies[0].callbackURL, "/admin");
  assert.equal(bodies[0].newUserCallbackURL, "/admin");
});

test("invalid staff addresses and disabled verification do not reach authentication", async () => {
  let requests = 0;
  respond = async () => {
    requests++;
    return Response.json({ success: true });
  };
  const view = ui.render(<StaffLoginForm nextPath="/admin" available />);
  ui.fireEvent.change(view.getByLabelText(/Email/), {
    target: { value: "person@example.invalid" }
  });
  ui.fireEvent.submit(view.container.querySelector("form")!);
  ui.fireEvent.click(view.getByRole("button", { name: "Email a magic link" }));
  await ui.act(async () => {});
  assert.equal(requests, 0);
  ui.fireEvent.change(view.getByLabelText(/Email/), {
    target: { value: "person@sophomores.co" }
  });
  ui.fireEvent.submit(view.container.querySelector("form")!);
  await ui.waitFor(() => assert.ok(view.getByLabelText(/Sign-in code/)));
  view.rerender(<StaffLoginForm nextPath="/admin" available={false} />);
  ui.fireEvent.change(view.getByLabelText(/Sign-in code/), {
    target: { value: "abc123" }
  });
  ui.fireEvent.submit(view.container.querySelector("form")!);
  await ui.act(async () => {});
  assert.equal(requests, 1);
});

for (const failure of ["response", "network"] as const) {
  test(
    "staff actions recover from " +
      failure +
      " errors without claiming delivery",
    async () => {
      const view = ui.render(<StaffLoginForm nextPath="/admin" available />);
      ui.fireEvent.change(view.getByLabelText(/Email/), {
        target: { value: "person@sophomores.co" }
      });
      let requests = 0;
      respond = async () => {
        requests++;
        if (failure === "network") throw new Error("Synthetic offline state");
        return Response.json(
          { code: "UNAVAILABLE", message: "Synthetic delivery failure" },
          { status: 503 }
        );
      };
      for (const label of ["Email a code", "Email a magic link"]) {
        const expected = requests + 1;
        ui.fireEvent.click(view.getByRole("button", { name: label }));
        await ui.waitFor(() => assert.ok(requests >= expected));
        await ui.waitFor(() =>
          assert.equal(
            (view.getByRole("button", { name: label }) as HTMLButtonElement)
              .disabled,
            false
          )
        );
        assert.equal(view.queryByLabelText(/Sign-in code/), null);
      }
      respond = async () => Response.json({ success: true });
      ui.fireEvent.click(view.getByRole("button", { name: "Email a code" }));
      await ui.waitFor(() => assert.ok(view.getByLabelText(/Sign-in code/)));
      respond = async () => {
        if (failure === "network") throw new Error("Synthetic offline state");
        return Response.json(
          { code: "INVALID_OTP", message: "Synthetic code failure" },
          { status: 400 }
        );
      };
      ui.fireEvent.change(view.getByLabelText(/Sign-in code/), {
        target: { value: "ABC123" }
      });
      ui.fireEvent.submit(view.container.querySelector("form")!);
      await ui.waitFor(() =>
        assert.equal(
          (
            view.getByRole("button", {
              name: "Verify code"
            }) as HTMLButtonElement
          ).disabled,
          false
        )
      );
    }
  );
}

test("successful alphanumeric verification preserves the selected admin destination", async (t) => {
  const destinations: string[] = [];
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "window")!;
  const browserWindow = dom.window;
  Object.defineProperty(globalThis, "window", {
    value: new Proxy(browserWindow, {
      get(target, key) {
        if (key === "location")
          return { assign: (path: string) => destinations.push(path) };
        return Reflect.get(target, key, target);
      }
    }),
    configurable: true,
    writable: true
  });
  t.after(() => Object.defineProperty(globalThis, "window", descriptor));
  respond = async () => Response.json({ success: true });
  const view = ui.render(
    <StaffLoginForm nextPath="/admin/collections/orders" available />
  );
  ui.fireEvent.change(view.getByLabelText(/Email/), {
    target: { value: "person@sophomores.co" }
  });
  ui.fireEvent.click(view.getByRole("button", { name: "Email a code" }));
  await ui.waitFor(() => assert.ok(view.getByLabelText(/Sign-in code/)));
  ui.fireEvent.change(view.getByLabelText(/Sign-in code/), {
    target: { value: "abc123" }
  });
  ui.fireEvent.submit(view.container.querySelector("form")!);
  await ui.waitFor(() =>
    assert.deepEqual(destinations, ["/admin/collections/orders"])
  );
});


test("staff controls have a compact full-width rhythm without vendor styling", () => {
  const html = renderToStaticMarkup(<StaffLoginForm nextPath="/admin" available />);
  const view = new JSDOM(html);
  try {
    const form = view.window.document.querySelector("form")!;
    assert.ok(form.classList.contains("staff:w-full"));
    assert.ok(view.window.document.querySelector("h1")?.classList.contains("staff:text-[24px]"));
    assert.ok(view.window.document.querySelector("input")?.classList.contains("staff:min-h-[52px]"));
    assert.ok(view.window.document.querySelector("input")?.classList.contains("staff:selection:bg-(--theme-text)"));
    assert.ok(view.window.document.querySelector("input")?.classList.contains("staff:selection:text-(--theme-bg)"));
    const primary = view.window.document.querySelector('button[type="submit"]')!;
    assert.ok(primary.classList.contains("staff:min-h-[48px]"));
    assert.ok(primary.classList.contains("staff:w-full"));
    assert.equal(view.window.document.querySelector(".field-type"), null);
  } finally { view.window.close(); }
});

test("staff login utility entry is explicitly scoped and never installs site globals or preflight", async () => {
  const css = await readFile(new URL("../../styles/staff-login.css", import.meta.url), "utf8");
  assert.match(css, /theme\.css.*prefix\(staff\)/);
  assert.match(css, /utilities\.css.*prefix\(staff\).*source\(none\)/);
  assert.match(css, /@source .*staff-login-form\.tsx/);
  assert.doesNotMatch(css, /preflight|globals\.css|\{[\s\S]*:/);
});

test("successful code delivery becomes a focused recipient-and-code step and Change email resets it", async () => {
  respond = async () => Response.json({ success: true });
  const view = ui.render(<StaffLoginForm nextPath="/admin" available />);
  ui.fireEvent.change(view.getByLabelText(/Email/), { target: { value: "  PERSON@sophomores.co  " } });
  ui.fireEvent.submit(view.container.querySelector("form")!);
  const input = await view.findByLabelText("Sign-in code") as HTMLInputElement;
  await ui.waitFor(() => assert.ok(document.activeElement === input));
  assert.equal(view.queryByLabelText(/Email/), null);
  assert.ok(view.getByRole("heading", { name: "Check your email" }));
  assert.ok(view.getByText("person@sophomores.co"));
  assert.equal(input.autocomplete, "one-time-code");
  assert.ok(input.classList.contains("staff:selection:bg-(--theme-text)"));
  assert.ok(input.classList.contains("staff:selection:text-(--theme-bg)"));
  ui.fireEvent.change(input, { target: { value: "a1b2c3" } });
  ui.fireEvent.click(view.getByRole("button", { name: "Change email" }));
  const email = view.getByLabelText(/Email/) as HTMLInputElement;
  await ui.waitFor(() => assert.equal(document.activeElement, email));
  assert.equal(view.queryByLabelText("Sign-in code"), null);
  ui.fireEvent.submit(view.container.querySelector("form")!);
  assert.equal((await view.findByLabelText("Sign-in code") as HTMLInputElement).value, "");
});

test("sending progress belongs to one initiating button and locks duplicate submissions and recipient edits", async () => {
  let release!: (value: Response) => void;
  let requests = 0;
  respond = async () => { requests++; return new Promise<Response>(resolve => { release = resolve; }); };
  const view = ui.render(<StaffLoginForm nextPath="/admin" available />);
  const email = view.getByLabelText(/Email/) as HTMLInputElement;
  ui.fireEvent.change(email, { target: { value: "person@sophomores.co" } });
  ui.fireEvent.submit(view.container.querySelector("form")!);
  await ui.waitFor(() => assert.equal(requests, 1));
  const sending = view.getByRole("button", { name: "Sending code…" });
  assert.equal(sending.getAttribute("aria-busy"), "true");
  assert.ok(sending.classList.contains("staff:disabled:aria-busy:opacity-100"));
  assert.ok(email.disabled);
  assert.equal(view.container.querySelectorAll('[aria-busy="true"]').length, 1);
  assert.equal(view.container.querySelector("form")?.getAttribute("aria-busy"), null);
  assert.equal(view.getAllByRole("status").length, 1);
  ui.fireEvent.submit(view.container.querySelector("form")!);
  ui.fireEvent.click(view.getByRole("button", { name: "Email a magic link" }));
  assert.equal(requests, 1);
  release(Response.json({ success: true }));
  await view.findByLabelText("Sign-in code");
});

test("magic-link progress and confirmation stay inline without claiming code delivery", async () => {
  let release!: (value: Response) => void;
  respond = async () => new Promise<Response>(resolve => { release = resolve; });
  const view = ui.render(<StaffLoginForm nextPath="/admin" available />);
  ui.fireEvent.change(view.getByLabelText(/Email/), { target: { value: "person@sophomores.co" } });
  ui.fireEvent.click(view.getByRole("button", { name: "Email a magic link" }));
  const pending = await view.findByRole("button", { name: "Sending link…" });
  assert.equal(pending.getAttribute("aria-busy"), "true");
  assert.ok(pending.classList.contains("staff:disabled:aria-busy:opacity-100"));
  assert.equal(view.getByRole("button", { name: "Email a code" }).getAttribute("aria-busy"), "false");
  release(Response.json({ success: true }));
  await ui.waitFor(() => assert.match(view.getByRole("status").textContent ?? "", /Magic link sent\. Open it in this browser\./));
  assert.equal(view.queryByLabelText("Sign-in code"), null);
});

for (const action of ["code", "magic", "verify"] as const) {
  test("staff " + action + " failures are inline, safe and recoverable", async () => {
    const view = ui.render(<StaffLoginForm nextPath="/admin" available />);
    ui.fireEvent.change(view.getByLabelText(/Email/), { target: { value: "person@sophomores.co" } });
    if (action === "verify") {
      respond = async () => Response.json({ success: true });
      ui.fireEvent.submit(view.container.querySelector("form")!);
      await view.findByLabelText("Sign-in code");
      ui.fireEvent.change(view.getByLabelText("Sign-in code"), { target: { value: "ABC123" } });
    }
    respond = async () => Response.json({ code: "UNAVAILABLE", message: "private-provider-detail" }, { status: 400 });
    if (action === "magic") ui.fireEvent.click(view.getByRole("button", { name: "Email a magic link" }));
    else ui.fireEvent.submit(view.container.querySelector("form")!);
    const alert = await view.findByRole("alert");
    assert.doesNotMatch(alert.textContent ?? "", /private-provider-detail/);
    assert.match(alert.textContent ?? "", action === "verify" ? /code was not accepted/i : /Could not send/);
    assert.equal(view.container.querySelectorAll('[aria-busy="true"]').length, 0);
    if (action === "verify") assert.equal(view.getByLabelText("Sign-in code").getAttribute("aria-invalid"), "true");
  });
}


test("staff server shell compiles its 400px maximum on the direct Payload wrapper", async () => {
  const { StaffLogin } = await import("@/lib/payload/admin/staff-login");
  const shell = StaffLogin({ initPageResult: { req: { payload: { config: {} } } } });
  assert.ok(shell.props.className.split(" ").includes("staff:*:max-w-[400px]"));
  const { default: tailwind } = await import("@tailwindcss/postcss");
  // PostCSS is Tailwind's installed peer, not a new app dependency. Resolve it
  // from that owning package rather than relying on a root transitive symlink.
  const localRequire = createRequire(import.meta.url);
  const tailwindRequire = createRequire(localRequire.resolve("@tailwindcss/postcss"));
  const postcss = tailwindRequire("postcss") as (plugins: ReturnType<typeof tailwind>[]) => {
    process(source: string, options: { from: string }): Promise<{ css: string }>;
  };
  const path = new URL("../../styles/staff-login.css", import.meta.url);
  const css = await readFile(path, "utf8");
  const compiled = await postcss([tailwind({ optimize: false })]).process(css, { from: path.pathname });
  const selector = ".staff\\:\\*\\:max-w-\\[400px\\]";
  const position = compiled.css.indexOf(selector);
  assert.ok(position >= 0, "the actual staff width utility must be generated");
  const rule = compiled.css.slice(position, position + 200);
  assert.match(rule, / > \*/);
  assert.match(rule, /max-width:\s*400px/);
});

test("wrong-code correction and resend return focus only after the code field unlocks", async () => {
  respond = async () => Response.json({ success: true });
  const view = ui.render(<StaffLoginForm nextPath="/admin" available />);
  ui.fireEvent.change(view.getByLabelText(/Email/), { target: { value: "person@sophomores.co" } });
  ui.fireEvent.submit(view.container.querySelector("form")!);
  const input = await view.findByLabelText("Sign-in code") as HTMLInputElement;
  ui.fireEvent.change(input, { target: { value: "ABC123" } });
  const verify = view.getByRole("button", { name: "Verify code" });
  verify.focus();
  respond = async () => Response.json({ code: "INVALID_OTP", message: "Rejected" }, { status: 400 });
  ui.fireEvent.click(verify);
  await view.findByRole("alert");
  await ui.waitFor(() => assert.ok(document.activeElement === input));
  assert.equal(input.selectionStart, 0);
  assert.equal(input.selectionEnd, 6);
  const resend = view.getByRole("button", { name: "Email a new code" });
  resend.focus();
  respond = async () => Response.json({ success: true });
  ui.fireEvent.click(resend);
  await ui.waitFor(() => assert.equal(input.value, ""));
  await ui.waitFor(() => assert.ok(document.activeElement === input));
});
