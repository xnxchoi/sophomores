"use client";
import { Link } from "@/hideaway/components/core/Link/Link";
import { FrontImage } from "@/hideaway/components/core/Media/FrontImage";
import { fallback } from "@/hideaway/components/UX/Highlightr/Navigation/fallbacks";
import { useCursor, useFrameState, useRPStore } from "@/hideaway/providers/RP_Pro";
import type { PostOverview } from "@/types/collections/posts";
import { useWindowResize } from "@/hideaway/utilities/use_window_resize";
import { useLenis } from "lenis/react";
import { useMotionValue, useTransform } from "motion/react";
import * as m from "motion/react-m";
import { useCallback, useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/shallow";
import { cn } from "@/lib/utils";

export const PrevNext = ({
  prev: previousPost,
  next: nextPost
}: {
  prev: PostOverview | null;
  next: PostOverview | null;
}) => {
  const [prev, setPreviousPost] = useState(
    previousPost || fallback({ direction: "prev" })
  );
  const [next, setNextPost] = useState(
    nextPost || fallback({ direction: "next" })
  );
  const lastResize = useWindowResize({
    detectVisibilityChange: false,
    detectHeightChange: true,
    debounce: 100
  });
  const resetCursorTheme = useCursor((r) => r.resetCursorTheme);
  const toggleCursorTheme = useCursor((r) => r.toggleCursorTheme);

  const containerRef = useRef<HTMLDivElement>(null!);
  const { bottom } = useFrameState();
  const h1 = useMotionValue(0),
    h2 = useMotionValue(0);
  const contBottom = useTransform(
    () => bottom.get() + h2.get() - h1.get() - 36
  );
  useEffect(() => {
    setPreviousPost(previousPost || fallback({ direction: "prev" }));
    setNextPost(nextPost || fallback({ direction: "next" }));
  }, [previousPost, nextPost]);
  useEffect(() => {
    if (!containerRef.current) {
      return;
    }
    h1.set(containerRef.current.getBoundingClientRect().height);
    h2.set(document.documentElement.clientHeight);
  }, [lastResize, h1, h2]);
  const lnis = useLenis();
  const cot = useMotionValue("0px");
  const isSidebarOpen = useRPStore(useShallow((r) => r.sidebarOpen));
  const throttledScroll = useCallback(() => {
    let isThrottled = false;

    return () => {
      if (!isThrottled) {
        if (
          window.scrollY > 2000 &&
          containerRef.current &&
          containerRef.current.getBoundingClientRect().top < 36
        ) {
          cot.set("auto");
          h2.set(window.innerHeight);
          h1.set(containerRef.current.getBoundingClientRect().height);
        }

        isThrottled = true;
        setTimeout(() => {
          isThrottled = false;
          cot.set("0px");
        }, 100);
      }
    };
  }, [cot, h1, h2]);
  useEffect(() => {
    lnis?.on("scroll", throttledScroll);
    return () => {
      lnis?.off("scroll", throttledScroll);
    };
  }, [throttledScroll, lnis]);
  return (
    <m.div
      className={cn(
        "top-[0px] z-0 mt-[-10px] flex w-screen flex-col justify-between overflow-hidden border-0 border-t-[1px] border-solid border-foreground bg-faded-foreground pt-0 pb-[8px] text-background",
        isSidebarOpen ? "fixed" : "sticky"
      )}
      style={{ bottom: contBottom, top: cot }}
      ref={containerRef}
      onMouseEnter={toggleCursorTheme}
      onMouseLeave={resetCursorTheme}
    >
      <div
        className="relative flex h-[calc(100vh-35px)] min-h-[400px] w-full items-start gap-[31px] bg-faded-foreground pb-[24px] after:absolute after:bottom-0 after:left-0 after:mt-[12px] after:h-px after:w-full after:border-t-[1px] after:border-solid after:border-foreground after:opacity-20 after:content-[''] min-lg:p-[0_27px_24px_26px] [&_h1]:m-0 [&_h1]:leading-[0.84] [&>a]:h-full [&>a]:w-1/2 [&>a]:text-faded-background"
        style={{ textDecoration: "none" }}
      >
        <div
          className={
            "pointer-events-none absolute top-0 left-[calc(50%-16px)] z-[1] h-full w-[32px] border-x-[1px] border-dashed border-muted-off-background/20 bg-faded-foreground after:absolute after:top-0 after:left-1/2 after:h-full after:w-px after:bg-muted-off-background/20 after:content-['']"
          }
        ></div>
        <Link
          href={`/essays/${prev.slug}`}
          onClick={resetCursorTheme}
          className={"overflow-hidden rounded-lg"}
        >
          <div className="relative flex h-full w-full flex-col justify-end bg-faded-foreground text-faded-background transition-colors duration-200 ease-out-power2 hover:bg-faded-background/40 hover:text-faded-foreground min-lg:px-[14px] min-lg:py-[10px]">
            {prev && "image" in prev && prev.image && (
              <div className="absolute inset-0 z-[0] opacity-0 transition-opacity duration-400 ease-out-power2 hover:opacity-35">
                <FrontImage
                  imgClassName={
                    "absolute inset-0 z-[0] transition-opacity duration-400 ease-out-power2 opacity-0 hover:opacity-35"
                  }
                  resource={prev.image}
                />
              </div>
            )}
            <h1 className="fixed !top-[55px] m-0 font-serif text-[calc(5px+5.8vmax+5.8vmin)] leading-[0.84] font-light tracking-[-0.05em]">
              <em> Previously</em>
              <br />
              &nbsp;on... &nbsp;
            </h1>
            <div className="m-0 flex h-auto w-full justify-between gap-12.5 font-sans text-base leading-[1.4] -tracking-[0.03em] wrap-break-word uppercase [&_span]:self-end [&_span]:min-lg:min-w-1/2">
              <span>
                {prev.title + " // "}
                <span>{prev.author.name}</span>
              </span>
              <span>{prev.subtitle}</span>
            </div>
          </div>
        </Link>
        <Link
          href={`/essays/${next.slug}`}
          onClick={resetCursorTheme}
          className={"overflow-hidden rounded-lg"}
        >
          <div className="relative flex h-full w-full flex-col justify-end bg-faded-foreground wrap-break-word text-faded-background transition-colors duration-200 ease-out-power2 hover:bg-faded-background/40 hover:text-faded-foreground min-lg:px-[14px] min-lg:py-[10px]">
            {next && "image" in next && next.image && (
              <div className="absolute inset-0 z-[0] opacity-0 mix-blend-overlay transition-opacity duration-400 ease-out-power2 hover:opacity-35">
                <FrontImage
                  imgClassName={
                    "absolute inset-0 z-[0] transition-opacity duration-400 ease-out-power2 opacity-0 hover:opacity-35"
                  }
                  resource={next.image}
                />
              </div>
            )}
            <div className="fixed !top-[80px] z-[5] m-0 flex h-auto w-[calc(50%-44px)] justify-between gap-[32px] text-right font-sans text-base leading-[1.4] -tracking-[0.03em] uppercase min-lg:w-[calc(50%-97px)] min-lg:self-end min-lg:[&_span]:max-w-1/2">
              <span>
                {next.title + " // "}
                <span className={"hidden min-lg:inline"}>
                  {next.author.name}
                </span>
              </span>
              <span className={"hidden min-lg:inline"}>{next.subtitle}</span>
            </div>
            <h1
              className={
                "m-0 text-right font-serif text-[calc(5px+5.8vmax+5.8vmin)] leading-[0.84] font-light tracking-[-0.05em] min-lg:mr-[12px]"
              }
              style={{
                alignSelf: "flex-end"
              }}
            >
              &nbsp;<em>Next&nbsp;</em>&nbsp;
              <br /> Piece&nbsp;
            </h1>
          </div>
        </Link>
        <div
          className={
            "absolute bottom-0 z-2 h-[24px] w-full after:absolute after:top-0 after:left-0 after:z-2 after:w-full after:border-t-[1px] after:border-solid after:border-background after:opacity-20 after:content-['']"
          }
        ></div>
      </div>
      <div
        className="pointer-events-none absolute top-0 right-[2.4rem] left-[2.4rem] z-[30] h-full w-[calc(100%-4.8rem)] border-0 border-x-[1px] border-solid border-x-muted-faded-background opacity-20 lg:right-[2.8rem] lg:left-[2.8rem] lg:w-[calc(100%-56px)]"
        style={{
          borderImage: "initial"
        }}
      />
    </m.div>
  );
};
