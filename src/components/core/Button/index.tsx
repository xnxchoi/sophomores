"use client";
import {
  CursorStatus,
  DomCursorOptions,
  useDomCursor
} from "@/components/core/cursorWrapper";
import { cn } from "@/lib/utils";
import { HTMLMotionProps } from "motion/react";
import * as m from "motion/react-m";
import {
  type ComponentProps,
  type ComponentPropsWithRef,
  MouseEventHandler,
  type RefAttributes,
  useCallback,
  useState
} from "react";
import type { MotionBtnProps } from "@/components/core/Link/types";

export const RP_Btn = (props: ComponentProps<"button">) => {
  const {
    onClick,
    disabled,
    onMouseLeave: doML,
    onMouseEnter: doME,
    ref,
    className,
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
      onClick={onClick}
      ref={ref as RefAttributes<HTMLButtonElement>["ref"]}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={className}
      {...rest}
    ></button>
  );
};
export const MotionBtn = (props: MotionBtnProps) => {
  const {
    onClick,
    disabled,
    onMouseLeave: doML,
    onMouseEnter: doME,
    ref,
    initial,
    animate,
    ...rest
  } = props;
  const { onMouseEnter, onMouseLeave } = useDomCursor<HTMLButtonElement>({
    onEnter: doME,
    enterCondition: () => (disabled ? null : "FOCUS"),
    onLeave: doML
  });

  return (
    <m.button
      disabled={disabled}
      onClick={onClick}
      ref={ref}
      initial={
        initial || {
          opacity: 0
        }
      }
      animate={
        animate || {
          opacity: 1
        }
      }
      {...rest}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    />
  );
};

export function Button(props: ComponentPropsWithRef<"button">) {
  return RP_Btn(props);
}

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
    <m.button
      aria-disabled={disabled}
      className={cn(
        `flex appearance-none items-center justify-center overflow-hidden border-[1px] border-transparent px-[1.2rem] text-sm leading-[2] font-light tracking-[-0.01em] backdrop-blur-[2.4rem] outline-none [text-decoration:none] hover:bg-transparent data-[hover=true]:bg-transparent max-md:px-[1.4rem]`,
        size === "sm"
          ? "h-[2.4rem] rounded-[2.4rem] max-md:h-[2rem] max-md:rounded-[2rem]"
          : size === "md"
            ? "h-[3.2rem] rounded-[3.2rem] max-md:h-[2.56rem] max-md:rounded-[2.56rem]"
            : "h-[3.6rem] rounded-[3.6rem] text-3xl max-md:h-[2.56rem] max-md:rounded-[2.88rem]",
        inverted
          ? "bg-button-background-inverted text-nav-button-inverted/90 hover:border-nav-button-border-inverted/80 data-[hover=true]:border-nav-button-border-inverted/80"
          : "bg-button-background text-nav-button/90 hover:border-nav-button-border/80 data-[hover=true]:border-nav-button-border/80",
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
      className={cn(
        `flex appearance-none items-center justify-center overflow-hidden border-[1px] border-transparent px-[1.2rem] text-sm leading-[2] font-light tracking-[-0.01em] backdrop-blur-[2.4rem] outline-none [text-decoration:none] hover:bg-transparent data-[hover=true]:bg-transparent max-md:px-[1.4rem]`,
        size === "sm"
          ? "h-[2.4rem] rounded-[2.4rem] max-md:h-[2rem] max-md:rounded-[2rem]"
          : size === "md"
            ? "h-[3.2rem] rounded-[3.2rem] max-md:h-[2.56rem] max-md:rounded-[2.56rem]"
            : "h-[3.6rem] rounded-[3.6rem] text-3xl max-md:h-[2.56rem] max-md:rounded-[2.88rem]",
        inverted
          ? "bg-button-background-inverted text-nav-button-inverted/90 hover:border-nav-button-border-inverted/80 data-[hover=true]:border-nav-button-border-inverted/80"
          : "bg-button-background text-nav-button/90 hover:border-nav-button-border/80 data-[hover=true]:border-nav-button-border/80",
        className
      )}
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
  const [isHovered, setHovered] = useState(false);
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
        `flex appearance-none items-center justify-center overflow-hidden border border-solid border-off-foreground/0 px-[1.4rem] text-sm leading-[2] font-light tracking-[-0.01em] backdrop-blur-[2.4rem] transition-[border-color,background-color,padding] duration-200 outline-none [text-decoration:none] md:px-[1.2rem]`,

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
        inverted
          ? "bg-button-background-inverted text-background/90 hover:border-off-foreground/80"
          : "bg-button-background text-foreground/90 hover:border-off-background/80",
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
