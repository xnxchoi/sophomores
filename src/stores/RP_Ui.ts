"use client";

import type { PayloadLinkProps } from "@/components/core/Link/ReferencedLink";
import type { ViewportSizes } from "@/cssVariables";
import type { PageTransitionType } from "@/components/UX/Transition";
import type { Media } from "@/payload-types";
import type { Theme } from "@/providers/Theme/types";
import { getMenuPagePreviewKey, getPageTypeFromUrl } from "@/utilities/Helpers";
import { isEqual } from "lodash-es";
import type { Variant } from "motion/react";
import type { CollectionSlug, DataFromCollectionSlug } from "payload";
import type { CSSProperties, RefObject } from "react";
import { subscribeWithSelector } from "zustand/middleware";
import { createStore } from "zustand/vanilla";
import type { PageType } from "./Routing/RP_Voyageur";

type CommonLinkProps = Omit<PayloadLinkProps, "reference" | "url" | "type">;

export type CustomLink = { type: "custom"; url: string } & CommonLinkProps;
type RefCols = CollectionSlug;
export type ReferenceLink<T extends RefCols = RefCols> = {
  type: "reference";
  reference: {
    relationTo: T;

    value: string | DataFromCollectionSlug<T>;
  };
} & CommonLinkProps;
export type BackendLink<T extends PayloadLinkProps> = T["type"] extends "custom"
  ? CustomLink
  : ReferenceLink;

export type BackendLinkProps = {
  link: PayloadLinkProps;
};
type NavItem = {
  link: PayloadLinkProps & { url: string };
};
export type NavigationProps = NavItem[];

export type HA_UI = {
  globalSettings: {
    navigation: NavigationProps;
    footer: Record<string, unknown> | null;
  };
  viewportSize: ViewportSizes;
  viewportWidth: number;
  viewportHeight: number;
  headerTheme: string;
  canInteract: boolean;
  showFXFrame: boolean;
  sidebarOpen: boolean;
  snapPoints: Array<number | string>;
  activeSnapPoint: number | string;
  sideDrawerRendered: boolean;
  isDraggingSideDrawer: boolean;
  sideDrawerDragPosition: number;
  sidebarIsTransitioning: boolean;
  theme: Theme | string;
  showScrollIndicator: boolean;
  dropdownOpen: boolean;
  controlbarView: ControlbarView;
  /**
   * Whether the full-screen mobile SearchSheet is open. Independent of
   * `sidebarOpen` and `controlbarView` — the sheet is a sibling overlay,
   * not a drawer view. Always read alongside `setSearchSheetOpen` /
   * `toggleSearchSheetOpen`.
   */
  searchSheetOpen: boolean;
};
export type ControlbarView = "default" | "notifications" | "search" | "account";
export type HA_UI_ACT = {
  setSideDrawerRendered: (c: boolean) => void;
  toggleSideDrawerRendered: () => void;
  setGlobalSettings: (c: {
    navigation?: NavigationProps;
    footer?: Record<string, unknown>;
  }) => void;
  setViewportDimensions: (c: { width: number; height: number }) => void;
  setHeaderTheme: (nextState: HA_UI["headerTheme"]) => void;
  setFXFrameVisibility: (c: boolean) => void;
  setTheme: (c: string) => void;
  toggleTheme: () => void;
  setSideDrawerDragPosition: (
    nextState: HA_UI["sideDrawerDragPosition"]
  ) => void;
  setViewportSize: (nextState: HA_UI["viewportSize"]) => void;
  setIsDraggingSideDrawer: (nextState: HA_UI["isDraggingSideDrawer"]) => void;
  setSideDrawerOpen: (c: boolean) => void;
  setSideDrawerIsTransitioning: (
    nextState: HA_UI["sidebarIsTransitioning"]
  ) => void;
  toggleSideDrawer: () => void;
  setCanInteract: (c: boolean) => void;
  setShowScrollIndicator: (nextState: HA_UI["showScrollIndicator"]) => void;
  setDropdownOpen: (nextState: HA_UI["dropdownOpen"]) => void;
  setSnapPoints: (c: Array<number | string>) => void;
  setActiveSnapPoint: (c: number | string | null) => void;
  setControlbarView: (c: ControlbarView) => void;
  toggleControlbarView: (c: ControlbarView) => void;
  setSearchSheetOpen: (c: boolean) => void;
  toggleSearchSheetOpen: () => void;
};

