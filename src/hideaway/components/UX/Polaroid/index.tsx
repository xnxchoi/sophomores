"use client";
import { FrontImage } from "@/hideaway/components/core/Media/FrontImage";
import { cn } from "@/lib/utils";
import { useIsMobile as useIsNarrow } from "@/hideaway/providers/MiddleMan";
import { useCursor, useRPStore } from "@/hideaway/providers/RP_Pro";
import { useTheme } from "@/hideaway/providers/Theme";
import { useWindowResize } from "@/hideaway/utilities/use_window_resize";
import "@/styles/__reviewCard.scss";
import {
  SVGMotionProps,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useScroll,
  useTransform
} from "motion/react";
import * as m from "motion/react-m";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState
} from "react";
import { useShallow } from "zustand/shallow";
import imager from "./ff.jpeg";

const calculatePositioning = () => {
  const wwi = window.innerWidth;
  const y = wwi >= 767 ? 150 : -100;
  const height = wwi >= 967 ? -30 : wwi >= 767 ? -70 : 160;

  return { y, height };
};
// gsap.registerPlugin(ScrollTrigger);
const iUnit = 420;
const yEdge = iUnit * 0.153;
const instax = {
  square: {
    rects: {
      inner: {
        height: 1,
        width: 1
      },
      outer: {
        height: 1 * 1.377,
        width: 1 * 1.135
      },
      content: {
        width: 1,
        height: 0.377 * 1 - 2 * 0.153
      }
    },
    edges: {
      y: 0.153,
      x: 0.135 / 2
    }
  },
  wide: {
    rects: {
      inner: {
        height: 1,
        width: 1 * 1.625
      },
      outer: {
        height: 1 * 1.416,
        width: 1 * 1.771
      },
      content: {
        width: 1 * 1.625,
        height: 0.416 * 1 - 2 * 0.153
      }
    },
    edges: {
      y: 0.153,
      x: (1.771 - 1.625) / 2
    }
  }
};
const polaroid = {
  wide: {
    framwWidth: 1,
    frameHeight: 0.8,
    pictureHeight: 0.4415,
    pictureWidth: 1.625 * 0.4415,
    borderY: 0.082 * 0.4415,
    borderX: 0.171 * 0.4415
  },
  narrow: {
    frameWidth: 1,
    frameHeight: 1.619,
    pictureHeight: 1.1418,
    pictureWidth: 0.857,
    borderY: 0.15,
    borderX: 0.0714
  }
};
export const RP_POLAROID = () => {
  const config = {
    author: "<NAME>",
    review: "Hi",
    image: "/media/ff.jpeg"
  };

  const isNarrow = useIsNarrow();
  const [polar, setPolar] = useState(
    isNarrow ? polaroid.narrow : polaroid.wide
  );

  const section = useRef<HTMLElement>(null),
    img = useRef<HTMLImageElement>(null),
    footer = useRef<HTMLDivElement>(null),
    patron = useRef<HTMLSpanElement>(null);
  const container = useRef<HTMLDivElement>(null),
    frameContent = useRef<HTMLDivElement>(null),
    imageContainer = useRef<HTMLDivElement>(null),
    frameContainer = useRef<HTMLDivElement>(null),
    frameContentInner = useRef<HTMLDivElement>(null),
    framePositioning = useRef<HTMLDivElement>(null),
    timeline = useRef<GSAPTimeline>(null),
    logo = useRef<SVGSVGElement>(null);
  const isInView = useInView(section, {});

  // const [osH, setOsH] = useState(0);
  const theme = useTheme((r) => r.theme);
  const white = "oklch(98.52% 0.006 23.79/1)";
  const black = "oklch(9.69% 0.0175 23.79/1)";
  // const [frameWidth, setFrameWidth] = useState(720);
  const [_secBG, set_secBG] = useState(theme === "dark" ? black : white);
  const [_secFG, set_secFG] = useState(theme === "dark" ? white : black);
  const themeValue = useMotionValue(theme);
  useEffect(() => {
    themeValue.set(theme);
  }, [theme, themeValue]);
  const sectionBGL = useTransform(() =>
      themeValue.get() === "dark" ? 9.69 : 98.52 * 1
    ),
    sectionBGC = useTransform(() =>
      themeValue.get() === "dark" ? 0.0175 : 0.006 * 1
    );
  const sectionFGL = useTransform(() =>
      themeValue.get() === "dark" ? 98.52 : 9.69 * 1
    ),
    sectionFGC = useTransform(() =>
      themeValue.get() === "dark" ? 0.006 : 0.0175 * 1
    );

  const sectionBG = useMotionTemplate`oklch(${sectionBGL}% ${sectionBGC} 23.79/1)`;
  const sectionFG = useMotionTemplate`oklch(${sectionFGL}% ${sectionFGC} 23.79/1)`;
  //   backgroundColor: sectionBG,
  //     color: sectionFG
  // },
  // { backgroundColor: sectionFG, color: sectionBG },
  const wW = useRPStore(useShallow((r) => r.viewportWidth));
  const wH = useRPStore(useShallow((r) => r.viewportHeight));
  useEffect(() => {
    set_secBG(theme === "dark" ? black : white);
    set_secFG(theme === "dark" ? white : black);
  }, [theme]);

  const windowResize = useWindowResize({ detectHeightChange: true });
  // const [height, setHeight] = useState(0),
  //   [y, setY] = useState(0);
  // useEffect(() => {
  // setOsH(container.current.offsetHeight);
  // setFrameWidth(framePositioning.current.offsetWidth);
  // }, []);
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ["30% end", `end 90%`]
  });
  const scrubProgress = useMotionValue(0);
  const opacityLinked = useTransform(scrubProgress, [0, 0.1], [0, 1]);
  /**
   * Picture Frame
   */
  const picWidth = useMotionValue(window.innerWidth);
  const picOffsetTop = useMotionValue(80);
  const picHeight = useMotionValue(window.innerHeight);
  const picX = useMotionValue(0);
  const imageContainerOWidth = useMotionValue(window.innerWidth);
  const imageContainerOHeight = useMotionValue(window.innerHeight);

  const frameBorderWidth = useTransform(() => {
    const pr = scrubProgress.get();
    const ogP = 1 - pr;
    return 40 * ogP + pr * 16;
  });
  const contentInnerWidth = useMotionValue(1000);
  const onScroll = useCallback(
    (v: number) => {
      scrubProgress.set(v);
    },
    [scrubProgress]
  );
  const setFrameD = useEffectEvent(() => {
    if (!framePositioning.current || !imageContainer.current) return;
    scrollCallback.current && scrollCallback.current();
    scrollCallback.current = null;
    const lastFrame = scrubProgress.get();
    scrubProgress.set(0);

    const { y: yval, height: hval } = calculatePositioning();
    imageContainerOWidth.set(imageContainer.current.offsetWidth);
    contentInnerWidth.set(framePositioning.current.offsetWidth - 80);
    imageContainerOHeight.set(imageContainer.current.offsetHeight);
    picHeight.set(framePositioning.current.offsetHeight);
    picWidth.set(framePositioning.current.offsetWidth);
    picOffsetTop.set(framePositioning.current.offsetTop + 150);
    picX.set(framePositioning.current.offsetLeft);

    scrubProgress.set(lastFrame);
    scrollCallback.current = scrollYProgress.on("change", onScroll);
  });

  const scrollCallback = useRef<null | (() => void)>(null);
  useEffect(() => {
    setFrameD();
  }, []);
  useEffect(() => {
    setFrameD();
    return () => {
      scrollCallback.current && scrollCallback.current();
      scrollCallback.current = null;
    };
  }, [windowResize]);
  /**
   * Framecontainer
   */
  const frameContainerWidth = useTransform(() => {
    const pr = scrubProgress.get();
    const ogP = 1 - pr;
    return (window.innerWidth + 48) * ogP + picWidth.get() * pr;
  });
  const frameContainerHeight = useTransform(() => {
    const pr = scrubProgress.get();
    const ogP = 1 - pr;
    return (window.innerHeight + 48) * ogP + picHeight.get() * pr;
  });
  const frameContainerX = useTransform(() => {
    const pr = scrubProgress.get();
    const ogP = 1 - pr;
    return -32 * ogP + pr * picX.get();
  });
  const frameContainerY = useTransform(() => {
    const pr = scrubProgress.get();
    const ogP = 1 - pr;
    return -32 * ogP + pr * picOffsetTop.get();
  });

  const frameBorderColorL = useTransform(() => {
    const pr = scrubProgress.get();
    const ogP = 1 - pr;
    return sectionBGL.get() * ogP + pr * sectionFGL.get();
  });
  const frameBorderColorC = useTransform(() => {
    const pr = scrubProgress.get();
    const ogP = 1 - pr;
    return sectionBGC.get() * ogP + pr * sectionFGC.get();
  });
  const frameBorderColor = useMotionTemplate`oklch(${frameBorderColorL}% ${frameBorderColorC} 23.79/1)`;
  /**
   * Graphics
   *
   */
  const graphicBGC = useTransform(() => {
      const pr = scrubProgress.get();
      const ogP = 1 - pr;
      return sectionBGC.get() * ogP + pr * sectionFGC.get();
    }),
    graphicBGL = useTransform(() => {
      const pr = scrubProgress.get();
      const ogP = 1 - pr;
      return sectionBGL.get() * ogP + pr * sectionFGL.get();
    }),
    graphicFGC = useTransform(() => {
      const pr = scrubProgress.get();
      const ogP = 1 - pr;
      return sectionFGC.get() * ogP + pr * sectionBGC.get();
    }),
    graphicFGL = useTransform(() => {
      const pr = scrubProgress.get();
      const ogP = 1 - pr;
      return sectionFGL.get() * ogP + pr * sectionBGL.get();
    });

  const graphicBG = useMotionTemplate`oklch(${graphicBGL}% ${graphicBGC} 23.79/1)`,
    graphicFG = useMotionTemplate`oklch(${graphicFGL}% ${graphicFGC} 23.79/1)`;
  /**
   *  Frame content
   *
   */
  const _frameContentY = useTransform(() => 105 * (1 - scrubProgress.get())),
    frameContentBGC = useTransform(() => {
      const pr = scrubProgress.get();
      const ogP = 1 - pr;
      return sectionBGC.get() * ogP + pr * sectionFGC.get();
    }),
    frameContentBGL = useTransform(() => {
      const pr = scrubProgress.get();
      const ogP = 1 - pr;
      return sectionBGL.get() * ogP + pr * sectionFGL.get();
    }),
    frameContentFGL = useTransform(() => {
      const pr = scrubProgress.get();
      const ogP = 1 - pr;
      return sectionFGL.get() * ogP + pr * sectionBGL.get();
    }),
    frameContentFGC = useTransform(() => {
      const pr = scrubProgress.get();
      const ogP = 1 - pr;
      return sectionFGC.get() * ogP + pr * sectionBGC.get();
    }),
    frameContentY = useMotionTemplate`${_frameContentY}%`;
  const frameContentBG = useMotionTemplate`oklch(${frameContentBGL}% ${frameContentBGC} 23.79/1)`,
    frameContentFG = useMotionTemplate`oklch(${frameContentFGL}% ${frameContentFGC} 23.79/1)`;
  /**
   *
   *  Image container
   */
  const imageContainerScale = useTransform(() => {
      const pr = scrubProgress.get();
      const ogP = 1 - pr;
      return 1.1 * ogP + pr;
    }),
    _imageContainerY = useTransform(() => {
      const pr = scrubProgress.get();
      const ogP = 1 - pr;
      return -20 * ogP + pr * 0;
    }),
    imageContainerWidth = useTransform(() => {
      const pr = scrubProgress.get();
      const ogP = 1 - pr;
      return imageContainerOWidth.get() * ogP + (picWidth.get() - 32) * pr;
    }),
    imageContainerHeight = useTransform(() => {
      const pr = scrubProgress.get();
      const ogP = 1 - pr;
      return (
        imageContainerOHeight.get() * ogP +
        (picWidth.get() - 32) * (9 / 16) * pr
      );
    });
  const imageContainerY = useMotionTemplate`${_imageContainerY}%`;
  const setCursorTheme = useCursor((r) => r.setCursorTheme);
  const resetCursor = useCursor((r) => r.resetCursorTheme);
  useEffect(() => {
    // setOsH(container.current.offsetHeight);
    // setFrameWidth(framePositioning.current.offsetWidth);
    // const { y, height } = calculatePositioning();
    // setY(y);
    // setHeight(height);
  }, [windowResize]);
  useEffect(() => {
    setPolar(isNarrow ? polaroid.narrow : polaroid.wide);
  }, [isNarrow]);
  const offCursor = useCallback(() => {
    resetCursor();
  }, [resetCursor]);
  const [contrast, setContrast] = useState<"dark" | "light">(
    theme === "dark" ? "light" : "dark"
  );
  useEffect(() => {
    setContrast(theme === "dark" ? "light" : "dark");
  }, [theme]);
  const onCursor = useCallback(
    (thema: "dark" | "light") => {
      setCursorTheme(thema);
    },
    [setCursorTheme]
  );

  // useGSAP(
  //   () => {
  //     if (
  //       !framePositioning.current ||
  //       !frameContainer.current ||
  //       !frameContent.current ||
  //       !imageContainer.current ||
  //       !framePositioning.current
  //     ) {
  //       return;
  //     }
  //     const picWidth = framePositioning.current.offsetWidth;
  //     const { y: yval, height: hval } = calculatePositioning();
  //     const picHeight = framePositioning.current.offsetHeight + hval;
  //     const picOffsetTop = framePositioning.current.offsetTop + yval;
  //
  //     const newX = framePositioning.current.offsetLeft;
  //     const borderWidth =
  //       parseInt(getComputedStyle(frameContainer.current).borderWidth, 10) || 0;
  //     gsap.set(frameContentInner.current, {
  //       width: framePositioning.current.offsetWidth - borderWidth * 2
  //     });
  //     if (timeline.current) {
  //       timeline.current.kill();
  //     }
  //     gsap.killTweensOf([
  //       frameContainer.current,
  //       frameContent.current,
  //       imageContainer.current
  //     ]);
  //     timeline.current = gsap.timeline({
  //       scrollTrigger: {
  //         trigger: section.current,
  //         start: "top+=30% bottom",
  //         end: `bottom 98%`,
  //         scrub: true,
  //         markers: false,
  //         onEnter: () => {
  //           gsap.set(section.current, {
  //             autoAlpha: 1
  //           });
  //         }
  //       }
  //     });
  //     // .fromTo(
  //     //   [patron.current, logo.current],
  //     //   {
  //     //     backgroundColor: sectionBG,
  //     //     color: sectionFG
  //     //   },
  //     //   { backgroundColor: sectionFG, color: sectionBG },
  //     //   0
  //     // )
  //
  //     // .fromTo(
  //     //   imageContainer.current,
  //     //   {
  //     //     scale: 1.1,
  //     //     y: "-20%",
  //     //     width: imageContainer.current.offsetWidth,
  //     //     x: "-50%",
  //     //     left: "50%"
  //     //   },
  //     //   {
  //     //     scale: 1,
  //     //     width: picWidth - 32,
  //     //     height: picWidth * (3 / 4) - 24,
  //     //     y: "20%",
  //     //     x: "-50%",
  //     //     left: "50%",
  //     //     ease: "power2.out"
  //     //   },
  //     //   0
  //     // );
  //     // .fromTo(
  //     //   frameContainer.current,
  //     //   {
  //     //     width: window.innerWidth + 48,
  //     //     height: window.innerHeight + 48,
  //     //     y: -24,
  //     //     x: -24,
  //     //     borderWidth: 40,
  //     //     borderColor: sectionBG
  //     //   },
  //     //   {
  //     //     width: picWidth,
  //     //     height: picHeight,
  //     //     y: picOffsetTop,
  //     //     x: newX,
  //     //     borderWidth: 16,
  //     //     ease: "power2.inOut",
  //     //     borderColor: sectionFG
  //     //   },
  //     //   "<+=6%"
  //     // )
  //     // .fromTo(
  //     //   frameContent.current,
  //     //   {
  //     //     y: "405%",
  //     //     scale: 1.01,
  //     //     backgroundColor: sectionBG,
  //     //     color: sectionFG
  //     //   },
  //     //   {
  //     //     y: 0,
  //     //     scale: 1.01,
  //     //     ease: "power2.out",
  //     //     height: picHeight - picWidth * (3 / 4) + 8,
  //     //     backgroundColor: sectionFG,
  //     //     color: sectionBG
  //     //   },
  //     //   "<"
  //     // );
  //   },
  //   {
  //     scope: container,
  //     dependencies: [y, height, isNarrow]
  //   }
  // );

  return (
    <section ref={section} className="h-[120vh]">
      <div ref={container}>
        <div className="relative grid h-screen min-h-352 w-full grid-cols-[repeat(12,1fr)] gap-0 overflow-hidden px-8 py-0">
          <div
            ref={framePositioning}
            className="md:cols-[4/10] relative top-[20rem] z-2 col-[2/12] h-[calc(100%-40rem)] md:top-[11rem] md:h-[calc(100%-22rem)]"
            onMouseEnter={() => onCursor(contrast)}
            onMouseLeave={offCursor}
          />
          <m.div
            style={{
              x: "-50%",
              left: "50%",
              y: imageContainerY,
              width: imageContainerWidth,
              height: imageContainerHeight,
              scale: imageContainerScale
            }}
            ref={imageContainer}
            className="transform-origin-center absolute top-20 h-full w-full rounded-[8px] bg-background/80"
          >
            <FrontImage
              ref={img}
              src={imager}
              pictureClassName={"absolute inset-0 object-cover"}
              className="absolute inset-0 object-cover"
              fill={true}
            />
          </m.div>
          <m.div
            ref={frameContainer}
            className="review__card-bg_frame-container"
            style={{
              width: frameContainerWidth,
              height: frameContainerHeight,
              x: frameContainerX,
              y: frameContainerY,
              borderWidth: frameBorderWidth,
              borderColor: frameBorderColor
            }}
          >
            <m.div
              ref={frameContent}
              style={{
                y: frameContentY,
                backgroundColor: frameContentBG,
                color: frameContentFG,
                scale: 1.01
              }}
              className="w-full"
            >
              <m.div
                ref={frameContentInner}
                style={{
                  width: contentInnerWidth
                }}
                className="relative mx-auto my-0 px-0 pt-[3.2rem] pb-[1.6rem] lg:px-12 lg:pt-(--gutter) lg:pb-(--gutter)"
              >
                <blockquote
                  className={`relative mb-[3.4rem] border-none text-h2 leading-[120%] -tracking-[0.03em] text-background/90 before:absolute before:top-auto before:right-full before:content-['"'] after:content-['"'] lg:mb-16 lg:text-[4rem] xl:mb-[8.4rem]`}
                >
                  {config.review}
                </blockquote>
                <div
                  ref={footer}
                  className="justify-betweena flex items-center"
                >
                  <address data-themed="color">
                    <m.span
                      style={{
                        color: graphicFG
                      }}
                      className="font-sans text-base leading-[140%] font-semibold -tracking-[.01em] text-faded-background/75 lg:text-[1.6rem]"
                    >
                      {config.author}
                    </m.span>
                    <span className="hidden text-faded-background/75 lg:inline-block">
                      &nbsp;-&nbsp;
                    </span>
                    <span className="block text-base leading-[140%] -tracking-[.01em] text-faded-background/75 lg:inline-block lg:text-[1.6rem]"></span>
                  </address>
                  <RP_Logo
                    style={{
                      color: graphicFG,
                      backgroundColor: graphicBG
                    }}
                  />
                </div>
              </m.div>
            </m.div>
          </m.div>
        </div>
      </div>
    </section>
  );
};
const RP_Logo = ({
  className,
  xmlns,
  viewBox,
  ...props
}: SVGMotionProps<SVGSVGElement>) => (
  <m.svg
    className={cn(
      "w-[1.8rem] text-faded-background/75 lg:w-[2.4rem]",
      className
    )}
    xmlns={xmlns || "http://www.w3.org/2000/svg"}
    viewBox={viewBox || "0 0 45 45"}
    {...props}
  >
    <g id="ha_ww">
      <path
        d="m10.17,42.82l-.05-40.63c0-.27.29-.5.64-.5h3.14c.35,0,.64.22.64.5l.03,25.87c0,.27.29.5.64.5h13.63c.35,0,.64-.23.64-.52v-10.96c-.01-.27.27-.5.63-.5h3.14c.35,0,.64.22.64.5l.03,25.74c0,.27-.29.5-.64.5h-3.14c-.35,0-.64-.22-.64-.5v-12.39c-.01-.27-.3-.5-.65-.5h-13.63c-.35,0-.64.23-.64.52v12.39c.01.27-.27.5-.63.5h-3.14c-.35,0-.64-.22-.64-.5h0Z"
        data-themed={"fill"}
        fill="currentColor"
        strokeWidth={0}
      />
      <circle
        cx="31.97"
        cy={7}
        data-filled={"fill"}
        r="2.91"
        fill="currentColor"
        strokeWidth={0}
      />
    </g>
  </m.svg>
);
