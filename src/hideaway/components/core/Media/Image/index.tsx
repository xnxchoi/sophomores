"use client";

import { getPayloadImageProps } from "@/hideaway/components/core/Media/Image/getPayloadImageProps";
import { breakString } from "@/cssVariables";
import { cn } from "@/lib/utils";
import { RenderImageFields } from "@/types/collections/image-collections";
import { HTMLMotionProps } from "motion/react";
import * as m from "motion/react-m";
import type { StaticImport } from "next/dist/shared/lib/get-img-props";
import type { ImageProps } from "next/image";
import NextImage from "next/image";
import { type FC, ReactNode, type Ref, useMemo } from "react";
import type { AspectRatio, MediaProps } from "../types";
import { useAspectRatio } from "./useAspectRatio";

// A base64 encoded image to use as a placeholder while the image is loading
const placeholderBlur =
  "data:image/png;base64,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";
export const RootImage = ({
  resource,
  priority,
  className,
  fill,
  loading: loadingFromProps,

  width: w,
  height: h,
  ...rest
}: Omit<ImageProps, "alt" | "src" | "resource" | "fill" | "sizes"> & {
  resource: RenderImageFields;
  fill?: boolean;
}) => {
  const width = fill ? undefined : w || 100;
  const height = fill ? undefined : h || 100;

  const loading = loadingFromProps || (!priority ? "lazy" : undefined);
  const { src, alt, sizes } = useMemo(
    () =>
      getPayloadImageProps({
        ...resource
      }),
    [resource]
  );
  return src ? (
    <NextImage
      className={className}
      {...rest}
      src={typeof src === "string" ? decodeURIComponent(src) : src}
      fill={fill}
      loading={loading}
      alt={alt}
      sizes={sizes}
      width={width}
      height={height}
    />
  ) : null;
};
export const ImageMedia: FC<
  Omit<MediaProps, "ref" | "src"> & {
    figureClassName?: string;
    src: StaticImport | string;
    ref?: Ref<HTMLImageElement>;
  }
