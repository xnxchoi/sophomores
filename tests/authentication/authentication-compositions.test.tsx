import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";

let dom: JSDOM;
let ui: typeof import("@testing-library/react/pure");
let Studies: typeof import("@/components/Authentication/composition-studies").AuthenticationCompositionStudies;
let Preview: typeof import("@/components/Authentication/composition-studies").CompositionPreview;
const previous = new Map<string, PropertyDescriptor | undefined>();
const requests: unknown[][] = [];

function expose(key: string, value: unknown) {
  previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  Object.defineProperty(globalThis, key, {
    configurable: true,
    writable: true,
    value
  });
}

before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/studies/authentication/compositions",
    pretendToBeVisual: true
  });
  const win = dom.window;
  Object.defineProperty(win.document, "elementFromPoint", {
    configurable: true,
    value: () => null
  });
  for (const key of [
    "window",
    "document",
    "navigator",
    "HTMLElement",
    "HTMLInputElement",
    "HTMLButtonElement",
    "SVGElement",
    "Element",
    "Node",
    "NodeList",
    "NodeFilter",
    "MutationObserver",
    "CustomEvent",
    "Event",
    "getComputedStyle",
    "requestAnimationFrame",
    "cancelAnimationFrame"
  ]) {
    const value = key === "window" ? win : win[key as keyof typeof win];
    expose(
      key,
      typeof value === "function" &&
        [
          "getComputedStyle",
          "requestAnimationFrame",
          "cancelAnimationFrame"
        ].includes(key)
        ? value.bind(win)
        : value
    );
  }
  expose("IS_REACT_ACT_ENVIRONMENT", true);
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  expose("ResizeObserver", ResizeObserverStub);
  win.ResizeObserver = ResizeObserverStub;
  const fetch = async (...args: unknown[]) => {
    requests.push(args);
    throw new Error("Layout studies must never make requests");
  };
  expose("fetch", fetch);
  win.fetch = fetch;
  ui = await import("@testing-library/react/pure");
  const studies =
    await import("@/components/Authentication/composition-studies");
  Studies = studies.AuthenticationCompositionStudies;
  Preview = studies.CompositionPreview;
});

afterEach(() => {
  ui?.cleanup();
  assert.equal(
    requests.splice(0).length,
    0,
    "all study interactions stay local"
  );
});

after(async () => {
  // input-otp schedules native selection updates at 0/10/50 ms.
  await new Promise((resolve) => setTimeout(resolve, 60));
  dom?.window.close();
  for (const [key, descriptor] of previous) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});

function surface(container: HTMLElement) {
  const element = container.querySelector<HTMLElement>(
    "[data-composition-surface]"
  );
  assert.ok(element, "an open preview has one local surface");
  return element;
}

test("study page shows only the selected vertical composition", () => {
  const html = renderToStaticMarkup(<Studies />);
  const server = new JSDOM(html);
  try {
    const previews = server.window.document.querySelectorAll(
      "[data-composition-preview]"
    );
    assert.deepEqual(
      Array.from(previews, (preview) =>
        preview.getAttribute("data-composition-preview")
      ),
      ["stacked"]
    );
    assert.equal(
      server.window.document.querySelectorAll("[data-composition-surface]")
        .length,
      1
    );
    assert.equal(
      server.window.document.querySelectorAll("img").length,
      0,
      "studies render live controls rather than mockup images"
    );
  } finally {
    server.window.close();
  }
});

test("vertical spacing keeps locale outside the surface and uses an explicit action rhythm", () => {
  const server = new JSDOM(
    renderToStaticMarkup(<Preview composition="stacked" />)
  );
  try {
    const preview = server.window.document.querySelector<HTMLElement>(
      "article[data-composition-preview]"
    );
    assert.ok(preview);
    const panel = surface(preview);
    const locale = preview.querySelector("header select");
    assert.ok(locale, "the preview header contains the locale control");
    assert.ok(
      !panel.contains(locale),
      "locale never consumes animated surface space"
    );
    for (const [selector, tokens] of [
      ["[data-composition-chrome]", ["h-18", "px-4", "pt-4"]],
      ["[data-composition-body]", ["px-6", "pt-0", "pb-6"]],
      ["[data-composition-actions]", ["flex", "flex-col", "gap-3"]],
      ["[data-composition-close]", ["absolute", "top-1.5", "right-1.5"]],
      ["[data-composition-handle]", ["top-7", "-translate-y-1/2"]]
    ] as const) {
      const region = panel.querySelector<HTMLElement>(selector);
      assert.ok(region, `${selector} is explicit`);
      for (const token of tokens) {
        assert.ok(
          region.classList.contains(token),
          `${selector} requires ${token}`
        );
      }
    }
    assert.ok(panel.querySelector("[data-composition-alternative]") === null);
  } finally {
    server.window.close();
  }
});

