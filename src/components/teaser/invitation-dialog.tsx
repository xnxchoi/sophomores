"use client";
import { useTranslations } from "next-intl";

import type { RefObject } from "react";
import { BrandMark } from "@/lib/brand";
import { useTeaserContent } from "./content-provider";

// Shared original invitation: a preview disclosure, never a reservation form.
export function InvitationDialog({
  dialogRef,
  onClose
}: {
  dialogRef: RefObject<HTMLDialogElement | null>;
  onClose: () => void;
}) {
  const t = useTranslations("System");
const content = useTeaserContent();
  return (
    <dialog
      className="m-auto max-h-[calc(100svh-48px)] w-[min(480px,calc(100vw-32px))] rounded-teaser-card border-0 bg-teaser-blue p-0 text-white backdrop:bg-black/80 backdrop:backdrop-blur-md"
      aria-labelledby="invitation-dialog-heading"
      data-lenis-prevent
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) dialogRef.current?.close();
      }}
    >
      <div className="flex flex-col gap-7 p-7">
        <div className="flex items-center justify-between gap-4 font-sans text-teaser-caption leading-[1.1] text-teaser-soft uppercase">
          <span>
            From: <BrandMark>{content.brandWordmark}</BrandMark>
          </span>
          <button
            className="bg-transparent p-2 text-white"
            onClick={() => dialogRef.current?.close()}
            autoFocus
            aria-label={t("closeInvitation")}
          >
            {t("closeWithSymbol")}
          </button>
        </div>
        <h2
          id="invitation-dialog-heading"
          className="font-teaser-serif text-teaser-heading leading-[1.2]"
        >
          {content.modalHeading}
        </h2>
        <p className="font-sans text-teaser-body leading-[1.3] uppercase">
          {content.modalLead}
        </p>
        <p className="font-sans text-teaser-label leading-[1.5] text-teaser-soft uppercase">
          {content.modalDisclaimer1}
        </p>
        <p className="font-sans text-teaser-label leading-[1.5] text-teaser-soft uppercase">
          {content.modalDisclaimer2}
        </p>
        <button
          className="self-start bg-transparent p-2 pl-0 text-white uppercase"
          onClick={() => dialogRef.current?.close()}
        >
          {content.modalReturnButton}
        </button>
      </div>
    </dialog>
  );
}
