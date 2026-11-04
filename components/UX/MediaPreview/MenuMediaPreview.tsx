"use client";

import { TWEEN_EASE } from "@/constants/animations";
import { useCurrentPage } from "@/hooks/useCurrentPage";
import { cn } from "@/lib/utils";
import { useRPStore } from "@/providers/RP_Pro";
import { useIsMobile } from "@/utilities/getBreakpoints";
import { useWindowResize } from "@/utilities/use_window_resize";
import { gsap } from "gsap";
import { AnimationSequence } from "motion";
import { animate, HTMLMotionProps, useMotionValue } from "motion/react";
import * as m from "motion/react-m";
import {
  ComponentProps,
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";
import { useShallow } from "zustand/shallow";

// Types and Interfaces
interface PreviewItem extends Partial<HTMLDivElement> {
  resetElement: () => void;
  setVisibility: () => void;
}

interface SizingValues {
  width: number;
  height: number;
  scale: number;
  y: number;
}

interface AnimationConfig {
  scale: number;
  y: number;
  duration: number;
}

interface MenuMediaPreviewProps {
  className?: string;
}

// Constants
const ANIMATION_CONFIG = {
  DURATION_IN: 0.4,
  DEBOUNCE_DELAY: 100,
  MOBILE_SCALE_MULTIPLIER: 1.32,
  DESKTOP_SCALE_MULTIPLIER: 1.1,
  ANIMATION_DURATION: 1.2,
  HIDE_DURATION: 0.4,
  SHOW_DELAY: 0.2
} as const;

const EASING = {
  POWER4_IN_OUT: "power4.inOut"
} as const;

/**
 * Custom hook for handling visibility change events with debouncing
 */
const useVisibilityChangeDebounced = (
  debounceMs: number = ANIMATION_CONFIG.DEBOUNCE_DELAY
) => {
  const [lastTimeout, setLastTimeout] = useState(0);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const handleVisibilityChange = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        setLastTimeout(Date.now());
      }, debounceMs);
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      window.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [debounceMs]);

  return lastTimeout;
};

/**
 * Custom hook for calculating default sizing values based on navigation element and screen size
 */
const useDefaultSizing = (navOpeningElement: HTMLElement | null) => {
  const { isMobile: isMobileDevice } = useIsMobile();
  return useCallback((): SizingValues | null => {
    if (!navOpeningElement) return null;

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    if (isMobileDevice) {
      const width = windowWidth;
      const height = ANIMATION_CONFIG.MOBILE_SCALE_MULTIPLIER * windowWidth;
      const elementTop = navOpeningElement.getBoundingClientRect().top || 0;
      const elementHeight = navOpeningElement.offsetHeight || 0;

      return {
        width,
        height,
        scale: 1,
        y: elementTop - (0.5 * height - 0.5 * elementHeight)
      };
    }

    return {
      width: windowWidth,
      height: windowHeight,
      scale:
        ANIMATION_CONFIG.DESKTOP_SCALE_MULTIPLIER *
        (navOpeningElement.offsetHeight / windowHeight),
      y: 0
    };
  }, [navOpeningElement, isMobileDevice]);
};

/**
 * Custom hook for preview sizing calculations
 */
const usePreviewSizing = (
  getDefaultSizingValues: () => SizingValues | null,
  isMobile: boolean,
  navIsOpen: boolean
) => {
  return useCallback((): AnimationConfig => {
    const defaultConfig: AnimationConfig = {
      scale: 1,
      y: window.innerHeight,
      duration: navIsOpen ? ANIMATION_CONFIG.ANIMATION_DURATION : 0
    };

    if (!isMobile) return defaultConfig;

    const sizingValues = getDefaultSizingValues();
    if (!sizingValues) return defaultConfig;

    const windowHeight = window.innerHeight;
    const heightDifference = windowHeight - sizingValues.height;
    let scale = windowHeight / sizingValues.height;

    if (scale < 1) scale = 1;

    return {
      scale,
      y: 0.5 * heightDifference + windowHeight + 50,
      duration: navIsOpen ? ANIMATION_CONFIG.ANIMATION_DURATION : 0
    };
  }, [getDefaultSizingValues, isMobile, navIsOpen]);
};

/**
 * MenuMediaPreview Component
 * Handles the preview display for navigation menu items with smooth animations
 */
