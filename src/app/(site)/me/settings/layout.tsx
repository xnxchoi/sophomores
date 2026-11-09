import messages from "../../../../../messages/en.json";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { SettingsNavProvider } from "@/components/settings/SettingsNav";
import { SettingsPane } from "@/components/settings/SettingsPane";
import { SettingsRail } from "@/components/settings/SettingsRail";

export const metadata: Metadata = {
  title: messages.PageMetadata.settings,
  description: messages.PageMetadata.settingsDescription,
  robots: { index: false, follow: false },
};

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate min-h-screen overflow-x-clip bg-neutral-950 text-white">
      {/* Atmosphere: subtle radial gradient on neutral dark canvas */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.05),_transparent_60%)]"
      />

      <SettingsNavProvider>
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-x-8 px-6 pt-28 pb-32 xl:grid-cols-[220px_minmax(0,1fr)] xl:gap-x-10 xl:px-8 xl:pt-36">
          <aside className="hidden xl:sticky xl:top-36 xl:block xl:self-start">
            <SettingsRail />
          </aside>
          <main className="min-w-0">
            <SettingsPane>{children}</SettingsPane>
          </main>
        </div>
      </SettingsNavProvider>
    </div>
  );
}
