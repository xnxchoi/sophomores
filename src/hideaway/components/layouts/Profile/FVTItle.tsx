"use client";
// import { useGSAP } from "@gsap/react";
// import { gsap } from "gsap";
import {
  ComponentPropsWithRef,
  CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { useInView } from "react-intersection-observer";
import * as m from "motion/react-m";
import { animate, useMotionValue } from "motion/react";
import { TE } from "@/hideaway/constants/animations";

export const InkedTitle = (
  props: ComponentPropsWithRef<"div"> & { name: string; id: string }
) => {
  const { name, id, ..._rest } = props;

  const [isHovered, setIsHovered] = useState(false);
  const tlRef = useRef<GSAPTimeline>(null!);
  const opacityTL = useRef<GSAPTimeline>(null!);
  const feBlurRef = useRef<SVGFEGaussianBlurElement>(null!);
  const feBlurValue = useRef(0.15);
  const progress = useMotionValue(0);
  const textOp = useMotionValue(0);
  const stdDev = useMotionValue(0.15);
  const containerRef = useRef<HTMLDivElement>(null!);
  const textsGroupRef = useRef<SVGGElement>(null!);
  const initialized = useRef(false);
  const textStyle = useMemo(
    (): CSSProperties => ({
      transformOrigin: "50% 50%",
      filter: "url(#goo-1)",

      transformBox: "view-box"
    }),
    []
  );
  //
  // useGSAP(
  //   ({}) => {
  //     tlRef.current = gsap
  //       .timeline({
  //         paused: true,
  //         onUpdate: () => {
  //           feBlurRef.current.setAttribute(
  //             "stdDeviation",
  //             `${feBlurValue.current}`
  //           );
  //         },
  //         onComplete: () => {
  //           initialized.current = true;
  //         }
  //       })
  //       .fromTo(
  //         feBlurValue,
  //         {
  //           current: 1.5
  //         },
  //         {
  //           current: 0.195,
  //           duration: 1.6,
  //           delay: initialized.current ? 0.5 : 0.2,
  //           ease: "power2.inOut"
  //         },
  //         0
  //       );
  //   },
  //   {
  //     scope: containerRef
  //   }
  // );
  // useGSAP(
  //   ({ context, contextSafe }) => {
  //     if (!initialized.current) return;
  //     gsap.killTweensOf([feBlurValue, feBlurRef.current]);
  //     gsap.to(feBlurValue, {
  //       current: isHovered ? 2.15 : 0.215,
  //       duration: isHovered ? 1.5 : 1.6,
  //       delay: isHovered ? 0.71 : 0.75,
  //       ease: isHovered ? "power4.out" : "power2.in",
  //       onUpdate: () => {
  //         feBlurRef.current.setAttribute(
  //           "stdDeviation",
  //           `${feBlurValue.current}`
  //         );
  //       }
  //     });
  //   },
  //   {
  //     dependencies: [isHovered],
  //     scope: containerRef
  //   }
  // );
  // useGSAP(
  //   () => {
  //     opacityTL.current = gsap.timeline().fromTo(
  //       textsGroupRef.current,
  //       {
  //         opacity: 0
  //       },
  //       {
  //         opacity: 1,
  //         duration: 1.5,
  //         delay: initialized.current ? 0.3 : 0,
  //         ease: "power2.inOut"
  //       }
  //     );
  //   },
  //   { scope: textsGroupRef }
  // );
  const { inView, ref: inviewRef } = useInView({
    threshold: 1
  });
  useEffect(() => {
    // if (inView) {
    // tlRef.current?.play();
    // opacityTL.current?.play();
    animate([
      [
        textOp,
        inView ? 1 : 0,
        {
          type: "tween",
          duration: 1.5,
          delay: inView && !initialized.current ? 0.3 : 0,
          at: 0
        }
      ],
      [
        stdDev,
        inView ? 0.195 : 1.5,
        {
          type: "tween",
          duration: 1.5,
          at: 0
        }
      ]
    ]);
    if (!initialized.current) {
      initialized.current = true;
    }
    // } else {
    //   tlRef.current?.reverse();
    //   opacityTL.current?.reverse();
    // }
  }, [inView, stdDev, textOp]);
  return (
    <div className={"h-screen w-full p-6"} ref={containerRef}>
      <div className={"relative h-full w-full"}>
        <div
          id={"title-container"}
          className={
            "group absolute top-1/2 left-1/2 z-[10] w-[50vw] -translate-x-1/2 -translate-y-1/2"
          }
        >
          <div
            className="relative flex h-full w-full items-center justify-center"
            ref={inviewRef}
          >
            <svg
              className="flex aspect-[21/10] items-center justify-center overflow-visible fill-edge-black text-center indent-[-9999px] transition-colors duration-400 ease-in-out-2 dark:hover:fill-faded-white"
              viewBox={`0 0 160 50`}
              style={{
                height: "100%",
                width: "100%",
                display: "block"
              }}
              data-themed={"fill-color,color"}
              preserveAspectRatio="xMidYMid meet"
              onMouseEnter={() => {
                setIsHovered(true);
              }}
              onMouseLeave={() => {
                setIsHovered(false);
              }}
            >
              <defs>
                <filter id="goo-1">
                  <m.feGaussianBlur
                    ref={feBlurRef}
                    in="SourceGraphic"
                    stdDeviation={stdDev}
                    whileHover={{
                      stdDeviation: 2.15,
                      transition: {
                        ease: TE.power4.out
                      }
                    }}
                    transition={{
                      type: "tween",
                      duration: 0.4,
                      delay: 0.65,
                      ease: TE.power2.out
                    }}
                    result="blur"
                  />
                  <feColorMatrix
                    in="blur"
                    mode="matrix"
                    values="
                    1 0 0 0 0
                    0 1 0 0 0
                    1 0 1 0 0
                    0 0 0 15 -8"
                    result="goo"
                  />
                  <feComposite
                    in="SourceGraphic"
                    in2="goo"
                    operator="atop"
                  ></feComposite>
                </filter>
              </defs>
              <m.g
                style={{ opacity: textOp }}
                ref={textsGroupRef}
                data-themed={"color,stroke"}
              >
                <m.text
                  dominantBaseline={"middle"}
                  textAnchor={"middle"}
                  style={{
                    transformOrigin: "50% 50%",
                    filter: "url(#goo-1)",
                    transformBox: "view-box"
                  }}
                  className="text-center font-siegfried text-[22px] font-black italic"
                  x="50%"
                  y="50%"
                >
                  {name}
                </m.text>
              </m.g>
            </svg>
          </div>
        </div>
        <m.div
          id={"gradience"}
          data-gl-type="about-fv"
          className="absolute inset-0 h-full w-full"
        ></m.div>

      </div>
    </div>
  );
};
