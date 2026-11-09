"use client";
import { FeaturedCard } from "@/blocks/heros/ArtHero/FeatureHero";
import { Link } from "@/hideaway/components/core/Link/Link";
import { ArticleBookmarkButton } from "@/hideaway/components/UX/Bookmark";
import { Paywall, type PaywallTeaser } from "@/hideaway/components/UX/Paywall/Paywall";
import { MiniMap } from "@/hideaway/components/UX/Highlightr/MiniMap";
import {
  fetchUserHighlights,
  useHighlighter
} from "@/hideaway/components/UX/Highlightr/providers/HighlighterProvider";
import { ResponseMap } from "@/hideaway/components/UX/Highlightr/responseMap";
import { TWEEN_EASE } from "@/hideaway/constants/animations";
import { useRPSession } from "@/hideaway/lib/auth/session/RP_SessionProvider";
import { cn } from "@/lib/utils";
import type { User } from "@/payload-types";
import RichText from "../RichText";
import { useNavEvents } from "@/hideaway/providers/Navigation/_client-nav-events";
import { useCursor } from "@/hideaway/providers/RP_Pro";
import type { SingleArticle } from "@/types/collections/posts";
import { AuthorOverview } from "@/types/collections/users";
import { motionCallback } from "@/hideaway/utilities/motionHelpers";
import { useWindowResize } from "@/hideaway/utilities/use_window_resize";
import {
  autoUpdate,
  flip,
  inline,
  offset,
  shift,
  useDismiss,
  useFloating,
  useInteractions,
  useTransitionStatus
} from "@floating-ui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type Lenis from "lenis";
import { useLenis } from "lenis/react";
import { AnimationSequence } from "motion";
import {
  animate,
  AnimatePresence,
  useMotionValue,
  useMotionValueEvent,
  useScroll
} from "motion/react";
import { useTransitionState } from "next-transition-router";