export type HA_MENU = {
  navIsOpenDebounced: boolean;
  navIsOpen: boolean;
  navImageExpanded: boolean;
};
export type HA_MENU_ACT = {
  setNavIsOpenDebounced: (nextState: HA_MENU["navIsOpenDebounced"]) => void;
  setNavIsOpen: (nextState: HA_MENU["navIsOpen"]) => void;
  toggleMenu: () => void;
  setNavImageExpanded: (nextState: HA_MENU["navImageExpanded"]) => void;
};
export type HA_PAGE = {
  homepageIsScrollingMobile: boolean;
};
export type HA_PAGE_ACT = {
  setHomepageIsScrollingMobile: (
    nextState: HA_PAGE["homepageIsScrollingMobile"]
  ) => void;
};
export type HeaderTransitionType = "fade" | "slide" | null;
export type HeaderTransitionSet = {
  [x in "in" | "out"]: GSAPTimeline | null;
};

const tz = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  pointerEvents: "none",
  overflowX: "hidden",
  overflowY: "hidden"
};

const tU = {
  position: "relative",
  top: 0,
  left: 0,
  width: "100%",
  height: "auto",
  pointerEvents: "auto",
  overflowX: "visible",
  overflowY: "visible"
};
const dlay = 0.7;
type TransitionAnimation =
  | { [y in keyof CSSProperties]: CSSProperties[keyof CSSProperties] }
  | Variant;
type TransitionPhase = "entering" | "leaving" | "none";

