import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test, { after, before, describe } from "node:test";
import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";
import { Children, createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { get } from "lodash-es";
import { messagesByLocale } from "@/i18n/messages";
import {
  developmentNamespaces,
  segmentNamespaces,
  shellNamespaces
} from "@/i18n/client-namespaces";
import {
  clientCatalogueImports,
  clientNamespaces,
  segmentEntries
} from "../support/client-namespaces";

// Each page receives its own namespaces, not the whole catalogue (plan: "Copy catalogue cleanup"). The shell
// provider in the site layout hands its client components the shell's namespaces; each segment layout hands its
// page the page's own. next-intl treats `messages` as atomic, so a segment list names everything its page reads.

const site = "src/app/(site)";
const staffOnly = ["Staff", "PreviewAuth", "Developer"];
const covers = (list: readonly string[], namespace: string) =>
  list.some(
    (delivered) =>
      namespace === delivered || namespace.startsWith(`${delivered}.`)
  );

test("staff, preview-login and developer copy is never on a public list", () => {
  for (const [name, list] of [
    ["shell", shellNamespaces],
    ...Object.entries(segmentNamespaces)
  ] as const) {
    for (const namespace of list) {
      assert.equal(
        staffOnly.includes(namespace.split(".")[0]),
        false,
        `${name} delivers ${namespace}`
      );
    }
  }
  assert.deepEqual([...developmentNamespaces], ["Developer"]);
});

test("every delivered namespace exists in both catalogues", () => {
  for (const list of [
    shellNamespaces,
    developmentNamespaces,
    ...Object.values(segmentNamespaces)
  ]) {
    for (const namespace of list) {
      for (const locale of ["en", "ko"] as const) {
        assert.equal(
          get(messagesByLocale[locale], namespace) !== undefined,
          true,
          `${locale} lacks ${namespace}`
        );
      }
    }
  }
});

test("the shell list covers the site layout, its boundaries, the 404 and the pages without a list of their own", () => {
  const withoutList = fs
    .readdirSync(site, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        !entry.name.startsWith("_") &&
        !(entry.name in segmentNamespaces)
    )
    .flatMap((entry) => segmentEntries(path.join(site, entry.name)));
  const entries = [
    `${site}/layout.tsx`,
    `${site}/client-layout.tsx`,
    `${site}/error.tsx`,
    `${site}/loading.tsx`,
    `${site}/not-found.tsx`,
    `${site}/page.tsx`,
    "src/app/global-not-found.tsx",
    ...withoutList
  ];
  const { namespaces, untyped } = clientNamespaces(entries);
  assert.deepEqual(untyped, []);
  for (const namespace of namespaces) {
    assert.equal(
      covers([...shellNamespaces, ...developmentNamespaces], namespace),
      true,
      `shell lacks ${namespace}`
    );
  }
});

test("each segment list covers every client namespace its pages read", () => {
  for (const [segment, list] of Object.entries(segmentNamespaces)) {
    const { namespaces, untyped } = clientNamespaces(
      segmentEntries(path.join(site, segment))
    );
    assert.deepEqual(untyped, [], segment);
    for (const namespace of namespaces)
      assert.equal(
        covers(list, namespace),
        true,
        `${segment} lacks ${namespace}`
      );
  }
});

test("the site layout and the 404 deliver the shell list", () => {
  // Both layouts pull in Payload and fonts at import time, so their provider line is read from source.
  for (const file of [`${site}/layout.tsx`, "src/app/global-not-found.tsx"]) {
    const source = fs.readFileSync(file, "utf8");
    assert.match(
      source,
      /<NextIntlClientProvider\s+locale=\{locale\}\s+messages=\{pick\((messages|intlMessages), shellDelivery\)\}\s*>/,
      file
    );
    assert.doesNotMatch(source, /messages=\{(messages|intlMessages)\}/, file);
  }
});

describe("segment layouts hand their pages exactly their own list", () => {
  type Layout = (props: { children: ReactNode }) => ReactElement;
  let SegmentMessages: typeof import("@/app/(site)/_intl/segment-messages").SegmentMessages;
  const layouts = new Map<string, Layout>();
  let boundary: ReturnType<typeof registerHooks>;

  before(async () => {
    // Request-free stand-ins for the two Next-only modules the layouts reach; everything else is real.
    boundary = registerHooks({
      resolve(specifier, context, nextResolve) {
        if (specifier === "next-intl/server" && /\/_intl\/segment-messages\.tsx$/.test(context.parentURL ?? "")) {
          return { url: new URL("../fixtures/segment-messages-server.ts", import.meta.url).href, shortCircuit: true };
        }
        if (specifier === "next/font/local" && /\/essays\/layout\.tsx$/.test(context.parentURL ?? "")) {
          return { url: new URL("../fixtures/next-font-local.ts", import.meta.url).href, shortCircuit: true };
        }
        return nextResolve(specifier, context);
      }
    });
    ({ SegmentMessages } = await import("@/app/(site)/_intl/segment-messages"));
    for (const segment of Object.keys(segmentNamespaces)) {
      const file = path.resolve(site, segment, "layout.tsx");
      layouts.set(segment, (await import(pathToFileURL(file).href)).default);
    }
  });
  after(() => boundary?.deregister());

  const find = (node: ReactNode, type: unknown): ReactElement<Record<string, unknown>> | null => {
    if (!isValidElement<Record<string, unknown>>(node)) return null;
    if (node.type === type) return node;
    for (const child of Children.toArray(node.props.children as ReactNode)) {
      const match = find(child, type);
      if (match) return match;
    }
    return null;
  };

  test("each layout renders SegmentMessages with its segment's list around the page", () => {
    for (const [segment, layout] of layouts) {
      const page = createElement("main", { "data-page": segment });
      const wrapper = find(layout({ children: page }), SegmentMessages);
      assert.ok(wrapper, segment);
      assert.equal(wrapper.props.namespaces, segmentNamespaces[segment as keyof typeof segmentNamespaces], segment);
      assert.equal(wrapper.props.children, page, segment);
    }
  });

  test("SegmentMessages gives the provider those namespaces from the request catalogue and nothing else", async () => {
    const catalogue = messagesByLocale.ko;
    for (const [segment, list] of Object.entries(segmentNamespaces)) {
      const provider = (await SegmentMessages({ namespaces: list, children: null })) as ReactElement<{
        messages: Record<string, Record<string, unknown>>;
      }>;
      assert.equal(provider.type, NextIntlClientProvider, segment);
      const { messages } = provider.props;
      for (const namespace of list) assert.deepEqual(get(messages, namespace), get(catalogue, namespace), `${segment} ${namespace}`);
      const tops = [...new Set(list.map((namespace) => namespace.split(".")[0]))].sort();
      assert.deepEqual(Object.keys(messages).sort(), tops, segment);
      const customer = list.filter((namespace) => namespace.startsWith("Customer.")).map((namespace) => namespace.slice(9)).sort();
      assert.deepEqual(Object.keys(messages.Customer ?? {}).sort(), customer, segment);
      for (const staff of staffOnly) assert.equal(staff in messages, false, `${segment} ${staff}`);
    }
  });
});

describe("the import walker", () => {
  const fixture = (name: string) => `tests/fixtures/client-namespaces/${name}`;

  test("counts static, dynamic and re-exported catalogue imports in client bundles", () => {
    const found = clientCatalogueImports([
      fixture("static-import.tsx"),
      fixture("dynamic-import.tsx"),
      fixture("re-export-entry.tsx"),
      fixture("type-only.tsx"),
      fixture("server-only.tsx")
    ]);
    // src/i18n/messages.ts is in the bundle too: re-export.ts carries it to the client, and it imports both catalogues.
    assert.deepEqual(found, [
      "src/i18n/messages.ts",
      fixture("dynamic-import.tsx"),
      fixture("re-export.ts"),
      fixture("static-import.tsx")
    ]);
  });

  test("ignores type-only imports and re-exports, server modules, and server actions called from the client", () => {
    assert.deepEqual(clientCatalogueImports([fixture("type-only.tsx")]), []);
    assert.deepEqual(clientCatalogueImports([fixture("server-action-entry.tsx")]), []);
    assert.deepEqual(clientCatalogueImports([fixture("server-only.tsx")]), []);
  });

  test("reads literal namespaces, cuts Customer at its page subtree, and reports a non-literal one", () => {
    assert.deepEqual(clientNamespaces([fixture("namespaces.tsx")]), {
      namespaces: ["Common", "Customer.policy"],
      untyped: [fixture("namespaces.tsx")]
    });
  });
});

// Whole-catalogue imports inside a client bundle ship every namespace as JavaScript, whatever the providers hand
// over. These five remain and are filed with their owners; the list may only shrink: when one is fixed, drop it.
const knownClientCatalogueImports = [
  "src/components/Authentication/phone-verification/verification-tray.tsx", // Auth: en.json for Common.cancel
  "src/components/Warp/_shared/sequence-editor.ts", // Home Warp: createTranslator over en.json (Developer)
  "src/components/Warp/_shared/tuning.ts", // Home Warp: Developer.tuningData labels
  "src/i18n/messages.ts", // via Auth's phone-verification.tsx (messagesByLocale, both locales)
  "src/lib/phone-verification/i18n.ts" // Auth: phone verification copy
];

test("no other client bundle under the site imports a whole catalogue", () => {
  const entries = [
    ...segmentEntries(site),
    `${site}/client-layout.tsx`,
    "src/app/global-not-found.tsx"
  ];
  assert.deepEqual(
    clientCatalogueImports(entries),
    knownClientCatalogueImports
  );
});
