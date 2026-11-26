"use client";
import { Button } from "@/components/core/Button";

import { useState } from "react";
import { Link } from "@/components/core/Link/Link";
import { useTranslations } from "next-intl";
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
import { useAccountSheetTrigger } from "@/components/auth/use-account-sheet";

interface SlotManagerProps {
  userSlotState: UserSlotState | null;
  isAuthenticated: boolean;
  onOpenSearch: (position: number) => void;
  onRemoveSlot: (position: number) => Promise<void>;
  onUpdateNote: (position: number, note: string) => Promise<void>;
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
  const t = useTranslations("Interface.radio");
  // Sign in opens the in-place sheet; the href is the no-JS and modifier-click path (owner, 24 Nov).
  const signIn = useAccountSheetTrigger();
  const [editingNoteSlot, setEditingNoteSlot] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [removingSlot, setRemovingSlot] = useState<number | null>(null);

  // 1. Unauthenticated state
  if (!isAuthenticated) {
    return (
      <section className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-carbon/50 p-6 backdrop-blur-md md:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center text-white">
              <UserIcon className="size-6 text-singer-stone" />
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="text-base text-white">{t("slots.signedOutTitle")}</h2>
              <p className="text-xs text-pewter max-w-lg leading-relaxed">
                {t("slots.signedOutBody")}
              </p>
            </div>
          </div>

          <Link
            href={signIn.href}
            onClick={signIn.onClick}
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-white px-5 text-xs font-medium text-black transition-colors hover:bg-singer-stone focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {t("slots.signInToNominate")}
          </Link>
        </div>
      </section>
    );
  }

