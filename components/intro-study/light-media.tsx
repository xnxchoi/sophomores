"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

const StudyLight = dynamic(
  () =>
    import("../invitation-study/study-light").then(
      (module) => module.StudyLight
    ),
  { ssr: false }
);

interface Props {
  readonly reference: boolean;
  readonly source: string;
  readonly loadVideo: boolean;
  readonly playVideo: boolean;
  readonly paused: boolean;
  readonly visible: boolean;
}

export function LightMedia({
  reference,
  source,
  loadVideo,
  playVideo,
  paused,
  visible
}: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const useVideo = reference && loadVideo && !failed;

  useEffect(() => {
    const element = video.current;
    if (!element || !useVideo) return;
    let active = true;
    if (playVideo) {
      void element
        .play()
        .then(() => {
          if (active) setBlocked(false);
        })
        .catch(() => {
          if (active) setBlocked(true);
        });
    } else element.pause();
    return () => {
      active = false;
      element.pause();
    };
  }, [useVideo, playVideo, source]);

  return (
    <>
      {useVideo ? (
        <video
          ref={video}
          className="intro-study__video"
          src={source}
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          onError={() => setFailed(true)}
        />
      ) : (
        <StudyLight paused={paused || !loadVideo} visible={visible} />
      )}
      {failed && reference && (
        <p className="intro-study__media-note" role="status">
          Reference footage unavailable. Showing the current Sophomores light.
        </p>
      )}
      {blocked && useVideo && (
        <button
          className="intro-study__media-note"
          onClick={() => {
            void video.current
              ?.play()
              .then(() => setBlocked(false))
              .catch(() => setBlocked(true));
          }}
        >
          Play reference light
        </button>
      )}
    </>
  );
}
