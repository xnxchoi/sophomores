"use client";
import { MotionPillButton } from "@/hideaway/components/core/Button";
import { SPRING_EASE } from "@/hideaway/constants/animations";
import { cn } from "@/lib/utils";
import { useRPStore } from "@/providers/RP_Pro";
import { useTheme } from "@/providers/Theme";
import { usePathname } from "next/navigation";
import { applyDocumentTheme, clearThemedTransitions } from "@/utilities/applyDocumentTheme";
import {
  HTMLMotionProps,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform
} from "motion/react";
import * as m from "motion/react-m";
import {
  MouseEventHandler,
  useCallback,
  useEffect,
  useId,
  useRef
} from "react";
import { useShallow } from "zustand/shallow";

type ElementTypMap = HTMLElementTagNameMap &
  Pick<
    SVGElementTagNameMap,
    Exclude<keyof SVGElementTagNameMap, keyof HTMLElementTagNameMap>
  >;
type ElementTyp = ElementTypMap[keyof ElementTypMap];
type TargetTagMap = Pick<
  ElementTypMap,
  "svg" | "circle" | "span" | "div" | "button" | "rect" | "path"
>;
export type TargetElementType = TargetTagMap[keyof TargetTagMap];

export function isOneOf(c: Element): c is TargetElementType {
  switch (c.tagName) {
    case "SVG":
    case "CIRCLE":
    case "RECT":
    case "PATH":
    case "SPAN":
    case "DIV":
    case "BUTTON":
      return true;
    default:
      return c instanceof HTMLElement;
  }
}

export const DarkmodeButton = ({
  ref,
  style,
  onClick: onClickFromProps,
  ...props
}: HTMLMotionProps<"button">) => {
  const navIsOpen = useRPStore(useShallow((l) => l.navIsOpen));
  const theme = useTheme(useShallow((r) => r.theme));
  const togggleTheme = useTheme((r) => r.toggleTheme);
  const locked = useTheme((r) => r.locked);
  const toRef = useRef<ReturnType<typeof setTimeout>>(null!);

  // Cauterization: Voyageur isHome and is404 are not imported.
  const pathname = usePathname() || "/";
  const is404 = pathname === "/404";
  const isHome = pathname === "/" || pathname === "/home";
  const themeValue = useMotionValue(theme);

  const themeToDarkTransform = useTransform(() =>
    themeValue.get() === "dark" ? 0 : (105 as number)
  );
  const themeToLightTransform = useTransform(() =>
    themeValue.get() === "dark" ? -105 : (0 as number)
  );
  const _darkY = useSpring(themeToDarkTransform, {
      visualDuration: 0.2,
      ...SPRING_EASE.power3.out
    }),
    _lightY = useSpring(themeToLightTransform, {
      visualDuration: 0.2,
      ...SPRING_EASE.power3.out
    });
  const darkY = useMotionTemplate`${_darkY}%`,
    lightY = useMotionTemplate`${_lightY}%`;
  useEffect(() => {
    if (toRef.current) clearTimeout(toRef.current);
    themeValue.set(theme);
    toRef.current = setTimeout(() => {
      clearThemedTransitions(document.documentElement);
    }, 220);
    return () => {
      if (toRef.current) clearTimeout(toRef.current);
    };
  }, [theme, themeValue]);

  const uid = useId();
  const onClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    (e) => {
      const enabled = !e.currentTarget.disabled;
      if (enabled) {
        applyDocumentTheme(document.documentElement, theme === "dark" ? "light" : "dark", {
          armTransitions: true
        });
        togggleTheme();
        onClickFromProps?.(e);
      }
    },
    [onClickFromProps, theme, togggleTheme]
  );
  return (
    (navIsOpen || (!isHome && !is404)) && (
      <MotionPillButton
        key={uid}
        initial={{
          opacity: 0,
          visibility: "hidden"
        }}
        animate={{
          opacity: 1,
          visibility: "visible"
        }}
        exit={{
          opacity: 0,
          visibility: "hidden"
        }}
        disabled={locked}
        className={cn(
          "circ-bt theme-toggle-btn hover:border-current! hover:bg-transparent!",
          { hover: navIsOpen }
        )}
        ref={ref}
        data-themed="background-color,border-color,color"
        aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode.`}
        onClick={onClick}
        style={{
          ...style
        }}
        {...props}
      >
        <m.span
          className={cn(
            "absolute top-0 left-0 m-0 flex h-full w-full items-center justify-center"
          )}
          style={{
            y: lightY,
            color: "inherit"
          }}
        >
          <m.svg className="w-[12px] max-lg:w-[14px]" viewBox="0 0 12 12">
            <path
              d="M1.39091 9.86727L2.16 10.6364L3.14182 9.66L2.36727 8.88546M6 2.72727C4.19455 2.72727 2.72727 4.19455 2.72727 6C2.72727 7.80545 4.19455 9.27273 6 9.27273C7.80545 9.27273 9.27273 7.80545 9.27273 6C9.27273 4.18909 7.80545 2.72727 6 2.72727ZM10.3636 6.54545H12V5.45455H10.3636M8.85818 9.66L9.84 10.6364L10.6091 9.86727L9.63273 8.88546M10.6091 2.18182L9.84 1.41818L8.85818 2.39455L9.63273 3.16909M6.54545 0H5.45455V1.63636H6.54545M3.14182 2.39455L2.16 1.41818L1.39091 2.18182L2.36727 3.16909L3.14182 2.39455ZM0 6.54545H1.63636V5.45455H0M6.54545 10.3636H5.45455V12H6.54545"
              fill="currentColor"
            />
          </m.svg>
        </m.span>
        <m.span
          className={cn(
            "absolute top-0 left-0 m-0 flex h-full w-full items-center justify-center",
            "toggle-icon-svg-lights"
          )}
          style={{
            y: darkY,
            color: "inherit"
          }}
        >
          <m.svg className="w-[7px] max-lg:w-[8px]" viewBox="0 0 7 10">
            <path
              d="M0.333986 9.71549C2.27597 9.0291 3.66732 7.17703 3.66732 5C3.66732 2.82297 2.27597 0.970903 0.333984 0.284509C0.855283 0.100257 1.41626 0 2.00065 0C4.76207 0 7.00065 2.23858 7.00065 5C7.00065 7.76142 4.76207 10 2.00065 10C1.41626 10 0.855285 9.89974 0.333986 9.71549Z"
              fillRule="evenodd"
              clipRule={"evenodd"}
              fill="currentColor"
            />
          </m.svg>
        </m.span>
      </MotionPillButton>
    )
  );
};