export type SingleTransition = { [x in TransitionPhase]: Variant };
type TransitionMap = Record<PageTransitionType, SingleTransition>;
const transitionMappings: TransitionMap = {
  SHELL: {
    none: {},
    entering: { opacity: 1, transition: { duration: 0 } },
    leaving: { opacity: 1, transition: { duration: 0 } }
  },
  FADE: {
    none: {
      ...tz,
      opacity: "0"
    },
    entering: {
      ...tU,
      opacity: "1",
      transition: {
        ease: "easeIn",
        duration: 0.3,
        delay: dlay
      }
    },
    leaving: {
      ...tz,
      opacity: "0",
      transition: {
        delay: dlay,
        duration: 0.3,
        ease: "easeOut"
      }
    }
  },
  FROM_MENU: {
    none: {
      ...tz
    },
    entering: {
      ...tU,
      opacity: "1",
      transition: {
        duration: 0,
        delay: 0
      }
    },
    leaving: {
      transition: {
        duration: 0,
        delay: 0
      }
    }
  },
  CURTAIN: {
    none: {
      ...tz
    },
    entering: {
      ...tU,
      transition: {
        delay: 0,
        duration: 0
      }
    },
    leaving: {
      pointerEvents: "none",
      opacity: "0",
      position: "relative",
      transition: {
        delay: 0,
        duration: 0
      }
    }
  },
  LOST_PRODUCT: {
    none: {
      ...tz,
      y: "100svh",
      zIndex: 0,
      borderRadius: "4px"
    },
    entering: {
      ...tU,
      y: 0,
      opacity: "1",
      zIndex: 1,
      transition: {
        delay: 0,
        duration: 1.24,
        ease: [0.6, 0, 0.3, 1]
      }
    },
    leaving: {
      ...tz,
      scale: 0.5,
      scaleX: 0.9,
      borderRadius: "4px",
      opacity: "1",
      transition: {
        delay: 0,
        duration: 1.28,
        ease: [0.6, 0, 0.3, 1]
      }
    }
  },
  IMMEDIATE: {
    none: {},
    entering: {
      pointerEvents: "auto",
      opacity: "1",
      transition: {
        delay: 0,
        duration: 0.1,
        ease: "easeIn"
      }
    },
    leaving: {
      pointerEvents: "none",
      opacity: "0",
      transition: {
        delay: 0,
        duration: 0.1,
        ease: "easeOut"
      }
    }
  }
};
export type TransitionSteps = "start" | "complete";
export type PhaseStep = `${TransitionPhase}${Capitalize<TransitionSteps>}`;
type PhaseStepCallbackName = `on${Capitalize<PhaseStep>}`;
type PhaseCallbackName = `on${Capitalize<TransitionPhase>}`;
type PhaseRemoveCallbackName = `off${Capitalize<PhaseStep>}`;
export type TransitionState = {
  transitionAnimations: TransitionMap;
  currentPhase: TransitionPhase | null;
  currentStep: TransitionSteps | null;
} & {
  [x in PhaseStep]: Array<{
    id: string;
    callback: () => void;
    pageType: PageType;
    pageSlug: string[];
    once: boolean;
  }>;
};
export type TransitionAction = {
  [x in PhaseStepCallbackName]: (param: {
    callback: () => void;
    pageType: PageType;
    pageSlug: string[];
    once: boolean;
  }) => string;
} & {
  [x in PhaseRemoveCallbackName]: (id: string | string[]) => void;
} & {
  setTransitionAnimations: (transitionAnimations: TransitionMap) => void;
  setCurrentStep: (step: TransitionSteps | null) => void;
  setCurrentPhase: (phase: TransitionPhase | null) => void;
  addCallback: (
    callbackName: PhaseStep,
    param: {
      callback: () => void;
      pageType: PageType;
      pageSlug: string[];
      once: boolean;
    }
  ) => void;
  getCallback: (callbackName: PhaseStep) => Array<{
    callback: () => void;
    pageType: PageType;
    pageSlug: string[];
    once: boolean;
  }>;
  clearCallbacks: (callbackName: PhaseStep) => void;
  cleanCallbacks: (
    callbackName: PhaseStep,
    { pageType, slug }: { pageType: PageType; slug: string[] }
  ) => void;
  clearAllCallbacks: () => void;
};
export type RPT = TransitionState & TransitionAction;
const initTrans: TransitionState = {
  transitionAnimations: transitionMappings,
  currentPhase: "none",
  //starts null so that we can react to "start" sequences
  currentStep: null,
  enteringStart: [],
  enteringComplete: [],
  leavingStart: [],
  leavingComplete: [],
  noneStart: [],
  noneComplete: []
};
export const createTransStore = (initState: TransitionState = initTrans) => {
  return createStore<RPT>()((set, get) => ({
    ...initState,

    setCurrentPhase: (phase: TransitionPhase | null) =>
      set((state) => ({ ...state, currentPhase: phase })),
    setCurrentStep: (step: TransitionSteps | null) =>
      set((state) => ({ ...state, currentStep: step })),
    setTransitionAnimations: (transitionAnimations: TransitionMap) =>
      set((state) => ({
        ...state,
        transitionAnimations: transitionAnimations
      })),
    getCallback: (callbackName: PhaseStep) => {
      return get()[callbackName] || [];
    },
    onEnteringStart: (param) => {
      const { callback, once, pageType, pageSlug } = param;
      const id = crypto.randomUUID();
      set((state) => ({
        ...state,
        enteringStart: [
          ...state.enteringStart,
          { id, callback, once, pageType, pageSlug }
        ]
      }));
      return id;
    },
    onEnteringComplete: (param) => {
      const { callback, once, pageType, pageSlug } = param;
      const id = crypto.randomUUID();
      set((state) => ({
        ...state,
        enteringComplete: [
          ...state.enteringComplete,
          { id, callback, once, pageType, pageSlug }
        ]
      }));
      return id;
    },
    onLeavingStart: (param) => {
      const { callback, once, pageType, pageSlug } = param;
      const id = crypto.randomUUID();
      set((state) => ({
        ...state,
        leavingStart: [
          ...state.leavingStart,
          { id, callback, once, pageType, pageSlug }
        ]
      }));
      return id;
    },
    onLeavingComplete: (param) => {
      const { callback, once, pageType, pageSlug } = param;
      const id = crypto.randomUUID();
      set((state) => ({
        ...state,
        leavingComplete: [
          ...state.leavingComplete,
          { id, callback, once, pageType, pageSlug }
        ]
      }));
      return id;
    },
    onNoneStart: (param) => {
      const { callback, once, pageType, pageSlug } = param;
      const id = crypto.randomUUID();
      set((state) => ({
        ...state,
        noneStart: [
          ...state.noneStart,
          { id, callback, once, pageType, pageSlug }
        ]
      }));
      return id;
    },
    onNoneComplete: (param) => {
      const { callback, once, pageType, pageSlug } = param;
      const id = crypto.randomUUID();
      set((state) => ({
        ...state,
        noneComplete: [
          ...state.noneComplete,
          { id, callback, once, pageType, pageSlug }
        ]
      }));
      return id;
    },
    offEnteringStart: (id) => {
      set((state) => ({
        ...state,
        enteringStart: state.enteringStart.filter((c) => c.id !== id)
      }));
    },
    offEnteringComplete: (id) => {
      set((state) => ({
        ...state,
        enteringComplete: state.enteringComplete.filter((c) => c.id !== id)
      }));
    },
    offLeavingStart: (id) => {
      set((state) => ({
        ...state,
        leavingStart: state.leavingStart.filter((c) => c.id !== id)
      }));
    },
    offLeavingComplete: (id) => {
      set((state) => ({
        ...state,
        leavingComplete: state.leavingComplete.filter((c) => c.id !== id)
      }));
    },
    offNoneStart: (id) => {
      set((state) => ({
        ...state,
        noneStart: state.noneStart.filter((c) => c.id !== id)
      }));
    },
    offNoneComplete: (id) => {
      set((state) => ({
        ...state,
        noneComplete: state.noneComplete.filter((c) => c.id !== id)
      }));
    },
    addCallback: (phaseStep, param) => {
      const { callback, pageType, pageSlug } = param;
      const id = crypto.randomUUID();
      set((state) => ({
        ...state,
        [phaseStep]: [...state[phaseStep], { id, callback, pageType, pageSlug }]
      }));
    },
    clearCallbacks: (phaseStep) =>
      set((state) => ({
        ...state,
        [phaseStep]: []
      })),
    cleanCallbacks: (phaseStep, { pageType, slug }) =>
      set((state) => ({
        ...state,
        [phaseStep]: state[phaseStep].filter(
          (c) =>
            !c.once ||
            (c.once &&
              (!isEqual(c.pageType, pageType) || !isEqual(c.pageSlug, slug)))
        )
      })),
    clearAllCallbacks: () =>
      set((state) => ({
        ...state
      }))
  }));
};
export type HA_ANIMATION = {
  navIsTransitioning: boolean;
  transitionType: null | string | PageTransitionType;
  transitionOutType: null | PageTransitionType;
  navOpeningElement: HTMLElement | null;
  isPreloader: boolean;
  enablePreloaderAnimation: boolean;
  preloaderAnimationType: "FAST" | "SLOW";
  isAnimatingOutPreloader: boolean;
  showHeader: boolean;
  headerAnimations: Partial<{
    [transition in NonNullable<HeaderTransitionType>]: HeaderTransitionSet;
  }> | null;
  headerTransition: HeaderTransitionType;
  pageIsTransitioning: boolean;
  isTransitioningWipe: boolean;
  navigationPageItemData: NavItem[];
  navigationPageItemKeys: string[];
  navigationPageItemSelected: -1 | string;
  navigationPageItemsToFetch: any[];
  navigationPreviewMediaByKey: {
    [key: string]: null | { desktop: Media | null; mobile: Media | null };
  };
  navigationPageItemHovered: -1 | string;
  navigationPageIsTransitioning: boolean;
};
export type HA_ANIMATION_ACT = {
  setNavIsTransitioning: (l: boolean) => void;
  setPageIsTransitioning: (l: boolean) => void;
  setNavOpeningElement: (l: HTMLElement | null) => void;
  setIsPreloader: (isPreloader: boolean) => void;
  setPreloaderAnimationType: (type: "FAST" | "SLOW") => void;
  togglePreloaderAnimation: (state: boolean) => void;
  setHeaderAnimations: (
    c: Partial<{
      [type in NonNullable<HeaderTransitionType>]: {
        [direction in "in" | "out"]: GSAPTimeline;
      };
    }>
  ) => void;
  setHeaderVisibility: (c: boolean) => void;
  setHeaderTransition: (c: HeaderTransitionType) => void;
  setIsAnimatingOutPreloader: (isAnimatingOutPreloader: boolean) => void;
  setNavigationPageItemData: (c: NavItem[]) => void;
  setNavigationPageItemSelected: (c: -1 | string) => void;
  setNavigationPageIsTransitioning: (c: boolean) => void;
  setTransitionOutType: (c: PageTransitionType | null) => void;
  setIsTransitioningWipe: (l: boolean) => void;
  setNavigationPageItemsToFetch: (c: any[]) => void;
  setNavigationPreviewMediaByKey: (c: { [key: string]: any }) => void;
  setNavigationPageItemHovered: (c: -1 | string) => void;
};
const uiInitState: HA_UI = {
  sidebarOpen: false,
  sidebarIsTransitioning: false,
  sideDrawerRendered: true,
  isDraggingSideDrawer: false,
  viewportSize: "lg",
  snapPoints: [],
  activeSnapPoint: null!,
  sideDrawerDragPosition: 0,
  theme: "dark",
  canInteract: true,
  globalSettings: {
    navigation: [],
    footer: null
  },
  headerTheme: "",
  dropdownOpen: false,
  showFXFrame: true,
  showScrollIndicator: true,
  viewportWidth: 0,
  viewportHeight: 0,
  controlbarView: "default",
  searchSheetOpen: false
};

