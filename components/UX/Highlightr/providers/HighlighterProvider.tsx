"use client";
import { errorToast } from "@/components/ui/sonner";
import {GhostUser} from "@/components/UX/Highlightr";
import { HighlightColors } from "@/components/UX/Highlightr/stores";
import type {
  FetchedCitation,
  HighlightedRange,
  HighlightsCollectionSlug,
  ProcessedRangy,
  RangeCreateParams,
  UpdateCitationData
} from "@/components/UX/Highlightr/types";
import type { User } from "@/payload-types";
import type { Where } from "payload";
import { stringify } from "qs-esm";
import {
  createContext,
  type ReactNode,
  RefObject,
  useContext,
  useRef
} from "react";
import { type StoreApi, useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import {
  HighlightCreateError,
  HighlightFetchError,
  HighlightUpdateError
} from "@/components/UX/Highlightr/HighlightErrors";
type HighlightState = {
  targetContainer: RefObject<HTMLDivElement>;
  focusedHighlight: HighlightedRange | null;
  currentColor: HighlightColors;
  target: {
    relationTo: HighlightsCollectionSlug;
    value: string;
    slug: string;
    author: string;
    disabled?: boolean;
  };
  citations: ProcessedRangy[];
  highlights: Map<string, HighlightedRange>;
};
type HighlightActions = {
  setContainer: (container: RefObject<HTMLDivElement>) => void;
  setTarget: (
    target: {
      relationTo: HighlightsCollectionSlug;
      value: string;
      slug: string;
      author: string;
      disabled?: boolean;
    } | null
  ) => void;
  setCurrentColor: (color: HighlightColors) => void;
  addHighlight: (
    highlights: HighlightedRange | Array<HighlightedRange>
  ) => void;
  setCitations: (citations: ProcessedRangy[]) => void;
  clear: () => void;
  reset: () => void;
  removeHighlight: (reference: string | Array<string>, user: string) => void;
  setFocusedHighlight: (reference: string | null) => void;
};
type HighlighterStore = HighlightState & HighlightActions;

export const fetchAuthorOverview = async ({
  authorId
}: {
  authorId: string;
}) => {
  const select = {
    id: true,
    name: true,
    displayUsername: true,
    banned: true,
    image: true,
    slug: true
  } as const;

  const author = await fetch(
    `/api/users/${authorId}/${stringify({ select }, { addQueryPrefix: true })}`,
    {
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      method: "GET"
    }
  )
    .then((r) => {
      if (r.ok) {
        return r.json() as Promise<Pick<User, keyof typeof select>>;
      }
      throw new Error("Failed to fetch user");
    })
    .then((r) => {
      if (r) {
        if (!r.banned)
          return {
            id: r.id,
            name: r.name,
            displayUsername: r.displayUsername || r.name,
            image: r.image,
            slug: r.slug
          };
      }
      throw new Error("Failed to fetch user");
    })
    .catch((e) => {
      return GhostUser();
    });
  return author;
};
export const fetchUserHighlights = async (props: {
  collection: HighlightsCollectionSlug;
  id: string;
}) => {
  const { collection, id } = props;
  return await fetch(
    `${process.env.NEXT_PUBLIC_SERVER_URL}/api/citations/getNotes/?collection=${collection}&id=${id}`,
    {
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      method: "GET"
    }
  )
    .then(async (res) => {
      if (res.ok) {
        const r = (await res.json()) as {
          docs: ProcessedRangy[];
          target: {
            relationTo: HighlightsCollectionSlug;
            value: string;
          };
          user: string;
        };
        if (r.docs) {
          return r;
        }
        throw new HighlightFetchError("unknown", "unknown");
      }
      throw new HighlightFetchError("unknown", "unknown");
    })
    .then((r) => r.docs)
    .catch((e) => {
      if (e instanceof HighlightFetchError) throw e;
      throw new HighlightFetchError("unknown", "unknown");
    });
};
export const createUserHighlight = async (props: {
  citation: RangeCreateParams;
}) => {
  const { citation } = props;
  const {
    author,
    selection,

    reference,
    cited,

    private: isPrivate,
    memo
  } = citation;
  try {
    const createData = {
      ...citation,

      cited,
      author,
      selection,

      private: isPrivate || false,
      memo: memo || null,
      reference
    } satisfies RangeCreateParams;
    const res = await fetch("/api/citations", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(createData)
    });
    if (res.ok) {
      const rr = (await res.json()) as {
        message: string;
        doc: FetchedCitation;
      };
      if ("doc" in rr) {
        return rr.doc;
      } else {
        throw new HighlightCreateError("unknown", "unknown");
      }
    } else {
      if (res.status === 401 || res.status === 403) {
        throw new HighlightCreateError("user", "unauthorized");
      }
      throw new HighlightCreateError("unknown", "unknown");
    }
  } catch (e) {
    if (e instanceof HighlightCreateError) throw e;
    throw new HighlightCreateError("unknown", "unknown");
  }
};
export const updateUserHighlight = async ({
  saveParams
}: {
  saveParams: Array<HighlightedRange>;
}) => {
  const toSaveArray = saveParams;

  const resultPromises = toSaveArray.map(
    async ({
      els,
      range,
      selection,
      memo,
      private: isPrivate,
      id,
      ...rest
    }) => {
      const params: UpdateCitationData = {};
      if (typeof isPrivate === "boolean") {
        params.private = isPrivate;
      }
      if (memo !== undefined) {
        params.memo = memo;
      }
      if (selection !== undefined) {
        params.selection = selection;
      }
      if (Object.entries(params).length === 0) {
        throw new HighlightUpdateError("selection", "empty");
      }
      const res = await fetch(`/api/citations/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(params)
      });
      if (res.ok) {
        const newDoc = (await res.json()) as FetchedCitation;
        return { ...newDoc, range, els } satisfies HighlightedRange;
      }
      throw new Error("Failed to update highlight", { cause: { type: "data" } });
    }
  );
  const result: PromiseSettledResult<HighlightedRange>[] =
    await Promise.allSettled(resultPromises);
  const errors: Set<{ id: string | null; message: string }> = new Set();
  const highlightArray: HighlightedRange[] = [];
  for (const r of result) {
    if (r.status === "fulfilled" && r.value) {
      highlightArray.push(r.value);
    } else {
      const targetId = toSaveArray[result.indexOf(r)];
      errors.add({
        id: targetId?.id ? targetId.id : null,
        message:
          r.status === "rejected" && r.reason instanceof Error
            ? r.reason.message
            : "Something went wrong"
      });
    }
  }
  if (errors.size > 0) {
    const era = Array.from(errors);
    const errorMessages = era
      .map((r) => `${r.id ? r.id : "(unknown id)"}:\t${r.message}`)
      .join("\n ");
    errorToast(
      `We couldn't update your highlight(s), please try again later.\nDetails\n\n${errorMessages}`
    );
  }
  return highlightArray;
};
export const deleteUserHighlight = async (props: {
  deleteTargets: HighlightedRange[];
}) => {
  const { deleteTargets } = props;
  const targetValues = deleteTargets.map((t) => t.id);
  const where: Where = {
    id: {
      in: targetValues
    }
  };
  const query = stringify(
    {
      where,
      select: {
        reference: true
      }
    },
    { addQueryPrefix: true }
  );
  return await fetch(`/api/citations/${query}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  })
    .then(async (res) => {
      if (res.ok) {
        const rr = (await res.json()) as {
          docs: { reference: string; id: string }[];
          errors: unknown[];
        };
        const data = rr?.docs;
        if (!data)
          throw new Error("No data", {
            cause: {
              type: "data"
            }
          });
        const citations = rr.docs.map((d) => d.reference);
        if (!citations)
          throw new Error("No citations", {
            cause: {
              type: "citations"
            }
          });
        return citations;
      }
      throw new Error("No data", {
        cause: {
          type: "data"
        }
      });
    })
    .catch((e) => {
      const cause = e instanceof Error && e.cause && typeof e.cause === "object" ? e.cause as { type?: string } : null;
      let message = "";
      if (cause && "type" in cause) {
        switch (cause.type) {
          case "data":
            message += "Highlights may be deleted, but we couldn't confirm.";
            break;
          case "citations":
            message += "No highlights were deleted.";
            break;
          case "request":
            message += "The request failed.";
        }
      }
      errorToast(
        `Something went wrong${message.length > 0 ? ": " + message : "!"} Please try again later.`
      );
      return null;
    });
};
export const createHighlighterStore = (props: HighlightState) =>
  createStore<HighlighterStore>()((set, get) => ({
    ...props,
    setContainer: (targetContainer) => set({ targetContainer }),
    setTarget: (target) =>
      set((state) => ({
        ...state,
        target: target || null!,
        highlights: new Map(),
        citations: [],
        focusedHighlight: null
      })),
    setCurrentColor: (currentColor) => set({ currentColor }),
    setFocusedHighlight: (focus) =>
      set((state) => {
        return {
          ...state,
          focusedHighlight: focus ? state.highlights.get(focus) || null : null
        };
      }),
    setCitations: (citations) => set({ citations }),
    addHighlight: (highlights) =>
      set((state) => {
        const h = Array.isArray(highlights) ? highlights : [highlights];
        const res = new Map(state.highlights);
        h.forEach((r) => {
          res.set(r.reference, r);
        });
        const fc = state.focusedHighlight;
        return {
          ...state,
          highlights: res,
          focusedHighlight: (fc && res.get(fc.reference)) || null,
          citations: [
            ...state.citations.filter(
              (r) => !h.some((s) => s.reference === r.reference)
            )
          ]
        };
      }, true),
    removeHighlight: (references) =>
      set((state) => {
        const f = Array.isArray(references) ? references : [references];
        const res = new Map(state.highlights);
        f.forEach((r) => {
          res.delete(r);
        });
        const fc = state.focusedHighlight;

        return {
          ...state,
          highlights: res,
          focusedHighlight: (fc && res.get(fc.reference)) || null,
          citations: [
            ...state.citations.filter((r) => !f.some((s) => s === r.reference))
          ]
        };
      }),
    clear: () =>
      set({ highlights: new Map(), citations: [], focusedHighlight: null }),
    reset: () =>
      set({
        highlights: new Map(),
        citations: [],
        focusedHighlight: null,
        target: null!,
        targetContainer: null!
      })
  }));
const HighlighterContext = createContext<StoreApi<HighlighterStore> | null>(
  null
);
export const HighlighterProvider = ({ children }: { children: ReactNode }) => {
  const highlighter = useRef<StoreApi<HighlighterStore>>(null!);
  if (!highlighter.current) {
    highlighter.current = createHighlighterStore({
      targetContainer: null!,
      target: null!,
      highlights: new Map(),
      citations: [],
      focusedHighlight: null,
      currentColor: "ORANGE"
    });
  }
  return (
    <HighlighterContext.Provider value={highlighter.current}>
      {children}
    </HighlighterContext.Provider>
  );
};
export const useHighlighter = <T,>(
  selector: (store: HighlighterStore) => T
) => {
  const highlighter = useContext(HighlighterContext);
  if (!highlighter) {
    throw new Error("useHighlighter must be used within a HighlighterProvider");
  }
  return useStore(highlighter, selector);
};
