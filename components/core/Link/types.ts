import type { HA_ButtonProps as ButtonProps } from "@/components/ui/button";
import { Flatten } from "@/utilities/typeUtilities";
import { Header } from "@payload-types";
import type { HTMLMotionProps } from "motion/react";
import type { LinkProps as NextLinkProps } from "next/link";
import { DataFromCollectionSlug } from "payload";
import { type ComponentProps, ReactNode, RefObject } from "react";

export type LinkedCollectionSlug = NonNullable<Flatten<Header["navItems"]>["link"]["reference"]>["relationTo"];
export type LinkReference<T extends LinkedCollectionSlug = LinkedCollectionSlug> = {
  relationTo: T; value: string | DataFromCollectionSlug<T>;
};
export type PayloadLinkProps<T extends "reference" | "custom" = "reference" | "custom"> = {
  url?: null | string; newTab?: boolean; label?: string; appearance?: "default" | "outline" | null; type: T;
} & (T extends "reference" ? {
  reference: LinkReference;
} : T extends "custom" ? {
  reference?: null;
} : never);
type AllowedTags = HTMLAnchorElement | HTMLSpanElement | HTMLDivElement;
type NativePropsA = Omit<ComponentProps<"a">, keyof NextLinkProps | "href">;
export type RPLinkProps = NativePropsA & Omit<NextLinkProps, "href"> & {
  href: string;
};

export type RPLinkPropsWithRef = RPLinkProps & {
  disabled?: boolean;
};
export type MotionBtnProps = HTMLMotionProps<"button">;
type VB = Partial<Omit<RPLinkProps, keyof ComponentProps<"button">|keyof RPLinkProps>>
export type CMSLinkBase = ({
  label?: string;
} & VB & { link: PayloadLinkProps }) & ((ComponentProps<'button'> & {
  button: true;
  variant: ButtonProps["variant"];
  size: ButtonProps["size"];
  children?:ReactNode;

}) | ({
  button?: false;
}&RPLinkProps));