const navIn: HA_MENU = {
  navImageExpanded: false,
  navIsOpen: false,
  navIsOpenDebounced: false
};
const transIn: HA_ANIMATION = {
  navIsTransitioning: false,
  transitionType: null,
  transitionOutType: null,
  preloaderAnimationType: "FAST",
  isTransitioningWipe: false,
  isPreloader: false,
  pageIsTransitioning: false,
  navOpeningElement: null,
  isAnimatingOutPreloader: false,
  showHeader: true,
  headerAnimations: null,
  headerTransition: null,
  navigationPreviewMediaByKey: {},
  navigationPageItemsToFetch: [],
  navigationPageItemKeys: [],
  navigationPageItemData: [],
  navigationPageItemHovered: -1,
  navigationPageItemSelected: -1,
  navigationPageIsTransitioning: !1,
  enablePreloaderAnimation: true
};

const pageInit: HA_PAGE = {
  homepageIsScrollingMobile: false
};

export type HA_VLT = HA_UI & HA_MENU & HA_ANIMATION & HA_PAGE;
export type HA_ACT = HA_UI_ACT & HA_MENU_ACT & HA_ANIMATION_ACT & HA_PAGE_ACT;
export type HA_VAULT = HA_VLT & HA_ACT;
export const HA_INIT: HA_VLT = {
  ...uiInitState,
  ...navIn,
  ...transIn,
  ...pageInit
};
export type RafRaf = {
  raf: null | number | RefObject<number | null>;
};
export type RafAct = {
  addToRaf: (l: { key: string; callback: (l?: any) => void }) => void;
  removeFromRaf: (l: string) => void;
};
export type RAF = RafRaf & RafAct;
const rafInit = {
  raf: null
};
export const createRafStore = (
  actions: Partial<RafAct> = {},
  initState: RafRaf = rafInit
) => {
  return createStore<RAF>()((set) => ({
    addToRaf: () => {},
    removeFromRaf: () => {},
    ...actions,
    ...initState
  }));
};
export const createHAStore = (initState: HA_VLT = HA_INIT) => {
  return createStore<HA_VAULT>()(
    subscribeWithSelector((set, get) => ({
      ...initState,
      setNavOpeningElement: (l: HTMLElement | null) =>
        set({ navOpeningElement: l }),
      setSideDrawerRendered: (c: boolean) =>
        set((state) => ({ sideDrawerRendered: c })),
      toggleSideDrawerRendered: () =>
        set((state) => ({ sideDrawerRendered: !state.sideDrawerRendered })),
      setHeaderTheme: (c: string) => set((state) => ({ headerTheme: c })),
      setIsPreloader: (c: boolean) => set((state) => ({ isPreloader: c })),
      setFXFrameVisibility: (c: boolean) =>
        set((state) => ({ showFXFrame: c })),
      setIsAnimatingOutPreloader: (c: boolean) =>
        set((state) => ({ isAnimatingOutPreloader: c })),
      togglePreloaderAnimation: (c: boolean) =>
        set((state) => ({ enablePreloaderAnimation: c })),
      setPreloaderAnimationType: (c: "FAST" | "SLOW") =>
        set({ preloaderAnimationType: c }),
      setCanInteract: (c: boolean) =>
        set((state) => ({
          canInteract: c
        })),
      setViewportSize: (c: ViewportSizes) =>
        set((state) => ({ viewportSize: c })),
      setIsTransitioningWipe: (l: boolean) =>
        set((state) => ({ isTransitioningWipe: l })),
      setGlobalSettings: (c: {
        navigation?: Partial<NavigationProps>;
        footer?: Record<string, unknown> | null;
      }) =>
        set(
          (l) => ({
            ...l,
            globalSettings: {
              ...l.globalSettings,
              footer: c?.footer ?? l.globalSettings.footer,
              navigation: {
                ...l.globalSettings.navigation
              }
            }
          }),
          true
        ),
      setNavIsTransitioning: (l: boolean) =>
        set((state) => ({ navIsTransitioning: l })),
      setPageIsTransitioning: (l: boolean) =>
        set((state) => ({ pageIsTransitioning: l })),
      setTransitionOutType: (l: PageTransitionType | null) =>
        set((state) => ({ transitionOutType: l })),
      setNavigationPageItemData: (c: NavItem[]) =>
        set(
          (state) => ({
            ...state,
            navigationPageItemData: c,
            navigationPageItemKeys: c.map((l) => {
              if (l.link.type === "reference") {
                const xxx = l.link.url.split("/")[1];
                return getMenuPagePreviewKey("pages", xxx);
              }
              // const link =
              //   (l.link.reference &&
              //     l.link.reference.value &&
              //     (typeof l.link.reference.value === "object"
              //       ? l.link.reference.value.slug
              //       : `${l.link.reference.value}`)) ||
              //   "";
              const type = getPageTypeFromUrl(l.link.url);
              return getMenuPagePreviewKey(type, l.link.url.split("/")[1]!);
            })
          }),
          true
        ),
      setHeaderAnimations: (c) =>
        set((state) => ({
          headerAnimations: {
            ...state.headerAnimations,
            fade: {
              ...state.headerAnimations?.fade,
              in: c.fade?.in ?? state.headerAnimations?.fade?.in ?? null,
              out: c.fade?.in ?? state.headerAnimations?.fade?.in ?? null
            },
            slide: {
              ...state.headerAnimations?.slide,
              in: c.slide?.in ?? state.headerAnimations?.slide?.in ?? null,
              out: c.slide?.out ?? state.headerAnimations?.slide?.out ?? null
            }
          }
        })),
      setHeaderVisibility: (c: boolean) =>
        set((state) => ({
          showHeader: c
        })),
      setHeaderTransition: (c: HeaderTransitionType) =>
        set((state) => ({
          headerTransition: c
        })),
      setNavigationPreviewMediaByKey: (c) =>
        set({
          navigationPreviewMediaByKey: c
        }),
      setNavigationPageItemsToFetch: (c) =>
        set({
          navigationPageItemsToFetch: c
        }),
      setNavigationPageItemHovered: (c) =>
        set({
          navigationPageItemHovered: c
        }),
      setNavigationPageItemSelected: (c) =>
        set({
          navigationPageItemSelected: c
        }),
      setNavigationPageIsTransitioning: (c) =>
        set({
          navigationPageIsTransitioning: c
        }),

      setControlbarView: (controlbarView) => set({ controlbarView }),
      toggleControlbarView: (view) =>
        set((state) => ({
          ...state,
          // Tapping the active view a second time returns to default.
          controlbarView: state.controlbarView === view ? "default" : view
        })),

      setSearchSheetOpen: (searchSheetOpen) => set({ searchSheetOpen }),
      toggleSearchSheetOpen: () =>
        set((state) => ({ searchSheetOpen: !state.searchSheetOpen })),

      setSideDrawerOpen: (openMenu: boolean) =>
        set((state) => {
          const { snapPoints, activeSnapPoint, sidebarOpen } = state;
          const isChanged = openMenu !== sidebarOpen;
          if (!isChanged) {
            return state;
          }
          const snapPoint = openMenu ? 1 : snapPoints[0]!;
          const newState = {
            ...state,
            sidebarOpen: openMenu
          };
          if (activeSnapPoint != snapPoint) {
            newState.activeSnapPoint = snapPoint;
          }
          return newState;
        }),
      setSideDrawerIsTransitioning: (sidebarIsTransitioning) =>
        set({ sidebarIsTransitioning }),
      toggleSideDrawer: () =>
        set((state) => {
          const { snapPoints, activeSnapPoint, sidebarOpen } = state;
          const toState = !sidebarOpen;
          const newPoint = toState ? 1 : snapPoints[0]!;
          const newState = {
            ...state,
            sidebarOpen: toState
          };
          if (activeSnapPoint != newPoint) {
            newState.activeSnapPoint = newPoint;
          }
          return newState;
        }),
      setIsDraggingSideDrawer: (isDraggingSideDrawer) =>
        set({ isDraggingSideDrawer }),
      setSideDrawerDragPosition: (sideDrawerDragPosition) =>
        set({ sideDrawerDragPosition }),
      setNavIsOpen: (navIsOpen) => set({ navIsOpen }),
      toggleMenu: () =>
        set((state) => ({ ...state, navIsOpen: !state.navIsOpen })),
      setNavIsOpenDebounced: (navIsOpenDebounced) =>
        set({ navIsOpenDebounced }),
      setDropdownOpen: (dropdownOpen: boolean) => set({ dropdownOpen }),
      setShowScrollIndicator: (showScrollIndicator) =>
        set({ showScrollIndicator }),
      setHomepageIsScrollingMobile: (homepageIsScrollingMobile) =>
        set({ homepageIsScrollingMobile }),
      setNavImageExpanded: (navImageExpanded) => set({ navImageExpanded }),
      setTheme: (l: string) => set((state) => ({ theme: l })),
      toggleTheme: () =>
        set((state) => ({
          ...state,
          theme: state.theme === "light" ? "dark" : "light"
        })),
      setViewportDimensions: (c: { width: number; height: number }) =>
        set((state) => ({ viewportWidth: c.width, viewportHeight: c.height })),
      setSnapPoints: (c: Array<number | string>) =>
        set((state) => {
          const { snapPoints, activeSnapPoint, sidebarOpen } = state;
          //@todo this considers all arrays with identical value of entries 'equal', even if they may differ in order
          if (isEqual(snapPoints, c)) {
            return state;
          }

          const newPoint = sidebarOpen ? c[c.length - 1]! : c[0]!;
          const newState = {
            ...state,
            snapPoints: [...c]
          };
          if (activeSnapPoint != newPoint) {
            newState.activeSnapPoint = newPoint;
          }
          return {
            ...newState
          };
        }),
      setActiveSnapPoint: (c: number | string | null) =>
        set((state) => {
          const { snapPoints, activeSnapPoint, sidebarOpen } = state;
          let toSnapPoint = c ?? snapPoints[0]!;
          const isChanged = activeSnapPoint != toSnapPoint;
          if (!isChanged) {
            return state;
          }
          let stateInference = snapPoints.indexOf(toSnapPoint);
          if (stateInference < 0) {
            stateInference = 0;
          }
          toSnapPoint = snapPoints[stateInference]!;

          const sideBarIsOpen = stateInference !== 0;

          const newState = {
            ...state
          };
          if (activeSnapPoint !== toSnapPoint) {
            newState.activeSnapPoint = toSnapPoint;
          }
          if (sideBarIsOpen !== sidebarOpen) {
            newState.sidebarOpen = sideBarIsOpen;
          }

          return newState;
        })
    }))
  );
};
