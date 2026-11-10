import type { ReactNode } from "react";
import { AppRouterContext, type AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { ClientLayout } from "@/app/(site)/client-layout";
import { Providers } from "@/providers";

const unexpectedNavigation = () => { throw new Error("SSR fixture must not navigate"); };
const fixtureRouter: AppRouterInstance = {
  back: unexpectedNavigation,
  forward: unexpectedNavigation,
  refresh: unexpectedNavigation,
  push: unexpectedNavigation,
  replace: unexpectedNavigation,
  prefetch: unexpectedNavigation,
  bfcacheId: "reading-ssr-fixture",
};

export function ReadingFixture({ children }: { children: ReactNode }) {
  return <AppRouterContext.Provider value={fixtureRouter}><Providers><ClientLayout><main data-reading-fixture="content">{children}</main></ClientLayout></Providers></AppRouterContext.Provider>;
}
