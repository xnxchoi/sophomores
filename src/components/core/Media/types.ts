import { cssVariables } from "@/cssVariables";
import type {
  FetchedImageDoc,
  ImageCollectionSlug
} from "@types/collections/image-collections";
import type { StaticImport } from "next/dist/shared/lib/get-img-props";
import type {
  ComponentProps,
  ComponentPropsWithoutRef,
  ReactNode
} from "react";

export type ImageCollectionOverview<
  T extends ImageCollectionSlug = ImageCollectionSlug
> = {
  [x in ImageCollectionSlug]: {
    relationTo: x;
    value: FetchedImageDoc | string;
  };
}[T];

export type MediaResource = ImageCollectionOverview;
type CSSVARS = typeof cssVariables;
export type ViewportBreakpoints = CSSVARS["breakpoints"];
export type ViewportSizes = keyof ViewportBreakpoints;

export type AspectRatio =
  | number
  | ({
      [key in ViewportSizes]?: number;
    } & {
      base: number;
    });
export type ImageElProp = Pick<ComponentProps<"img">, "ref"> & {
  htmlElement?: Extract<
    keyof HTMLElementTagNameMap,
    "div" | "span" | "a" | "img" | "figure"
  >;
  loading?: "lazy" | "eager"; // for NextImage only
  priority?: boolean; // for NextImage only
  imgClassName?: string;
  fill?: boolean; // for NextImage only
  size?: string; // for NextImage only
  src?: StaticImport | string;
  pictureClassName?: string;
};
export type VideoElProp = Pick<ComponentProps<"video">, "ref" | "src"> & {
  htmlElement?: Extract<
    keyof HTMLElementTagNameMap,
    "div" | "span" | "a" | "video"
  >;
  videoClassName?: string;
};
export type MediaPropsBase = Omit<
  ComponentPropsWithoutRef<"div">,
  "resource" | "onClick" | "onLoad"
> & {
  captionClassName?: string;
  aspectRatio?: AspectRatio;
  onClick?: () => void;
  onLoad?: () => void;
  caption?: string | ReactNode;
  resource?: MediaResource | string | null;
};
export type MediaElementProps<T extends "video" | "img" = "img"> =
  T extends "img"
    ? ImageElProp & MediaPropsBase
    : T extends "video"
      ? VideoElProp & MediaPropsBase
      : never;

export type MediaProps<T extends "img" | "video" = "img"> =
  MediaElementProps<T>;
//   Omit<MediaElementProps, "videoClassName" | "ref"> & {
//   ref?: Ref<HTMLImageElement>;
// };

type QueriedMediaProps = {
  resource: MediaResource | string;
};
type StaticMediaProps = {
  fill?: boolean; // for NextImage only
  size?: string; // for NextImage only
  loading?: "lazy" | "eager"; // for NextImage only
  priority?: boolean; // for NextImage only

  src: StaticImport | string;
};