import {
  type ComponentPropsWithoutRef,
  type ComponentPropsWithRef,
  type MouseEvent,
  ReactNode,
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { useShallow } from "zustand/shallow";
import { Button } from "@/hideaway/components/core/Button";
import { SignedFooter } from "../Signature";
import { AmbientAudioProvider } from "@/hideaway/components/UX/AmbientAudio/AmbientAudioProvider";
import { AmbientAudioWidget } from "@/hideaway/components/UX/AmbientAudio/AmbientAudioWidget";
import { DynamicBreadcrumb } from "./DynamicIsland";
import { FloatHighlightMenu } from "./HighlightMenu";
import { usePrivateNote } from "./PrivateHighlights";
import { useArticle } from "./providers/ArticleProvider";
import { useFloater } from "./providers/FloatProvider";
import { useRanger } from "./providers/RangerProvider";
import type { HighlightColors } from "./stores";
import "./styles/_highlightr.scss";
import type {
  FetchedCitation,
  HighlightedRange,
  ProcessedRangy
} from "./types";
import {
  ensureRange,
  getAnchestorIdentifyableNode,
  isMarkable
} from "./utils/highlight-helpers";

export type RangeRect = {
  top: number;
  left: number;
  right: number;
  width: number;
};
export const Narrateur = ({ post }: { post: SingleArticle }) => {
  return (
    <AmbientAudioProvider>
      <Article post={post} />
    </AmbientAudioProvider>
  );
};

const Article = ({
  post: { id, slug, author, ...rest }
}: {
  post: SingleArticle;
}) => {
  return (
    <div
      className={
        "rp_story z-120 mb-[15vh] w-screen bg-faded-white pb-[20px] leading-[1.28] dark:bg-faded-black"
      }
      data-themed="background-color,color"
    >
      <div
        className="pointer-events-none absolute top-0 right-[24px] left-[24px] z-0 h-full w-[calc(100%-48px)] border-0 border-x border-solid border-x-muted-faded-foreground/20 bg-faded-white lg:right-[27px] lg:left-[27px] lg:w-[calc(100%-54px)] dark:bg-faded-black"
        style={{
          borderImage: "initial"
        }}
      />
      <ReadInternal post={{ id, slug, author, ...rest }} />
      <div
        className="relative top-0 z-100 mt-0 -mb-[15vh] flex h-[16vh] w-screen items-center justify-center"
        style={{
          backgroundImage: `linear-gradient(to bottom, oklch(from var(--faded-bg) l c h/1) 22%, oklch(from var(--faded-bg) l c h/0.75) 40%, oklch(from var(--faded-bg) l c h/0.5) 50%, oklch(from var(--faded-bg) l c h/0.15) 65%, oklch(from var(--faded-bg) l c h/0.05) 72%, oklch(from var(--faded-bg) l c h/0.001) 96%)`
        }}
      >
        <div className="absolute top-0 left-0 z-50 h-px w-screen bg-linear-to-r from-muted-faded-foreground/15 from-10% via-muted-faded-foreground/75 via-50% to-muted-faded-foreground/15 to-90%" />
      </div>
    </div>
  );
};

export type BaseGhostUserField = Extract<
  keyof User,
  "id" | "name" | "image" | "displayUsername" | "slug"
>;
export const GhostUser = (
  userOverrides?: Pick<User, BaseGhostUserField>,
  additionalFields?: Pick<User, Exclude<keyof User, BaseGhostUserField>>
) =>
  ({
    ...(additionalFields || {}),
    id: "0",
    name: "Ghost",
    image: "",
    displayUsername: "Ghost",
    slug: "/404",
    ...(userOverrides || {})
  }) as Partial<Omit<User, BaseGhostUserField>> &
    Required<Pick<User, BaseGhostUserField>>;
type AV<A extends Record<string, unknown>> = {
  -readonly [key in keyof A]: A[key];
};
type VirtualDOMRect = AV<Omit<DOMRect, "toJSON">>;

const ReadInternal = ({ post }: { post: SingleArticle }) => {
  const { id: postId, content: postContent, disabled: d, locked, slug } = post;
  const valueRef = useRef(postId);
  useEffect(() => {
    valueRef.current = postId;
  }, [postId]);
  const slugRef = useRef(slug);
  useEffect(() => {
    slugRef.current = slug;
  }, [slug]);
  const { direction } = useNavEvents();
  const [naved, setNaved] = useState(true);
  useEffect(() => {
    setNaved(direction === null);
  }, [direction]);
  const user = useRPSession(useShallow((r) => r.id as string | null));
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);
  const collection = useArticle(useShallow((r) => r.collection));
  const [enableHighlight, setEnableHighlight] = useState(
    !!user && !d && !locked
  );
  const contentRef = useRef<HTMLDivElement>(null!);
  const ranger = useRanger((r) => r.ranger);
  const setTargetContainer = useRanger((r) => r.setTargetContainer);
  const classApplier = useRanger((r) => r.classApplier);
  const containerRef = useRef<HTMLDivElement>(null!);
  const wrapperRef = useRef<HTMLDivElement>(null!);
  const { isReady } = useTransitionState();
  const visi = useFloater(useShallow((r) => r.open));
  const setVisi = useFloater((r) => r.setOpen);
  const { refs, floatingStyles, context } = useFloating({
    placement: "top",
    open: visi,
    onOpenChange: setVisi,
    middleware: [offset(10), inline(), shift(), flip()],
    whileElementsMounted: autoUpdate
  });
  useEffect(() => {
    if (!visi) {
      refs.setReference(null);
    }
  }, [visi, refs]);
  const { status, isMounted } = useTransitionStatus(context);
  const prefs = usePrivateNote((r) => r.refs);
  const dismiss = useDismiss(context);
  const { getFloatingProps } = useInteractions([dismiss]);

  const [responseNodes, setResponseNodes] = useState<
    Array<{ top: number; reference: string }>
  >([]);
  const [privateNodes, setPrivateNodes] = useState<
    Array<{ top: number; reference: string }>
  >([]);
  const { scrollYProgress } = useScroll({
    target: contentRef,
    offset: ["start end", "end center"]
  });
  const { scrollYProgress: wrapperScroll } = useScroll({
    target: wrapperRef,
    offset: ["start end", "end center"]
  });
  const shownDynamicIsland = useFloater((r) => r.shown);
  const [isAtEnd, setAtEnd] = useState(wrapperScroll.get() > 0.1);
  const lastRun = useRef(0);
  const lastVale = useRef(isAtEnd);
  useMotionValueEvent(wrapperScroll, "change", (cur) => {
    const now = performance.now();
    if (now - lastRun.current < 60) {
      return;
    }
    const val = cur < 1 && cur >= 0.1;
    if (val !== lastVale.current) {
      lastRun.current = now;
      lastVale.current = val;
      setAtEnd(val);
    }
  });

  const setCurrentColor = useHighlighter((r) => r.setCurrentColor);
  const qc = useQueryClient();
  const colorUpdater = useMutation({
    onSuccess: ([newColor, _]) => {
      qc.setQueryData(["color"], (old: HighlightColors) => {
        return newColor;
      });
      setCurrentColor(newColor);
    },
    mutationFn: async ({
      color,
      user
    }: {
      color: HighlightColors;
      user: string;
    }) =>
      await fetch(`/api/payload-preferences/highlight-colors`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          value: color
        }),
        credentials: "include"
      }).then(async (r) => {
        if (r.ok) {
          const res = (await r.json()) as {
            message: string;
            doc: {
              user: string;
              userCollection: "users" | "admins";
              key: string;
              value: HighlightColors;
            };
          };
          if (res.doc && "value" in res.doc && res.doc.value) {
            return [res.doc.value, user] as [HighlightColors, string];
          }
        }
        throw new Error("Update failed");
      })
  });
  useEffect(() => {
    setEnableHighlight(!!user && !d);
  }, [user, d]);
  const {
    data: savedHighlights,
    isLoading: hLoading,
    isPending: hPending
  } = useQuery({
    placeholderData: [] as FetchedCitation[],
    queryKey: [
      "savedHighlights",
      { value: postId, collection, userId: user!, slug }
    ],
    queryFn: async ({
      queryKey: [_, { value: id, collection: col }]
    }: {
      queryKey: [
        string,
        {
          value: string;
          collection: "posts" | "surf";
          userId: string;
          slug: string;
        }
      ];
    }) =>
      await fetchUserHighlights({
        collection: col,
        id
      }),
    enabled: enableHighlight,
    staleTime: Infinity,
    gcTime: 60 * 1000 * 5
  });

  const lastResize = useWindowResize({
    debounce: 100,
    detectHeightChange: true
  });

  const [containerBounds, setContainerBounds] = useState(0.25);
  const scr = useLenis();
  const addHighlighter = useHighlighter((r) => r.addHighlight);
  const clearHighlights = useHighlighter((r) => r.clear);

  useEffect(() => {
    const cont = contentRef.current;
    if (cont) {
      const ratio = window.innerHeight / cont.offsetHeight;
      ratioRef.current = Math.max(0.25, ratio);
      setContainerBounds(ratio);
    }
  }, [lastResize, scr]);

  const currentColor = useHighlighter(useShallow((r) => r.currentColor));
  const lastColorRef = useRef(currentColor);

  const currentColorRef = useRef<HighlightColors>(currentColor);
  const highlights = useHighlighter(useShallow((r) => r.highlights));
  const existingRefs = useRef(highlights);
  useEffect(() => {
    if (highlights !== existingRefs.current) {
      existingRefs.current = highlights;
    }
  }, [highlights]);
  const focusedHighlight = useHighlighter(
    useShallow((r) => r.focusedHighlight)
  );
  const setFocusedHighlight = useHighlighter((r) => r.setFocusedHighlight);

  const ratioRef = useRef(1);

  const setPrivOpen = usePrivateNote((r) => r.setOpen);
  const setPrivView = usePrivateNote((r) => r.setView);
  const setPrivMemo = usePrivateNote((r) => r.setMemo);

  const updateDOMRect = useCallback(
    (a: VirtualDOMRect, t: Element): VirtualDOMRect => {
      const b = t.getBoundingClientRect();
      const right = Math.min(a.right, b.right);
      const left = Math.min(a.left, b.left);
      const height = Math.min(a.height, b.height);
      const width = right - left;
      const y = Math.min(a.y, b.y);
      const bottom = Math.max(a.bottom, b.bottom);
      const top = Math.min(a.top, b.top);
      const x = Math.min(a.x, b.x);
      return {
        top,
        left,
        right,
        width,
        height,
        y,
        bottom,
        x
      };
    },
    []
  );
  useEffect(() => {
    lastColorRef.current = currentColorRef.current;
    currentColorRef.current = currentColor;
  }, [currentColor]);
  const getHighlightsRect = useCallback(
    (e: HighlightedRange) => {
      let a: VirtualDOMRect = {
        top: 0,
        left: 0,
        right: 0,
        width: 0,
        height: 0,
        bottom: 0,
        x: 0,
        y: 0
      };
      const r = e.els[0];
      if (r) {
        a = r.getBoundingClientRect();
        e.els.forEach((e: Element) => {
          a = updateDOMRect(a, e);
        });
      }
      return a;
    },
    [updateDOMRect]
  );
  const getHighlightsRects = useCallback((e: HighlightedRange) => {
    const a = e.els[0];
    if (a) {
      return a.getClientRects();
    }
    return e.range.nativeRange.getClientRects();
  }, []);

  const handleHighlightClick = useCallback(
    (e: Event) => {
      e.stopPropagation();
      if (!e.currentTarget) return;
      const target = e.currentTarget as Element;
      const ref = target.getAttribute("data-reference");
      setFocusedHighlight(ref);
    },
    [setFocusedHighlight]
  );
  useEffect(() => {
    //We only handle cases where a highlight is focused, because null cases vary in expected float menu visibility
    if (focusedHighlight) {
      if (
        focusedHighlight.private &&
        focusedHighlight.memo &&
        focusedHighlight.memo.length > 0
      ) {
        const ance = getAnchestorIdentifyableNode(
          focusedHighlight.els[0] as Node
        );
        if (ance) {
          prefs.setReference(ance);
          setPrivMemo(focusedHighlight.memo ?? "");
          setPrivView("view");
          setPrivOpen(true);
        }
      }
      refs.setReference({
        getBoundingClientRect: () => getHighlightsRect(focusedHighlight),
        getClientRects: () => getHighlightsRects(focusedHighlight)
      });

      setVisi(true);
    }
  }, [
    focusedHighlight,
    getHighlightsRect,
    getHighlightsRects,
    prefs,
    refs,
    setPrivMemo,
    setPrivOpen,
    setPrivView,
    setVisi
  ]);
  const setCursor = useCursor((r) => r.setCursorState);
  const onEn = useCallback(() => {
    setCursor("FOCUS");
  }, [setCursor]);
  const onExit = useCallback(() => {
    setCursor(null);
  }, [setCursor]);

  const changeCurrentHighlightColor = useCallback(
    (colorWay: HighlightColors) => {
      if (!userRef.current) return;
      colorUpdater.mutate({ color: colorWay, user: userRef.current });
    },
    [colorUpdater]
  );
  const lastRangeAt = useRef<rangy.RangyRange | null>(null);

  const containerMouseUp = useCallback(() => {
    const base = contentRef.current;
    if (!base) return;
    const e = ranger.getSelection();
    const t = ensureRange(e);
    if (!t) {
      setFocusedHighlight(null);
      setVisi(false);
      refs.setReference(null);
      lastRangeAt.current = null;
      return;
    }
    if (isMarkable(e) && t && "nativeRange" in t) {
      if (!t.collapsed && base.contains(e.anchorNode)) {
        setFocusedHighlight(null);
        refs.setReference({
          getBoundingClientRect: () => t.nativeRange.getBoundingClientRect(),
          getClientRects: () => t.nativeRange.getClientRects()
        });
        const ance = getAnchestorIdentifyableNode(e.anchorNode!) as HTMLElement;
        prefs.setReference(ance);
        setPrivView("edit");
        setVisi(true);
      }
      lastRangeAt.current = t;
    } else {
      setFocusedHighlight(null);
      setVisi(false);
      refs.setReference(null);
      prefs.setReference(null);
      lastRangeAt.current = null;
    }
  }, [prefs, ranger, refs, setFocusedHighlight, setPrivView, setVisi]);

  const updateResponseNodes = useCallback(
    (highlighter: Map<string, HighlightedRange>) => {
      const highlighters = highlighter.values();
      const b: Array<{
        top: number;
        reference: string;
        memo: string;
        quote: string;
        author: AuthorOverview;
        updatedAt: string;
        createdAt: string;
      }> = [];
      const c: Array<{
        top: number;
        reference: string;
        memo: string;
        quote: string;
        author: AuthorOverview;
        updatedAt: string;
        createdAt: string;
      }> = [];
      highlighters.forEach((e) => {
        let n = 0;
        e.els.forEach((t, i) => {
          const tt = (t as HTMLElement).offsetTop;
          if (i > 0) {
            n = Math.min(n, tt);
          } else {
            n = tt;
          }
        });
        if (e.memo && e.memo.length > 0) {
          if (e?.private) {
            const el = e.els[0] as HTMLElement;
            const pa = el.closest(
              '[data-selectable="true"]'
            ) as HTMLElement | null;
            pa && (n = pa.offsetTop);
          }
          const pass = {
            quote:
              e.quote ||
              `${e.selection.before}${e.selection.text}${e.selection.after}`,
            top: n,
            reference: e.reference,
            memo: e.memo,
            author: e.author,
            updatedAt: e.updatedAt,
            createdAt: e.createdAt
          };
          e.private ? c.push(pass) : b.push(pass);
        }
      });
      if (b.length > 0) {
        setResponseNodes(b);
      } else {
        setResponseNodes([]);
      }
      if (c.length > 0) {
        setPrivateNodes(c);
      } else {
        setPrivateNodes([]);
      }
    },
    []
  );
  const fc = useRef(focusedHighlight);
  useEffect(() => {
    fc.current = focusedHighlight;
  }, [focusedHighlight]);

  const updaterC = useCallback(
    (highlights: Map<string, HighlightedRange>, cont: HTMLDivElement) => {
      cont.removeEventListener("mouseup", containerMouseUp, false);
      cont.addEventListener("mouseup", containerMouseUp, false);
      const highlightedNodes = cont.querySelectorAll(".highlighted");
      highlightedNodes.forEach((e) => {
        e.removeEventListener("click", handleHighlightClick);
        e.removeEventListener("mouseenter", onEn);
        e.removeEventListener("mouseleave", onExit);
        e.addEventListener("mouseenter", onEn);
        e.addEventListener("mouseleave", onExit);
        e.addEventListener("click", handleHighlightClick);
      });
      // updateMiniMap(highlights);
      updateResponseNodes(highlights);
    },
    [
      containerMouseUp,
      handleHighlightClick,
      onEn,
      onExit,
      // updateMiniMap,
      updateResponseNodes
    ]
  );
  const initializeReader = useEffectEvent(() => {
    const cont = contentRef.current;
    if (!cont) return;
    if (!isReady) return;

    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        updaterC(highlights, cont);
      })
    );
    return () => {
      cont.removeEventListener("mouseup", containerMouseUp, false);
      const highlightedNodes = cont.querySelectorAll(".highlighted");
      highlightedNodes.forEach((e) => {
        e.removeEventListener("click", handleHighlightClick);
        e.removeEventListener("mouseenter", onEn);
        e.removeEventListener("mouseleave", onExit);
      });
    };
  });
  useEffect(() => {
    const resetter = initializeReader();
    return () => {
      resetter?.();
    };
  }, [highlights, isReady]);

  const addListeners = useCallback(
    (targets: HTMLElement[]) => {
      targets.forEach((e) => {
        e.addEventListener("click", handleHighlightClick);
      });
    },
    [handleHighlightClick]
  );
  const removeListeners = useCallback(
    (targets: HTMLElement[]) => {
      targets.forEach((e) => {
        e.classList.remove("highlighted");
        e.removeEventListener("click", handleHighlightClick);
      });
    },
    [handleHighlightClick]
  );
  const palettes = useMemo(
    () => ({
      BLUE: "84.43% 0.065 210.91",
      ORANGE: "78.6% 0.1658 74.9677",
      YELLOW: "85% 0.161 82.9",
      GREEN: "91% 0.228 124.65"
    }),
    []
  );

  const updateColeurs = useCallback(
    (props: {
      targets: HTMLElement[];
      fromColor: HighlightColors;
      toColor: HighlightColors;
    }) => {
      const { targets, fromColor, toColor } = props;
      const from = palettes[fromColor];
      const to = palettes[toColor];
      const sequence: AnimationSequence = [
        [motionCallback(() => removeListeners(targets)), { duration: 0 }],
        [
          targets,
          {
            backgroundImage: `linear-gradient(to left, oklch(${from}/.01) 0%, okclh(${from}/.1) 40%, oklch(${to}/.01) 50%, oklch(${to}/.85) 100%)`
          },
          {
            type: "tween",
            ease: TWEEN_EASE.power2.inOut,
            duration: 0.2,
            delay: 0.05,
            at: 0
          }
        ],
        [
          motionCallback(
            () => (
              targets.forEach((e) => e.classList.add("highlighted")),
              addListeners(targets)
            )
          ),
          { duration: 0 }
        ],
        [targets, { backgroundImage: "none" }]
      ];
      animate(sequence);
    },
    [addListeners, palettes, removeListeners]
  );

  useEffect(() => {
    const targets = Array.from(highlights.values()).reduce(
      (r, e) => [...r, ...(e.els as HTMLElement[])],
      [] as HTMLElement[]
    );
    targets.length > 0 &&
      updateColeurs({
        targets,
        fromColor: lastColorRef.current,
        toColor: currentColor
      });
  }, [highlights, currentColor, updateColeurs]);

  const lastVisi = useRef(visi);
  useEffect(() => {
    if (lastVisi.current !== visi) {
      if (!visi) setCursor(null);
    }
    lastVisi.current = visi;
  }, [visi, setCursor]);

  const findTextNode = useCallback((e: Node, offsetValue: number) => {
    let a = 0;
    const traverseNodes = (e: Node): null | { node: Text; offset: number } => {
      if (e.nodeType === Node.TEXT_NODE) {
        const tt = e as Text;
        if (a + tt.length >= offsetValue) {
          return {
            node: tt,
            offset: offsetValue - a
          };
        }
        a += tt.length;
      } else {
        for (const t of e.childNodes) {
          const result = traverseNodes(t);
          if (result) {
            return result;
          }
        }
      }
      return null;
    };
    return traverseNodes(e);
  }, []);
  const applyHighlightCallback = useCallback(
    (t: ProcessedRangy) => {
      const base = contentRef.current;
      if (!base) return;
      const { text: a } = t.selection;
      const n = base.textContent?.indexOf(a) || -1;
      if (n === -1) {
        return false;
      }
      const i = n + a.length;
      const o = findTextNode(base, n);
      const s = findTextNode(base, i);
      if (!o || !s) {
        return false;
      }
      const r = ranger.createRange();
      r.setStart(o.node, o.offset);
      r.setEnd(s.node, s.offset);
      const l = Array.from(base.querySelectorAll(".highlighted"));
      const vv = ranger.getSelection();
      vv.setSingleRange(r);

      classApplier.applyToRange(r);

      // highlighterRef.current.highlightSelection(".highlighted");
      const h = Array.from(base.querySelectorAll(".highlighted")).filter(
        (e) => !l.includes(e)
      ) as HTMLElement[];
      h.forEach((el) => el.setAttribute("data-reference", t.reference));
      const c = {
        ...t,
        id: t.id,
        cited: t.cited as string,
        private: t.private,
        memo: t.memo,
        reference: t.reference,
        path: t.path,
        quote: t.quote,
        createdAt: t.createdAt,
        author: t.author,
        range: r,
        els: h,
        selection: {
          text: a,
          before: `"...`,
          after: `..."`
        },
        updatedAt: t.updatedAt
      } satisfies HighlightedRange;
      const { startOffset, endOffset, startContainer, endContainer } = r;
      if (
        startContainer.nodeType === Node.TEXT_NODE &&
        base.contains(startContainer) &&
        (startContainer as Text).data
      ) {
        c.selection.before = (startContainer as Text).data.substring(
          startOffset - 10,
          startOffset
        );
      } else if (
        startContainer.previousSibling &&
        base.contains(startContainer.previousSibling) &&
        (startContainer.previousSibling as Text).data
      ) {
        c.selection.before = (
          startContainer.previousSibling as Text
        ).data.substring(
          (startContainer.previousSibling as Text).data.length - 10
        );
      } else {
        return;
      }
      if (
        endContainer.nodeType === Node.TEXT_NODE &&
        (endContainer as Text).data
      ) {
        c.selection.after = (endContainer as Text).data.substring(
          endOffset,
          endOffset + 10
        );
      } else if (
        endContainer.nextSibling &&
        base.contains(endContainer.nextSibling) &&
        endContainer.nextSibling.nodeType === Node.TEXT_NODE &&
        (endContainer.nextSibling as Text).data
      ) {
        c.selection.after = (endContainer.nextSibling as Text).data.substring(
          0,
          10
        );
      } else {
        return;
      }
      updateColeurs({
        targets: h,
        fromColor: lastColorRef.current,
        toColor: currentColorRef.current
      });
      vv.removeAllRanges();
      return c;
    },
    [classApplier, updateColeurs, findTextNode, ranger]
  );
  const hasRun = useRef(false);
  useEffect(() => {
    if (!hPending && !hLoading) {
      if (savedHighlights) {
        const base = contentRef.current;
        if (!base) return;
        // Remove all existing highlights before re-applying
        const existingHighlights = base.querySelectorAll("mark.highlighted");
        existingHighlights.forEach((el) => {
          const parent = el.parentNode;
          if (parent) {
            // Replace the mark element with its text content
            const textNode = document.createTextNode(el.textContent || "");
            parent.replaceChild(textNode, el);
            // Normalize to merge adjacent text nodes
            parent.normalize();
          }
        });
        const ss = savedHighlights.flatMap((c) => {
          // If highlight already exists in DOM, create HighlightedRange with existing elements
          if (existingRefs.current.has(c.reference)) {
            const els = Array.from(
              base.querySelectorAll(
                `mark.highlighted[data-reference="${c.reference}"]`
              )
            ) as HTMLElement[];

            if (els.length > 0) {
              // Create a minimal range for existing highlights
              const firstEl = els[0];
              const lastEl = els[els.length - 1];
              const r = ranger.createRange();

              if (firstEl.firstChild && lastEl.lastChild) {
                r.setStart(firstEl.firstChild, 0);
                r.setEnd(
                  lastEl.lastChild,
                  lastEl.lastChild.textContent?.length || 0
                );

                return [
                  {
                    ...c,
                    range: r,
                    els: els,
                    selection: c.selection
                  } satisfies HighlightedRange
                ];
              }
            }
          }

          // Otherwise apply highlight normally
          const r = applyHighlightCallback(c);
          return r ? [r] : [];
        });

        if (ss.length > 0) {
          // Clear stale store entries before applying fresh highlights for this document
          clearHighlights();
          addHighlighter(ss);
        }
      }
    }
  }, [
    savedHighlights,
    applyHighlightCallback,
    hPending,
    hLoading,
    addHighlighter,
    clearHighlights,
    postId,
    ranger
  ]);
  useLayoutEffect(() => {
    if (!window) return;
    if (hasRun.current) return;
    if (!isReady) return;
    const cont = contentRef.current;
    if (!enableHighlight) {
      return () => {
        const e = cont.querySelectorAll("mark.highlighted");
        e.forEach((e) => {
          e.removeEventListener("click", handleHighlightClick);
        });
      };
    }
    const ratio = window.innerHeight / cont.offsetHeight;
    setContainerBounds(ratio);

    hasRun.current = true;

    return () => {
      setPrivateNodes([]);
      const e = cont.querySelectorAll("mark.highlighted");
      e.forEach((e) => {
        e.removeEventListener("click", handleHighlightClick);
      });
      hasRun.current = false;
    };
  }, [
    isReady,
    applyHighlightCallback,
    handleHighlightClick,
    enableHighlight,
    addHighlighter
  ]);
  return (
    <>
      <div className="h-full w-full">
        <div className="z-3 h-full w-full">
          <div className={"w-full"} ref={wrapperRef}>
            <article
              className="rp-article relative w-full max-md:mx-auto max-md:w-[calc(100%-4.8rem)]"
              data-id={postId}
              data-themed="background-color,color"
            >
              <FeaturedCard post={post} />
              <div
                className="mx-auto my-[28px] w-full max-w-(--maxContainerWidth) px-0 py-[32px]"
                ref={containerRef}
              >
                <div
                  className="rp-content *:col-[main] [&>aside]:col-3"
                  ref={(el) => {
                    el && ((contentRef.current = el), setTargetContainer(el));
                  }}
                >
                  <Aside>
                    <ResponseMap responseNodes={responseNodes} />
                    {privateNodes.map((r) => (
                      <PrivateIndicator
                        key={r.reference}
                        top={r.top}
                        reference={r.reference}
                      />
                    ))}
                  </Aside>
                  {d ? (
                    <Paywall
                      requiredAuthority={post.authority ?? 2}
                      needsAuth={!user}
                      teaser={
                        (post.teaser as PaywallTeaser | null | undefined) ??
                        null
                      }
                      currentPath={
                        typeof slug === "string" ? `/essays/${slug}` : undefined
                      }
                    />
                  ) : (
                    // d:false here means the server already verified access
                    // and put the full body on `postContent` — render directly.
                    // (The old `locked ? <LockedGate /> : <RichText />` branch
                    // re-leaked the access check to the client.)
                    <RichText data={postContent} enableGutter={false} />
                  )}
                </div>
              </div>
              <div
                className={
                  "mx-auto my-0 min-h-10 w-full max-w-(--maxContainerWidth) px-16 py-0 max-lg:px-8"
                }
              >
                {post.tagged.length > 0 && (
                  <>
                    <h4 className="pt-10 pb-5">Relevant Topics</h4>
                    <ul className="m-0 flex list-none flex-wrap gap-4 p-0">
                      {post.tagged.map(({ slug, title }) => {
                        return (
                          <li key={slug}>
                            <Link
                              className={cn(
                                `flex appearance-none items-center justify-center overflow-hidden border border-solid border-off-foreground px-[1.4rem] text-sm leading-[2] font-light tracking-[-0.01em] backdrop-blur-[2.4rem] transition-[border-color,background-color,padding] duration-200 outline-none [text-decoration:none] md:px-[1.2rem]`,
                                "rounded-[18px] px-4 py-1 text-[16px] font-medium"
                              )}
                              href={`/tagged/${slug}`}
                            >
                              {title}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </div>
              <div className="f-divider mt-[90px] mb-9 h-[1px] w-full min-w-[1px]" />
              <SignedFooter />
            </article>
          </div>

          <FloatHighlightMenu
            ref={refs.setFloating}
            handleChangeHighlightColor={changeCurrentHighlightColor}
            floatingStyles={floatingStyles}
            postDisabled={!enableHighlight}
            style={{}}
            status={status}
            {...getFloatingProps()}
            mounted={isMounted}
          />
          <MiniMap contentContainer={contentRef} scaleRatio={containerBounds} />
        </div>
      </div>
      <div className="fixed right-0 bottom-[30px] left-0 z-[120] mx-auto mb-[24px] w-full">
        <div className={"grid grid-cols-[auto_1fr_auto] items-stretch gap-y-5"}>
          <div className="relative col-[2] justify-self-center">
            <AnimatePresence
              mode={"sync"}
              key={"dynamic-island"}
              initial={true}
              propagate={true}
            >
              {shownDynamicIsland && isAtEnd && (
                <DynamicBreadcrumb
                  title={post.title}
                  progress={scrollYProgress}
                >
                  <AnimatePresence
                    mode="popLayout"
                    key={"island-widgets"}
                    initial={true}
                  >
                    <AmbientAudioWidget key={"ambient-audio"} />
                    <ArticleBookmarkButton key={"bookmark-btn"} />
                  </AnimatePresence>
                </DynamicBreadcrumb>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
};

export type HighlightMenuProps = {
  postDisabled: boolean;

  handleChangeHighlightColor: (color: HighlightColors) => void;
};

const PrivateIndicator = (
  props: ComponentPropsWithoutRef<"div"> & {
    top: number;
    reference: string;
  }
) => {
  const { top: _, reference: refer, ...rest } = props;

  const setOpen = usePrivateNote((r) => r.setOpen);
  const setView = usePrivateNote((r) => r.setView);
  const setFocusedHighlight = useHighlighter((r) => r.setFocusedHighlight);

  const onClick = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      setFocusedHighlight(refer);
      setView("view");
      setOpen(true);
    },
    [setFocusedHighlight, refer, setView, setOpen]
  );

  return (
    <div
      style={{ transform: `translateY(${props.top}px)` }}
      className={"flex items-center gap-2"}
      {...rest}
    >
      <div className={"relative"}>
        <Button
          onClick={onClick}
          className="z-[30] flex aspect-[4/3] h-[var(--text-base)] w-auto items-center justify-center rounded-[5px_5px_5px_0] border-[1px] border-muted bg-background px-[3px] py-[2px] text-center text-[calc(var(--text-base)*0.55)] whitespace-nowrap dark:border-muted-faded-foreground dark:bg-faded-background"
        ></Button>
      </div>
    </div>
  );
};

const Aside = ({ children }: { children: ReactNode }) => {
  return (
    <>
      <style>
        {`
			aside > div{
			 max-width: 100%;
			 position:absolute;
			 display:flex;
			 align-items:center;
			 white-space:nowrap;
			 width: 100%;
			 margin-left:20px;
			 margin-top:2px;
			 gap:8px;
			}
			`}
      </style>
      <aside
        className={
          "top-0 [&>div]:absolute [&>div]:mt-1 [&>div]:flex [&>div]:w-full [&>div]:max-w-full [&>div]:gap-3.5 [&>div]:whitespace-nowrap"
        }
      >
        {children}
      </aside>
    </>
  );
};

export const HighlightMenuButton = ({
  children,
  className,
  ...props
}: ComponentPropsWithRef<"button">) => {
  return (
    <Button
      className={cn(
        "z-[10] flex items-center border-0 border-r-[1px] border-dashed !border-faded-foreground/90 bg-transparent px-[16px] py-0 text-base leading-0 font-light tracking-[0.05rem] text-faded-foreground/90 antialiased transition-colors ease-in-out-2 last-of-type:border-r-0 hover:!text-piercing-orange hover:[&_path]:!fill-piercing-orange [&_svg]:inline-block nth-of-type-[2]:[&_svg]:-left-[0.25px] nth-last-of-type-[2]:[&_svg]:left-[0.5px]",
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
};
export const MenuButtonCaption = ({
  children,
  pre = "[",
  post = "]",
  icon = true,
  className,
  ...props
}: ComponentPropsWithRef<"div"> & {
  pre?: string;
  post?: string;
  icon?: boolean;
}) => {
  return (
    <div
      className={cn(
        "mb-[2px] ml-[6px] flex items-center text-base [&_svg]:relative [&_svg]:top-[0.5px]",
        className,
        icon
          ? "lowercase"
          : "border-r-px border-dashed border-faded-background/80"
      )}
      {...props}
    >
      {icon ? (
        <>
          {pre}
          {children}
          {post}
        </>
      ) : (
        <>{children}</>
      )}
    </div>
  );
};
