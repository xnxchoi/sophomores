"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { filmPoses, studyMotion } from "../../lib/invitation/motion";

export type FilmMedia = {
  src: string;
  title: string;
  credit: string;
  captions?: { src: string; language: string; label: string };
  transcript?: string;
};
type Props = {
  still: boolean;
  onModalChange: (open: boolean) => void;
  media?: FilmMedia;
};

export function FilmStudy({ still, onModalChange, media }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const returnButton = useRef<HTMLButtonElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [present, setPresent] = useState(false);
  const [mediaFailed, setMediaFailed] = useState(false);
  const overflow = useRef<{ value: string; priority: string } | null>(null);

  function restoreScroll() {
    if (!overflow.current) return;
    document.documentElement.style.setProperty(
      "overflow",
      overflow.current.value,
      overflow.current.priority
    );
    overflow.current = null;
  }

  useEffect(() => {
    const element = dialog.current;
    return () => {
      element?.close();
      if (overflow.current) {
        document.documentElement.style.setProperty(
          "overflow",
          overflow.current.value,
          overflow.current.priority
        );
        overflow.current = null;
      }
    };
  }, []);

  function open() {
    if (!dialog.current || dialog.current.open) return;
    const style = document.documentElement.style;
    overflow.current = {
      value: style.getPropertyValue("overflow"),
      priority: style.getPropertyPriority("overflow")
    };
    style.setProperty("overflow", "hidden");
    dialog.current.showModal();
    setMediaFailed(false);
    setPresent(true);
    closeButton.current?.focus();
    onModalChange(true);
  }

  function dismiss() {
    video.current?.pause();
    setPresent(false);
  }

  useEffect(() => {
    const pauseWhenHidden = () => {
      if (document.hidden) video.current?.pause();
    };
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () =>
      document.removeEventListener("visibilitychange", pauseWhenHidden);
  }, []);

  return (
    <>
      <button
        className="invitation-study-text-button"
        ref={trigger}
        onClick={open}
      >
        {media ? "Watch reference clip" : "Preview film transition"}{" "}
        <span aria-hidden="true">↗</span>
      </button>
      <dialog
        ref={dialog}
        className="invitation-film-dialog"
        aria-labelledby="film-study-heading"
        aria-describedby="film-study-disclosure"
        aria-modal="true"
        data-still={still || undefined}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          if (
            event.shiftKey &&
            event.target === closeButton.current &&
            returnButton.current
          ) {
            event.preventDefault();
            returnButton.current.focus();
          } else if (!event.shiftKey && event.target === returnButton.current) {
            event.preventDefault();
            closeButton.current?.focus();
          }
        }}
        onCancel={(event) => {
          event.preventDefault();
          dismiss();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) dismiss();
        }}
        onClose={() => {
          setPresent(false);
          restoreScroll();
          onModalChange(false);
          trigger.current?.focus();
        }}
      >
        <button
          className="invitation-film-close"
          ref={closeButton}
          onClick={dismiss}
          aria-label="Close film study"
        >
          Close <span aria-hidden="true">×</span>
        </button>
        <h2 id="film-study-heading" className="invitation-study-sr-only">
          {media?.title ?? "Film transition study"}
        </h2>
        <p id="film-study-disclosure" className="invitation-film-disclosure">
          {media?.credit ?? "Motion study / film not produced"}
        </p>
        <AnimatePresence onExitComplete={() => dialog.current?.close()}>
          {present && (
            <motion.div
              key="film-panel"
              className="invitation-film-panel"
              style={{
                transformPerspective: still
                  ? undefined
                  : studyMotion.perspective
              }}
              {...filmPoses(still)}
            >
              {media ? (
                <>
                  {mediaFailed ? (
                    <div className="invitation-film-failure" role="alert">
                      <p>The reference video could not load.</p>
                      <button onClick={() => setMediaFailed(false)}>
                        Try loading again
                      </button>
                    </div>
                  ) : (
                    <video
                      ref={video}
                      src={media.src}
                      controls
                      playsInline
                      preload="metadata"
                      aria-label={media.title}
                      onError={() => setMediaFailed(true)}
                    >
                      {media.captions && (
                        <track
                          kind="captions"
                          src={media.captions.src}
                          srcLang={media.captions.language}
                          label={media.captions.label}
                          default
                        />
                      )}
                    </video>
                  )}
                  {media.transcript && (
                    <details className="invitation-film-transcript">
                      <summary>Read transcript</summary>
                      <p>{media.transcript}</p>
                    </details>
                  )}
                </>
              ) : (
                <div className="invitation-film-empty">
                  <p className="invitation-film-kicker">
                    A few things we believe in
                  </p>
                  <h3 className="my-7 font-teaser-serif text-[clamp(32px,5vw,64px)] font-normal leading-[1.1]">
                    A little experience.
                    <br />A lot left to discover.
                  </h3>
                  <p className="invitation-film-description">
                    This is the entrance and exit treatment, not the film. The
                    voices, footage and permissions are still to be chosen.
                  </p>
                </div>
              )}
              <button
                className="invitation-film-return"
                ref={returnButton}
                onClick={dismiss}
              >
                Back to the study <span aria-hidden="true">↗</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </dialog>
    </>
  );
}
