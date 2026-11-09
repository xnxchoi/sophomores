import type { HA_ButtonProps as ButtonProps } from "@/components/ui/button";
import type { HTMLMotionProps } from "motion/react";
import type { LinkProps as NextLinkProps } from "next/link";
import { type ComponentProps, ReactNode } from "react";

/** A document pointer. Collection lookup is supplied later as a resolver. */
export type LinkReference = {
  relationTo: string;
  value: string | { id: string };
};

export type PayloadLinkProps<T extends "reference" | "custom" = "reference" | "custom"> = {
  url?: null | string;
  newTab?: boolean;
  label?: string;
  appearance?: "default" | "outline" | null;
  type: T;
} & (T extends "reference"
  ? { reference: LinkReference }
  : T extends "custom"
    ? { reference?: null }
    : never);

type NativePropsA = Omit<ComponentProps<"a">, keyof NextLinkProps | "href">;
export type RPLinkProps = NativePropsA &
  Omit<NextLinkProps, "href"> & {
    href: string;
  };

export type RPLinkPropsWithRef = RPLinkProps & {
  disabled?: boolean;
};
export type MotionBtnProps = HTMLMotionProps<"button">;
type VB = Partial<Omit<RPLinkProps, keyof ComponentProps<"button"> | keyof RPLinkProps>>;
export type CMSLinkBase = ({
  label?: string;
} & VB & { link: PayloadLinkProps }) &
  (
    | (ComponentProps<"button"> & {
        button: true;
        variant: ButtonProps["variant"];
        size: ButtonProps["size"];
        children?: ReactNode;
      })
    | ({
        button?: false;
      } & RPLinkProps)
  );
