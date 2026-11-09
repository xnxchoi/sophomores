"use client";
import { bookmarkTypes } from "@/payload/collections/Bookmarks/constants";
import { getBookmark } from "@/payload/collections/Bookmarks/getUserBookmarks";
import { SyncedNotification } from "@/payload/collections/Notifications/hooks/types";
import { BookmarkedCollectionSlug } from "@/payload/collections/Users/endpoints/userFieldSelect";
import { RP_Roles } from "@/stores/Notification/NotificationStore";
import {
  createContext,
  type ReactNode,
  Suspense,
  use,
  useContext,
  useEffect,
  useRef
} from "react";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import { authClient } from "../client";
import type { SessionType } from "./sessionType";
import { useBetterAuth } from "@/lib/auth/context";
import { User } from "@payload-types";
import { bookmarks, notifications } from "@/payload-generated-schema";
import { role } from "better-auth/client";
import type { Notification } from "@/payload-types";
import { DateTime } from "luxon";
export type RP_SessionUser = SessionType["user"];
export type RP_SessionActions = {
  /** Marks the session as stale so InternalHandler will refetch */
  stale: boolean;
  markStale: () => void;

  setBookmarks: ({
    bookmarks
  }: {
    bookmarks: {
      [collection in BookmarkedCollectionSlug]: string[];
    };
  }) => void;
  addBookmark: ({
    collection,
    id
  }: {
    collection: BookmarkedCollectionSlug;
    id: string;
  }) => void;
  deleteBookmark: ({
    collection,
    id
  }: {
    collection: BookmarkedCollectionSlug;
    id: string;
  }) => void;
  getBookmarks: ({
    collection
  }: {
    collection: BookmarkedCollectionSlug;
  }) => string[];
  isBookmarked: ({
    collection,
    id
  }: {
    collection: BookmarkedCollectionSlug;
    id: string;
  }) => boolean;
  setUser: (user: Partial<RP_SessionUser>) => void;
  setSession: (
    session: Pick<RP_SessionUser, "id" | "name"> &
      Partial<Omit<RP_SessionUser, "id" | "name">>
  ) => void;
  setOnboarded: (onboarded: boolean) => void;
  setNotifications: (
    notifications: SyncedNotification[] | SyncedNotification
  ) => void;
  setPortrait: (portrait: string | null) => void;
  setUsername: (username: string) => void;
  setSlug: (slug: string) => void;
  setDisplayUsername: (displayUsername: string) => void;
  setBanned: (banned: boolean) => void;
  setEmailVerified: (emailVerified: boolean) => void;
  setImage: (image: string) => void;
  setName: (name: string) => void;
  setFirstName: (firstName: string) => void;
  setLastName: (lastName: string) => void;

  setEmail: (email: string) => void;

  setUpdatedAt: (updatedAt: Date) => void;
};
export type RP_LocalSession = RP_SessionUser & RP_SessionActions;
const createSessionStore = (
  init: RP_SessionUser = {
    id: null!,
    email: null!,
    name: null!,
    role: null!,
    twoFactorEnabled: false,
    verified: false,
    bookmarks: {
      posts: [],
      surf: [],
      profile: [],
      userMedia: [],
      albums: [],
      tracks: [],
      playlists: [],
      users: []
    },
    banned: false,
    displayUsername: null!,
    emailVerified: false,
    image: null!,
    createdAt: null!,
    updatedAt: null!,
    firstName: "",
    lastName: "",
    onboarded: false,
    collection: null!,
    notifications: [],
    following: { count: 0, docs: [] },
    followers: { count: 0, docs: [] },
    portrait: null!,
    bio: "",
    location: "",
    link: "",
    username: null!,
    slug: null!
  }
) => {
  return createStore<RP_LocalSession>()((set, get) => ({
    ...init,
    stale: false,
    markStale: () => set({ stale: true }),
    setBookmarks: ({ bookmarks }) =>
      set((state) => {
        const collections = Object.keys(
          bookmarks
        ) as BookmarkedCollectionSlug[];
        const bk = state.bookmarks;
        collections.forEach((collection) => {
          bk[collection] = bookmarks[collection];
        });
        return { ...state, bookmarks: bk };
      }),
    addBookmark: ({ collection, id }) => {
      set((state) => ({
        ...state,
        bookmarks: {
          ...state.bookmarks,
          [collection]: [...(state.bookmarks?.[collection] || []), id]
        }
      }));
    },
    deleteBookmark: ({ collection, id }) => {
      set((state) => ({
        ...state,
        bookmarks: {
          ...state.bookmarks,
          [collection]: (state.bookmarks?.[collection] || []).filter(
            (i) => i !== id
          )
        }
      }));
    },
    getBookmarks: ({ collection }) => {
      return get().bookmarks?.[collection] || [];
    },
    isBookmarked: ({ collection, id }) => {
      return get().bookmarks[collection]?.includes(id) || false;
    },
    setUser: (user) => {
      set((state) => ({
        ...state,
        ...user
      }));
    },
    setOnboarded: (onboarded) => {
      set((state) => ({
        ...state,
        onboarded
      }));
    },
    setNotifications: (notifications) => {
      set((state) => {
        const n = Array.isArray(notifications)
          ? notifications
          : [notifications];
        return {
          ...state,
          notifications: n
        };
      });
    },
    setPortrait: (portrait) => {
      set((state) => ({
        ...state,
        portrait: portrait!
      }));
    },
    setUsername: (username) => {
      set((state) => ({
        ...state,
        username
      }));
    },
    setSlug: (slug) => {
      set((state) => ({
        ...state,
        slug
      }));
    },
    setDisplayUsername: (displayUsername) => {
      set((state) => ({
        ...state,
        displayUsername
      }));
    },
    setBanned: (banned) => {
      set((state) => ({
        ...state,
        banned
      }));
    },
    setEmailVerified: (emailVerified) => {
      set((state) => ({
        ...state,
        emailVerified
      }));
    },
    setImage: (image) => {
      set((state) => ({
        ...state,
        image
      }));
    },
    setName: (name) => {
      set((state) => ({
        ...state,
        name
      }));
    },
    setFirstName: (firstName) => {
      set((state) => ({
        ...state,
        firstName
      }));
    },
    setLastName: (lastName) => {
      set((state) => ({
        ...state,
        lastName
      }));
    },
    setEmail: (email) => {
      set((state) => ({
        ...state,
        email
      }));
    },

    setUpdatedAt: (updatedAt) => {
      set((state) => ({
        ...state,
        updatedAt
      }));
    },
    setSession: ({ id, name, ...rest }) =>
      set((state) => ({
        ...state,
        id,
        name,
        ...Object.entries(rest).reduce((acc, [key, value]) => {
          if (value !== undefined) {
            return {
              ...acc,
              [key]: value
            };
          }
          return acc;
        }, {} as Partial<RP_SessionUser>)
      }))
  }));
};
type SessionAPI = ReturnType<typeof createSessionStore>;
export const SessionContext = createContext<SessionAPI | undefined>(undefined);
/**
 * RP_SessionProvider that provides the session to the context provider
 */
