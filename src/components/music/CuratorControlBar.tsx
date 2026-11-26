"use client";

import {
  ArrowsClockwiseIcon,
  CheckIcon,
  CircleNotchIcon,
  LinkIcon,
  ShieldCheckIcon,
  WarningCircleIcon
} from "@phosphor-icons/react";
import { useMusicKit } from "./use-musickit";
import { cn } from "@/lib/utils";

interface CuratorControlBarProps {
  slug: string;
  initialIsConfigured?: boolean;
  pendingSyncCount?: number;
}

export function CuratorControlBar({
  slug,
  initialIsConfigured = false,
  pendingSyncCount = 0
}: CuratorControlBarProps) {
  const {
    isConfigured,
    isLoading,
    isSyncing,
    statusMessage,
    authorizeCurator,
    syncNow
  } = useMusicKit(slug, initialIsConfigured);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-white/15 bg-carbon/80 p-5 backdrop-blur-md shadow-[0_4px_24px_-4px_color-mix(in_oklab,var(--color-shadow)_50%,transparent)] md:p-6">
      {/* Specular edge */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
      />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center text-white">
              <ShieldCheckIcon className="size-5 text-titanium" />
            </span>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xs font-sans text-pewter">Curator controls</span>
                <span
                  className={cn(
                    "flex items-center gap-1 text-[11px] font-sans",
                    isConfigured ? "text-white" : "text-pewter"
                  )}
                >
                  {isConfigured ? (
                    <>
                      <CheckIcon className="size-3 text-white" />
                      <span>Sync active</span>
                    </>
                  ) : (
                    <>
                      <WarningCircleIcon className="size-3 text-pewter" />
                      <span>Action required</span>
                    </>
                  )}
                </span>
              </div>
              <p className="text-xs text-singer-stone">
                {isConfigured
                  ? "Your Apple ID is authorized. Attendee nominations can be synced to the master playlist."
                  : "Authorize your Curator Apple ID to enable 2-way sync with the Apple Music playlist."}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {isConfigured ? (
              <>
                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={() => syncNow()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-xs font-medium text-black transition-colors hover:bg-singer-stone focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50"
                >
                  {isSyncing ? (
                    <CircleNotchIcon className="size-4 animate-spin" />
                  ) : (
                    <ArrowsClockwiseIcon className="size-4" />
                  )}
                  <span>{isSyncing ? "Syncing..." : "Sync to Apple Music"}</span>
                  {pendingSyncCount > 0 && !isSyncing && (
                    <span className="ml-1 rounded-full bg-black/10 px-1.5 py-0.2 font-sans text-[10px]">
                      {pendingSyncCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => authorizeCurator()}
                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-xs text-singer-stone transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  title="Reconnect your Apple ID"
                >
                  <LinkIcon className="size-3.5" />
                  <span>Reconnect</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={isLoading}
                onClick={() => authorizeCurator()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-xs font-medium text-black transition-colors hover:bg-singer-stone focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50"
              >
                {isLoading ? (
                  <CircleNotchIcon className="size-4 animate-spin" />
                ) : (
                  <LinkIcon className="size-4" />
                )}
                <span>{isLoading ? "Connecting..." : "Connect Apple ID"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Status: an inline line under a rule, not a box inside the bar */}
        {statusMessage && (
          <p className="border-t border-white/10 pt-3 text-xs text-singer-stone">
            {statusMessage}
          </p>
        )}
      </div>
    </div>
  );
}
