"use client";
import { cn } from "@/lib/utils";
import { Menu } from "@base-ui/react";
import { DotsVerticalIcon } from "@radix-ui/react-icons";
import { useLenis } from "lenis/react";
import { type ComponentProps, useCallback, useMemo } from "react";

export const MenuItem = ({
  children,
  className,
  ...props
}: ComponentProps<typeof Menu.Item>) => {
  return (
    <Menu.Item
      {...props}
      role="button"
      className={cn(
        "flex h-full w-full py-[8px] pr-[32px] pl-[16px] text-sm leading-[16px] text-faded-foreground/90! transition-colors duration-200 ease-out-power2 outline-none select-none before:transition-colors before:duration-200 before:ease-out-power2 hover:text-faded-background data-highlighted:relative data-highlighted:z-0 data-highlighted:text-faded-background! data-highlighted:before:absolute data-highlighted:before:inset-x-[4px] data-highlighted:before:inset-y-0 data-highlighted:before:z-[-1] data-highlighted:before:rounded-sm data-highlighted:before:bg-muted-faded-foreground/30",
        className
      )}
      data-themed="color, border-color, background-color, outline-color,box-shadow"
    >
      {children}
    </Menu.Item>
  );
};
export const MenuSeparator = () => {
  return (
    <Menu.Separator
      className="mx-4 my-1.5"
      style={{
        backgroundImage:
          "linear-gradient(to right, oklch(from var(--faded-fg) l c h/ 0.1) 0%, oklch(from var(--faded-fg) l c h/ .25) 50%, oklch(from var(--faded-fg) l c h/ 0.1) 100%)",
        height: "1px"
      }}
    />
  );
};
export const MenuButton = ({
  children,
  className,
  ...props
}: ComponentProps<typeof Menu.Trigger>) => {
  return (
    <Menu.Trigger
      {...props}
      className={cn(
        "flex h-[40px] appearance-none items-center justify-center gap-1.5 rounded-md border-none bg-transparent px-3.5 text-base font-medium shadow-none outline-none select-none",
        className
      )}
      data-themed="color,border-color, background-color,outline-color,box-shadow"
    >
      {children}
    </Menu.Trigger>
  );
};
export const MenuTrigger = (props: ComponentProps<typeof Menu.Trigger>) => {
  return (
    <MenuButton {...props}>
      <DotsVerticalIcon />
    </MenuButton>
  );
};
export const MenuArrow = (props: ComponentProps<typeof Menu.Arrow>) => {
  return (
    <Menu.Arrow
      {...props}
      className="data-[side=bottom]:top-[-14px] data-[side=left]:right-[-13px] data-[side=left]:rotate-90 data-[side=right]:left-[-13px] data-[side=right]:-rotate-90 data-[side=top]:bottom-[-8px] data-[side=top]:rotate-180"
    >
      <svg width="20" height="10" viewBox="0 1.5 20 8.5" fill="none">
        <path
          d="M9.66437 2.60207L4.80758 6.97318C4.07308 7.63423 3.11989 8 2.13172 8H0V10H20V8H18.5349C17.5468 8 16.5936 7.63423 15.8591 6.97318L11.0023 2.60207C10.622 2.2598 10.0447 2.25979 9.66437 2.60207Z"
          data-themed="fill"
          className="fill-faded-background/40 dark:fill-faded-background/80"
        />
        <path
          d="M8.99542 1.85876C9.75604 1.17425 10.9106 1.17422 11.6713 1.85878L16.5281 6.22989C17.0789 6.72568 17.7938 7.00001 18.5349 7.00001L15.89 7L11.0023 2.60207C10.622 2.2598 10.0447 2.2598 9.66436 2.60207L4.77734 7L2.13171 7.00001C2.87284 7.00001 3.58774 6.72568 4.13861 6.22989L8.99542 1.85876Z"
          data-themed="fill"
          className="fill-muted-faded-foreground/40 dark:fill-none"
        />
        <path
          data-themed="fill"
          d="M10.3333 3.34539L5.47654 7.71648C4.55842 8.54279 3.36693 9 2.13172 9H0V8H2.13172C3.11989 8 4.07308 7.63423 4.80758 6.97318L9.66437 2.60207C10.0447 2.25979 10.622 2.2598 11.0023 2.60207L15.8591 6.97318C16.5936 7.63423 17.5468 8 18.5349 8H20V9H18.5349C17.2998 9 16.1083 8.54278 15.1901 7.71648L10.3333 3.34539Z"
          className="fill-transparent dark:fill-muted-faded-foreground"
        />
      </svg>
    </Menu.Arrow>
  );
};
type MenuPopupProps = ComponentProps<typeof Menu.Popup>;
type BouseEvent = NonNullable<MenuPopupProps["onMouseEnter"]>;
export const MenuPopup = (props: MenuPopupProps) => {
  const {
    children,
    onMouseEnter: oE,
    onMouseLeave: oL,
    className,
    style,
    ...rest
  } = props;
  const lenis = useLenis();
  const onEnter = useCallback(
    (e: Parameters<BouseEvent>[0]) => {
      lenis?.stop();
      oE?.(e);
    },
    [lenis, oE]
  );
  const onLeave = useCallback(
    (e: Parameters<BouseEvent>[0]) => {
      lenis?.start();
      oL?.(e);
    },
    [lenis, oL]
  );
  return (
    <Menu.Popup
      {...rest}
      className={cn(
        "origin-(--transform-origin) rounded-md bg-faded-background/40 px-[24px] py-[16px] text-faded-foreground shadow-sm/25 backdrop-blur-sm transition-[transform,scale,opacity] data-ending-style:scale-90 data-ending-style:opacity-0 data-starting-style:scale-90 data-starting-style:opacity-0 dark:bg-faded-background/80 dark:shadow-md/40 dark:shadow-gray-900/30 dark:-outline-offset-1 dark:outline-muted-faded-foreground/40",
        className
      )}
      data-themed="color, border-color, background-color, outline-color,box-shadow"
      style={{
        zIndex: 10003,
        ...style
      }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {children}
    </Menu.Popup>
  );
};
export const MenuPositioner = ({
  children,
  className,
  align: a,
  sideOffset: _so,
  alignOffset: _ao,
  ...props
}: ComponentProps<typeof Menu.Positioner>) => {
  const { align, alignOffset, sideOffset } = useMemo(() => {
    switch (a) {
      case "end":
        return {
          align: a,
          alignOffset: -78,
          sideOffset: 14
        };
      case "center":
        return {
          alignOffset: 0,
          sideOffset: 14,
          align: a
        };
      default:
        return {
          alignOffset: -78,
          sideOffset: 14,
          align: "start" as const
        };
    }
  }, [a]);
  return (
    <Menu.Positioner
      className={cn("outline-none", className)}
      sideOffset={sideOffset}
      align={align}
      alignOffset={alignOffset}
      {...props}
    >
      {children}
    </Menu.Positioner>
  );
};