> = (props) => {
  const {
    fill: fillFromProps,
    className,
    caption,
    figureClassName,
    captionClassName,
    src,
    priority,
    resource,
    onLoad,
    aspectRatio,
    size: sizeFromProps,
    loading: loadingFromProps,
    imgClassName,
    pictureClassName,
    ...rest
  } = props;
  const resourceOb = typeof resource === "object" && !!resource;
  const fenderImageRields = useMemo((): {
    alt: string;
  } & (
    | {
        width?: undefined;
        height?: undefined;
        fill?: true;
      }
    | {
        width: number;
        height: number;
        fill?: false;
      }
  ) => {
    const base: {
      alt: string;
    } = {
      alt:
        (typeof resource === "object" &&
          !!resource &&
          typeof resource.value !== "string" &&
          !!resource.value &&
          resource.value.alt) ||
        ""
    };
    if (!resource || typeof resource === "string") {
      return {
        ...base,
        fill: true
      };
    }
    if (typeof resource.value === "string") {
      return {
        ...base,
        fill: true
      };
    }
    const q = resource.value?.width || 0,
      c = resource.value?.height || 0;

    return (
      (q &&
        c &&
        q > 0 &&
        c > 0 &&
        ({
          ...base,
          width: q,
          height: c
        } as {
          width: number;
          height: number;
          alt: string;
        })) || {
        ...base,
        fill: true
      }
    );
  }, [resource]);

  const loading = loadingFromProps || (!priority ? "lazy" : undefined);
  // NOTE: this is used by the browser to determine which image to download at different screen sizes
  const sizes = sizeFromProps ? sizeFromProps : breakString;

  const baseclass = "relative min-h-px min-w-px";
  return (
    <figure className={cn("contents", figureClassName)} style={{ margin: 0 }}>
      {src &&
        (aspectRatio ? (
          <ResponsiveFrame
            baseClass={baseclass}
            className="w-full overflow-hidden"
            pictureClassName={pictureClassName}
            aspectRatio={aspectRatio}
          >
            <NextImage
              className={cn(
                "absolute inset-0 w-full max-w-full border-0 object-cover backface-hidden"
              )}
              onLoad={onLoad}
              {...rest}
              fill={true}
              priority={priority}
              loading={loading}
              sizes={sizes}
              src={typeof src === "string" ? decodeURIComponent(src) : src}
              {...fenderImageRields}
            />
          </ResponsiveFrame>
        ) : (
          <m.div
            className={cn(
              baseclass,
              "h-full",
              pictureClassName,
              "overflow-hidden"
            )}
          >
            <NextImage
              className={cn(
                "absolute h-auto w-full max-w-full border-0 object-cover object-center backface-hidden"
              )}
              onLoad={onLoad}
              {...rest}
              fill={true}
              priority={priority}
              loading={loading}
              sizes={sizes}
              src={typeof src === "string" ? decodeURIComponent(src) : src}
              {...fenderImageRields}
            />
          </m.div>
          // <NoARMedia
          //     baseClass={baseclass}
          //     pictureClassName={pictureClassName}
          //     onLoad={onLoad}
          //     size={sizes}
          //     priority={priority}
          //     loading={loading}
          //     src={src}
          //     {...fenderImageRields}
          //   />
        ))}

      {caption && (
        <figcaption
          data-dark={false}
          className={cn(
            "right-[.5em] bottom-[.05em] flex h-[1em] w-full items-center justify-end bg-transparent p-[1.5em] underline",
            "text-foreground",
            captionClassName
          )}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  );
};
type ProcessedMediaProps = Omit<
  MediaProps,
  "resource" | "className" | "caption" | "captionClassName" | "src"
> & {
  src: StaticImport | string;
  alt: string;
  darkmode?: boolean;
  width?: number;
  height?: number;
  baseClass: string;
  aspectRatio?: AspectRatio;
};
const ResponsiveFrame = ({
  aspectRatio,
  children,
  pictureClassName,
  baseClass,
  className,
  style,
  ...rest
}: {
  baseClass: string;
  pictureClassName?: string;
  aspectRatio: AspectRatio;
} & HTMLMotionProps<"div">) => {
  const { paddingTop } = useAspectRatio(aspectRatio);
  return (
    <m.div
      className={cn(
        baseClass,
        pictureClassName,
        "w-full",
        className,
        "overflow-hidden"
      )}
      style={{ ...style, paddingTop }}
      {...rest}
    >
      {children}
    </m.div>
  );
};
// const ARMedia = (props: ProcessedMediaProps & { aspectRatio: AspectRatio }) => {
//   const {
//     src,
//     pictureClassName,
//     alt,
//     fill,
//     baseClass,
//     imgClassName,
//     onLoad,
//     priority,
//     darkmode,
//     size,
//     loading,
//     ref,
//     aspectRatio,
//     ...rest
//   } = props;
//   const { paddingTop } = useAspectRatio(aspectRatio);
//   return (
//     <m.div
//       className={cn(baseClass, pictureClassName, "w-full")}
//       style={{ paddingTop }}
//     >
//       <picture>
//         <NextImage
//           alt={alt}
//           className={cn(
//             "inset-0 w-full max-w-full border-0 object-cover backface-hidden",
//             imgClassName
//           )}
//           onLoad={onLoad}
//           fill={fill}
//           priority={priority}
//           quality={100}
//           loading={loading}
//           unoptimized={true}
//           sizes={size}
//           src={typeof src === "string" ? toRelativeIfSameOrigin(decodeURIComponent(src)) : src}
//           {...rest}
//         />
//       </picture>
//     </m.div>
//   );
// };
// const NoARMedia = (props: Omit<ProcessedMediaProps, "aspectRatio">) => {
//   const {
//     src,
//     alt,
//     fill,
//     imgClassName,
//     baseClass,
//     pictureClassName,
//     onLoad,
//     priority,
//     darkmode,
//     size,
//     loading,
//     ref,
//     ...rest
//   } = props;
//
//   return (
//     <m.div className={cn(baseClass, "h-full", pictureClassName)}>
//       <picture>
//         <NextImage
//           alt={alt}
//           className={cn(
//             "h-auto w-full max-w-full border-0 object-cover object-center backface-hidden",
//             imgClassName
//           )}
//           onLoad={onLoad}
//           fill={true}
//           priority={priority}
//           unoptimized={true}
//           quality={100}
//           loading={loading}
//           sizes={size}
//           src={typeof src === "string" ? toRelativeIfSameOrigin(decodeURIComponent(src)) : src}
//           {...rest}
//         />
//       </picture>
//     </m.div>
//   );
// };
