"use client";
import { AnimatePresence } from "motion/react";
import { Fragment, useEffect, useRef, useState } from "react";
import * as m from "motion/react-m";
import { useCursor } from "@/providers/RP_Pro";
import { useLenis } from "lenis/react";
import { useTheme } from "@/providers/Theme";
import { useIsMobile } from "@/providers/MiddleMan";
import { useDomCursor } from "@/components/core/cursorWrapper";
import { useLocale, useTranslations } from "next-intl";

export const Justification = (props: {
  posterEnabled: boolean;
  controls: boolean;
  loop: boolean;
  playsInline: boolean;
  muted: boolean;
  autoPlay: boolean;
  restartOnEnter: boolean;
  objectFit: "cover" | "contain" | "fill" | "none" | "scale-down" | string;
  backgroundColor: CSSStyleDeclaration["backgroundColor"];
  volume: number;
  startTime: number;
}) => {
  const { isMobile } = useIsMobile();
  const setCursorState = useCursor((store) => store.setCursorState);
  const { onMouseEnter: hME, onMouseLeave: hMO } = useDomCursor({});
  const locale = useLocale();
  const t = useTranslations("UI.Justification");
  const [visibility, setVisibility] = useState(false);

  const {
    posterEnabled,
    controls,
    loop,
    playsInline,
    muted,
    autoPlay,
    restartOnEnter,
    objectFit,
    backgroundColor,
    volume,
    startTime
  } = props;
  const videoRef = useRef<HTMLVideoElement>(null!);

  useEffect(() => {
    if (!videoRef.current) return;
    if (volume) {
      videoRef.current.volume = volume / 100;
    } else {
      videoRef.current.volume = 0.15;
    }
  }, [volume]);
  const bgRE = useRef<HTMLDivElement>(null!);
  const bgTL = useRef<GSAPTimeline>(null!);
  const setTheme = useTheme((store) => store.setTheme);
  const resetTheme = useTheme((store) => store.clearPageTheme);
  useLenis(
    (lenis) => {
      if (visibility) {
        lenis.stop();
        videoRef.current && (videoRef.current.currentTime = startTime);
        setTheme("dark");
        bgTL.current && bgTL.current.play();
      } else {
        resetTheme();
        bgTL.current && bgTL.current.pause();
        setCursorState(null);
        lenis.start();
      }
    },
    [visibility]
  );
  return (
    <>
      <div
        className="flex shrink-0 flex-col justify-items-start"
        data-highlight="true"
        style={{
          flex: "0 0 auto",
          height: "auto",
          position: "relative",
          width: "auto"
        }}
        onMouseEnter={hME}
        onMouseLeave={hMO}
        onClick={() => {
          setVisibility(true);
        }}
      >
        <p>
          {locale === "ko" && <>&#34;</>} {t("question")}
          {locale === "ko" && <>&#34;</>}
        </p>
      </div>
      <div id={"overlayer"}>
        <AnimatePresence initial={true} mode="wait">
          {visibility && (
            <>
              <m.div
                key={"the_pitch_bg"}
                ref={bgRE}
                animate={{
                  opacity: 1,
                  transition: {
                    default: {
                      delay: 0,
                      duration: 1,
                      ease: [0.5, 0, 0.88, 0.77],
                      type: "tween"
                    },
                    backgroundColor: {
                      delay: 0,
                      duration: 2,
                      type: "tween",
                      times: [0.2, 1]
                    }
                  },
                  backgroundColor: [
                    "oklch(14.17% 0 118.54/.2)",
                    "oklch(14.17% 0 118.54/1)"
                  ],
                  backdropFilter: "blur(10px)"
                }}
                exit={{
                  opacity: 0,
                  transition: {
                    delay: 0,
                    duration: 1,
                    ease: [0.12, 0.23, 0.5, 1],
                    type: "tween"
                  },
                  backgroundColor: "oklch(14.17% 0 118.54/0)",
                  backdropFilter: "initial"
                }}
                initial={{
                  opacity: 0
                }}
                data-lenis-prevent="true"
                className="fixed inset-0 z-10"
              />
              <m.div
                key={"the_pitch_content"}
                data-lenis-prevent="true"
                layoutRoot={true}
                className="fixed inset-0 z-10 overflow-hidden"
              >
                <m.div
                  key={"the_pitch_content_close"}
                  className="absolute inset-0 opacity-0"
                  initial={{ zIndex: 11 }}
                  onMouseEnter={() => setCursorState("CLOSE")}
                  onMouseLeave={hMO}
                  onTap={() => {
                    setVisibility(false);
                  }}
                ></m.div>
                <m.div
                  key={"the_pitch_content_inner"}
                  className="absolute top-1/2 left-[55%] z-22 flex h-min w-min transform-[translate(-50%,-50%)] flex-nowrap items-end justify-center gap-[10px] overflow-visible p-0 max-md:left-1/2 max-md:flex-col"
                  style={{
                    flex: "0 0 auto"
                  }}
                >
                  <m.div
                    key={"the_pitch_content_inner_video"}
                    className="relative h-220 w-220 flex-none max-md:aspect-square max-md:h-auto max-md:w-[95vw]"
                    initial={{
                      opacity: 1,
                      rotate: 0,
                      rotateX: -90,
                      rotateY: 0,
                      scale: 1,
                      skewX: 0,
                      skewY: 0,
                      transformPerspective: 1200,
                      x: 0,
                      y: -800
                    }}
                    animate={{
                      opacity: 1,
                      rotate: 0,
                      rotateX: 0,
                      rotateY: 0,
                      scale: 1,
                      skewX: 0,
                      skewY: 0,
                      transformPerspective: 1200,
                      transition: {
                        delay: 0,
                        duration: 1,
                        ease: [0.44, 0, 0, 1],
                        type: "tween"
                      },
                      x: 0,
                      y: 0
                    }}
                    exit={{
                      opacity: 1,
                      rotate: 0,
                      rotateX: 100,
                      rotateY: 0,
                      scale: 1,
                      skewX: 0,
                      skewY: 0,
                      transition: {
                        delay: 0,
                        duration: 1,
                        ease: [0.44, 0, 0, 1],
                        type: "tween"
                      },
                      x: 0,
                      y: 700
                    }}
                    style={{ transformPerspective: 1200 }}
                  >
                    <m.video
                      onTap={(e) => {
                        if (e.currentTarget) {
                          (
                            e.currentTarget as HTMLVideoElement & EventTarget
                          ).muted = false;
                        }
                      }}
                      ref={videoRef}
                      playsInline={true}
                      controls={false}
                      loop={true}
                      muted={true}
                      className={
                        "h-full w-full rounded-4xl bg-transparent object-cover"
                      }
                      src="/media/f.mp4"
                      width={"100%"}
                      height={"100%"}
                      autoPlay={true}
                    />
                  </m.div>
                  <m.div
                    key={"the_pitch_content_inner_text"}
                    className="relative flex h-min w-[161px] flex-none flex-col flex-wrap content-center items-center gap-[10px] overflow-hidden p-0"
                    animate={{
                      opacity: 1,
                      rotate: 0,
                      rotateX: 0,
                      rotateY: 0,
                      scale: 1,
                      skewX: 0,
                      skewY: 0,
                      transition: {
                        delay: 1.8,
                        duration: 0.4
                      },
                      x: 0,
                      y: 0
                    }}
                    exit={{
                      opacity: 0,
                      rotate: 0,
                      rotateX: 0,
                      rotateY: 0,
                      scale: 1,
                      skewX: 0,
                      skewY: 0,
                      transition: {
                        delay: 0,
                        duration: 0.3
                      },
                      x: 0,
                      y: 0
                    }}
                    initial={{
                      opacity: 0,
                      rotate: 0,
                      rotateX: 0,
                      rotateY: 0,
                      scale: 1,
                      skewX: 0,
                      skewY: 0,
                      x: 0,
                      y: 0
                    }}
                    transition={{ ease: [0.44, 0, 0.56, 1], type: "tween" }}
                    style={{ flex: "0 0 auto" }}
                  >
                    <m.div className="relative h-auto w-full flex-none shrink-0 justify-start wrap-break-word whitespace-pre-wrap opacity-70 outline-none">
                      <m.p>Don&#39;t Trust Us-</m.p>
                    </m.div>
                    <m.div className="relative h-auto w-full flex-none shrink-0 justify-start wrap-break-word whitespace-pre-wrap outline-none">
                      <m.p>Trust The Process.</m.p>
                    </m.div>
                  </m.div>
                </m.div>
              </m.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};
