"use client";

import { useEffect, useRef } from "react";
import { useLenis } from "lenis/react";
import { useMotionValue } from "motion/react";
import type { ChapterId } from "@/lib/teaser/choreography";
import { Conversation, Invitation, Orbit, People } from "./narrative";
import { InvitationDialog } from "./invitation-dialog";
import SceneLoader from "./scene-loader";
import { useHydrated } from "./use-device-flags";

/** The original page after Story; Warp remains the sole entry and scroll owner. */
export function TeaserContinuation({
  onActive
}: {
  onActive: (id: ChapterId) => void;
}) {
  const lenis = useLenis();
  const ready = useHydrated();
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  // SceneLoader's footer branch owns its playback and does not use hero progress.
  const footerProgress = useMotionValue(0);

  useEffect(() => {
    const element = dialog.current;
    if (element?.open) lenis?.stop();
    return () => {
      if (element?.open) lenis?.start();
    };
  }, [lenis]);

  const openInvitation = () => {
    opener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    dialog.current?.showModal();
    lenis?.stop();
  };

  return (
    <div className="w-full" data-teaser-continuation="">
      <Orbit onActive={onActive} />
      <Conversation onActive={onActive} />
      <People onActive={onActive} />
      <Invitation
        onActive={onActive}
        onOpen={openInvitation}
        renderBackdrop={(active) => (
          <SceneLoader
            progress={footerProgress}
            active={ready && active}
            footer
          />
        )}
      />
      <InvitationDialog
        dialogRef={dialog}
        onClose={() => {
          lenis?.start();
          opener.current?.focus();
        }}
      />
    </div>
  );
}
