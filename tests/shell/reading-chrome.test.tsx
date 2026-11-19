import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { after, afterEach, before, test } from "node:test";
import { JSDOM } from "jsdom";
import type { Notification, PostBody } from "../../src/lib/content/slots";

// Header v9 (2026-11-19). Narrow "does it work" check (owner): the reading view hands its posts and the
// member's notifications to the one global header and the shared inbox, and takes them back when it leaves.
let dom: JSDOM;
let ui: typeof import("@testing-library/react/pure");
let chrome: typeof import("../../src/components/shell/reading-chrome");
let inbox: typeof import("../../src/components/notifications/notification-inbox");
const previous = new Map<string, PropertyDescriptor | undefined>();

function globalValue(key: string, value: unknown) {
  if (!previous.has(key))
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  Object.defineProperty(globalThis, key, {
    value,
    configurable: true,
    writable: true
  });
}

before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/",
    pretendToBeVisual: true
  });
  for (const key of [
    "window",
    "document",
    "navigator",
    "HTMLElement",
    "Element",
    "Node",
    "MutationObserver",
    "Event"
  ]) {
    globalValue(key, dom.window[key as keyof typeof dom.window]);
  }
  globalValue("IS_REACT_ACT_ENVIRONMENT", true);
  ui = await import("@testing-library/react/pure");
  // The inbox's server action is stubbed, as in the auth-entry and mode-switch tests.
  const inboxURL = new URL(
    "../../src/components/notifications/notification-inbox.tsx",
    import.meta.url
  ).href;
  const boundaryURL = new URL(
    "../fixtures/notification-action-boundary.ts",
    import.meta.url
  ).href;
  const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      if (
        context.parentURL === inboxURL &&
        specifier === "@/payload/collections/notifications/actions"
      )
        return { url: boundaryURL, shortCircuit: true };
      return nextResolve(specifier, context);
    }
  });
  try {
    chrome = await import("../../src/components/shell/reading-chrome");
    inbox =
      await import("../../src/components/notifications/notification-inbox");
  } finally {
    hooks.deregister();
  }
});

afterEach(() => ui.cleanup());

after(() => {
  for (const [key, descriptor] of previous) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
  dom.window.close();
});

const post = {
  id: "p1",
  slug: "first",
  title: "First",
  dek: "",
  body: ""
} as unknown as PostBody;
const note: Notification = {
  id: "n1",
  title: "Hello",
  body: "",
  href: "/",
  imageUrl: "",
  read: false,
  createdAt: "2026-11-19"
};

function Header() {
  const posts = chrome.useReadingPosts();
  const { unread } = inbox.useNotificationInbox([]);
  return (
    <p data-testid="header">
      {posts ? `reading ${posts.length} ${unread.length}` : "ordinary"}
    </p>
  );
}

test("the reading view's posts and notifications reach the global header, and leave with it", async () => {
  const Frame = ({ reading }: { reading: boolean }) => (
    <inbox.NotificationProvider userId="" notifications={[]}>
      <Header />
      {reading ? (
        <chrome.ReadingChrome
          posts={[post]}
          notifications={[note]}
          userId="u1"
        />
      ) : null}
    </inbox.NotificationProvider>
  );
  const view = ui.render(<Frame reading={false} />);
  assert.equal(view.getByTestId("header").textContent, "ordinary");
  await ui.act(async () => view.rerender(<Frame reading />));
  assert.equal(view.getByTestId("header").textContent, "reading 1 1");
  await ui.act(async () => view.rerender(<Frame reading={false} />));
  assert.equal(view.getByTestId("header").textContent, "ordinary");
});
