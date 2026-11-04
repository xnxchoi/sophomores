"use client";
import { useInView, type Variants } from "motion/react";
import * as m from "motion/react-m";
import { useMemo, useRef } from "react";
import "./__signature.scss";
import { paths } from "./paths";

type Transitionn = typeof paths.transitions;
type SignatureKeys = keyof Transitionn;
export const Signature = () => {
  const ref = useRef<HTMLDivElement>(null!);
  const isVisible = useInView(ref, { once: true });

  const signatureSvgVariants = useMemo(
    () => ({
      initial: {
        opacity: 0
      },
      revealed: {
        opacity: 1,
        transition: {
          duration: 0.2
        }
      }
    }),
    []
  );

  const signaturePathVariants: Variants = useMemo(
    () => ({
      initial: {
        opacity: 0,
        pathLength: 0
      },
      revealed: {
        opacity: 1,
        pathLength: 1,
        transition: {
          type: "tween",
          duration: 2,
          ease: "easeInOut"
        }
      }
    }),
    []
  );

  return (
    <div ref={ref}>
      <m.svg
        className={
          "h-auto w-full [&_path]:fill-none [&_path]:stroke-faded-foreground/90 [&_path]:stroke-[98px] [&_path]:[stroke-linecap:round] [&_path]:[stroke-linejoin:round] [&_path]:[stroke-miterlimit:10]"
        }
        layout={true}
        animate={isVisible ? "revealed" : "initial"}
        variants={signatureSvgVariants}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 14248.91 2723.74"
        style={{
          color: "oklch(from var(--faded-fg) l c h/.9)"
        }}
      >
        <defs>
          <filter id="goo-1">
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation="20"
              result="blur"
              edgeMode="extend"
            ></feGaussianBlur>
          </filter>
        </defs>
        <m.path
          initial={"initial"}
          animate={isVisible ? "revealed" : "initial"}
          variants={signaturePathVariants}
          d="M158.91 2668.91c106.54 40.94 494-115 532-129 142-54 612.51-257.7 612.51-257.7l475.49-230.3 228-114s473-248 616-347c94-65 233.82-155.86 270-178 85-52.03 496-288.64 844-565 170-135 329.99-276.43 366-312 82-81 236.11-287.67 246-348 10-61-18-127-81-138-98.42-17.18-290 85-423 174-334.92 224.12-613 751-707 909"
          style={{
            filter: "url(#goo-1)",
            transformBox: "view-box",
            strokeMiterlimit: 10,
            fill: "none",
            stroke: "currentColor",
            strokeLinecap: "round",
            strokeWidth: 116
          }}
        />
        <m.path
          initial={"initial"}
          animate={isVisible ? "revealed" : "initial"}
          variants={signaturePathVariants}
          d="M3177.15 1192.58c-9.62 6.05-17 20-15 32 1.06 6.34 13.99 15.33 30.68 4.61 200.66-142.34 616.63-433.94 777.08-565.28 237-194 359-420 379-476 12.81-35.86 2-124-81-138-123.57-20.84-401.14 147.83-504.08 233.28-277.92 230.72-501.77 652.49-561.92 740.72-60 88-111.24 196.48-150 260-51.72 84.75-85 138-108 179-53.3 95.01-369 650-628 924-116.68 123.74-301.72 214.5-398 223-211.69 15.92-334-106-523-280-149.31-137.46-277.45-349.92-306-386-153-185-86-107-276-299-210.59-175.49-436-255-644-193-101 30-149.87 93.97-103 157 116 156 553 235 868 276"
          style={{
            filter: "url(#goo-1)",
            transformBox: "view-box",
            strokeMiterlimit: 10,
            fill: "none",
            stroke: "currentColor",
            strokeLinecap: "round",
            strokeWidth: 116
          }}
        />
        <m.path
          initial={"initial"}
          animate={isVisible ? "revealed" : "initial"}
          variants={signaturePathVariants}
          d="M958.91 1790.91c-6.47 0-93.08-94.14-98.11-99.37-15.68-16.31-31.77-32.15-47.8-47.11-158.92-143.72-429.09-263.53-644.09-192.53-26.48 8.74-97 31-116 85-24.19 68.76 67.86 134.14 134.64 166.32 694.36 334.68 2687.36 254.68 3357.36 82.68"
          style={{
            filter: "url(#goo-1)",
            transformBox: "view-box",
            strokeMiterlimit: 10,
            fill: "none",
            stroke: "currentColor",
            strokeLinecap: "round",
            strokeWidth: 116
          }}
        />
        <m.path
          initial={"initial"}
          animate={isVisible ? "revealed" : "initial"}
          variants={signaturePathVariants}
          d="M3398.79 1859.97s238.11-131.07 284.11-103.07c115-6 2 260-450 511"
          style={{
            filter: "url(#goo-1)",
            transformBox: "view-box",
            strokeMiterlimit: 10,
            fill: "none",
            stroke: "currentColor",
            strokeLinecap: "round",
            strokeWidth: 116
          }}
        />
        <m.path
          initial={"initial"}
          animate={isVisible ? "revealed" : "initial"}
          variants={signaturePathVariants}
          d="M3366.91 1892.91s-419 307-284 614 1179.88-495.99 1262-556c82.39-60.2 284.83-133.18 272.24-122.33"
          style={{
            filter: "url(#goo-1)",
            transformBox: "view-box",
            strokeMiterlimit: 10,
            fill: "none",
            stroke: "currentColor",
            strokeLinecap: "round",
            strokeWidth: 116
          }}
        />
        <m.path
          initial={"initial"}
          animate={isVisible ? "revealed" : "initial"}
          variants={signaturePathVariants}
          d="M3278.91 2241.91c-157 84-109 60-207 119-40 13 17.24-255.33 321.24-492.33m963.76 97.33s318-235 534-169-157 277-157 277"
          style={{
            filter: "url(#goo-1)",
            transformBox: "view-box",
            strokeMiterlimit: 10,
            fill: "none",
            stroke: "currentColor",
            strokeLinecap: "round",
            strokeWidth: 116
          }}
        />
        <m.path
          initial={"initial"}
          animate={isVisible ? "revealed" : "initial"}
          variants={signaturePathVariants}
          d="M4749.15 2064.58c4.79 6.76 326.69-192.51 139-246-172.96-49.3-551.63 34.33-889 513-347 545 583.03-116.85 588.76-140.67 0 0-270 285-194 372 126.46 144.76 1098.69-615.26 1224-685 115-64 185-49 185-49s-620 650-550 703 1053-695 1113-644c114.35 97.2-458.36 445.02-420 632 40 195 959-488 1018-549m-367 673s100 31 284-60c121.84-60.26 252-178 188-199-87.11-28.58-115 74-97 69m624-116c219.57-99.01 670.95-458.6 696-570 9.67-43.03-88.76 952.67-377 729-263.69-204.62 22 434 872-454m61 523c100-35 131.21-174.61 42-130-28 14-90 107-56 124m903-1278s670.48 16.55 1608-534c533-313 824-568 610-584"
          style={{
            filter: "url(#goo-1)",
            transformBox: "view-box",
            strokeMiterlimit: 10,
            fill: "none",
            stroke: "currentColor",
            strokeLinecap: "round",
            strokeWidth: 116
          }}
        />
        <m.path
          initial={"initial"}
          animate={isVisible ? "revealed" : "initial"}
          variants={signaturePathVariants}
          d="M12007.91 181.91c-47-78-1196 89-2263 1662-413.89 610.16-27.28 797.67 481 687 744-162 2199.98-1303.41 2469-1897"
          style={{
            filter: "url(#goo-1)",
            transformBox: "view-box",
            strokeMiterlimit: 10,
            fill: "none",
            stroke: "currentColor",
            strokeLinecap: "round",
            strokeWidth: 116
          }}
        />
        <m.path
          initial={"initial"}
          animate={isVisible ? "revealed" : "initial"}
          variants={signaturePathVariants}
          d="m11070.15 2459.58 81.76-109.67 1543-1716-1615 1824s866.34-582.58 1012-515c97 45-124 72-376 501-215.65 367.11 642-180 1056-359"
          style={{
            filter: "url(#goo-1)",
            transformBox: "view-box",
            strokeMiterlimit: 10,
            fill: "none",
            stroke: "currentColor",
            strokeLinecap: "round",
            strokeWidth: 116
          }}
        />
        <m.path
          initial={"initial"}
          animate={isVisible ? "revealed" : "initial"}
          variants={signaturePathVariants}
          d="M12777.91 2094.91s-360 212-356 382c5.39 229.02 498-143 498-143s248.01-312.17 83-488c-122-130-380.96-54-355 175 28 247 249 367 478 314s496.75-158.51 590-378c32.09-75.53-323.17 416.92-298 525 25.94 111.36 691-361 783-490m-358-241s123-89 66-112c-44 19-78 108-78 108"
          style={{
            filter: "url(#goo-1)",
            transformBox: "view-box",
            strokeMiterlimit: 10,
            fill: "none",
            stroke: "currentColor",
            strokeLinecap: "round",
            strokeWidth: 116
          }}
        />
      </m.svg>
    </div>
  );
};
export const SignedFooter = () => {
  return (
    <section className="w-full py-22 md:px-8">
      <div
        className={
          "mx-auto my-0 flex max-w-(--content-width) flex-col items-start justify-center gap-8"
        }
      >
        <div className="block w-[45%] font-sans text-sm leading-[175%] font-light">
          <p>{`Like what you're seeing here?`}</p>
          <br />
          <p>{`Have something you want to share with us, a joint project proposal, somethjign`}</p>
          <br />
          <p>{`Just let us know.`}</p>
          <p>Lost with care,</p>
        </div>
        <Signature />
      </div>
    </section>
  );
};
