import { useArticle } from "@/components/UX/Highlightr/providers/ArticleProvider";
import { useFloater } from "@/components/UX/Highlightr/providers/FloatProvider";
import {
  createUserHighlight,
  deleteUserHighlight,
  updateUserHighlight,
  useHighlighter
} from "@/components/UX/Highlightr/providers/HighlighterProvider";
import { useRanger } from "@/components/UX/Highlightr/providers/RangerProvider";
import type {
  CreateCallbackParams,
  CreateCitationData,
  HighlightedRange
} from "@/components/UX/Highlightr/types";
import {
  clearSelection,
  ensureRange,
  isMarkable
} from "@/components/UX/Highlightr/utils/highlight-helpers";
import { nanoid } from "nanoid";
import { useShallow } from "zustand/shallow";
import { type HighlightsCollectionSlug } from "../types";

import {
  HighlightCreateError,
  HighlightDeleteError,
  HighlightError,
  HighlightUpdateError
} from "@/components/UX/Highlightr/HighlightErrors";
import { useRPSession } from "@/lib/auth/session/RP_SessionProvider";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode
} from "react";
type CitationState = {
  create: (props: {
    params: CreateCallbackParams;
    container: HTMLElement;
  }) => Promise<HighlightedRange>;
  update: (toSave: HighlightedRange) => Promise<HighlightedRange>;
  delete: ({
    focusedHighlight
  }: {
    focusedHighlight: HighlightedRange;
  }) => Promise<void>;
};

export const CitationContext = createContext<CitationState>(null!);

