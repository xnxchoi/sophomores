"use client";

import { useDomCursor } from "@/components/core/cursorWrapper";
import type { LinkProps as NextLinkProps } from "next/link";
import { cn } from "@/lib/utils";
import { isInternalLink } from "@/utilities/isInternalLink";
import { useLenis } from "lenis/react";
import * as m from "motion/react-m";
import { Link as NextLink } from "next-transition-router";
import { usePathname } from "next/navigation";

import {
  type ComponentProps,
  MouseEventHandler,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef
} from "react";
import { useTransitionSetter } from "@/components/UX/Transition/useTransitionSetter";

type NativePropsA = Omit<ComponentProps<"a">, keyof NextLinkProps | "href">;
export type RPLinkProps = NativePropsA &
  Omit<NextLinkProps, "href"> & {
    href: string;
  };

export type RPLinkPropsWithRef = RPLinkProps & {
  disabled?: boolean;
};

const LOSTINSEOUL_PATH_PREFIX = "/lostinseoul";

const normalizePath = (path: string) => path.replace(/\/+$/, "") || "/";

export const isLostInSeoulPathNavigation = ({
  currentPath,
  href,
  isAnchor
}: {
  currentPath: string | null;
  href: string;
  isAnchor: boolean;
}) => {
  if (!isInternalLink(href) || isAnchor) return false;

  const target = new URL(href, "http://localhost");
  const targetPath = normalizePath(target.pathname);
  const activePath = normalizePath(currentPath || "/");

  return (
    activePath.startsWith(LOSTINSEOUL_PATH_PREFIX) &&
    targetPath.startsWith(LOSTINSEOUL_PATH_PREFIX) &&
    targetPath !== activePath
  );
};

/** Same-page hash targets: "#id" or this path plus "#id". */
const isAnchorHref = (href: string, currentPath: string | null) =>
  href.startsWith("#") || (currentPath !== null && href.startsWith(`${currentPath}#`));

/** Web links off this site open in a new tab; mailto:, tel: and other schemes hand off in place. */
const isExternalWebHref = (href: string) => !isInternalLink(href) && /^(https?:)?\/\//i.test(href);

/**
 * The site's link: the custom cursor, the page transition for in-site navigation, and Lenis scrolling for hash links.
 * A click the browser should handle itself (a modifier key or middle button, target="_blank", download, a link off the
 * site, mailto: or tel:) gets no transition.
 */
export function Link(props: RPLinkPropsWithRef) {
  const {
    href,
    onClick,
    onMouseLeave: doML,
    onMouseEnter: doME,
    className,
    disabled = false,
    ...rest
  } = props;

  const lenis = useLenis();
  const currentPath = usePathname();
  const { isActivePath } = useLinkPaths({ href });
  const isAnchor = Boolean(href) && isAnchorHref(href, currentPath);
  const external = Boolean(href) && isExternalWebHref(href);
  const isActivePathRef = useRef(isActivePath);
  const disabledRef = useRef(disabled);
  useEffect(() => {
    isActivePathRef.current = isActivePath;
  }, [isActivePath]);
  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  const { onMouseEnter, onMouseLeave } = useDomCursor({
    onEnter: doME,
    onLeave: doML,
    enterCondition: () =>
      disabledRef.current ? null : isActivePathRef.current ? "#here" : "FOCUS"
  });

  const { goToPage, setGenericPageTransition } = useTransitionSetter();
  const isLostInternalNavigation = Boolean(href) && isLostInSeoulPathNavigation({ currentPath, href, isAnchor });

  const handleClick: MouseEventHandler<HTMLAnchorElement> = useCallback(
    (e) => {
      onClick?.(e);
      if (e.defaultPrevented) return;
      const link = e.currentTarget;
      const browserHandles =
        e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0 ||
        (link.target !== "" && link.target !== "_self") || link.hasAttribute("download") || !isInternalLink(href);
      if (browserHandles) return;
      if (isAnchor) {
        e.preventDefault();
        const id = decodeURIComponent(href.slice(href.indexOf("#") + 1));
        // Lenis where the site scroll runs it; elsewhere ((nfc), (auth)) the page scrolls itself.
        if (lenis) lenis.scrollTo(id ? `#${CSS.escape(id)}` : 0);
        else if (id) document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
        else window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (isLostInternalNavigation) {
        e.preventDefault();
        goToPage(href);
      } else {
        setGenericPageTransition(href);
      }
    },
    [onClick, isAnchor, lenis, href, isLostInternalNavigation, goToPage, setGenericPageTransition]
  );
  if (!href || typeof href !== "string") {
    return <div className={className}>{props.children}</div>;
  }

  return (
    <NextLink
      className={className}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      {...rest}
      href={href}
      aria-disabled={disabled || rest["aria-disabled"] || undefined}
      tabIndex={disabled ? -1 : rest.tabIndex}
      onClick={
        disabled
          ? (e) => {
              e.preventDefault();
            }
          : handleClick
      }
      onMouseEnter={disabled ? void 0 : onMouseEnter}
      onMouseLeave={disabled ? void 0 : onMouseLeave}
    />
  );
}
export const NextMotion = m.create(Link);

export function MotionLink(props: ComponentProps<typeof NextMotion>) {
  return <NextMotion {...props} />;
}

export function LinkUnderlined(
  props: RPLinkPropsWithRef & {
    children: ReactNode;
  }
) {
  const { href, children, className, ...rest } = props;
  return (
    <span className="group relative mx-1 inline-flex items-center justify-center p-0">
      <Link
        href={href}
        className={cn(
          "ease rounded-xs no-underline decoration-0 transition-colors duration-200 hover:text-deep-cinnabar focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current",
          className
        )}
        {...rest}
      >
        {children}
      </Link>
      <span className="ease absolute bottom-[1px] left-0 z-0 h-[1px] w-full origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100"></span>
      <span className="ease absolute bottom-[1px] left-0 z-0 h-px w-full origin-right scale-x-100 transition-transform duration-300 group-hover:scale-x-0"></span>
    </span>
  );
}

/** The link's path and whether it is the current page ("/" and "/home" count as one). Computed in render. */
export const useLinkPaths = ({ href }: { href: string }) => {
  const path = useMemo(() => (href ? new URL(href, "http://localhost").pathname : ""), [href]);
  const currentPath = usePathname();
  const isActivePath =
    path === "/" || path === "/home" ? currentPath === "/" || currentPath === "/home" : path === currentPath;
  return {
    path,
    isActivePath
  };
};
