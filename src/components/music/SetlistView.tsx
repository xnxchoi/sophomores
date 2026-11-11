"use client";

import { useCallback, useState } from "react";
import { SetlistHeader } from "./SetlistHeader";
import { SlotManager } from "./SlotManager";
import { SetlistTracklist } from "./SetlistTracklist";
import { TrackSearchDrawer } from "./TrackSearchDrawer";
import { CuratorControlBar } from "./CuratorControlBar";
import { useAudioPreview } from "./use-audio-preview";
import type { MusicTrackView, SetlistData, UserSlotState } from "@/lib/music/types";

interface SetlistViewProps {
  initialSetlist: SetlistData;
  initialUserSlotState: UserSlotState | null;
  isAuthenticated: boolean;
  isCurator?: boolean;
}

export function SetlistView({
  initialSetlist,
  initialUserSlotState,
  isAuthenticated,
  isCurator = false
}: SetlistViewProps) {
  const [setlist, setSetlist] = useState<SetlistData>(initialSetlist);
  const [userSlots, setUserSlots] = useState<UserSlotState | null>(initialUserSlotState);

  // Audio Preview Controller
  const audioPreview = useAudioPreview();

  // Search Drawer State
  const [searchDrawerSlot, setSearchDrawerSlot] = useState<1 | 2 | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Count contributed tracks
  const contributedCount = setlist.tracks.filter((t) => !!t.submittedByName).length;

  // Open Apple Music Catalog Search for a slot
  const handleOpenSearch = (slotIndex: 1 | 2) => {
    audioPreview.pause();
    setSearchDrawerSlot(slotIndex);
  };

  const handleCloseSearch = () => {
    setSearchDrawerSlot(null);
  };

  // Submit/Replace track in slot
  const handleSelectTrack = useCallback(
    async (track: MusicTrackView) => {
      if (!searchDrawerSlot) return;
      setIsSubmitting(true);

      const slotIdx = searchDrawerSlot;
      const existingSlot = userSlots?.slots.find((s) => s.slotIndex === slotIdx);
      const note = existingSlot?.note || "";

      // 1. Optimistic Update on userSlots
      const optimisticTrack: MusicTrackView = {
        ...track,
        slotIndex: slotIdx,
        submittedByName: "You"
      };

      setUserSlots((prev) => {
        if (!prev) return prev;
        const nextSlots = prev.slots.map((s) =>
          s.slotIndex === slotIdx ? { ...s, track: optimisticTrack, note } : s
        );
        return { ...prev, slots: nextSlots };
      });

      // Optimistic update on setlist tracks
      setSetlist((prev) => {
        // remove any existing track for this user's slot if present
        const filtered = prev.tracks.filter(
          (t) => !(t.submittedByName === "You" && t.slotIndex === slotIdx)
        );
        return {
          ...prev,
          totalTracks: filtered.length + 1,
          tracks: [...filtered, optimisticTrack]
        };
      });

      try {
        const response = await fetch(`/api/setlists/${encodeURIComponent(setlist.slug)}/slots`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slotIndex: slotIdx,
            track,
            note
          })
        });

        if (!response.ok) {
          throw new Error("Failed to save slot submission");
        }

        const data = await response.json();
        if (data.track) {
          // Sync server-assigned track view
          const serverTrack: MusicTrackView = {
            id: data.track.id,
            title: data.track.title,
            artist: data.track.artist,
            albumTitle: data.track.albumTitle,
            coverUrl: data.track.coverUrl,
            previewUrl: data.track.previewUrl,
            duration: data.track.duration,
            isrc: data.track.isrc,
            slotIndex: slotIdx,
            submittedByName: "You",
            note
          };

          setUserSlots((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              slots: prev.slots.map((s) =>
                s.slotIndex === slotIdx ? { ...s, track: serverTrack, note } : s
              )
            };
          });

          setSetlist((prev) => {
            const filtered = prev.tracks.filter(
              (t) => !(t.submittedByName === "You" && t.slotIndex === slotIdx)
            );
            return {
              ...prev,
              tracks: [...filtered, serverTrack]
            };
          });
        }
      } catch (err) {
        console.error("Error submitting track slot:", err);
      } finally {
        setIsSubmitting(false);
      }
    },
    [searchDrawerSlot, setlist.slug, userSlots]
  );

  // Remove track from slot
  const handleRemoveSlot = useCallback(
    async (slotIndex: 1 | 2) => {
      // Optimistic userSlots update
      setUserSlots((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          slots: prev.slots.map((s) =>
            s.slotIndex === slotIndex ? { ...s, track: null, note: undefined } : s
          )
        };
      });

      // Optimistic setlist tracks update
      setSetlist((prev) => {
        const filtered = prev.tracks.filter(
          (t) => !(t.submittedByName === "You" && t.slotIndex === slotIndex)
        );
        return {
          ...prev,
          totalTracks: filtered.length,
          tracks: filtered
        };
      });

      try {
        const res = await fetch(
          `/api/setlists/${encodeURIComponent(setlist.slug)}/slots/${slotIndex}`,
          { method: "DELETE" }
        );
        if (!res.ok) {
          throw new Error("Failed to clear slot");
        }
      } catch (err) {
        console.error("Error removing slot:", err);
      }
    },
    [setlist.slug]
  );

  // Update note on slot
  const handleUpdateNote = useCallback(
    async (slotIndex: 1 | 2, note: string) => {
      const slot = userSlots?.slots.find((s) => s.slotIndex === slotIndex);
      if (!slot || !slot.track) return;

      setUserSlots((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          slots: prev.slots.map((s) =>
            s.slotIndex === slotIndex ? { ...s, note } : s
          )
        };
      });

      try {
        await fetch(`/api/setlists/${encodeURIComponent(setlist.slug)}/slots`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slotIndex,
            track: slot.track,
            note
          })
        });
      } catch (err) {
        console.error("Error updating note:", err);
      }
    },
    [setlist.slug, userSlots]
  );

  return (
    <div className="relative isolate min-h-screen overflow-x-clip bg-neutral-950 text-white selection:bg-white selection:text-black">
      {/* Atmosphere: subtle radial ambient light */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.06),_transparent_65%)]"
      />

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pt-28 pb-36 sm:px-6 md:px-8 md:pt-32">
        {/* Setlist Header */}
        <SetlistHeader
          setlist={setlist}
          contributedCount={contributedCount}
        />

        {/* Curator Controls (Staff / Admin only) */}
        {isCurator && (
          <CuratorControlBar
            slug={setlist.slug}
            initialIsConfigured={Boolean(setlist.appleMusic?.ownerUserToken)}
            pendingSyncCount={contributedCount}
          />
        )}

        {/* 2-Slot Attendee Nomination Panel */}
        <SlotManager
          userSlotState={userSlots}
          isAuthenticated={isAuthenticated}
          onOpenSearch={handleOpenSearch}
          onRemoveSlot={handleRemoveSlot}
          onUpdateNote={handleUpdateNote}
          audioPreview={audioPreview}
          isPastDeadline={setlist.isPastDeadline || setlist.status === "locked"}
        />

        {/* Complete Setlist Table */}
        <SetlistTracklist
          tracks={setlist.tracks}
          audioPreview={audioPreview}
        />
      </div>

      {/* Apple Music Search Drawer */}
      <TrackSearchDrawer
        isOpen={searchDrawerSlot !== null}
        onClose={handleCloseSearch}
        slotIndex={searchDrawerSlot || 1}
        onSelectTrack={handleSelectTrack}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