export const RP_SessionProvider = ({ children }: { children: ReactNode }) => {
  const sessionRef = useRef<SessionAPI>(null!);
  if (!sessionRef.current) {
    sessionRef.current = createSessionStore();
  }

  // const getUser = useCallback(async (id: string): Promise<GotUser | null> => {
  //   const res = await fetch(`/api/users/${encodeURIComponent(id)}/details`, {
  //     method: "GET",
  //     headers: {
  //       "Content-Type": "application/json"
  //     },
  //     credentials: "include"
  //   });
  //   if (!res.ok) {
  //     return null;
  //   } else {
  //     const resJson = await res.json();
  //     return resJson.user as GotUser;
  //   }
  // }, []);
  // const fetchDetails = useCallback(
  //   async (
  //     data: Pick<RP_SessionData, "user">
  //   ): Promise<RP_SessionData["user"] | null> => {
  //     const user = await getUser(data.user.id);
  //     if (user) {
  //       const a = {
  //         name: data.user.name,
  //         twoFactorEnabled: data.user?.twoFactorEnabled || false,
  //         banned: data.user?.banned || false,
  //         emailVerified: data.user.emailVerified,
  //         email: data.user.email,
  //
  //         ...user,
  //         portrait: user.portrait!
  //       } satisfies RP_SessionData["user"];
  //       return a;
  //     }
  //     return null;
  //   },
  //   [getUser]
  // );
  // useEffect(() => {
  //   if (!isPending) {
  //     if (data) {
  //       fetchDetails({
  //         user: { ...data.user, role: data.user.role as RP_Roles }
  //       }).then((r) => {
  //         r &&
  //           setLocalSession({
  //             ...data,
  //             user: r
  //           });
  //       });
  //     } else {
  //       setLocalSession(null);
  //     }
  //   }
  // }, [data, isPending, fetchDetails]);
  // useEffect(() => {
  //   if (!sessionRef.current) {
  //     return;
  //   }
  //   if (localSession) {
  //     sessionRef.current.setState((state) => ({
  //       ...state,
  //
  //       ...localSession.user,
  //       bio: localSession.user.bio || "",
  //       location: localSession.user.location || "",
  //       link: localSession.user.link || "",
  //       onboarded: localSession.user.onboarded || false
  //     }));
  //   } else {
  //   }
  // }, [localSession]);

  /**
   * Function to refresh the session
   */

  return (
    <SessionContext.Provider value={sessionRef.current}>
      <Suspense fallback={null}>
        <SessionSyncer />
      </Suspense>
      {children}
    </SessionContext.Provider>
  );
};
const SessionSyncer = () => {
  const { currentUserPromise } = useBetterAuth();
  const currentUser = use(currentUserPromise) as (User & {}) | null;
  const setSession = useRPSession((r) => r.setSession);
  const stale = useRPSession((r) => r.stale);

  // ── Refetch session when marked stale (e.g. after authClient.updateUser) ──
  const { data: freshSession, refetch } = authClient.useSession();

  useEffect(() => {
    if (!stale) return;
    refetch().then(() => {
      // Reset stale flag — SessionSyncer will re-sync via the main useEffect
      // because freshSession reference changes after refetch
      const ctx = sessionCtxRef.current;
      if (ctx) ctx.setState({ stale: false });
    });
  }, [stale, refetch]);

  // Keep a ref to the store so we can reset stale without going through hooks
  const sessionCtxRef = useRef<SessionAPI | null>(null);
  const storeCtx = useContext(SessionContext);
  sessionCtxRef.current = storeCtx ?? null;

  // ── Sync lightweight fields from freshSession after client-side refetch ──
  useEffect(() => {
    const user = freshSession?.user;
    if (!user) return;
    // Only push scalar fields that authClient.updateUser can change
    setSession({
      id: user.id,
      name: user.name,
      firstName: (user as any).firstName ?? "",
      lastName: (user as any).lastName ?? "",
      bio: (user as any).bio ?? "",
      onboarded: (user as any).onboarded ?? false,
      email: user.email,
      image: user.image ?? null
    });
  }, [freshSession, setSession]);

  useEffect(() => {
    if (!!currentUser) {
      getBookmark({
        types: bookmarkTypes
      })
        .then((r) => {
          setSession({
            ...currentUser,
            createdAt: DateTime.fromISO(currentUser.createdAt!).toJSDate(),
            updatedAt: DateTime.fromISO(currentUser.updatedAt!).toJSDate(),
            banExpires: !!currentUser.banExpires
              ? DateTime.fromISO(currentUser.banExpires!).toJSDate()
              : undefined,
            followers: {
              count: currentUser.followers?.totalDocs || 0,
              docs:
                currentUser.followers?.docs?.map((r) =>
                  typeof r === "string" ? r : r.id
                ) || []
            },
            following: {
              count: currentUser.following?.totalDocs || 0,
              docs:
                currentUser.following?.docs?.map((r) =>
                  typeof r === "string" ? r : r.id
                ) || []
            },
            displayUsername: currentUser.displayUsername || undefined,
            notifications: currentUser.notifications?.docs
              ?.filter((n) => typeof n !== "string")
              .map((n) => {
                const {
                  type,
                  title,
                  status,
                  content,
                  importance,
                  sticky,
                  dismissed,
                  actionLink,
                  createdAt,
                  read,
                  readAt,
                  thumbnail,
                  updatedAt,
                  recipient
                } = n;
                return {
                  type,
                  title,
                  status,
                  importance,
                  recipient:
                    typeof recipient === "string" ? recipient : recipient.id,
                  createdAt,
                  updatedAt,
                  actionLink,
                  content,
                  sticky,
                  dismissed,
                  read,
                  thumbnail,
                  readAt
                } as SyncedNotification;
              }),
            role: currentUser.role as RP_Roles,
            bio: currentUser.bio || "",
            bookmarks: r
          });
        })
        .catch((e) => {
          console.error(e);
          setSession({
            ...currentUser,
            role: currentUser.role as RP_Roles,
            bio: currentUser.bio || "",
            bookmarks: {},
            displayUsername: "",
            notifications: [],
            following: {
              count: 0,
              docs: []
            },
            followers: {
              count: 0,
              docs: []
            },
            createdAt: undefined,
            updatedAt: undefined,
            banExpires: undefined
          });
        });
    } else {
      setSession({
        id: null!,
        name: null!,
        role: "user",
        bio: "",
        bookmarks: {},
        image: null,
        portrait: null
      });
    }
  }, [currentUser, setSession]);

  return null;
};
export const useRPSession = <T,>(
  selector: (store: RP_LocalSession) => T
): T => {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useRPSession must be used within SessionContext Provider");
  }
  return useStore(ctx, selector);
};
