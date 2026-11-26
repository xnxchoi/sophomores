"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { PageInset } from "@/components/core/PageInset/PageInset";
import { SetlistHeader } from "./SetlistHeader";
import { SlotManager } from "./SlotManager";
import { SetlistTracklist } from "./SetlistTracklist";
import { TrackSearchDrawer } from "./TrackSearchDrawer";
import { CuratorControlBar } from "./CuratorControlBar";
import { useAudioPreview } from "./use-audio-preview";
import type { MusicTrackView, SetlistData, SlotStateItem, UserSlotState } from "@/lib/music/types";

interface SetlistViewProps {
  initialSetlist: SetlistData;
  initialUserSlotState: UserSlotState | null;
  isAuthenticated: boolean;
  isCurator?: boolean;
  archiveOnly?: boolean;
  playlistUnavailable?: boolean;
  playlistTrackCount?: number;
}

export function SetlistView({
  initialSetlist,
  initialUserSlotState,
  isAuthenticated,
  isCurator = false,
  archiveOnly = false,
  playlistUnavailable = false,
  playlistTrackCount = 0
}: SetlistViewProps) {
  const t = useTranslations("Interface.radio");
  // Playlist retries refresh provider tracks, not editable nominations or their controls.
  const [nominatedTracks, setNominatedTracks] = useState(() => initialSetlist.tracks.slice(playlistTrackCount));
  const tracks = [...initialSetlist.tracks.slice(0, playlistTrackCount), ...nominatedTracks];
  const setlist = { ...initialSetlist, tracks, totalTracks: tracks.length };
  const [userSlots, setUserSlots] = useState<UserSlotState | null>(initialUserSlotState);

  // Audio Preview Controller
  const audioPreview = useAudioPreview();

  // Search Drawer State: the card position being filled or replaced
  const [searchDrawerSlot, setSearchDrawerSlot] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Count contributed tracks
  const contributedCount = nominatedTracks.filter((t) => !!t.submittedByName).length;

  // Cards are the member's entries in running order, then open cards. Positions
  // are computed here, never stored; an entry is addressed by its id.
  const withEntries = useCallback((prev: UserSlotState, filled: SlotStateItem[]): UserSlotState => ({
    ...prev,
    slots: prev.slots.map((_, index) => {
      const entry = filled[index];
      return entry ? { ...entry, position: index + 1 } : { position: index + 1, entryId: null, track: null };
    })
  }), []);
  const entriesUrl = `/api/setlists/${encodeURIComponent(setlist.slug)}/slots`;

  // Open Apple Music Catalog Search for a card
  const handleOpenSearch = (position: number) => {
    audioPreview.pause();
    setSearchDrawerSlot(position);
  };

  const handleCloseSearch = () => {
    setSearchDrawerSlot(null);
  };

  // Add an entry (open card) or replace an entry's track (filled card)
  const handleSelectTrack = useCallback(
    async (track: MusicTrackView) => {
      if (!searchDrawerSlot || !userSlots) return;
      setIsSubmitting(true);
      const card = userSlots.slots[searchDrawerSlot - 1];
      const note = card?.note || "";
      try {
        const response = card?.entryId
          ? await fetch(`${entriesUrl}/${encodeURIComponent(card.entryId)}`, {
              method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ track })
            })
          : await fetch(entriesUrl, {
              method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ track, note })
            });
        if (!response.ok) throw new Error("Failed to save entry");
        const data = await response.json();
        const entryId = String(data.savedTrack?.id ?? card?.entryId ?? "");
        const saved: MusicTrackView = { ...track, id: entryId, submittedByName: "You", note: note || undefined };
        setUserSlots((prev) => {
          if (!prev) return prev;
          const filled = prev.slots.filter((s) => s.entryId);
          const next = card?.entryId
            ? filled.map((s) => (s.entryId === card.entryId ? { ...s, track: saved } : s))
            : [...filled, { position: filled.length + 1, entryId, track: saved, note: note || undefined }];
          return withEntries(prev, next);
        });
        setNominatedTracks((prev) =>
          card?.entryId ? prev.map((t) => (t.id === card.entryId ? saved : t)) : [...prev, saved]
        );
      } catch (err) {
        console.error("Error saving entry:", err);
      } finally {
        setIsSubmitting(false);
      }
    },
    [searchDrawerSlot, entriesUrl, userSlots, withEntries]
  );

  // Delete an entry; the others keep their places
  const handleRemoveSlot = useCallback(
    async (position: number) => {
      const entryId = userSlots?.slots[position - 1]?.entryId;
      if (!entryId) return;
      setUserSlots((prev) => prev && withEntries(prev, prev.slots.filter((s) => s.entryId && s.entryId !== entryId)));
      setNominatedTracks((prev) => prev.filter((t) => t.id !== entryId));
      try {
        const res = await fetch(`${entriesUrl}/${encodeURIComponent(entryId)}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete entry");
      } catch (err) {
        console.error("Error deleting entry:", err);
      }
    },
    [entriesUrl, userSlots, withEntries]
  );

  // Update an entry's note
  const handleUpdateNote = useCallback(
    async (position: number, note: string) => {
      const entryId = userSlots?.slots[position - 1]?.entryId;
      if (!entryId) return;
      setUserSlots((prev) => prev && {
        ...prev,
        slots: prev.slots.map((s) => (s.entryId === entryId ? { ...s, note } : s))
      });
      try {
        await fetch(`${entriesUrl}/${encodeURIComponent(entryId)}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note })
        });
      } catch (err) {
        console.error("Error updating note:", err);
      }
    },
    [entriesUrl, userSlots]
  );

  return (
    <div className="relative isolate min-h-screen overflow-x-clip bg-carbon-deep text-white selection:bg-white selection:text-black">
      {/* Atmosphere: subtle radial ambient light */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_color-mix(in_oklab,var(--color-titanium)_6%,transparent),_transparent_65%)]"
      />

      {/* From lg: the header in columns 1-4, everything else in 5-12. Below lg it stacks. */}
      <PageInset className={cn("flex flex-col gap-8 pb-36 lg:grid lg:grid-cols-12 lg:items-start",
        playlistUnavailable ? "pt-6" : "pt-28 md:pt-32")}>
        <div className="lg:col-span-4">
          <SetlistHeader
            setlist={setlist}
            contributedCount={contributedCount}
            archiveOnly={archiveOnly}
          />
        </div>

        <div className="flex flex-col gap-8 lg:col-span-8 lg:col-start-5">

        {/* Curator Controls (Staff / Admin only) */}
        {!archiveOnly && isCurator && (
          <CuratorControlBar
            slug={setlist.slug}
            initialIsConfigured={setlist.appleMusic?.isConfigured ?? false}
            pendingSyncCount={contributedCount}
          />
        )}

        {/* 2-Slot Attendee Nomination Panel */}
        {!archiveOnly && <SlotManager
          userSlotState={userSlots}
          isAuthenticated={isAuthenticated}
          onOpenSearch={handleOpenSearch}
          onRemoveSlot={handleRemoveSlot}
          onUpdateNote={handleUpdateNote}
          audioPreview={audioPreview}
          isPastDeadline={setlist.isPastDeadline || setlist.status !== "active"}
        />}
        <p role="status" className="sr-only">
          {audioPreview.status === "loading" ? t("previewLoading")
            : audioPreview.status === "error" ? t("previewError") : null}
        </p>

        {/* Complete Setlist Table */}
        {(!playlistUnavailable || setlist.tracks.length > 0) && (
          <SetlistTracklist tracks={setlist.tracks} audioPreview={audioPreview} />
        )}
        </div>
      </PageInset>

      {/* Apple Music Search Drawer */}
      {!archiveOnly && <TrackSearchDrawer
        isOpen={searchDrawerSlot !== null}
        onClose={handleCloseSearch}
        position={searchDrawerSlot || 1}
        onSelectTrack={handleSelectTrack}
        isSubmitting={isSubmitting}
      />}
    </div>
  );
}
