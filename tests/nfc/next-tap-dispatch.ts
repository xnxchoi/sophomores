import "next/dist/server/node-environment-baseline";

import { NextRequest } from "next/server";
import { AppRouteRouteModule, type AppRouteRouteHandlerContext } from "next/dist/server/route-modules/app-route/module";
import type { RouteKind } from "next/dist/server/route-kind";

type Userland = Awaited<ReturnType<ConstructorParameters<typeof AppRouteRouteModule>[0]["userland"]>>;

export function dispatchTap(userland: () => Omit<Userland, "generateStaticParams">, ref: string, tap: string) {
  const pathname = "/nfc/[ref]";
  const module = new AppRouteRouteModule({
    userland: () => ({ generateStaticParams: undefined, ...userland() }) as Userland,
    definition: { kind: "APP_ROUTE" as RouteKind.APP_ROUTE, page: pathname + "/route", pathname, filename: "route.ts", bundlePath: "app" + pathname + "/route" },
    distDir: ".next", relativeProjectDir: "", resolvedPagePath: "src/app/(nfc)/nfc/[ref]/route.ts",
    nextConfigOutput: undefined,
  });
  return (method: string, headers: HeadersInit = {}, url = tap, body?: string) => module.handle(
    new NextRequest(url, { method, headers, body }),
    {
      params: { ref },
      renderOpts: {
        cacheLifeProfiles: { default: { stale: 0, revalidate: 1, expire: 60 } },
        staticPageGenerationTimeout: 60, cacheComponents: false, validationLevel: "warning",
        waitUntil: undefined, onClose: () => {}, onAfterTaskError: undefined,
        experimental: { authInterrupts: false, useCacheTimeout: 30000, durableUseCacheEntries: false },
      },
      sharedContext: { buildId: "nfc-fixture", deploymentId: "" },
      previewProps: { previewModeId: "", previewModeEncryptionKey: "", previewModeSigningKey: "" },
    } satisfies AppRouteRouteHandlerContext,
  );
}
