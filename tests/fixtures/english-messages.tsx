import { type ReactNode, useContext, useState } from "react";
import { NextIntlClientProvider } from "next-intl";
import { AppRouterContext, type AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import messages from "../../messages/en.json";
import { WithVerificationMessages } from "./verification-messages";

/**
 * The same canonical catalogue used by the site, without network or request state. Like a purchase segment
 * (SegmentMessages), it also hands the phone verification flow its bilingual copy, and it mounts the site contexts core
 * Button and Link need (SiteContexts).
 */
export function EnglishMessages({ children }: { children: ReactNode }) {
  return <NextIntlClientProvider locale="en" timeZone="Asia/Seoul" messages={messages}>
    <WithVerificationMessages>
      <SiteContexts>{children}</SiteContexts>
    </WithVerificationMessages>
  </NextIntlClientProvider>;
}

/**
 * The contexts the site layout gives every page that core Button and Link read (owner, 27 Nov: controls go through
 * them so the cursor reacts): device, store, cursor and an app router for the page transition. Each mounts only when
 * the test hasn't mounted its own, so nothing nests twice and a test's router spy wins. The device store is inert: the
 * site's DeviceProvider also fingerprints the browser (Thumbmark), which can reach the network, so tests never mount it.
 */
export function SiteContexts({ children }: { children: ReactNode }) {
  // Loaded at render, not at import: tests import this fixture before they install jsdom's window, and RP_Pro's
  // dependencies (motion, the stores, the transition router) read the environment when they first load.
  const { CurContext, CursorProvider, DeviceContext, HAStoreContext, HAStoreProvider } = siteProviders();
  const router = useContext(AppRouterContext);
  const device = useContext(DeviceContext);
  const store = useContext(HAStoreContext);
  const cursor = useContext(CurContext);
  let tree = children;
  if (!cursor) tree = <CursorProvider>{tree}</CursorProvider>;
  if (!store) tree = <HAStoreProvider>{tree}</HAStoreProvider>;
  if (!device) tree = <InertDevice>{tree}</InertDevice>;
  if (!router) tree = <AppRouterContext.Provider value={inertRouter}>{tree}</AppRouterContext.Provider>;
  return tree;
}

const inertRouter: AppRouterInstance = {
  back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {}, bfcacheId: "english-messages-fixture"
};

/** The device store with its defaults and no detection or fingerprint effect. */
function InertDevice({ children }: { children: ReactNode }) {
  const { DeviceContext } = siteProviders();
  const [store] = useState(() => (require("@/stores/Device/DeviceStore") as typeof import("@/stores/Device/DeviceStore")).createDeviceStore());
  return <DeviceContext.Provider value={store}>{children}</DeviceContext.Provider>;
}

const siteProviders = () => require("@/providers/RP_Pro") as typeof import("@/providers/RP_Pro");
