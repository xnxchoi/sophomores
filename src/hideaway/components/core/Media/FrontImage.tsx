"use client";

import { ImageMedia } from "./Image";
import type { MediaResource, MediaProps } from "./types";
import { cn } from "@/lib/utils";
import { processFetchedImage } from "@/blocks/ImageBlock/Comp/hooks/image-processors";
import { useCursor } from "@/hideaway/providers/RP_Pro";
import {
  FetchedImageDoc,
  ImageCollectionSlug,
  RalueWithRelation,
  RenderImageFields
} from "@/types/collections/image-collections";
import { imageSelect } from "@/types/payload-api-selects";

import { getFallbackImage } from "@/hideaway/utilities/getFallbackImage";
import { getClientSideURL } from "@/hideaway/utilities/getURL";
import { useQuery } from "@tanstack/react-query";
import { nanoid } from "nanoid";
import { stringify } from "qs-esm";
import {
  type Ref,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition
} from "react";
import { Skeleton } from "../../ui/skeleton";

export type FrontImageProps = MediaProps & {
  className?: string;
  isUser?: boolean;
};
export const FrontImage = (props: FrontImageProps) => {
  const {
    resource: image,
    imgClassName,
    className,
    src,
    isUser,
    ...rest
  } = props;
  const hashId = useMemo(() => nanoid(), []);
  return image ? (
    <QueriedImage
      resource={image}
      className={className}
      imgClassName={imgClassName}
      collection={isUser ? "userMedia" : "assets"}
      {...rest}
    />
  ) : !!src ? (
    <ImageMedia src={src} {...props} />
  ) : (
    <FallbackImage hashId={hashId} imgClassName={imgClassName} {...rest} />
  );
};

function FallbackImage(
  props: { hashId: string } & Omit<FrontImageProps, "src" | "resource">
) {
  const { hashId, imgClassName, className, aspectRatio, ...rest } = props;
  const [isTransitioning, startTransition] = useTransition();
  const [backupImage, setBackupImage] = useState<{
    path: string;
  } | null>(null);

  const getBackupImage = useCallback(() => {
    startTransition(async () => {
      await getFallbackImage(hashId).then((res) => {
        setBackupImage(res);
      });
    });
  }, [hashId]);
  useEffect(() => {
    getBackupImage();
  }, [getBackupImage]);
  return isTransitioning || !backupImage ? (
    <Skeleton
      className={cn(
        className,
        "block h-full w-full rounded-2xl bg-faded-foreground/20 object-cover"
      )}
    />
  ) : (
    <ImageMedia
      src={backupImage.path}
      className={className || "relative"}
      imgClassName={imgClassName}
      fill={false}
      aspectRatio={aspectRatio}
      {...rest}
    />
  );
}

function QueriedImage(
  props: MediaProps & {
    resource: string | MediaResource | RalueWithRelation;
    collection?: ImageCollectionSlug;
  }
) {
  const {
    imgClassName,
    className,
    aspectRatio,
    collection: initCollection,
    resource: rs,
    ...rest
  } = props;
  const [hover, setHover] = useState<boolean>(false);
  const collection = useMemo(
    () =>
      !!rs && typeof rs === "object"
        ? rs.relationTo
        : initCollection || "assets",
    [initCollection, rs]
  );
  const onEnter = useCallback(() => setHover(true), []);
  const onLeave = useCallback(() => setHover(false), []);
  const setCursorTheme = useCursor((store) => store.setCursorTheme);
  const resetCursorTheme = useCursor((store) => store.resetCursorTheme);
  const [image, setImage] = useState<RenderImageFields | null>(null);
  const tId = useMemo(
    () =>
      typeof rs === "string"
        ? rs
        : typeof rs.value === "string"
          ? rs.value
          : rs.value.id,
    [rs]
  );
  const select = useMemo(() => imageSelect(), []);
  const {
    data: resource,
    isLoading,
    isPending,
    isError,
    isEnabled
  } = useQuery({
    placeholderData: {
      darkmode: false,
      src: "",
      width: 0,
      height: 0,
      caption: ""
    } as RenderImageFields,
    queryKey: [collection, tId],
    queryFn: async () => {
      const res = await fetch(
        `${getClientSideURL()}/api/${collection}/${tId}${stringify({ select }, { addQueryPrefix: true })}`
      );
      if (res.ok) {
        const docc = (await res.json()) as FetchedImageDoc;
        const ress = processFetchedImage(docc);
        const src = ress.src;
        return {
          src,
          width: ress.width,
          height: ress.height,
          caption: ress.caption,
          darkmode: ress.darkmode,
          alt: ress.alt,
          blurDataUrl: ress.blurDataUrl
        } as RenderImageFields;
      }
      throw new Error("Failed to fetch image");
    },

    staleTime: Infinity,
    refetchOnWindowFocus: false,
    gcTime: 1.5 * 60 * 1000
  });
  useEffect(() => {
    if (image) {
      if (hover) {
        setCursorTheme(image.darkmode ? "dark" : "light");
      } else {
        resetCursorTheme();
      }
    }
  }, [hover, image, resetCursorTheme, setCursorTheme]);
  useEffect(() => {
    if (isEnabled) {
      if (!isLoading && !isError && resource) {
        setImage(resource);
      }
    }
  }, [isLoading, isEnabled, resource, isError]);
  return isLoading || isPending || !resource ? (
    <div
      className={"block h-full w-full"}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <Skeleton
        className={cn(
          imgClassName,
          "block h-full w-full rounded-2xl bg-faded-foreground/20 object-cover"
        )}
      />
    </div>
  ) : (
    <ImageMedia
      priority={false}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      loading="lazy"
      className={className || "relative"}
      imgClassName={imgClassName}
      src={typeof resource.src === "string" ? resource.src : resource?.src.src}
      aspectRatio={aspectRatio}
      {...rest}
    />
  );
}
