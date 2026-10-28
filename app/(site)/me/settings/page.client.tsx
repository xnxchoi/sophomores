"use client";

import Link from "next/link";
import { IdCard, ShieldCheck, Sliders, ChevronRight } from "lucide-react";
import type { User } from "@/lib/payload/payload-types";
import {
  Panel,
  PanelGrid,
  PanelHeader,
  PanelControls,
} from "@/components/settings/Panel";
import {
  SETTINGS_SECTION_META,
  SETTINGS_SECTION_SLUGS,
} from "@/lib/settings/sections";
import { cn } from "@/lib/utils";

interface SettingsHubClientProps {
  user: User;
  activeSessionsCount: number;
}

const SECTION_ICONS = {
  general: Sliders,
  account: IdCard,
  security: ShieldCheck,
};

export default function SettingsHubClient({
  user,
  activeSessionsCount,
}: SettingsHubClientProps) {
  const displayName = user.name || user.email.split("@")[0] || "Attendee";
  const tier = user.ticketTier ?? "none";
  const status = user.membershipStatus ?? "applicant";

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Attendee Overview Banner */}
      <Panel>
        <PanelGrid>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-xl font-medium text-white">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-medium text-white">{displayName}</h1>
                  <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[11px] font-mono uppercase tracking-wider text-neutral-300">
                    {tier}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 font-mono">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-white/10 bg-neutral-900/80 px-2.5 py-1 text-xs text-neutral-300">
                Status: <span className="capitalize text-white">{status}</span>
              </span>
              <span className="rounded-md border border-white/10 bg-neutral-900/80 px-2.5 py-1 text-xs text-neutral-300">
                {activeSessionsCount} active {activeSessionsCount === 1 ? "session" : "sessions"}
              </span>
            </div>
          </div>
        </PanelGrid>
      </Panel>

      {/* Navigation Sections */}
      <Panel>
        <PanelGrid>
          <PanelHeader
            eyebrow="Settings"
            blurb="Select a category to view or update your attendee information and security."
          />
          <PanelControls>
            <div className="flex flex-col gap-2">
              {SETTINGS_SECTION_SLUGS.map((slug) => {
                const Icon = SECTION_ICONS[slug];
                const meta = SETTINGS_SECTION_META[slug];
                return (
                  <Link
                    key={slug}
                    href={`/me/settings/${slug}`}
                    className={cn(
                      "group flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-colors",
                      "hover:border-white/10 hover:bg-white/[0.05]"
                    )}
                  >
                    <div className="flex items-center gap-3.5">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-neutral-400 group-hover:text-white">
                        <Icon size={20} strokeWidth={1.5} />
                      </span>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-white">
                          {meta.label}
                        </span>
                        <span className="text-xs text-neutral-400">
                          {meta.blurb}
                        </span>
                      </div>
                    </div>
                    <ChevronRight
                      size={18}
                      className="text-neutral-500 transition-transform group-hover:translate-x-0.5 group-hover:text-neutral-300"
                    />
                  </Link>
                );
              })}
            </div>
          </PanelControls>
        </PanelGrid>
      </Panel>
    </div>
  );
}
