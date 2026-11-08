"use client";
import { authClient } from "@/lib/auth/client";
import type { User, UserMedia } from "@/payload-types";
import { SyncedNotification } from "@/payload/collections/Notifications/hooks/types";
import { DateTime } from "luxon";
import { createStore } from "zustand/vanilla";

export type RP_Roles =
  | "user"
  | "resident"
  | "admin"
  | "author"
  | "editor"
  | "patron"
  | "cofounder";

export type SortByDateProps = { order?: "ASC" | "DESC" };
export const sortByDate =
  ({ order = "ASC" }: SortByDateProps) =>
  (a: string, b: string) => {
    const aDate = DateTime.fromISO(a).toUnixInteger();
    const bDate = DateTime.fromISO(b).toUnixInteger();
    if (order === "ASC") {
      return aDate - bDate;
    }
    return bDate - aDate;
  };
export type SessionResponse = ReturnType<typeof authClient.useSession>;
export type SuccessSessionData = NonNullable<SessionResponse["data"]>;
/**
 *     {
 *     banExpires?: Date | null | undefined;
 *     banReason?: string | null | undefined;
 *     banned: false | true | null | undefined;
 *     createdAt: Date;
 *     email: string;
 *     emailVerified: boolean;
 *     id: string;
 *     image?: string | null | undefined;
 *     name: string;
 *     updatedAt: Date;
 *     role: RP_Roles;
 * }
 */
export type BetterAuth_User = SuccessSessionData["user"];

/**
 *  {
 *     activeOrganizationId?: string | null | undefined;
 *     createdAt: Date;
 *     expiresAt: Date;
 *     id: string;
 *     impersonatedBy?: string | null | undefined;
 *     ipAddress?: string | null | undefined;
 *     token: string;
 *     updatedAt: Date;
 *     userAgent?: string | null | undefined;
 *     userId: string;
 *   };
 */
export type BetterAuth_Session = SuccessSessionData["session"];
export type RP_User = BetterAuth_User &
  Omit<
    User,
    | "favorites"
    | "role"
    | "portrait"
    | "createdAt"
    | "updatedAt"
    | "id"
    | "banExpires"
  > & {
    role: RP_Roles;
    collection: "users";
    bio: string;
    email: string;
    firstName: string;
    lastName: string;
    name: string;
    id: string;
    image: string | null;
    portrait: UserMedia | null;
    slug: string;
    onboarded: boolean;
    link: string;
    displayUsername: string;
    createdAt: Date;
    updatedAt: Date;
    banExpires?: Date | null;
    notifications: SyncedNotification[];
  } & favoritestore;

export interface RP_Session {
  user: RP_User;
  session: BetterAuth_Session;
}

/**
 *
 * Type for the Polymorphic relationship item in the favorites array.
 * We take this and divvy it up into each collection type.
 * @todo: slice this into separate objects per collection to modularize queries/data
 *
 * **/
export type FavouriteItem = { value: string; relationTo: "posts" | "surf" };
export type FavouriteActions = {
  setfavorites: (l: FavouriteItem[]) => void;
  addFavourite: (l: FavouriteItem | FavouriteItem[]) => void;
  removeFavorite: (l: Partial<{ [x in "surf" | "posts"]: string[] }>) => void;
};
/**
 * Store for the favorites array.
 * This should have a field for each favorites-enabled collection.
 * @todo: Slice this down to separate types/stores per collection, and perhaps create a mapped type to help with the process.
 *
 */
export type favoritestore = {
  favorites: {
    posts: string[];
    surf: string[];
  };
};

export type NotificationItems = {
  lastFetched: number;
  count: number;
  user: string;
  notifications: Map<string, SyncedNotification>;
};
export type NotificationActions = {
  setNotifications: (item: SyncedNotification[]) => void;
  updateUser: (item: NotificationItems["user"]) => void;
  updateNotifications: (
    item: Array<Partial<SyncedNotification> & Pick<SyncedNotification, "id">>
  ) => void;
  addNotification: (item: SyncedNotification) => void;
  removeNotification: (id: string) => void;
};
export type NotificationStore = NotificationItems & NotificationActions;
const sortNotifications = (notifications: Map<string, SyncedNotification>) => {
  return new Map(
    [...notifications.entries()].sort((a, b) =>
      sortByDate({ order: "DESC" })(a[1].createdAt, b[1].createdAt)
    )
  );
};

/**
 * `count` represents the **unread inbox count** — the value shown on the
 * header bell badge. Dismissed and already-read items don't count, since
 * the badge is conceptually "things you should look at." Total cache
 * size is `notifications.size`, available via the store directly when
 * needed.
 */
const computeUnreadCount = (notifications: Map<string, SyncedNotification>) =>
  [...notifications.values()].reduce(
    (total, n) => (n.read || n.dismissed ? total : total + 1),
    0
  );
export const createNotificationStore = (props?: { user?: string }) => {
  const user = props?.user || "guest";
  return createStore<NotificationStore>()((set, get) => ({
    lastFetched: 0,
    count: 0,
    user: user,
    notifications: new Map<string, SyncedNotification>(),
    setNotifications: (nextState) =>
      set((state) => {
        const notific = new Map(state.notifications);
        nextState.forEach((n) => {
          notific.set(n.id, n);
        });
        return {
          ...state,
          notifications: sortNotifications(notific),
          count: computeUnreadCount(notific),
          lastFetched: performance.now()
        };
      }),
    updateNotifications: (nextState) =>
      set((state) => {
        const notific = new Map(state.notifications);
        nextState.forEach((n) => {
          const prv = notific.get(n.id);
          if (prv) {
            notific.set(n.id, {
              ...prv,
              ...n
            });
          } else {
            // warning: this is a convenience, but it's not type-safe
            notific.set(n.id, n as SyncedNotification);
          }
        });
        return {
          ...state,
          notifications: sortNotifications(notific),
          count: computeUnreadCount(notific),
          lastFetched: performance.now()
        };
      }),
    addNotification: (nextState) =>
      set((state) => {
        const notific = new Map(state.notifications);
        notific.set(nextState.id, nextState);
        return {
          ...state,
          notifications: sortNotifications(notific),
          count: computeUnreadCount(notific),
          lastFetched: performance.now()
        };
      }),
    removeNotification: (id) =>
      set((state) => {
        const notific = new Map(state.notifications);
        notific.delete(id);
        return {
          ...state,
          notifications: sortNotifications(notific),
          count: computeUnreadCount(notific),
          lastFetched: performance.now()
        };
      }),
    updateUser: (nextState) =>
      set(
        (state) => ({
          ...state,
          count: 0,
          notifications: new Map<string, SyncedNotification>(),
          lastFetched: 0,
          user: nextState
        }),
        true
      )
  }));
};
