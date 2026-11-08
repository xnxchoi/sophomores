"use client";
import { useArticle } from "@/components/UX/Highlightr/providers/ArticleProvider";
import { useRPSession } from "@/lib/auth/session/RP_SessionProvider";
import { type Bookmark } from "@payload-types";
import { BookmarkFilledIcon, BookmarkIcon } from "@radix-ui/react-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Where } from "payload";
import { stringify } from "qs-esm";
import {
  MouseEventHandler,
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";
import { useShallow } from "zustand/shallow";
import { MotionBtn } from "@/components/core/Button";

export type BookmarkButtonProps = {
  collectionSlug: Bookmark["target"]["relationTo"];
  itemId: string;
  userId: string;
  className?: string;
};

async function fetchBookmarkExists(
  itemId: string,
  userId: string
): Promise<boolean> {
  const where: Where = {
    and: [{ "target.value": { equals: itemId } }, { user: { equals: userId } }]
  };
  const r = await fetch(
    `/api/bookmarks/count/${stringify({ where }, { addQueryPrefix: true })}`
  );
  if (!r.ok) throw new Error("Failed to fetch bookmark status");
  const res = (await r.json()) as { totalDocs: number };
  return res.totalDocs > 0;
}

async function createBookmarkRequest(
  collectionSlug: Bookmark["target"]["relationTo"],
  itemId: string,
  userId: string
): Promise<Bookmark> {
  const body: Pick<Bookmark, "target" | "user"> = {
    target: { value: itemId, relationTo: collectionSlug },
    user: userId
  };
  const r = await fetch("/api/bookmarks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body)
  });
  const res = (await r.json()) as { doc: Bookmark };
  if (!res.doc) throw new Error("Failed to create bookmark");
  return res.doc;
}

async function deleteBookmarkRequest(
  itemId: string,
  userId: string
): Promise<Bookmark | null> {
  const where: Where = {
    and: [{ "target.value": { equals: itemId } }, { user: { equals: userId } }]
  };
  const args = stringify({ where }, { addQueryPrefix: true });
  const r = await fetch(`/api/bookmarks/${args}`, {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" }
  });
  const res = (await r.json()) as { docs: Bookmark[] };
  return res.docs?.[0] ?? null;
}

/**
 * Generic, context-agnostic bookmark button.
 * Pass collectionSlug, itemId, and userId explicitly.
 */
export const BookmarkButton = ({
  collectionSlug,
  itemId,
  userId,
  className
}: BookmarkButtonProps) => {
  const qc = useQueryClient();
  const queryKey = ["bookmark", { collectionSlug, itemId, userId }] as const;

  const {
    data: hasBookmark,
    isPending,
    isFetching
  } = useQuery({
    queryKey,
    queryFn: () => fetchBookmarkExists(itemId, userId),
    enabled: !!userId && !!itemId
  });

  const [bookmarked, setBookmarked] = useState(Boolean(hasBookmark));
  useEffect(() => {
    if (!isPending) setBookmarked(hasBookmark || false);
  }, [hasBookmark, isPending]);

  const addBookmark = useRPSession((s) => s.addBookmark);
  const removeBookmark = useRPSession((s) => s.deleteBookmark);

  const createMutation = useMutation({
    mutationFn: () => createBookmarkRequest(collectionSlug, itemId, userId),
    onSuccess: (doc) => {
      addBookmark({
        collection: doc.target.relationTo,
        id: doc.target.value as string
      });
      qc.setQueryData(queryKey, true);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteBookmarkRequest(itemId, userId),
    onSuccess: (doc) => {
      if (doc) {
        removeBookmark({
          collection: doc.target.relationTo,
          id: doc.target.value as string
        });
      }
      qc.setQueryData(queryKey, false);
    }
  });

  const handleClick: MouseEventHandler = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (hasBookmark) {
        deleteMutation.mutate();
      } else {
        createMutation.mutate();
      }
    },
    [hasBookmark, createMutation, deleteMutation]
  );

  const isLoading =
    isFetching || createMutation.isPending || deleteMutation.isPending;

  return (
    <MotionBtn
      key={"widget-bookmark"}
      transition={{ type: "spring", bounce: 0.4 }}
      whileTap={{ scale: 0.88 }}
      whileHover={{ scale: 1.12 }}
      onClick={handleClick}
      disabled={isLoading || !userId}
      className={
        className ??
        "flex h-8 w-8 items-center justify-center [&_path]:fill-muted-faded-background/55 [&_path]:stroke-none dark:[&_path]:fill-muted-faded-foreground/55 [&_svg]:size-[18px]"
      }
    >
      {bookmarked ? <BookmarkFilledIcon /> : <BookmarkIcon />}
    </MotionBtn>
  );
};

/**
 * Context-aware wrapper for use inside Highlightr / ArticleProvider.
 * Reads collectionSlug and itemId from ArticleProvider context.
 */
export const ArticleBookmarkButton = () => {
  const post = useArticle(useShallow((r) => r.id as null | string));
  const collection = useArticle(useShallow((r) => r.collection));
  const userId = useRPSession(useShallow((r) => r.id as null | string));

  if (!post || !collection || !userId) return null;

  return (
    <BookmarkButton
      collectionSlug={collection as Bookmark["target"]["relationTo"]}
      itemId={post}
      userId={userId}
    />
  );
};
