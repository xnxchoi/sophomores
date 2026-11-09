import { Button, MotionBtn } from "@/hideaway/components/core/Button";
import { useHighlighter } from "@/hideaway/components/UX/Highlightr/providers/HighlighterProvider";
import { useHighlightSidebar } from "@/hideaway/components/UX/Highlightr/providers/sideBarProvider";
import { TWEEN_EASE } from "@/hideaway/constants/animations";
import { useWindowResize } from "@/hideaway/utilities/use_window_resize";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import * as m from "motion/react-m";
import {
  type ComponentPropsWithRef,
  type MouseEvent,
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState
} from "react";
import { useShallow } from "zustand/shallow";
import {
  AnimatePresence,
  HTMLMotionProps,
  useAnimate,
  useMotionValue
} from "motion/react";
export const ResponseMap = ({
  responseNodes
}: {
  responseNodes: Array<{ top: number; reference: string }>;
}) => {
  const responseNodeEls = useRef<HTMLDivElement[]>([]);
  const lastResize = useWindowResize({
    debounce: 100,
    detectHeightChange: true,
    detectVisibilityChange: true
  });
  // const { contextSafe } = useGSAP();

  // const updatePositions = useMemo(
  //   () =>
  //     contextSafe((v: HTMLDivElement[]) => {
  //       gsap.killTweensOf(v);
  //       gsap.to(v, {
  //         autoAlpha: 0,
  //         duration: 0.2,
  //         ease: "power2.inOut",
  //         onComplete: () => {
  //           v.forEach((r) => {
  //             const reference = r.getAttribute("data-reference");
  //             if (!reference) return;
  //             const el = document.querySelector(
  //               'mark[data-reference="' + reference + '"]'
  //             ) as HTMLElement | null;
  //             if (!el) return;
  //             gsap.set(el, {
  //               top: r.offsetTop
  //             });
  //           });
  //         }
  //       });
  //       gsap.to(v, {
  //         autoAlpha: 1,
  //         delay: 0.3,
  //         duration: 0.2,
  //         ease: "power2.inOut"
  //       });
  //     }),
  //   [contextSafe]
  // );
  // useEffect(() => {
  //   const r = responseNodeEls.current;
  //   updatePositions(r);
  //   return () => {
  //     gsap.killTweensOf(r);
  //   };
  // }, [lastResize, updatePositions]);
  return (
    <AnimatePresence initial={true} mode={"popLayout"}>
      {responseNodes.map((r, i) => (
        <ResponseIndicator
          key={r.reference + "Response"}
          ref={(el) => {
            el && (responseNodeEls.current[i] = el);
          }}
          responseNode={r}
        />
      ))}
    </AnimatePresence>
  );
};
const ResponseIndicator = (
  props: HTMLMotionProps<"div"> & {
    responseNode: { top: number; reference: string };
  }
) => {
  const {
    ref,
    style,
    responseNode: { reference: refer, top: topFromProps },
    ...rest
  } = props;
  const highlights = useHighlighter(useShallow((r) => r.highlights));
  const setOpen = useHighlightSidebar("setOpen");
  const setContent = useHighlightSidebar("setContent");
  const topValue = useMotionValue(topFromProps);
  const op = useMotionValue(0);

  const referencedMark = useRef<HTMLElement | null>(null);

  const lastResize = useWindowResize({
    debounce: 100,
    detectHeightChange: true
  });
  const [resizedTime, setResizedTime] = useState(0);
  const initialize = useEffectEvent(() => {
    const el = document.querySelector(
      'mark[data-reference="' + refer + '"]'
    ) as HTMLElement | null;
    if (el) {
      referencedMark.current = el;
      topValue.set(el.offsetTop);
      setResizedTime(lastResize);
    }
  });
  useEffect(() => {
    initialize();
  }, []);
  useEffect(() => {
    const el = referencedMark.current;
    if (el) {
      topValue.set(el.offsetTop);
      setResizedTime(lastResize);
    }
  }, [lastResize, topValue]);
  const onClick = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      const tg = highlights.get(refer) || null;
      if (tg && tg.memo && tg.memo.length) {
        setContent({
          author: tg.author,
          createdAt: tg.createdAt,
          memo: tg.memo,
          quote: tg.quote!,
          reference: tg.reference,
          updatedAt: tg.updatedAt
        });
      } else {
        setContent(null);
      }
      setOpen(true);
    },
    [highlights, setOpen, refer, setContent]
  );

  return (
    resizedTime === lastResize && (
      <m.div
        style={style}
        initial={{
          opacity: 0
        }}
        animate={{
          opacity: 1
        }}
        exit={{
          opacity: 0
        }}
        transition={{
          type: "tween",
          ease: TWEEN_EASE.power2.inOut,
          duration: 0.2,
          delay: 0.1
        }}
        className={
          "absolute mt-1 flex max-w-full items-center gap-3 whitespace-nowrap"
        }
        ref={ref}
        {...rest}
      >
        <div className={"relative"}>
          <MotionBtn
            onClick={onClick}
            className="z-30 flex aspect-4/3 h-[var(--text-base)] w-auto items-center justify-center rounded-[5px_5px_5px_0] border border-muted bg-background px-[3px] py-[2px] text-center text-[calc(var(--text-base)*0.55)] whitespace-nowrap dark:border-muted-faded-foreground dark:bg-faded-background"
          >
            <span
              className={
                "absolute -bottom-[3px] left-[0.5px] z-20 h-[4.5px] w-[4.5px] bg-background [clip-path:polygon(0_0,0_100%,100%_0)] dark:bg-faded-background"
              }
            />
            <span
              className={
                "absolute bottom-[-6px] -left-[0.5px] z-15 h-[7px] w-[6px] bg-muted [clip-path:polygon(0_0,0_100%,100%_0)] dark:bg-muted-faded-foreground"
              }
            />
            <span className="leading-[1.5] uppercase">1</span>
          </MotionBtn>
        </div>
      </m.div>
    )
  );
};
