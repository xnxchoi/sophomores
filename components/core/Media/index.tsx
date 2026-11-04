import { FrontImage } from "@/components/core/Media/FrontImage";
import React, { Fragment, Ref } from "react";

import type { MediaElementProps, MediaProps } from "./types";
import { VideoMedia } from "./VideoMedia";

export const Media: React.FC<MediaProps> = ({ ref, ...props }) => {
  const { className, htmlElement = "div", resource } = props;

  const isVideo =
    !!resource &&
    typeof resource === "object" &&
    !!resource?.value &&
    typeof resource?.value === "object" &&
    typeof resource?.value.mimeType === "string" &&
    /(video\/)?(mp4|wav|avi|webm)/.test(resource.value.mimeType);
  const Tag = (htmlElement as any) || Fragment;

  return (
    <Tag
      {...(htmlElement !== null
        ? {
            className
          }
        : {})}
    >
      {isVideo ? (
        <VideoMedia
          ref={ref as Ref<HTMLVideoElement>}
          {...(props as MediaElementProps<"video">)}
        />
      ) : (
        <FrontImage {...props} />
      )}
    </Tag>
  );
};
