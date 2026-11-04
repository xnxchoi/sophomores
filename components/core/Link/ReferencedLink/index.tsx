import { Link } from "@/components/core/Link/Link";
import { getUrlFromReference } from "@/components/core/Link/ReferencedLink/getUrlFromReference";
import { CMSLinkBase } from "@/components/core/Link/types";
import { HA_Button as Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ComponentProps } from "react";

export const ReferencedLink = async (props: CMSLinkBase) => {
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
      href = await getUrlFromReference({
        ...reference,
        value: a
      });
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