  // 2. Authenticated but Ineligible state
  if (userSlotState && !userSlotState.eligible) {
    const isUnactivated = userSlotState.reason === "account_unactivated";
    return (
      <section className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-carbon/50 p-6 backdrop-blur-md md:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center text-singer-stone">
              <ShieldWarningIcon className="size-6" />
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="text-base text-white">
                {isUnactivated ? t("slots.activationRequired") : t("slots.verificationRequired")}
              </h2>
              <p className="text-xs text-pewter max-w-xl leading-relaxed">
                {isUnactivated
                  ? t("slots.activationBody")
                  : t("slots.verificationBody")}
              </p>
            </div>
          </div>

          <Link
            href={isUnactivated ? "/account" : "/tickets"}
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] px-5 text-xs font-medium text-white transition-colors hover:bg-white/[0.12] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {isUnactivated ? t("slots.activateAccount") : t("slots.getTicket")}
          </Link>
        </div>
      </section>
    );
  }

  if (!userSlotState) {
    return <p role="status" className="text-sm text-singer-stone">{t("nominationsUnavailable")}</p>;
  }

  // 3. Eligible state: 2 nomination slots
  const slots = userSlotState.slots;

  const handleStartEditNote = (slot: SlotStateItem) => {
    setEditingNoteSlot(slot.position);
    setNoteDraft(slot.note || "");
  };

  const handleSaveNote = async (position: number) => {
    setIsSavingNote(true);
    try {
      await onUpdateNote(position, noteDraft);
      setEditingNoteSlot(null);
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleRemove = async (position: number) => {
    setRemovingSlot(position);
    try {
      await onRemoveSlot(position);
    } finally {
      setRemovingSlot(null);
    }
  };

  return (
    <section className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-carbon/60 p-6 backdrop-blur-md md:p-8">
      {/* Top subtle highlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
      />

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-base text-white">{t("slots.title")}</h2>
            <p className="text-xs text-pewter">
              {isPastDeadline
                ? t("slots.lockedBody")
                : t("slots.openBody")}
            </p>
          </div>

          {isPastDeadline && (
            <span className="flex items-center gap-1.5 text-xs text-pewter">
              <LockKeyIcon className="size-3.5" />
              {t("slots.locked")}
            </span>
          )}
        </div>

        {/* Entries: flat rows divided by rules (no cards inside the section) */}
        <div className="flex flex-col divide-y divide-white/10 border-y border-white/10">
          {slots.map((slot) => {
            const hasTrack = !!slot.track;
            const isPlayingThis =
              hasTrack &&
              audioPreview.activeId === slot.track?.id &&
              audioPreview.isPlaying;
            const isActive = hasTrack && audioPreview.activeId === slot.track?.id;
            const previewLoading = isActive && audioPreview.status === "loading";
            const previewFailed = isActive && audioPreview.status === "error";
            const isRemoving = removingSlot === slot.position;
            const isEditingThisNote = editingNoteSlot === slot.position;

            if (!hasTrack) {
              // Empty Slot Card
              return (
                <div
                  key={slot.entryId ?? `open-${slot.position}`}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3.5">
                    <MusicNotesIcon className="size-6 shrink-0 text-pewter" />
                    <div className="flex flex-col gap-0.5">
                    <span className="font-sans text-xs text-pewter">
                      {t("slots.openEntry", { position: slot.position })}
                    </span>
                    <span className="text-sm font-medium text-white">
                      {t("slots.nominateTrack")}
                    </span>
                    </div>
                  </div>

                  {!isPastDeadline ? (
                    <Button variant="bare"
                      type="button"
                      onClick={() => onOpenSearch(slot.position)}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white px-5 text-xs font-medium text-black transition-colors hover:bg-singer-stone focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    >
                      <PlusIcon className="size-4" />
                      <span>{t("slots.searchCatalog")}</span>
                    </Button>
                  ) : (
                    <span className="text-xs text-pewter">
                      {t("slots.nominationsClosed")}
                    </span>
                  )}
                </div>
              );
            }

            // Filled Slot Card
            return (
              <div
                key={slot.entryId ?? `open-${slot.position}`}
                className="flex flex-col justify-between gap-4 py-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5 min-w-0">
                    {/* Artwork with Play/Pause button */}
                    <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-gunmetal border border-white/10">
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
                        <div className="flex size-full items-center justify-center text-pewter">
                          <MusicNotesIcon className="size-6" />
                        </div>
                      )}

                      {slot.track?.previewUrl && (
                        <Button variant="bare"
                          type="button"
                          onClick={() =>
                            audioPreview.toggle(
                              slot.track!.id,
                              slot.track?.previewUrl
                            )
                          }
                          className="absolute inset-0 flex items-center justify-center bg-black/40 text-white transition-opacity hover:bg-black/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white"
                          aria-busy={previewLoading || undefined}
                          aria-label={t(previewLoading ? "cancelPreview" : isPlayingThis ? "pausePreview" : previewFailed ? "retryPreview" : "playPreview", { track: slot.track.title })}
                        >
                          {isPlayingThis || previewLoading ? (
                            <PauseIcon aria-hidden="true" className="size-6" weight="fill" />
                          ) : (
                            <PlayIcon aria-hidden="true" className="size-6" weight="fill" />
                          )}
                        </Button>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex flex-col min-w-0">
                      <span className="font-sans text-[11px] text-pewter">
                        {t("slots.entry", { position: slot.position })}
                      </span>
                      <span className="text-sm font-medium text-white truncate">
                        {slot.track?.title}
                      </span>
                      <span className="text-xs text-pewter truncate">
                        {slot.track?.artist}
                      </span>
                      {isActive && (previewLoading || previewFailed) && (
                        <p className="text-xs text-singer-stone">{t(previewFailed ? "previewError" : "previewLoading")}</p>
                      )}
                      {slot.track?.albumTitle && (
                        <span className="text-[11px] text-pewter truncate">
                          {slot.track.albumTitle}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Slot Actions */}
                  {!isPastDeadline && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="bare"
                        type="button"
                        onClick={() => onOpenSearch(slot.position)}
                        title={t("slots.replaceTrack")}
                        className="flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-pewter transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                      >
                        <ArrowsClockwiseIcon className="size-4" />
                        <span className="sr-only">{t("slots.replace")}</span>
                      </Button>
                      <Button variant="bare"
                        type="button"
                        disabled={isRemoving}
                        onClick={() => handleRemove(slot.position)}
                        title={t("slots.removeTrack")}
                        className="flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-pewter transition-colors hover:bg-gunmetal hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                      >
                        <TrashIcon className="size-4" />
                        <span className="sr-only">{t("slots.remove")}</span>
                      </Button>
                    </div>
                  )}
                </div>

                {/* Submitter Note Section */}
                <div className="pt-1">
                  {isEditingThisNote ? (
                    <div className="flex flex-col gap-2">
                      <input
                        type="text"
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        placeholder={t("slots.notePlaceholder")}
                        maxLength={120}
                        className="mt-0 h-9 w-full rounded-none border-0 border-b border-white/15 bg-transparent px-0 py-0 font-sans text-xs font-normal tracking-normal text-white placeholder:text-pewter focus-visible:outline-none focus-visible:border-white/40"
                        autoFocus
                      />
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="bare"
                          type="button"
                          onClick={() => setEditingNoteSlot(null)}
                          className="h-7 rounded px-2.5 text-xs text-pewter hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                        >
                          {t("slots.cancel")}
                        </Button>
                        <Button variant="bare"
                          type="button"
                          disabled={isSavingNote}
                          onClick={() => handleSaveNote(slot.position)}
                          className="inline-flex h-7 items-center justify-center rounded bg-white px-3 text-xs font-medium text-black hover:bg-singer-stone focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                        >
                          {isSavingNote ? t("slots.saving") : t("slots.saveNote")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-pewter italic truncate max-w-[280px]">
                        {slot.note ? t("slots.quotedNote", { note: slot.note }) : t("slots.noNote")}
                      </span>
                      {!isPastDeadline && (
                        <Button variant="bare"
                          type="button"
                          onClick={() => handleStartEditNote(slot)}
                          className="text-pewter hover:text-white underline underline-offset-2 shrink-0 ml-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                        >
                          {slot.note ? t("slots.editNote") : t("slots.addNote")}
                        </Button>
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
