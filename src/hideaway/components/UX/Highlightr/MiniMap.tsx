import { useDomCursor } from "@/hideaway/components/core/cursorWrapper";
import { useHighlighter } from "@/hideaway/components/UX/Highlightr/providers/HighlighterProvider";
import { HighlightPalette } from "@/hideaway/components/UX/Highlightr/stores";
import { SPRING_EASE, TWEEN_EASE } from "@/hideaway/constants/animations";
import { useWindowResize } from "@/hideaway/utilities/use_window_resize";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { useLenis } from "lenis/react";
import { animate } from "motion";
import {
  HTMLMotionProps,
  MotionValue,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform
} from "motion/react";
import * as m from "motion/react-m";
import {
  type ComponentPropsWithoutRef,
  type MouseEvent,
  RefObject,
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState
} from "react";
import { useShallow } from "zustand/shallow";

const MiniMapItem = ({
  onMouseEnter: onEnter,
  onMouseLeave: onLeave,
  style,
  scaleValue,
  targets,
  contentContainer,
  ...props
}: HTMLMotionProps<"div"> & {
  targets: HTMLElement[];
  scaleValue: MotionValue<number>;
  contentContainer: RefObject<HTMLDivElement>;
}) => {
  const hTop = useMotionValue(window.innerHeight);
  const lenis = useLenis();
  const scrollToY = useMotionValue(0);
  const translateYV = useTransform(() => hTop.get() * scaleValue.get());
  const lastResize = useWindowResize({
    debounce: 100,
    detectHeightChange: true
  });
  const translateY = useSpring(translateYV, {
    ...SPRING_EASE.power2.inOut,
    duration: 0.2
  });
  const setUp = useEffectEvent((cont: HTMLDivElement) => {
    const placement = targets
      .filter((r) => r.isConnected)
      .reduce((acc, t) => Math.min(t.offsetTop, acc), window.innerHeight);

    const contOff = cont.offsetTop;
    const contDimension = cont.offsetHeight;
    const y = contOff + placement - 250;
    const top = (placement / contDimension) * window.innerHeight * 0.85;
    scrollToY.set(y);
    hTop.set(top);
  });
  const onClick = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      lenis?.scrollTo(scrollToY.get());
    },
    [lenis, scrollToY]
  );
  const { onMouseEnter, onMouseLeave } = useDomCursor({
    onEnter,
    onLeave
  });
  useEffect(() => {
    const cont = contentContainer.current;
    if (!cont) return;
    setUp(cont);
  }, [contentContainer]);
  useEffect(() => {
    const cont = contentContainer.current;
    setUp(cont);
  }, [contentContainer, lastResize]);
  return (
    <m.div
      className="pointer-events-auto absolute top-0 left-0 z-10 h-[3px] w-full border-0 border-b-[1px] border-foreground/20 hover:-top-[3px]"
      whileHover={{
        scaleY: 3,
        scaleX: 1.2
      }}
      {...props}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      style={{
        backgroundColor:
          "color-mix(in oklch, var(--currentHighlight) 85%, var(--color-faded-white))",
        translateY
      }}
    ></m.div>
  );
};
export const MiniMap = ({
  scaleRatio,
  contentContainer,
  ...props
}: HTMLMotionProps<"div"> & {
  contentContainer: RefObject<HTMLDivElement>;

  scaleRatio: number;
}) => {
  const highlights = useHighlighter(useShallow((r) => r.highlights));
  const highlightMap = useMemo(() => {
    return Array.from(
      highlights.values().map(({ els }) => els as HTMLElement[])
    );
  }, [highlights]);
  const currentColor = useHighlighter(useShallow((r) => r.currentColor));
  const mapBackdropRef = useRef<HTMLDivElement>(null!);
  const mapTrackRef = useRef<HTMLDivElement>(null!);
  const highMaps = useRef<HTMLDivElement[]>([]);
  const lastResize = useWindowResize({
    detectVisibilityChange: false,
    detectHeightChange: true
  });
  // const [scale_, setScale_] = useState(1);
  const scaleValue = useMotionValue(scaleRatio);
  useEffect(() => {
    // setScale_(scaleRatio);
    scaleValue.set(scaleRatio);
  }, [lastResize, scaleRatio, scaleValue]);

  //
  // useGSAP(() => {
  //   highMaps.current.forEach((e, t) => {
  //     const y = highlightMap[t]?.top;
  //     if (!y) return;
  //     gsap.to(e, {
  //       translateY: y * scale_,
  //       duration: 0.1,
  //       ease: "power2.inOut"
  //     });
  //   });
  // }, [scale_]);
  return (
    <m.div
      className="pointer-events-none fixed top-24 right-[40px] bottom-20 z-[250] w-[24px] origin-[0_0] scale-x-50 overflow-hidden transition-transform duration-200"
      ref={mapTrackRef}
      {...props}
    >
      <div
        ref={mapBackdropRef}
        className="absolute h-full w-full origin-[100%_0]"
      ></div>
      {highlightMap.map((e, t) => (
        <MiniMapItem
          targets={e}
          scaleValue={scaleValue}
          contentContainer={contentContainer}
          key={"highMap" + t}
          color={currentColor}
        />
      ))}
    </m.div>
  );
};