test("chooser keeps Welcome without redundant copy and centers consistent primary-secondary actions", () => {
  for (const [locale, title] of [
    ["en", "Welcome"],
    ["ko", "환영합니다"]
  ] as const) {
    const server = new JSDOM(
      renderToStaticMarkup(<Preview composition="stacked" locale={locale} />)
    );
    try {
      const preview = server.window.document.querySelector<HTMLElement>(
        "[data-composition-preview]"
      );
      assert.ok(preview);
      const panel = surface(preview);
      const heading = panel.querySelector("h3");
      const actions = panel.querySelector("[data-composition-actions]");
      assert.ok(heading && actions, `${locale}: welcome hierarchy exists`);
      assert.equal(heading.textContent?.trim(), title);
      assert.ok(
        !heading.classList.contains("sr-only") &&
          !heading.classList.contains("hidden") &&
          !heading.hasAttribute("hidden"),
        "Welcome is visible, not merely an accessible name"
      );
      assert.ok(
        panel.querySelector("p") === null,
        "chooser has no redundant subtitle"
      );
      assert.ok(panel.querySelector("[data-composition-alternative]") === null);
      assert.doesNotMatch(panel.textContent ?? "", /\bOr\b|또는/);
      assert.ok(
        heading.compareDocumentPosition(actions) &
          Node.DOCUMENT_POSITION_FOLLOWING
      );
      const choices = Array.from(
        actions.querySelectorAll<HTMLElement>("[data-composition-choice]")
      );
      assert.equal(choices.length, 2);
      for (const [index, choice] of choices.entries()) {
        assert.equal(
          choice.dataset.compositionChoiceTone,
          index === 0 ? "primary" : "secondary"
        );
        for (const token of [
          "h-13",
          "justify-center",
          "px-5",
          "rounded-[14px]"
        ]) {
          assert.ok(
            choice.classList.contains(token),
            `both choices require ${token}`
          );
        }
        assert.ok(!choice.classList.contains("justify-start"));
        assert.ok(
          choice.querySelector("svg, img") === null,
          "choices stay icon-free"
        );
      }
      for (const token of [
        "border-white/15",
        "bg-white/5",
        "shadow-[inset_0_1px_0_#ffffff08]"
      ]) {
        assert.ok(
          choices[1].classList.contains(token),
          `secondary action restores ${token}`
        );
      }
    } finally {
      server.window.close();
    }
  }
});

test("morph scrolling preserves content width without reserving a scrollbar gutter", () => {
  for (const composition of ["stacked", "paired"] as const) {
    const server = new JSDOM(
      renderToStaticMarkup(<Preview composition={composition} />)
    );
    try {
      const scroll = server.window.document.querySelector<HTMLElement>(
        "[data-composition-surface] [data-composition-scroll]"
      );
      assert.ok(scroll, `${composition}: the inner scroll region is explicit`);
      for (const token of [
        "overflow-y-auto",
        "[scrollbar-width:none]",
        "[&::-webkit-scrollbar]:hidden"
      ]) {
        assert.ok(
          scroll.classList.contains(token),
          `${composition}: scroll geometry requires ${token}`
        );
      }
      assert.doesNotMatch(
        scroll.className,
        /scrollbar-thin|scrollbar-width:thin|scrollbar-gutter/,
        "morphs must not reserve width for a scrollbar"
      );
    } finally {
      server.window.close();
    }
  }
});

