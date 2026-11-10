import { Link } from "../Link";
import type { RPLinkProps } from "../Link";
import type { HA_ButtonProps as ButtonProps } from "@/components/ui/button";
import type { ReactNode } from "react";
import { HA_Button as Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ComponentProps } from "react";

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

export type ReferenceTarget = {
  relationTo: string;
  value: string;
};

/** Turns a collection document into a site path. Not installed yet. */
export type ReferenceUrlResolver = (
  reference: ReferenceTarget
) => Promise<string | null> | string | null;


export const ReferencedLink = async (
  props: CMSLinkBase & { resolveReference?: ReferenceUrlResolver }
) => {
  const {
    button,
    link,
    children,
    className,
    onClick,
    onMouseEnter,
    onMouseLeave,
    ref,
    label,
    resolveReference,
    ...rest
  } = props;
  let href: null | undefined | string = null;
  const { type, reference, url } = link;
  switch (type) {
    case "reference": {
      if (!reference) return null;
      const a =
        typeof reference.value === "string"
          ? reference.value
          : reference.value.id;
      href = resolveReference
        ? await resolveReference({ relationTo: reference.relationTo, value: a })
        : null;
      break;
    }
    case "custom": {
      url && (href = url);
      break;
    }
  }
  if (!href)
    return (
      <div>
        {label && label}
        {children && children}
      </div>
    );

  if (button) {
    const propsToPass = { ...rest } as Omit<
      ComponentProps<"button">,
      | "button"
      | "link"
      | "children"
      | "className"
      | "onClick"
      | "onMouseEnter"
      | "onMouseLeave"
      | "ref"
      | "label"
    >;
    return (
      <Button
        asChild
        {...propsToPass}
        className={className}
        size={props.size}
        variant={props.variant}
        ref={ref}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        type="button"
      >
        <Link className={className} href={href}>
          {label && label}
          {children && children}
        </Link>
      </Button>
    );
  }
  const propsToPass = { ...rest } as Omit<
    ComponentProps<typeof Link>,
    | "link"
    | "children"
    | "className"
    | "onClick"
    | "onMouseEnter"
    | "onMouseLeave"
    | "ref"
    | "href"
    | "label"
  >;
  return (
    <Link className={cn(className)} href={href} {...propsToPass}>
      {label && label}
      {children && children}
    </Link>
  );
};
