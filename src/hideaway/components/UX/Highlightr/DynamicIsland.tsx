"use client";
import { useDomCursor } from "@/hideaway/components/core/cursorWrapper";
import {
  type HTMLMotionProps,
  type MotionValue,
  useTransform
} from "motion/react";
import * as m from "motion/react-m";

export const DynamicBreadcrumb = ({
  title,
  progress,
  children,
  ...props
}: Omit<HTMLMotionProps<"div">, "ref"> & {
  title: string;
  progress: MotionValue<number>;
}) => {
  const { onMouseEnter, onMouseLeave } = useDomCursor({});

  const strokeDashArray = useTransform(progress, (v) => `${v}px 1px`);

  return (
    <m.div
      initial={{
        y: "100%",
        opacity: 0
      }}
      transition={{
        type: "spring",
        bounce: 0.4,
        visualDuration: 0.4
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      animate={{
        y: 0,
        opacity: 1
      }}
      exit={{
        y: "100%",
        opacity: 0
      }}
      className={"z-[120]"}
    >
      <m.div
        className="relative z-[120] overflow-hidden rounded-[18px] p-1"
        {...props}
        transition={{ type: "spring", bounce: 0.25 }}
        whileHover={{
          scale: 1.1,
          borderColor: "oklch(from var(--neutral-white) l c h/0.001)"
        }}
      >
        <div className="absolute top-0 left-0 z-[120] h-full w-full bg-muted-off-background/35"></div>
        <m.div
          className="absolute top-0 left-0 z-[119] h-full w-full opacity-[0.001]"
          transition={{ type: "spring", bounce: 0.25 }}
          variants={{
            active: {
              opacity: 1,
              backdropFilter: "blur(20px) saturate(1.15)"
            },
            hidden: {
              backdropFilter: "blur(0px) saturate(1)",
              opacity: 0.001
            }
          }}
          animate={"active"}
          initial={"hidden"}
          exit={"hidden"}
        ></m.div>
        <div className="relative z-[120] flex w-fit max-w-[400px] min-w-[150px] origin-[50%_50%_0px] transform-none flex-col flex-nowrap items-start justify-center gap-2 overflow-hidden rounded-[12px] border-[oklab(0.7716_-0.00387748_-0.0277302/0.10)] px-[12px] py-[6px] select-none">
          <div className="filter-blur-0 transform-origin-[50%_50%_0px] flex w-full transform-none items-center gap-4 opacity-100">
            <div className="h-8 w-8 origin-[50%_50%_0px] rounded-[50%]">
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                style={{ transform: "rotate(-90deg)" }}
              >
                <defs>
                  <linearGradient id="col" gradientUnits="userSpaceOnUse">
                    <stop offset="10%" stopColor="var(--faded-fg)" />
                    <stop offset="85%" stopColor="var(--faded-d-gray)" />
                  </linearGradient>
                </defs>
                <m.circle
                  className={"stroke-off-l-gray/100 dark:stroke-off-d-gray/100"}
                  cx="10"
                  cy="10"
                  r="8"
                  strokeWidth="1.25"
                  fill="none"
                  strokeLinecap="round"
                ></m.circle>
                <m.circle
                  className={"stroke-[url(#col)]"}
                  cx="10"
                  cy="10"
                  r="8"
                  strokeWidth="1.25"
                  fill="none"
                  strokeDasharray={strokeDashArray}
                  strokeLinecap="round"
                  pathLength="1"
                  strokeDashoffset="0px"
                ></m.circle>
              </svg>
            </div>
            <div
              className={
                "m-0 w-full overflow-hidden p-0 text-center align-middle font-sans text-base font-light tracking-[0.3px] text-ellipsis whitespace-nowrap"
              }
            >
              {title}
            </div>
            {children && (
              <m.div
                className={"flex h-full items-center justify-center gap-2"}
              >
                {children}
              </m.div>
            )}
          </div>
        </div>
      </m.div>
    </m.div>
  );
};