for (const composition of ["stacked", "paired"] as const) {
  test(`${composition}: chooser is primary-first without a separator or brand mark`, () => {
    const { container } = ui.render(<Preview composition={composition} />);
    const panel = surface(container);
    assert.equal(panel.dataset.compositionView, "chooser");
    const choices = Array.from(
      panel.querySelectorAll<HTMLButtonElement>("[data-composition-choice]")
    );
    assert.deepEqual(
      choices.map((choice) => [
        choice.dataset.compositionChoice,
        choice.textContent?.trim()
      ]),
      [
        ["signup", "Sign up"],
        ["login", "Log in"]
      ]
    );
    for (const choice of choices) assert.equal(choice.type, "button");
    assert.ok(ui.within(panel).queryByText("Or", { exact: true }) === null);
    assert.ok(panel.querySelector("[data-composition-alternative]") === null);
    assert.ok(panel.querySelector("p") === null);
    assert.ok(
      choices[0].compareDocumentPosition(choices[1]) &
        Node.DOCUMENT_POSITION_FOLLOWING
    );
    if (composition === "paired") {
      const actions = panel.querySelector("[data-composition-actions]");
      assert.ok(actions);
      for (const token of ["grid", "grid-cols-2", "gap-3"]) {
        assert.ok(
          actions.classList.contains(token),
          `paired actions require ${token}`
        );
      }
    }
    assert.ok(panel.querySelector("[data-brand-mark]") === null);
    assert.doesNotMatch(panel.textContent ?? "", /sophomores/i);
    assert.ok(panel.querySelector('input[type="password"]') === null);
    const notes = Array.from(container.querySelectorAll("p")).filter((note) =>
      /layout.only|presentation.only/i.test(note.textContent ?? "")
    );
    assert.ok(
      notes.some(
        (note) =>
          !panel.contains(note) &&
          /no requests|no .*requests|requests .*not|not .*requests/i.test(
            note.textContent ?? ""
          )
      ),
      "honest layout-only / no-requests note lives outside the surface"
    );
  });

  for (const [choice, view, inputType] of [
    ["Sign up", "signup", "email"],
    ["Log in", "login", "email"]
  ] as const) {
    test(`${composition}: ${choice} morphs in place, focuses input, and Back restores the chosen action`, async () => {
      const { container } = ui.render(<Preview composition={composition} />);
      const originalSurface = surface(container);
      ui.fireEvent.click(
        ui.within(originalSurface).getByRole("button", { name: choice })
      );
      const focused = surface(container);
      assert.ok(
        focused === originalSurface,
        "the chooser morphs in its existing local surface"
      );
      assert.equal(focused.dataset.compositionView, view);
      const cancel = ui.within(focused).getByRole("button", { name: "Cancel" });
      assert.ok(cancel.querySelector("svg"), "focused Cancel uses an X glyph");
      assert.equal(cancel.textContent?.trim(), "", "Cancel has no visible text label");
      assert.ok(cancel.classList.contains("size-11"), "Cancel retains a 44px target");
      const input = focused.querySelector<HTMLInputElement>(
        `input[type="${inputType}"]`
      );
      assert.ok(input);
      assert.ok(!input.readOnly, "local simulation fields are editable");
      assert.ok(
        input.labels?.length || input.getAttribute("aria-label"),
        "input has an accessible name"
      );
      // Never pass React-backed DOM nodes to assertion diffs: a failed focus
      // check can otherwise inspect the entire JSDOM / React object graph.
      await ui.waitFor(() =>
        assert.ok(
          document.activeElement === input,
          "the chosen input receives focus"
        )
      );
      const continueButton = ui.within(focused).getByRole("button", {
        name: "Continue"
      }) as HTMLButtonElement;
      assert.ok(
        !continueButton.disabled,
        "Continue advances the local simulation without real authentication"
      );
      ui.fireEvent.change(input, { target: { value: "fixture@example.com" } });
      assert.equal(input.value, "fixture@example.com");
      assert.equal(surface(container).dataset.compositionView, view);
      assert.ok(container.querySelector('input[type="password"]') === null);
      assert.doesNotMatch(
        focused.textContent ?? "",
        /verified|success|signed in|account created/i
      );
      ui.fireEvent.click(
        ui.within(focused).getByRole("button", { name: "Back" })
      );
      assert.equal(surface(container).dataset.compositionView, "chooser");
      await ui.waitFor(() =>
        assert.ok(
          document.activeElement ===
            ui.within(surface(container)).getByRole("button", { name: choice }),
          "Back restores focus to the chosen action"
        )
      );
    });
  }

  for (const dismiss of ["Cancel", "Escape"] as const) {
    for (const view of ["chooser", "login", "signup"] as const) {
      test(`${composition}: ${dismiss} dismisses ${view}, then Open preview resets and restores focus`, async () => {
        const { container } = ui.render(<Preview composition={composition} />);
        if (view !== "chooser") {
          ui.fireEvent.click(
            ui.within(surface(container)).getByRole("button", {
              name: view === "signup" ? "Sign up" : "Log in"
            })
          );
        }
        if (dismiss === "Cancel") {
          ui.fireEvent.click(
            ui.within(surface(container)).getByRole("button", {
              name: view === "chooser" ? "Close preview" : "Cancel"
            })
          );
        } else {
          const target =
            surface(container).querySelector<HTMLElement>("input, button");
          assert.ok(target);
          target.focus();
          ui.fireEvent.keyDown(target, { key: "Escape" });
        }
        await ui.waitFor(() =>
          assert.ok(
            container.querySelector("[data-composition-surface]") === null,
            "the dismissed surface is removed after its exit animation"
          )
        );
        const open = ui
          .within(container)
          .getByRole("button", { name: "Open preview" });
        await ui.waitFor(() =>
          assert.ok(
            document.activeElement === open,
            "Open preview receives focus"
          )
        );
        ui.fireEvent.click(open);
        assert.equal(surface(container).dataset.compositionView, "chooser");
        await ui.waitFor(() =>
          assert.ok(
            document.activeElement ===
              ui
                .within(surface(container))
                .getByRole("button", { name: "Sign up" }),
            "reopening focuses the primary action"
          )
        );
      });
    }
  }

  test(`${composition}: preview language control remains available through login and Back and translates to English`, () => {
    const { container } = ui.render(
      <Preview composition={composition} locale="ko" />
    );
    const korean = ui
      .within(container)
      .getByRole("combobox", { name: "언어" }) as HTMLSelectElement;
    assert.equal(korean.tagName, "SELECT");
    assert.equal(korean.value, "ko");
    assert.deepEqual(
      Array.from(korean.options, (option) => option.value).sort(),
      ["en", "ko"]
    );
    assert.ok(
      ui.within(surface(container)).getByRole("button", { name: "회원가입" })
    );
    ui.fireEvent.click(
      ui.within(surface(container)).getByRole("button", { name: "로그인" })
    );
    assert.equal(surface(container).dataset.compositionView, "login");
    assert.ok(ui.within(container).getByRole("combobox", { name: "언어" }));
    assert.ok(
      ui.within(surface(container)).getByRole("button", { name: "계속" })
    );
    assert.ok(ui.within(surface(container)).getByLabelText("이메일 주소"));
    ui.fireEvent.click(
      ui.within(surface(container)).getByRole("button", { name: "뒤로" })
    );
    assert.equal(surface(container).dataset.compositionView, "chooser");
    const restoredKorean = ui
      .within(container)
      .getByRole("combobox", { name: "언어" }) as HTMLSelectElement;
    assert.equal(restoredKorean.value, "ko");
    ui.fireEvent.change(restoredKorean, { target: { value: "en" } });
    const english = ui
      .within(container)
      .getByRole("combobox", { name: "Language" }) as HTMLSelectElement;
    assert.equal(english.value, "en");
    ui.fireEvent.click(
      ui.within(surface(container)).getByRole("button", { name: "Log in" })
    );
    assert.equal(surface(container).dataset.compositionView, "login");
    assert.ok(ui.within(container).getByRole("combobox", { name: "Language" }));
    assert.ok(
      ui.within(surface(container)).getByRole("button", { name: "Continue" })
    );
    assert.ok(ui.within(surface(container)).getByLabelText("Email address"));
    ui.fireEvent.click(
      ui.within(surface(container)).getByRole("button", { name: "Back" })
    );
    assert.ok(
      ui.within(surface(container)).getByRole("button", { name: "Sign up" })
    );
  });
}

