"use client";
import { CursorStatus, DomCursorOptions, useDomCursor } from "@/components/core/cursorWrapper";
import { cn } from "@/lib/utils";
import { HTMLMotionProps } from "motion/react";
import * as m from "motion/react-m";
import {
  type ComponentProps,
  type ComponentPropsWithRef,
  MouseEventHandler,
  type RefAttributes,
  useCallback
} from "react";
import { CopyButton as ArcCopyButton } from "@/components/arc/copy-button/copy-button";
import {ActionButton as ArcActionButton} from "@/components/arc/action-button/action-button";
type MotionBtnProps = HTMLMotionProps<"button">;

export { Button, MotionButton } from "./base";

export const MotionPillButton = ({
  size = "sm",
  inverted = false,
  hover = false,
  leaveCondition: lc,
  enterCondition: ec,
  ...props
}: {
  size?: "sm" | "md" | "lg";
  inverted?: boolean;
  hover?: boolean;
} & Partial<
  Pick<DomCursorOptions<HTMLButtonElement>, "enterCondition" | "leaveCondition">
> &
  MotionBtnProps) => {
  const {
    onClick,
    disabled,
    onMouseLeave: doML,
    onMouseEnter: doME,
    className,
    ...rest
  } = props;
  const { onMouseEnter, onMouseLeave } = useDomCursor<HTMLButtonElement>({
    onEnter: (e) => {
      doME?.(e);
    },
    enterCondition: (e) =>
      (!!ec && ec(e)) || (disabled ? null : ("FOCUS" as CursorStatus)),

    onLeave: (e) => {
      doML?.(e);
    },
    ...(!lc
      ? {}
      : {
          leaveCondition: lc
        })
  });

  return (
    // Native disabled, so a disabled pill takes no clicks and callers' disabled: variants apply; aria-disabled
    // stays for its existing readers (the cursor wrapper, aria-disabled selectors).
    <m.button
      disabled={disabled}
      aria-disabled={disabled}
      className={cn(
        `flex appearance-none items-center justify-center overflow-hidden border-[1px] border-transparent px-[1.2rem] text-sm leading-[2] font-light tracking-[-0.01em] backdrop-blur-[2.4rem] outline-none [text-decoration:none] hover:bg-transparent data-[hover=true]:bg-transparent max-md:px-[1.4rem]`,
        size === "sm"
          ? "h-[2.4rem] rounded-[2.4rem] max-md:h-[2rem] max-md:rounded-[2rem]"
          : size === "md"
            ? "h-[3.2rem] rounded-[3.2rem] max-md:h-[2.56rem] max-md:rounded-[2.56rem]"
            : "h-[3.6rem] rounded-[3.6rem] text-3xl max-md:h-[2.56rem] max-md:rounded-[2.88rem]",
        className
      )}
      data-hover={hover}
      onClick={onClick}
      {...rest}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    />
  );
};
export const MotionPill = ({
  size = "sm",
  inverted = false,
  hover = false,
  disabled = false,
  className,
  onClick: onClickProp,
  onMouseEnter: doME,
  onMouseLeave: doML,
  ...props
}: HTMLMotionProps<"div"> & {
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  inverted?: boolean;
  hover?: boolean;
}) => {
  const { onMouseEnter, onMouseLeave } = useDomCursor<HTMLDivElement>({
    onEnter: (e) => {
      doME?.(e);
    },
    enterCondition: () => (disabled ? null : "FOCUS"),
    onLeave: (e) => {
      doML?.(e);
    }
  });
  const onClick: MouseEventHandler<HTMLDivElement> = useCallback(
    (e) => {
      const t = e.currentTarget as HTMLDivElement;
      const isD = t.getAttribute("data-disabled");
      if (isD === null || isD === "true") return;
      onClickProp?.(e);
    },
    [onClickProp]
  );
  return (
    <m.div
      className={cn(className)}
      data-disabled={disabled}
      data-hover={hover}
      onClick={onClick}
      {...props}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    />
  );
};
export const PillButton = ({
  size = "sm",
  inverted = false,
  className,
  ...props
}: {
  size?: "sm" | "md" | "lg";
  inverted?: boolean;
} & ComponentPropsWithRef<"button">) => {
  const {
    onClick,
    disabled,
    onMouseLeave: doML,
    onMouseEnter: doME,
    ref,
    ...rest
  } = props;
  const { onMouseEnter, onMouseLeave } = useDomCursor<HTMLButtonElement>({
    onEnter: doME,
    enterCondition: () => (disabled ? null : "FOCUS"),
    onLeave: doML
  });
  return (
    <button
      disabled={disabled}
      className={cn(
        `flex appearance-none items-center justify-center overflow-hidden border border-solid px-[1.4rem] text-sm leading-[2] font-light tracking-[-0.01em] backdrop-blur-[2.4rem] transition-[border-color,background-color,padding] duration-200 outline-none [text-decoration:none] md:px-[1.2rem]`,

        {
          "h-[2rem] rounded-[2rem] md:h-[2.4rem] md:rounded-[2.4rem]":
            size === "sm"
        },
        {
          "h-[2.56rem] rounded-[2.56rem] md:h-[3.2rem] md:rounded-[3.2rem]":
            size === "md"
        },
        {
          "h-[2.88rem] rounded-[2.88rem] text-3xl md:h-[3.6rem] md:rounded-[3.6rem]":
            size === "lg"
        },
        inverted ? "text-background/90" : "text-foreground/90",
        className
      )}
      onClick={onClick}
      ref={ref as RefAttributes<HTMLButtonElement>["ref"]}
      {...rest}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    />
  );
};
export function CopyButton({
  variant = "outline",
  className,
  ...props
}: ComponentProps<typeof ArcCopyButton>) {
  return (
    <ArcCopyButton
      variant={variant}
      {...props}

      // The same keyboard ring as Button's filled variants: 2 px, 2 px out, the text colour of the page.
      className={cn("focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground", className)}
    />
  );
}

export function ActionButton({
  className,
  ...props
}: ComponentProps<typeof ArcActionButton>) {
  return (
    <ArcActionButton
      {...props}
      className={cn(
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
        className
      )}
    />
  );
}