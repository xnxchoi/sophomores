"use client";

import type { RefObject } from "react";
import { BrandMark } from "@/lib/brand";
import { teaser } from "@/lib/teaser/content";
import { launchLabel } from "@/lib/teaser/motion";

// Shared original invitation: a preview disclosure, never a reservation form.
export function InvitationDialog({
  dialogRef,
  onClose
}: {
  dialogRef: RefObject<HTMLDialogElement | null>;
  onClose: () => void;
}) {
  return (
    <dialog
      className="invitation-dialog m-auto max-h-[calc(100svh-48px)] w-[min(480px,calc(100vw-32px))] rounded-teaser-card border-0 bg-teaser-blue p-0 text-white backdrop:bg-black/80 backdrop:backdrop-blur-md"
      aria-labelledby="invitation-dialog-heading"
      data-lenis-prevent
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) dialogRef.current?.close();
      }}
    >
      <div className="dialog-content flex flex-col gap-7 p-7">
        <div className="message-meta flex items-center justify-between gap-4 font-sans text-teaser-caption leading-[1.1] text-teaser-soft uppercase">
          <span>
            From: <BrandMark>sophomores</BrandMark>
          </span>
          <button
            className="bg-transparent p-2 text-white"
            onClick={() => dialogRef.current?.close()}
            autoFocus
            aria-label="Close invitation"
          >
            Close ×
          </button>
        </div>
        <h2
          id="invitation-dialog-heading"
          className="font-teaser-serif text-teaser-heading leading-[1.2]"
        >
          The first invitation
        </h2>
        <p className="font-sans text-teaser-body leading-[1.3] uppercase">
          Ticket sales open {teaser.launchHint.toLowerCase()}.
        </p>
        <p className="dialog-note font-sans text-teaser-label leading-[1.5] text-teaser-soft uppercase">
          {launchLabel(teaser.launchAt, new Date(0))}. Ticket sales are not open
          yet.
        </p>
        <p className="dialog-note font-sans text-teaser-label leading-[1.5] text-teaser-soft uppercase">
          Preview only. No email is collected and no reservation is made.
        </p>
        <button
          className="dialog-return self-start bg-transparent p-2 pl-0 text-white uppercase"
          onClick={() => dialogRef.current?.close()}
        >
          Back to the story →
        </button>
      </div>
    </dialog>
  );
}