test("dismissing a focused preview also removes its technical scenario controls", async () => {
  const { container } = ui.render(<Preview composition="stacked" />);
  ui.fireEvent.click(
    ui.within(surface(container)).getByRole("button", { name: "Log in" })
  );
  const details = container.querySelector("details");
  assert.ok(details);
  const summary = details.querySelector("summary");
  assert.ok(summary);
  ui.fireEvent.click(summary);
  assert.ok(
    ui.within(container).getByRole("combobox", { name: "Preview state" })
  );
  ui.fireEvent.click(
    ui.within(surface(container)).getByRole("button", { name: "Cancel" })
  );
  await ui.waitFor(() =>
    assert.ok(container.querySelector("[data-composition-surface]") === null)
  );
  assert.ok(
    container.querySelector('[aria-label="Preview state"]') === null,
    "dismissed previews expose no stale scenario selector"
  );
  assert.ok(container.querySelector("details") === null);
  assert.ok(
    ui.within(container).queryByText(/Simulated flow/) === null,
    "technical fixture instructions disappear with the focused flow"
  );
});

test("rapid flow re-entry keeps the new phase navigation after the old flow exits", async () => {
  const { container } = ui.render(<Preview composition="stacked" />);
  ui.fireEvent.click(
    ui.within(surface(container)).getByRole("button", { name: "Log in" })
  );
  ui.fireEvent.click(
    ui.within(surface(container)).getByRole("button", { name: "Back" })
  );
  assert.equal(surface(container).dataset.compositionView, "chooser");
  ui.fireEvent.click(
    ui.within(surface(container)).getByRole("button", { name: "Sign up" })
  );
  const summary = container.querySelector("details summary");
  assert.ok(summary);
  ui.fireEvent.click(summary);
  ui.fireEvent.change(
    ui.within(container).getByRole("combobox", { name: "Preview state" }),
    { target: { value: "email-code" } }
  );
  await ui.act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 250));
  });
  assert.equal(surface(container).dataset.compositionView, "signup");
  assert.ok(
    surface(container).querySelector(
      '[data-account-phase="email-code"]:not([aria-hidden="true"])'
    ) !== null,
    "the new signup flow owns the selected code fixture"
  );
  ui.fireEvent.click(
    ui.within(surface(container)).getByRole("button", { name: "Back" })
  );
  assert.equal(
    surface(container).dataset.compositionView,
    "signup",
    "Back uses the new controller instead of falling through to chooser"
  );
  await ui.waitFor(() =>
    assert.ok(
      surface(container).querySelector(
        '[data-account-phase="entry"]:not([aria-hidden="true"])'
      ) !== null,
      "Back returns to the new flow's email entry"
    )
  );
});