export const MenuMediaPreview = ({
  className,
  children,
  ...props
}: ComponentProps<"div">) => {
  // Store state
  const navOpeningElement = useRPStore((state) => state.navOpeningElement);
  const navigationPreviewMediaByKey = useRPStore(
    (state) => state.navigationPreviewMediaByKey
  );
  const navigationPageItemSelected = useRPStore(
    (state) => state.navigationPageItemSelected
  );
  const navIsOpen = useRPStore((state) => state.navIsOpen);

  // Refs
  const currentStateRef = useRef<boolean>(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const previewItems = useRef<PreviewItem[]>([]);
  const selectedItemIndex = useRef<string | number>(-1);
  const fallbackRef = useRef<PreviewItem>(null!);

  // Hooks
  const windowResize = useWindowResize();
  const { isMobile } = useIsMobile();
  const { currentPageKey } = useCurrentPage();
  const visibilityChangeTimestamp = useVisibilityChangeDebounced();
  const getDefaultSizingValues = useDefaultSizing(navOpeningElement);
  const getPreviewSizing = usePreviewSizing(
    getDefaultSizingValues,
    isMobile,
    navIsOpen
  );

  // Computed values
  const hasSomethingToShow = Boolean(
    navigationPreviewMediaByKey[navigationPageItemSelected] || currentPageKey
  );

  // Update current state ref
  useEffect(() => {
    currentStateRef.current = navIsOpen;
  }, [navIsOpen]);

  /**
   * Shows the preview with fade in animation
   */
  const showPreview = useCallback(() => {
    if (!previewRef.current) return;

    gsap.set(previewRef.current, {
      autoAlpha: 1
    });
  }, []);

  /**
   * Resets preview to initial position
   */
  const resetPreview = useCallback(() => {
    if (!previewRef.current) return;

    const animationConfig = getPreviewSizing();
    gsap.killTweensOf(previewRef.current);

    const method = navIsOpen ? "to" : "set";
    gsap[method](previewRef.current, {
      ...animationConfig,
      duration: navIsOpen ? 1 : 0,
      delay: navIsOpen ? ANIMATION_CONFIG.SHOW_DELAY : 0
    });
  }, [navIsOpen, getPreviewSizing]);

  /**
   * Animates preview to show position
   */
  const animateToShowPosition = useCallback(() => {
    if (!previewRef.current) return;

    const sizingValues = getDefaultSizingValues();
    if (!sizingValues) return;

    gsap.killTweensOf(previewRef.current);
    gsap.to(previewRef.current, {
      ...sizingValues,
      duration: ANIMATION_CONFIG.DURATION_IN,
      delay: navIsOpen ? ANIMATION_CONFIG.SHOW_DELAY : 0,
      ease: EASING.POWER4_IN_OUT
    });
  }, [getDefaultSizingValues, navIsOpen]);

  /**
   * Shows preview after window resize with proper positioning
   */
  const showPreviewAfterResize = useCallback(() => {
    if (!previewRef.current) return;

    gsap.killTweensOf(previewRef.current);

    const onComplete = () => {
      if (fallbackRef.current) {
        fallbackRef.current.setVisibility();
      }

      previewItems.current.forEach((item) => {
        item.resetElement();
      });

      showPreview();
    };

    const animationProps = {
      delay: navIsOpen ? ANIMATION_CONFIG.SHOW_DELAY : 0,
      duration: ANIMATION_CONFIG.ANIMATION_DURATION,
      ease: EASING.POWER4_IN_OUT,
      onComplete
    };

    if (isMobile) {
      const sizingConfig = getPreviewSizing();
      gsap.to(previewRef.current, {
        scale: sizingConfig.scale,
        y: sizingConfig.y,
        ...animationProps
      });
    } else {
      gsap.to(previewRef.current, {
        y: window.innerHeight,
        scale: 1,
        ...animationProps
      });
    }
  }, [isMobile, getPreviewSizing, showPreview, navIsOpen]);

  /**
   * Hides the preview with fade out animation
   */
  const hidePreview = useCallback(() => {
    if (!previewRef.current) return;

    gsap.to(previewRef.current, {
      autoAlpha: 0,
      duration: ANIMATION_CONFIG.HIDE_DURATION,
      onComplete: () => {
        resetPreview();

        if (fallbackRef.current) {
          fallbackRef.current.resetElement();
        }

        previewItems.current.forEach((item) => {
          item.resetElement();
        });

        showPreview();
      }
    });
  }, [resetPreview, showPreview]);

  /**
   * Handles selection change with smooth transition
   */
  const handleSelectionChange = useCallback(() => {
    if (!previewRef.current) return;

    gsap.killTweensOf(previewRef.current);

    const onComplete = () => {
      if (fallbackRef.current) {
        fallbackRef.current.setVisibility();
      }

      previewItems.current.forEach((item) => {
        item.resetElement();
      });

      showPreview();
    };

    const baseAnimationProps = {
      delay: navIsOpen ? ANIMATION_CONFIG.SHOW_DELAY : 0,
      duration: ANIMATION_CONFIG.ANIMATION_DURATION,
      ease: EASING.POWER4_IN_OUT
    };

    if (isMobile) {
      const sizingValues = getDefaultSizingValues();
      if (!sizingValues) return;

      const windowHeight = window.innerHeight;
      const heightDifference = windowHeight - sizingValues.height;
      const sizingConfig = getPreviewSizing();

      gsap.to(previewRef.current, {
        scale: sizingConfig.scale,
        y: 0.5 * heightDifference,
        ...baseAnimationProps,
        onComplete: () => {
          gsap.to(previewRef.current, {
            y: sizingConfig.y,
            duration: ANIMATION_CONFIG.ANIMATION_DURATION,
            ease: EASING.POWER4_IN_OUT
          });
        }
      });
    } else {
      gsap.to(previewRef.current, {
        scale: 1,
        ...baseAnimationProps,
        onComplete: () => {
          gsap.to(previewRef.current, {
            y: window.innerHeight,
            duration: ANIMATION_CONFIG.ANIMATION_DURATION,
            ease: EASING.POWER4_IN_OUT,
            onComplete
          });
        }
      });
    }
  }, [
    isMobile,
    getDefaultSizingValues,
    getPreviewSizing,
    showPreview,
    navIsOpen
  ]);

  // Effect for nav open/close state changes
  useEffect(() => {
    if (navIsOpen) {
      animateToShowPosition();
    } else {
      resetPreview();

      if (fallbackRef.current) {
        fallbackRef.current.resetElement();
      }

      previewItems.current.forEach((item) => {
        item.resetElement();
      });

      showPreview();
    }
  }, [
    resetPreview,
    visibilityChangeTimestamp,
    animateToShowPosition,
    showPreview,
    navIsOpen
  ]);

  // Effect for window resize and selection changes
  useEffect(() => {
    if (navIsOpen) {
      animateToShowPosition();
      return;
    }

    const hasSelectionChanged =
      selectedItemIndex.current !== navigationPageItemSelected &&
      navigationPageItemSelected !== -1;

    if (hasSelectionChanged || !navIsOpen) {
      if (hasSomethingToShow) {
        showPreviewAfterResize();
      } else {
        hidePreview();
      }
    }
  }, [
    windowResize,
    resetPreview,
    navIsOpen,
    animateToShowPosition,
    showPreviewAfterResize,
    navigationPageItemSelected,
    hasSomethingToShow,
    hidePreview
  ]);

  return (
    <div
      ref={previewRef}
      className={cn(
        "menu__preview-preview invisible z-[1] data-active:visible",
        className
      )}
      data-active={navIsOpen}
      {...props}
    >
      {children}
    </div>
  );
};
// export const MenuGradientFrame = ({
//   children,
//   className,
//   ...props
// }: HTMLMotionProps<"div">) => {
//   // Store state
//   const navOpeningElement = useRPStore((state) => state.navOpeningElement);
//   const {isMobile}=useIsMobile();
//   const width=useMotionValue(window.innerWidth),height=useMotionValue(window.innerHeight),
//     scale=useMotionValue(1),y=useMotionValue(0);
//   const mobileState=useMotionValue(isMobile)
//   useEffect(
//     () => {
//       mobileState.set(isMobile)
//     },
//     [isMobile,mobileState]
//   )
//   const navIsOpen = useRPStore(useShallow((state) => state.navIsOpen));
//   const navOpenState=useMotionValue(navIsOpen);
//   useEffect(
//     () => {
//       navOpenState.set(navIsOpen)
//     },
//     [navIsOpen,navOpenState]
//   )
//   /**
//    * Resets preview to initial position
//    */
//   const resetPreview = useCallback(() => {
//  const nv=navOpenState.get();
//     const isMobileDevice = mobileState.get();
//
//     const windowWidth = window.innerWidth;
//     const windowHeight = window.innerHeight;
//     const defaultConfig= {
//    at:0,
//
//       duration: nv ? 1 : 0,
//       delay: nv? 0.2 : 0
//     };
//
//     if (!navOpeningElement) {return;}
//       animate([
//         scale,1,
//         {
//           ...defaultConfig,
//           type:"tween"
//         }
//       ],[
//         y,window.innerHeight,{
//         ...defaultConfig,
//         type:"tween"
//         }
//       ])
//
//     if (isMobileDevice) {
//       const
//       const
//       const elementTop = navOpeningElement.getBoundingClientRect().top || 0;
//       const elementHeight = navOpeningElement.offsetHeight || 0;
//       const def={
//         scale: 1,
//           y: window.innerHeight,
//       };
//       animate(
//         [width , windowWidth,{
//           duration: nv? 1.2 : 0,
//
//
//     }],
//           [height,  1.32 * windowWidth,{
//         }
//     }]
//         [scale,1,{}],
//         [y, elementTop - (0.5 * height - 0.5 * elementHeight),{}]
//       ) {
//     }
//
//      {
//       width: windowWidth,
//       height: windowHeight,
//       scale:
//         ANIMATION_CONFIG.DESKTOP_SCALE_MULTIPLIER *
//         (navOpeningElement.offsetHeight / windowHeight),
//       y: 0
//     };
//
//
//      const heightDifference = windowHeight - sizingValues.height;
//
//
//     animate([
//       scale,Math.max(1,windowHeight / sizingValues.height),{
//       duration: nv ? 1.2 : 0,
//
//     }],[
//       y, 0.5 * heightDifference + windowHeight + 50,{
//       duration: nv ? 1.2 : 0,
//       }
//     ])
//   }, [ getPreviewSizing]);
//
//   /**
//    * Animates preview to show position
//    */
//   const animateToShowPosition = useCallback(() => {
//     const windowWidth = window.innerWidth;
//     const windowHeight = window.innerHeight;
//     if (!navOpeningElement) return ;
//
//     const nv=navOpenState.get();
//     const commoner={
//       duration: 0.4,
//       delay: nv ? 0.2 : 0,
//       ease: TWEEN_EASE.power4.inOut,
//       at:0
//     }
//     const ismobile=mobileState.get();
//     const seq:AnimationSequence=[
//       [  width,windowWidth,{
//       ...commoner,
//         type:"tween"
//       }],
//         [height, ismobile ? 1.32 * windowWidth : windowHeight,{
//       ...commoner,
//           type:"tween"
//         }],
//       [scale, ismobile?1:1.1 * (navOpeningElement.offsetHeight / windowHeight),{
//         ...commoner,
//         type:"tween"
//       }],
//       [y, ismobile
//       ? (navOpeningElement.getBoundingClientRect().top || 0) -
//       (0.66 * windowWidth -
//         0.5 * (navOpeningElement.offsetHeight || 0))
//       : 0,{
//         ...commoner,
//         type:"tween"
//       }]
//   ];
//     animate(seq)
//   },[navOpenState,mobileState,navIsOpen]);
//
//   /**
//    * Shows preview after window resize with proper positioning
//    */
//   const showPreviewAfterResize = useCallback(() => {
//     const isMobile = mobileState.get();
//     const navIsOpen = navOpenState.get();
//     const animationProps = {
//       delay: navIsOpen ?0.2 : 0,
//       duration: 1.2,
//       at:0,
//       ease: TWEEN_EASE.power4.inOut,
//     };
//     const seq:AnimationSequence=[]
//     if (isMobile) {
//       const sizingConfig = getPreviewSizing();
//       seq.push([
//         scale,sizingConfig.scale,{
//         ...animationProps,
//         type:"tween"
//       }
//       ],[ y,sizingConfig.y,{
//         ...animationProps,
//         type:"tween"
//       }])
//     } else {
//       seq.push([
//         [y,window.innerHeight,{
//         ...animationProps,
//         type:"tween"
//         }],
//         [scale,1,{
//         ...animationProps,
//         type:"tween"
//         }]
//       ])
//     }
//     animate(seq)
//   }, [ getPreviewSizing, showPreview]);
//
//   /**
//    * Hides the preview with fade out animation
//    */
//   const hidePreview = useCallback(() => {
//
//
//     animate(, {
//       autoAlpha: 0,
//       duration: ANIMATION_CONFIG.HIDE_DURATION,
//       onComplete: () => {
//         resetPreview();
//
//
//         showPreview();
//       }
//     });
//   }, [resetPreview, showPreview]);
//
//   return (
//     <m.div className={cn("menu__preview-gradient-frame", className)} {...props}>
//       {children}
//     </m.div>
//   );
// };;
