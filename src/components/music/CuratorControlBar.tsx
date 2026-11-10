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
    <div className="relative w-full overflow-hidden rounded-2xl border border-white/15 bg-neutral-900/80 p-5 backdrop-blur-md shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)] md:p-6">
      {/* Specular edge */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
      />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-white">
              <ShieldCheckIcon className="size-5 text-neutral-200" />
            </span>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-neutral-400">Curator controls</span>
                <span
                  className={cn(
                    "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-mono",
                    isConfigured
                      ? "border-white/20 bg-white/[0.08] text-white"
                      : "border-white/10 bg-white/[0.03] text-neutral-400"
                  )}
                >
                  {isConfigured ? (
                    <>
                      <CheckIcon className="size-3 text-white" />
                      <span>Sync active</span>
                    </>
                  ) : (
                    <>
                      <WarningCircleIcon className="size-3 text-neutral-400" />
                      <span>Action required</span>
                    </>
                  )}
                </span>
              </div>
              <p className="text-xs text-neutral-300">
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
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-xs font-medium text-black transition-colors hover:bg-neutral-200 focus-visible:outline-none disabled:opacity-50"
                >
                  {isSyncing ? (
                    <CircleNotchIcon className="size-4 animate-spin" />
                  ) : (
                    <ArrowsClockwiseIcon className="size-4" />
                  )}
                  <span>{isSyncing ? "Syncing..." : "Sync to Apple Music"}</span>
                  {pendingSyncCount > 0 && !isSyncing && (
                    <span className="ml-1 rounded-full bg-black/10 px-1.5 py-0.2 font-mono text-[10px]">
                      {pendingSyncCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => authorizeCurator()}
                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-xs text-neutral-300 transition-colors hover:bg-white/[0.08] hover:text-white"
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
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-xs font-medium text-black transition-colors hover:bg-neutral-200 focus-visible:outline-none disabled:opacity-50"
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

        {/* Status / In-place message */}
        {statusMessage && (
          <div className="rounded-xl border border-white/10 bg-neutral-950/60 p-3 text-xs text-neutral-300">
            {statusMessage}
          </div>
        )}
      </div>
    </div>
  );
}