test("focused fields use one inset-aligned focus treatment rather than a double ring", () => {
  const { container } = ui.render(<Preview composition="stacked" />);
  ui.fireEvent.click(
    ui.within(surface(container)).getByRole("button", { name: "Log in" })
  );
  const input = surface(container).querySelector<HTMLInputElement>(
    'input[type="email"]'
  );
  assert.ok(input);
  for (const token of [
    "focus:!outline-none",
    "focus:!border-white/45",
    "focus:!shadow-[inset_0_0_0_1px_#ffffff24]"
  ]) {
    assert.ok(input.classList.contains(token), `field focus requires ${token}`);
  }
  assert.ok(
    !input.classList.contains("focus:!outline-2"),
    "focus uses a subtle inset shadow instead of a thick outline"
  );
});

test("focused outcome actions remain compact rather than full-width cards", async () => {
  const { container } = ui.render(<Preview composition="stacked" />);
  ui.fireEvent.click(
    ui.within(surface(container)).getByRole("button", { name: "Log in" })
  );
  const summary = container.querySelector("details summary");
  assert.ok(summary);
  ui.fireEvent.click(summary);
  ui.fireEvent.change(
    ui.within(container).getByRole("combobox", { name: "Preview state" }),
    { target: { value: "expired" } }
  );
  await ui.waitFor(() => {
    const retry = ui.within(surface(container)).getByRole("button", {
      name: "Try again"
    });
    for (const token of ["!w-auto", "min-w-36"]) {
      assert.ok(
        retry.classList.contains(token),
        `outcome primary action requires ${token}`
      );
    }
  });
  ui.fireEvent.change(ui.within(container).getByRole("combobox", { name: "Preview state" }), { target: { value: "complete" } });
  await ui.waitFor(() => assert.ok(ui.within(surface(container)).getByRole("heading", { name: "Preview complete" })));
  assert.ok(ui.within(surface(container)).queryByRole("button", { name: "Back" }) === null, "terminal completion exposes no Back control");
  const disclaimer = Array.from(container.querySelectorAll("p")).find((note) => /layout.only|presentation.only/i.test(note.textContent ?? ""));
  assert.ok(disclaimer && !surface(container).contains(disclaimer), "honest presentation-only note remains outside completion");

});