export const CitationProvider = ({ children }: { children: ReactNode }) => {
  const ranger = useRanger((r) => r.ranger);
  const classApplier = useRanger((r) => r.classApplier);
  const addHighlighter = useHighlighter((r) => r.addHighlight);
  const removeHighlighter = useHighlighter((r) => r.removeHighlight);
  const setFocusedHighlight = useHighlighter((r) => r.setFocusedHighlight);
  const focusedHighlight = useHighlighter(
    useShallow((r) => r.focusedHighlight)
  );
  const user = useRPSession(useShallow((r) => r.id as string | null));
  const postId = useArticle(useShallow((r) => r.id as string | null));
  const collection = useArticle(useShallow((r) => r.collection));
  const author = useArticle(useShallow((r) => r.author));
  const setMenuVisibility = useFloater((r) => r.setOpen);
  const targetRef = useRef<{
    relationTo: HighlightsCollectionSlug;
    value: string;
  } | null>(null);
  const citedRef = useRef<string | null>(null);
  const currentUser = useRef(user);
  const currentFocus = useRef(focusedHighlight);
  useEffect(() => {
    currentFocus.current = focusedHighlight;
  }, [focusedHighlight]);
  useEffect(() => {
    currentUser.current = user;
  }, [user]);
  useEffect(() => {
    targetRef.current = postId
      ? { relationTo: collection, value: postId }
      : null;
    citedRef.current = author ? author.id : null;
  }, [collection, postId, author]);

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
  const coreCreate = useCallback(
    async ({
      params,
      container: content
    }: {
      params: CreateCallbackParams;
      container: HTMLElement;
    }) => {
      const userId = currentUser.current;
      if (!userId) throw new HighlightCreateError("user", "not_authenticated");
      const base = content;
      if (!base) throw new HighlightCreateError("params", "container");
      const target = targetRef.current;
      if (!target) throw new HighlightCreateError("target", "invalid");
      const cited = citedRef.current;
      if (!cited) throw new HighlightCreateError("target", "invalid");
      const selection = ranger.getSelection();
      const rangeAt = ensureRange(selection);
      if (
        !rangeAt ||
        !base.contains(selection.anchorNode) ||
        !isMarkable(selection)
      ) {
        clearSelection(selection);
        throw new HighlightCreateError("selection", "invalid");
      }
      try {
        const nanoid1 = nanoid(17);
        const text = rangeAt.toString();
        if (!text || text.length < 1) {
          throw new HighlightCreateError("selection", "empty");
        }
        const toPass = {
          ...params,
          selection: {
            text,
            before: `"...`,
            after: `..."`
          },
          author: userId,
          cited,
          target,
          private: params.private || false,
          reference: nanoid1
        } satisfies CreateCitationData;
        const newH = await createUserHighlight({
          citation: {
            ...toPass
          }
        });

        if (!newH) throw new HighlightCreateError("unknown", "unknown");
        const previousHighlight = base.querySelectorAll(".highlighted");
        classApplier.applyToSelection();
        const highLightedNodes = base.querySelectorAll(".highlighted");
        const elements: Element[] = [];
        const previousHighlightArray = Array.from(previousHighlight);
        highLightedNodes.forEach((e) => {
          if (!previousHighlightArray.includes(e)) {
            e.setAttribute("data-reference", nanoid1);
            elements.push(e);
          }
        });
        const newHighlight: HighlightedRange = {
          ...newH,
          selection: {
            ...newH.selection
          },
          quote: newH.quote,
          id: newH.id,
          cited: newH.cited,
          reference: newH.reference,
          memo: newH.memo,
          range: rangeAt,
          els: elements
        };
        addHighlighter(newHighlight);
        setFocusedHighlight(newH.reference);
        selection.removeAllRanges();
        return newHighlight;
      } catch (e) {
        setFocusedHighlight(null);
        setMenuVisibility(false);
        if (e instanceof HighlightError) {
          throw e;
        }
        throw new HighlightCreateError("unknown", "unknown");
      }
    },
    [
      addHighlighter,
      classApplier,
      ranger,
      setFocusedHighlight,
      setMenuVisibility
    ]
  );
  const coreUpdate = useCallback(
    async (toSave: HighlightedRange) => {
      const saveParams = [toSave];
      const user = currentUser.current;
      const target = targetRef.current;
      if (!user) {
        throw new HighlightUpdateError("user", "not_authenticated");
      }
      if (!target) {
        throw new HighlightUpdateError("target", "invalid");
      }
      try {
        const res = await updateUserHighlight({
          saveParams
        });
        const rv = res[0];
        if (!rv) throw new HighlightUpdateError("unknown", "unknown");
        addHighlighter(res);
        setFocusedHighlight(rv.reference);
        return rv;
      } catch (e) {
        if (e instanceof HighlightUpdateError) {
          throw e;
        }
        throw new HighlightUpdateError("unknown", "unknown");
      }
    },
    [addHighlighter, setFocusedHighlight]
  );
  const coreDelete = useCallback(
    async ({ focusedHighlight }: { focusedHighlight: HighlightedRange }) => {
      setMenuVisibility(false);
      const selection = window.getSelection();
      const userId = currentUser.current;
      if (!selection) return;
      if (!userId) {
        throw new HighlightDeleteError("user", "not_authenticated");
      }
      selection.removeAllRanges();
      if (
        !focusedHighlight ||
        !("els" in focusedHighlight) ||
        !focusedHighlight.els
      )
        throw new HighlightDeleteError("selection", "invalid");
      selection.removeAllRanges();
      const deleteResult = await deleteUserHighlight({
        deleteTargets: [focusedHighlight]
      });
      const t = document.createRange();
      const a = focusedHighlight.els[0];
      const n = focusedHighlight.els[focusedHighlight.els.length - 1];
      a && t.setStartBefore(a);
      n && t.setEndAfter(n);
      selection.addRange(t);

      if (deleteResult) {
        focusedHighlight.els.forEach((e) => {
          const parentNode = e.parentNode;
          if (parentNode) {
            if (e.className === "highlighted") {
              while (e.firstChild) {
                parentNode.insertBefore(e.firstChild, e);
              }
              e.remove();
            }
            (e as HTMLElement).style.backgroundImage = "none";
            (e as HTMLElement).classList.remove("highlighted");
            (e as HTMLElement).removeAttribute("data-reference");
            (e as HTMLElement).removeEventListener(
              "click",
              handleHighlightClick
            );
          }
        });
        removeHighlighter(deleteResult, userId);
      } else {
        throw new HighlightDeleteError("unknown", "unknown");
      }
      setFocusedHighlight(null);
      setMenuVisibility(false);
      selection.removeAllRanges();
    },
    [
      handleHighlightClick,
      removeHighlighter,
      setFocusedHighlight,
      setMenuVisibility
    ]
  );
  return (
    <CitationContext.Provider
      value={{ create: coreCreate, update: coreUpdate, delete: coreDelete }}
    >
      {children}
    </CitationContext.Provider>
  );
};
export const useCitations = <T,>(selector: (state: CitationState) => T) => {
  const ctx = useContext(CitationContext);
  if (!ctx) {
    throw new Error("useCitations must be used within a CitationProvider");
  }
  return selector(ctx);
};
