import { useRPStore } from "@/providers/RP_Pro";
import { HTMLAttributes, ReactNode, useEffect, useRef, useState } from "react";
import { useLenis } from "lenis/react";
import { wait } from "@/utilities/wait";
import { useIsMobile } from "@/utilities/getBreakpoints";
import { cn } from "@/lib/utils";
import { transitionMappings } from "@/components/UX/Transition";
import { gsap } from "gsap";

export type SectionPreviewProps = Partial<HTMLAttributes<HTMLDivElement>> & {
  sections: Array<any>;
  minimizePageDuringOpenNav: (l: HTMLElement, c: boolean) => void;
  children?: ReactNode;
  footerType?: string;
  type?: string;
  slug: string;
  id: string;
};
export const SectionPreview = (props: SectionPreviewProps) => {
  let {
      id,
      sections,
      minimizePageDuringOpenNav,
      children,
      footerType,
      type,
      slug
    } = props,
    navigationPageItemHovered = useRPStore((l) => l.navigationPageItemHovered),
    navigationPageItemSelected = useRPStore(
      (l) => l.navigationPageItemSelected
    ),
    setNavigationPageItemHovered = useRPStore(
      (l) => l.setNavigationPageItemHovered
    ),
    setNavigationPageItemSelected = useRPStore(
      (l) => l.setNavigationPageItemSelected
    ),
    setNavigationPageIsTransitioning = useRPStore(
      (l) => l.setNavigationPageIsTransitioning
    ),
    setPageIsTransitioning = useRPStore((l) => l.setPageIsTransitioning),
    navIsOpen = useRPStore((l) => l.navIsOpen),
    setTransitionOutType = useRPStore((l) => l.setTransitionOutType),
    setCanInteract = useRPStore((l) => l.setCanInteract),
    M = sections[0],
    sectionPreviewRef = useRef<HTMLDivElement>(null!),
    sectionsContainerRef = useRef(null),
    scroll = useLenis(),
    [isAnimated, setIsAnimated] = useState(!1),
    [hasFiredForNow, setHasFiredForNow] = useState(!1),
    someBooleanRef = useRef(!1),
    transitionOutType = useRPStore((l) => l.transitionOutType),
    [needsUpdated, setNeedsUpdated] = useState(!1),
    lastSelectedNavigationItem = useRef<string | -1>(-1),
    inNeedOfUpdateRef = useRef(!1),
    [z, U] = useState(!0),
    [isCurrentlyTheSelectedItem, setIsCurrentlyTheSelectedItem] = useState(!1),
    [visuallyShowOnlyFirstSection, setVisuallyShowOnlyFirstSection] =
      useState(!0),
    [renderMinimal, setRenderMinimal] = useState(!0),
    navigationPreviewMediaByKey = useRPStore(
      (l) => l.navigationPreviewMediaByKey
    ),
    isNotPortfolio =
      !!navigationPreviewMediaByKey[id] && "portfolioItem" !== type,
    { isMobile } = useIsMobile();
  (useEffect(() => {
    isAnimated &&
      sectionPreviewRef.current &&
      minimizePageDuringOpenNav &&
      minimizePageDuringOpenNav(sectionPreviewRef.current, navIsOpen);
  }, [navIsOpen, minimizePageDuringOpenNav, isAnimated]),
    useEffect(() => {
      (lastSelectedNavigationItem.current === id &&
        navigationPageItemSelected !== id &&
        ((inNeedOfUpdateRef.current = !0), setNeedsUpdated(!0)),
        (lastSelectedNavigationItem.current = navigationPageItemSelected),
        setTimeout(() => {
          setIsCurrentlyTheSelectedItem(navigationPageItemSelected === id);
        }, 100));
    }, [navigationPageItemSelected, id]));
  let setupPosition = () => {
    inNeedOfUpdateRef.current ||
      someBooleanRef.current ||
      !sectionPreviewRef.current ||
      gsap.set(sectionPreviewRef.current, {
        pointerEvents: "none"
      });
  };
  if (
    (useEffect(() => {
      if (!needsUpdated) return;
      let l = 0.7,
        c = 0,
        d = null === transitionOutType ? 1 : 0;
      ("MENU_TO_PAGE" === transitionOutType
        ? (l = 1e-5)
        : "HOMEPAGE_TO_CASE_STUDY" === transitionOutType
          ? ((l =
              transitionMappings.HOMEPAGE_TO_CASE_STUDY.exit.transition
                .duration),
            (c =
              transitionMappings.HOMEPAGE_TO_CASE_STUDY.exit.transition.delay +
              0.15))
          : "IMMEDIATE" === transitionOutType && ((l = 1e-5), (c = 0)),
        gsap.killTweensOf(sectionPreviewRef.current),
        setTimeout(
          () => {
            (setIsAnimated(!1),
              setupPosition(),
              (inNeedOfUpdateRef.current = !1),
              setNeedsUpdated(!1),
              U(!1),
              setTimeout(() => {
                U(!0);
              }, 50),
              setVisuallyShowOnlyFirstSection(!0),
              setRenderMinimal(!0));
          },
          (c + l) * 1e3
        ),
        gsap.to(sectionPreviewRef.current, {
          autoAlpha: d,
          duration: l,
          delay: c
        }));
    }, [navigationPageItemSelected, id, transitionOutType, needsUpdated]),
    useEffect(() => {
      if (
        needsUpdated ||
        !sectionPreviewRef.current ||
        navigationPageItemSelected === id ||
        !navIsOpen
      )
        return;
      let l = navigationPageItemHovered === id;
      (gsap.killTweensOf(sectionPreviewRef.current),
        gsap.to(sectionPreviewRef.current, {
          autoAlpha: l ? 1 : 0,
          duration: 0.1,
          delay: l ? 0 : 0.1,
          zIndex: l ? 5 : 4
        }));
    }, [
      navigationPageItemHovered,
      id,
      navigationPageItemSelected,
      navIsOpen,
      needsUpdated
    ]),
    useEffect(() => {
      !needsUpdated &&
        navigationPageItemSelected === id &&
        sectionPreviewRef.current &&
        sectionsContainerRef.current &&
        (someBooleanRef.current ||
          ((someBooleanRef.current = !0),
          gsap.killTweensOf([
            sectionPreviewRef.current,
            sectionsContainerRef.current
          ]),
          gsap.set(sectionPreviewRef.current, {
            zIndex: 10
          }),
          gsap.to(sectionPreviewRef.current, {
            autoAlpha: 1,
            ease: "power3.inOut",
            duration: 1.2,
            start: () => {
              setHasFiredForNow(!0);
            },
            onComplete: () => {
              let fire = async () => {
                (gsap.set(sectionPreviewRef.current, {
                  zIndex: 1
                }),
                  setRenderMinimal(!1),
                  await wait(40),
                  setIsAnimated(!0),
                  setVisuallyShowOnlyFirstSection(!1),
                  await wait(40),
                  setHasFiredForNow(!1),
                  setNavigationPageItemHovered(-1),
                  setNavigationPageIsTransitioning(!1),
                  setPageIsTransitioning(!1),
                  setCanInteract(!0),
                  ScrollTrigger.refresh(),
                  scroll && scroll.resize(),
                  setTimeout(() => {
                    scroll && scroll.resize();
                  }, 300));
              };
              fire();
            }
          }),
          gsap.to(sectionsContainerRef.current, {
            ease: "power3.inOut",
            duration: 1.2,
            pointerEvents: "all"
          })));
    }, [
      navigationPageItemSelected,
      id,
      setNavigationPageItemHovered,
      setNavigationPageItemSelected,
      setNavigationPageIsTransitioning,
      setPageIsTransitioning,
      setTransitionOutType,
      setCanInteract,
      scroll,
      needsUpdated,
      isNotPortfolio
    ]),
    useEffect(() => {
      sectionsContainerRef.current &&
        !needsUpdated &&
        navigationPageItemSelected !== id &&
        (someBooleanRef.current || setupPosition());
    }, [
      navigationPageItemHovered,
      needsUpdated,
      navigationPageItemSelected,
      navIsOpen,
      id
    ]),
    !M ||
      !z ||
      !navIsOpen ||
      (isMobile && navIsOpen && !(hasFiredForNow || isAnimated)))
  )
    return null;
  let showAllSections =
    (isCurrentlyTheSelectedItem ||
      navigationPageItemSelected === id ||
      needsUpdated) &&
    isAnimated;
  return (
    <div
      className={cn("section__preview", { animatedIn: isAnimated })}
      id={id}
      ref={sectionPreviewRef}
      data-themed="background-color"
      data-page={"from-menu__".concat(id)}
    >
      <div className="sectionsContainer" ref={sectionsContainerRef}>
        {children}
      </div>
    </div>
  );
};