test("all explicit phase fixtures render headings in English and Korean without native side effects", async () => {
  const { AccountPhaseStudy } = await import("@/components/Authentication/account-phase-study");
  const phases = [
    "entry",
    "email-code",
    "passkey",
    "phone",
    "waiting",
    "review",
    "phone-confirmed",
    "complete",
    "expired",
    "used",
    "error"
  ] as const;
  for (const locale of ["en", "ko"] as const) {
    for (const current of phases) {
      const server = new JSDOM(
        renderToStaticMarkup(
          <AccountPhaseStudy
            flow="signup"
            locale={locale}
            headingId="fixture-heading"
            navigationRef={{ current: null }}
            initialPhase={current}
          />
        )
      );
      try {
        const root = server.window.document.querySelector(
          "[data-account-phase]"
        );
        assert.ok(root);
        assert.equal(root.getAttribute("data-account-phase"), current);
        const heading = root.querySelector(`#fixture-heading-${current}`);
        assert.ok(
          heading?.textContent?.trim(),
          `${locale}/${current} has a heading`
        );
        if (locale === "ko") assert.match(root.textContent ?? "", /[가-힣]/);
        assert.ok(
          root.querySelector(
            'a[href^="sms:"], a[href^="tel:"], input[type="password"]'
          ) === null
        );
      } finally {
        server.window.close();
      }
    }
  }
});

test("separate previews keep independent state and Escape only dismisses its focused preview", async () => {
  const { container } = ui.render(
    <>
      <Preview composition="stacked" />
      <Preview composition="stacked" />
    </>
  );
  const previews = Array.from(
    container.querySelectorAll<HTMLElement>("[data-composition-preview]")
  );
  assert.equal(previews.length, 2);
  ui.fireEvent.click(
    ui.within(surface(previews[0])).getByRole("button", { name: "Log in" })
  );
  assert.equal(surface(previews[0]).dataset.compositionView, "login");
  assert.equal(surface(previews[1]).dataset.compositionView, "chooser");
  ui.fireEvent.keyDown(surface(previews[0]), { key: "Escape" });
  await ui.waitFor(() =>
    assert.ok(
      previews[0].querySelector("[data-composition-surface]") === null,
      "Escape removes only its preview after its exit animation"
    )
  );
  assert.equal(surface(previews[1]).dataset.compositionView, "chooser");
});

