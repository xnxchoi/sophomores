"use client";

import React, { useEffect, useRef } from "react";

import type { MediaElementProps, MediaProps as MediaProps } from "../types";

import { getMediaUrl } from "@/utilities/getMediaUrl";
import { cn } from "@/lib/utils";

export const VideoMedia: React.FC<MediaElementProps<"video">> = (props) => {
  const { onClick, resource, videoClassName } = props;

  const videoRef = useRef<HTMLVideoElement>(null);
  // const [showFallback] = useState<boolean>()

  useEffect(() => {
    const { current: video } = videoRef;
    if (video) {
      video.addEventListener("suspend", () => {
        // setShowFallback(true);
        // console.warn('Video was suspended, rendering fallback image.')
      });
    }
  }, []);

  if (
    !!resource &&
    typeof resource === "object" &&
    "value" in resource &&
    !!resource.value &&
    typeof resource.value === "object" &&
    "filename" in resource.value &&
    typeof resource.value.filename === "string"
  ) {
    const { filename } = resource.value;

    return (
      <video
        autoPlay
        className={cn(videoClassName)}
        controls={false}
        loop
        muted
        onClick={onClick}
        playsInline
        ref={videoRef}
      >
        <source src={getMediaUrl(`/media/${filename}`)} />
      </video>
    );
  }

  return null;
};
