"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowsClockwiseIcon,
  LockKeyIcon,
  MusicNotesIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  ShieldWarningIcon,
  TrashIcon,
  UserIcon
} from "@phosphor-icons/react";
import type { AudioPreviewState } from "./use-audio-preview";
import type { SlotStateItem, UserSlotState } from "@/lib/music/types";

interface SlotManagerProps {
  userSlotState: UserSlotState | null;
  isAuthenticated: boolean;
  onOpenSearch: (slotIndex: 1 | 2) => void;
  onRemoveSlot: (slotIndex: 1 | 2) => Promise<void>;
  onUpdateNote: (slotIndex: 1 | 2, note: string) => Promise<void>;
  audioPreview: AudioPreviewState;
  isPastDeadline: boolean;
}

export function SlotManager({
  userSlotState,
  isAuthenticated,
  onOpenSearch,
  onRemoveSlot,
  onUpdateNote,
  audioPreview,
  isPastDeadline
}: SlotManagerProps) {
  const [editingNoteSlot, setEditingNoteSlot] = useState<1 | 2 | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [removingSlot, setRemovingSlot] = useState<1 | 2 | null>(null);

  // 1. Unauthenticated state
  if (!isAuthenticated) {
    return (
      <section className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/50 p-6 backdrop-blur-md md:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white">
              <UserIcon className="size-6 text-neutral-300" />
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-medium text-white">Attendee nominations</h2>
              <p className="text-xs text-neutral-400 max-w-lg leading-relaxed">
                Ticket holders and members can shape the room by nominating up to two tracks from Apple Music. Sign in to your account to claim your slots.
              </p>
            </div>
          </div>

          <Link
            href="/account"
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-white px-5 text-xs font-medium text-black transition-colors hover:bg-neutral-200 focus-visible:outline-none"
          >
            Sign in to nominate
          </Link>
        </div>
      </section>
    );
  }

  // 2. Authenticated but Ineligible state
  if (userSlotState && !userSlotState.eligible) {
    return (
      <section className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/50 p-6 backdrop-blur-md md:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-neutral-300">
              <ShieldWarningIcon className="size-6" />
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-medium text-white">Verification required</h2>
              <p className="text-xs text-neutral-400 max-w-xl leading-relaxed">
                {userSlotState.reason ||
                  "Setlist nominations are reserved for verified attendees and members. Once your ticket purchase is completed, your two nomination slots will unlock automatically."}
              </p>
            </div>
          </div>

          <Link
            href="/tickets"
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] px-5 text-xs font-medium text-white transition-colors hover:bg-white/[0.12]"
          >
            Get ticket
          </Link>
        </div>
      </section>
    );
  }

  // 3. Eligible state: 2 nomination slots
  const slots = userSlotState?.slots || [
    { slotIndex: 1, track: null },
    { slotIndex: 2, track: null }
  ];

  const handleStartEditNote = (slot: SlotStateItem) => {
    setEditingNoteSlot(slot.slotIndex);
    setNoteDraft(slot.note || "");
  };

  const handleSaveNote = async (slotIndex: 1 | 2) => {
    setIsSavingNote(true);
    try {
      await onUpdateNote(slotIndex, noteDraft);
      setEditingNoteSlot(null);
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleRemove = async (slotIndex: 1 | 2) => {
    setRemovingSlot(slotIndex);
    try {
      await onRemoveSlot(slotIndex);
    } finally {
      setRemovingSlot(null);
    }
  };

  return (
    <section className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/60 p-6 backdrop-blur-md md:p-8">
      {/* Top subtle highlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
      />

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-base font-medium text-white">Your nomination slots</h2>
            <p className="text-xs text-neutral-400">
              {isPastDeadline
                ? "Nominations are locked. Here are the tracks you added to the room setlist."
                : "You have 2 nomination slots. Search and audition tracks before submitting."}
            </p>
          </div>

          {isPastDeadline && (
            <span className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-neutral-400">
              <LockKeyIcon className="size-3.5" />
              Locked
            </span>
          )}
        </div>

        {/* 2-Slot Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {slots.map((slot) => {
            const hasTrack = !!slot.track;
            const isPlayingThis =
              hasTrack &&
              audioPreview.activeId === slot.track?.id &&
              audioPreview.isPlaying;
            const isRemoving = removingSlot === slot.slotIndex;
            const isEditingThisNote = editingNoteSlot === slot.slotIndex;

            if (!hasTrack) {
              // Empty Slot Card
              return (
                <div
                  key={slot.slotIndex}
                  className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/15 bg-neutral-950/40 p-6 text-center transition-colors hover:border-white/25 md:p-8"
                >
                  <div className="flex size-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-neutral-400">
                    <MusicNotesIcon className="size-6" />
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-xs text-neutral-400">
                      Slot 0{slot.slotIndex} (open)
                    </span>
                    <span className="text-sm font-medium text-white">
                      Nominate a track
                    </span>
                  </div>

                  {!isPastDeadline ? (
                    <button
                      type="button"
                      onClick={() => onOpenSearch(slot.slotIndex)}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white px-5 text-xs font-medium text-black transition-colors hover:bg-neutral-200 focus-visible:outline-none"
                    >
                      <PlusIcon className="size-4" />
                      <span>Search catalog</span>
                    </button>
                  ) : (
                    <span className="text-xs text-neutral-500">
                      Nominations closed
                    </span>
                  )}
                </div>
              );
            }

            // Filled Slot Card
            return (
              <div
                key={slot.slotIndex}
                className="flex flex-col justify-between gap-4 rounded-xl border border-white/15 bg-neutral-950/80 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5 min-w-0">
                    {/* Artwork with Play/Pause button */}
                    <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-neutral-800 border border-white/10">
                      {slot.track?.coverUrl ? (
                        <Image
                          src={slot.track.coverUrl}
                          alt={slot.track.title}
                          width={64}
                          height={64}
                          unoptimized
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-neutral-500">
                          <MusicNotesIcon className="size-6" />
                        </div>
                      )}

                      {slot.track?.previewUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            audioPreview.toggle(
                              slot.track!.id,
                              slot.track?.previewUrl
                            )
                          }
                          className="absolute inset-0 flex items-center justify-center bg-black/40 text-white transition-opacity hover:bg-black/60"
                          title={isPlayingThis ? "Pause preview" : "Play preview"}
                        >
                          {isPlayingThis ? (
                            <PauseIcon className="size-6" weight="fill" />
                          ) : (
                            <PlayIcon className="size-6" weight="fill" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex flex-col min-w-0">
                      <span className="font-mono text-[11px] text-neutral-400">
                        Slot 0{slot.slotIndex}
                      </span>
                      <span className="text-sm font-medium text-white truncate">
                        {slot.track?.title}
                      </span>
                      <span className="text-xs text-neutral-400 truncate">
                        {slot.track?.artist}
                      </span>
                      {slot.track?.albumTitle && (
                        <span className="text-[11px] text-neutral-500 truncate">
                          {slot.track.albumTitle}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Slot Actions */}
                  {!isPastDeadline && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onOpenSearch(slot.slotIndex)}
                        title="Replace track"
                        className="flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-neutral-400 transition-colors hover:bg-white/[0.08] hover:text-white"
                      >
                        <ArrowsClockwiseIcon className="size-4" />
                        <span className="sr-only">Replace</span>
                      </button>
                      <button
                        type="button"
                        disabled={isRemoving}
                        onClick={() => handleRemove(slot.slotIndex)}
                        title="Remove track"
                        className="flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
                      >
                        <TrashIcon className="size-4" />
                        <span className="sr-only">Remove</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Submitter Note Section */}
                <div className="border-t border-white/10 pt-3">
                  {isEditingThisNote ? (
                    <div className="flex flex-col gap-2">
                      <input
                        type="text"
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        placeholder="Why this track belongs in the room..."
                        maxLength={120}
                        className="h-9 w-full rounded-lg border border-white/15 bg-neutral-900 px-3 text-xs text-white placeholder:text-neutral-500 focus-visible:outline-none focus-visible:border-white/30"
                        autoFocus
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingNoteSlot(null)}
                          className="h-7 rounded px-2.5 text-xs text-neutral-400 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isSavingNote}
                          onClick={() => handleSaveNote(slot.slotIndex)}
                          className="inline-flex h-7 items-center justify-center rounded bg-white px-3 text-xs font-medium text-black hover:bg-neutral-200"
                        >
                          {isSavingNote ? "Saving..." : "Save note"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-400 italic truncate max-w-[280px]">
                        {slot.note ? `“${slot.note}”` : "No note added"}
                      </span>
                      {!isPastDeadline && (
                        <button
                          type="button"
                          onClick={() => handleStartEditNote(slot)}
                          className="text-neutral-400 hover:text-white underline underline-offset-2 shrink-0 ml-2"
                        >
                          {slot.note ? "Edit note" : "Add note"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