test("email code uses a centered intro, left-aligned feedback, a shared column and a wide primary before recovery", async () => {
  const { AccountPhaseStudy } = await import("@/components/Authentication/account-phase-study");
  const { container } = ui.render(<AccountPhaseStudy flow="login" locale="en" headingId="otp-layout"
    navigationRef={{ current: null }} initialPhase="email-code" />);
  const intro = container.querySelector<HTMLElement>("[data-phase-intro]");
  assert.ok(intro, "the code view identifies its intro");
  assert.ok(intro.classList.contains("text-center"), "the approved OTP intro stays centered");
  const headingRow = intro.querySelector("h3")?.parentElement;
  assert.ok(headingRow?.classList.contains("justify-center"), "the heading row shares the centered intro");
  const column = intro.parentElement;
  assert.ok(column);
  for (const token of ["w-full"]) {
    assert.ok(column.classList.contains(token), `the OTP column retains ${token}`);
  }
  const code = container.querySelector<HTMLInputElement>('input[autocomplete="one-time-code"]')!;
  const feedbackId = code.getAttribute("aria-describedby");
  assert.ok(feedbackId, "the OTP input describes its compact feedback area");
  const feedback = document.getElementById(feedbackId);
  assert.ok(feedback && container.contains(feedback));
  assert.ok(feedback.classList.contains("sr-only"), "empty feedback takes no visible space");
  assert.ok(!feedback.classList.contains("min-h-14"));
  assert.ok(!feedback.classList.contains("text-center"));
  const resendRow = container.querySelector<HTMLButtonElement>('[data-phase-action="retry"]')!.parentElement;
  assert.ok(resendRow);
  for (const token of ["mt-2", "flex", "justify-center"]) {
    assert.ok(resendRow.classList.contains(token), `inline resend retains ${token}`);
  }
  const verify = container.querySelector<HTMLButtonElement>('[data-phase-action="submit"]')!;
  assert.ok(column.contains(code) && column.contains(verify) && column.contains(resendRow));
  assert.ok(verify.classList.contains("w-full") && !verify.classList.contains("w-fit"));
  assert.ok(verify.compareDocumentPosition(resendRow) & Node.DOCUMENT_POSITION_FOLLOWING);
});

test("failed unchanged OTP never loops after rerender or locale change", async () => {
  const { AccountPhaseStudy } = await import("@/components/Authentication/account-phase-study");
  const props = { flow: "login" as const, headingId: "otp-stability", navigationRef: { current: null }, initialPhase: "email-code" as const };
  const { container, rerender } = ui.render(<AccountPhaseStudy {...props} locale="en" />);
  const code = container.querySelector<HTMLInputElement>('input[autocomplete="one-time-code"]')!;
  ui.fireEvent.change(code, { target: { value: "000000" } });
  const verify = () => container.querySelector<HTMLButtonElement>('[data-phase-action="submit"]')!;
  assert.ok(verify().disabled, "full code auto-verifies");
  await ui.waitFor(() => assert.equal(code.getAttribute("aria-invalid"), "true"));
  for (const locale of ["en", "ko", "en"] as const) {
    rerender(<AccountPhaseStudy {...props} locale={locale} />);
    assert.ok(!verify().disabled, "rerender does not trigger unchanged failed code");
    await ui.act(async () => { await new Promise((resolve) => setTimeout(resolve, 450)); });
    assert.ok(!verify().disabled);
    assert.equal(code.value, "000000");
    assert.equal(code.getAttribute("aria-invalid"), "true");
  }
});

test("Cancel during OTP pending dismisses without allowing stale success on re-entry", async () => {
  const { container } = ui.render(<Preview composition="stacked" />);
  ui.fireEvent.click(ui.within(surface(container)).getByRole("button", { name: "Log in" }));
  ui.fireEvent.click(container.querySelector("details summary")!);
  ui.fireEvent.change(ui.within(container).getByRole("combobox", { name: "Preview state" }),
    { target: { value: "email-code" } });
  const code = await ui.waitFor(() => {
    const input = surface(container).querySelector<HTMLInputElement>('input[autocomplete="one-time-code"]');
    assert.ok(input); return input;
  });
  ui.fireEvent.change(code, { target: { value: "A1B2C3" } });
  const verify = code.closest("form")!.querySelector<HTMLButtonElement>('[data-phase-action="submit"]')!;
  assert.ok(verify.disabled && verify.getAttribute("aria-busy") === "true");
  ui.fireEvent.click(ui.within(surface(container)).getByRole("button", { name: "Cancel" }));
  await ui.act(async () => { await new Promise((resolve) => setTimeout(resolve, 650)); });
  assert.ok(container.querySelector('[data-account-phase="complete"]') === null);
  ui.fireEvent.click(ui.within(container).getByRole("button", { name: "Open preview" }));
  ui.fireEvent.click(ui.within(surface(container)).getByRole("button", { name: "Log in" }));
  await ui.waitFor(() => assert.ok(surface(container).querySelector('input[type="email"]')));
  assert.ok(container.querySelector('[data-account-phase="complete"]') === null);
});
