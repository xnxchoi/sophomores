"use client";

import { Missing } from "@/components/layouts/Missing/Missing";
import { MissingLayout } from "@/components/layouts/Missing/lays.client";
import { LinkUnderlined } from "@/components/core/Link/Link";
import { CursorProvider, DeviceProvider, HAStoreProvider, MenuProvider } from "@/providers/RP_Pro";
import { MiddleMan } from "@/providers/MiddleMan";
import { ThemeProvider } from "@/providers/Theme";
import { VoyageurProvider } from "@/stores/Routing/RP_Voyageur";

export function NotFoundScreen() {
  return (
    <HAStoreProvider>
      <VoyageurProvider>
        <ThemeProvider>
          <DeviceProvider>
            <MenuProvider>
              <CursorProvider>
              <MiddleMan>
                <div className="title-wrapper fixed h-full w-full">
                  <MissingLayout />
                </div>
                <Missing />
                <div className="fixed z-1 flex h-full w-full items-center justify-center">
                  <LinkUnderlined
                    className="link-underlined bg-transparent hover:text-red-500"
                    href="/"
                    style={{ position: "relative", bottom: "20px" }}
                  >
                    Come Back.
                  </LinkUnderlined>
                </div>
              </MiddleMan>
              </CursorProvider>
            </MenuProvider>
          </DeviceProvider>
        </ThemeProvider>
      </VoyageurProvider>
    </HAStoreProvider>
  );
}
