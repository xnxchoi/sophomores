"use client";

import { useDomCursor } from "../cursorWrapper";
import { RPLinkProps, RPLinkPropsWithRef } from "../Link/types";
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
  useRef,
  useState
} from "react";
import { useTransitionSetter } from "../../UX/Transition/useTransitionSetter";

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

const RP_Link = (props: RPLinkPropsWithRef) => {
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
  const isActivePathRef = useRef(isActivePath);
  const disabledRef = useRef(disabled);
  useEffect(() => {
    isActivePathRef.current = isActivePath;
  }, [isActivePath]);
  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  const propsToPass = useMemo(() => {
    const toPass: Partial<RPLinkProps> = {};
    if (!isInternalLink(href)) {
      toPass.target = "_blank";
      toPass.rel = "noreferrer";
    }
    return toPass;
  }, [href]);
  const { onMouseEnter, onMouseLeave } = useDomCursor({
    onEnter: doME,
    onLeave: doML,
    enterCondition: () =>
      disabledRef.current ? null : isActivePathRef.current ? "#here" : "FOCUS"
  });

  const [isAnchor, setIsAnchor] = useState(false);
  useEffect(() => {
    setIsAnchor(href.startsWith("#") || href.startsWith(`${currentPath}#`));
  }, [href, currentPath]);
  const { goToPage, setGenericPageTransition } = useTransitionSetter();
  const isLostInternalNavigation = useMemo(
    () => isLostInSeoulPathNavigation({ currentPath, href, isAnchor }),
    [currentPath, href, isAnchor]
  );

  const handleClick: MouseEventHandler<HTMLAnchorElement> = useCallback(
    (e) => {
      onClick?.(e);
      if (e.defaultPrevented) return;
      if (isAnchor) {
        e.preventDefault();
        lenis && lenis.scrollTo(href);
      } else if (isLostInternalNavigation) {
        e.preventDefault();
        goToPage(href);
      } else {
        setGenericPageTransition(href);
      }
    },
    [
      onClick,
      isAnchor,
      lenis,
      href,
      isLostInternalNavigation,
      goToPage,
      setGenericPageTransition
    ]
  );
  if (!href || typeof href !== "string") {
    return <div className={className}>{props.children}</div>;
  }

  return (
    <NextLink
      className={cn(
        {
          link_hashLink: isAnchor
        },

        className
      )}
      {...propsToPass}
      {...rest}
      href={href}
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
};
export const NextMotion = m.create(RP_Link);

export function MotionLink(props: ComponentProps<typeof NextMotion>) {
  return <NextMotion {...props} />;
}

export function Link(props: RPLinkPropsWithRef) {
  return RP_Link(props);
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
          "ease no-underline decoration-0 transition-colors duration-200 hover:text-red-500",
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

export const useLinkPaths = ({ href }: { href: string }) => {
  const path = useMemo(() => {
    if (!href) {
      return "";
    }
    const url = new URL(href, "http://localhost");
    return url.pathname;
  }, [href]);
  const currentPath = usePathname();
  const [isActivePath, setIsActivePath] = useState(currentPath === path);
  useEffect(() => {
    if (path === "/" || path === "/home") {
      setIsActivePath(["/", "/home"].some((p) => p === currentPath));
    } else {
      setIsActivePath(path === currentPath);
    }
  }, [path, currentPath]);
  return {
    path,
    isActivePath
  };
};
