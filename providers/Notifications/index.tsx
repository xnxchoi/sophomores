"use client";

/**
 * Notifications: provider + public hook.
 *
 * Architecture:
 *   1. NotificationStoreContext     — internal Zustand store (one map of
 *                                     SyncedNotification by id, kept in
 *                                     sync with React Query results).
 *   2. NotificationContext           — public surface consumed via
 *                                     `useNotifications()`.
 *
 * Data flow:
 *   - Initial: useQuery hits GET /api/notifications/me.
 *   - Polling: refetchInterval keeps the cache fresh while the tab is
 *     focused. We do NOT poll in the background — that's a battery /
 *     bandwidth tax that no notification surface justifies.
 *   - User actions: mutations.ts holds the three PATCH flows. Each one
 *     applies an optimistic update to every cached
 *     `["NOTIFY", { user }, ...]` entry and rolls back on error.
 *   - Cross-tab freshness: when the user re-focuses the tab, React
 *     Query refetches; that's our "real-time-enough" for this phase.
 *
 * Migration path to Server-Sent Events lives in
 * `readmes/NOTIFICATIONS.md` § "Phase B". The public hook surface here
 * is the contract that SSE-driven cache updates must preserve so the
 * swap is call-site-free.
 */

import { useRPSession } from "@/lib/auth/session/RP_SessionProvider";
import type { SyncedNotification } from "@/payload/collections/Notifications/hooks/types";
import {
  createNotificationStore,
  type NotificationStore
} from "@/stores/Notification/NotificationStore";
import { useQuery } from "@tanstack/react-query";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef
} from "react";
import { type StoreApi, useStore } from "zustand";
import { useNotificationFn } from "./notificationFn";
import {
  useDismissMutation,
  useReadAllMutation,
  useReadMutation
} from "./mutations";

/** Cadence of the foreground refetch. 30s is the lower bound that still
 * feels effortless without flooding the API. */
const POLL_INTERVAL_MS = 30_000;

type NotificationStoreApi = StoreApi<NotificationStore>;
const NotificationStoreContext = createContext<
  NotificationStoreApi | undefined
>(undefined);

interface NotificationContextValue {
  notifications: SyncedNotification[];
  count: number;
  lastFetched: number;
  isLoading: boolean;
  setRead: (args: { ids: string[] }) => void;
  setDismissed: (args: { ids: string[] }) => void;
  setAllRead: () => void;
}

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  count: 0,
  lastFetched: 0,
  isLoading: false,
  setRead: () => {},
  setDismissed: () => {},
  setAllRead: () => {}
});

/* ── Public Provider ────────────────────────────────────────────── */

export const NotificationProvider = ({
  children,
  user
}: {
  children: ReactNode;
  user: string;
}) => (
  <NotificationStoreShell user={user || ""}>
    <NotificationOrchestrator>{children}</NotificationOrchestrator>
  </NotificationStoreShell>
);

/* ── Store shell ────────────────────────────────────────────────── */

const NotificationStoreShell = ({
  user,
  children
}: {
  user: string;
  children: ReactNode;
}) => {
  // Lazy-init the store exactly once per provider mount.
  const storeRef = useRef<NotificationStoreApi>(undefined!);
  if (!storeRef.current) {
    storeRef.current = createNotificationStore({ user });
  }
  return (
    <NotificationStoreContext.Provider value={storeRef.current}>
      {children}
    </NotificationStoreContext.Provider>
  );
};

const useStoreSelector = <T,>(selector: (s: NotificationStore) => T): T => {
  const store = useContext(NotificationStoreContext);
  if (!store) {
    throw new Error(
      "useNotificationStore must be used within a NotificationProvider"
    );
  }
  return useStore(store, selector);
};

/* ── Orchestrator: query + mutations + context ──────────────────── */

const NotificationOrchestrator = ({ children }: { children: ReactNode }) => {
  const sessionUser = useRPSession((r) => r.id);
  const setStoreUser = useStoreSelector((s) => s.updateUser);
  const setStoreNotifications = useStoreSelector((s) => s.setNotifications);
  const storeNotifications = useStoreSelector((s) => s.notifications);
  const lastFetched = useStoreSelector((s) => s.lastFetched);
  const count = useStoreSelector((s) => s.count);

  // Keep the store's user in sync with the session. Clears the local
  // cache when the user changes — guards against a previous user's
  // notifications surviving a quick session swap.
  useEffect(() => {
    if (sessionUser) setStoreUser(sessionUser);
  }, [sessionUser, setStoreUser]);

  const { fn, queryString } = useNotificationFn({});
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["NOTIFY", { user: sessionUser }, queryString] as const,
    queryFn: fn,
    enabled: Boolean(sessionUser),
    staleTime: POLL_INTERVAL_MS,
    refetchInterval: POLL_INTERVAL_MS,
    // Don't burn bandwidth on background tabs. Refocus refetch is
    // enough to bring a sleeping tab current.
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    placeholderData: Array.from(storeNotifications.values()),
    networkMode: "online"
  });

  // Mirror server results into the Zustand store so non-React Query
  // consumers (and the optimistic-cache path) see consistent state.
  useEffect(() => {
    if (data) setStoreNotifications(data);
  }, [data, setStoreNotifications]);

  const readMutation = useReadMutation();
  const dismissMutation = useDismissMutation();
  const readAllMutation = useReadAllMutation();

  const setRead = useCallback(
    ({ ids }: { ids: string[] }) => {
      if (!sessionUser || ids.length === 0) return;
      readMutation.mutate({ user: sessionUser, ids });
    },
    [readMutation, sessionUser]
  );

  const setDismissed = useCallback(
    ({ ids }: { ids: string[] }) => {
      if (!sessionUser || ids.length === 0) return;
      dismissMutation.mutate({ user: sessionUser, ids });
    },
    [dismissMutation, sessionUser]
  );

  const setAllRead = useCallback(() => {
    if (!sessionUser) return;
    readAllMutation.mutate({ user: sessionUser });
  }, [readAllMutation, sessionUser]);

  const value: NotificationContextValue = {
    notifications: Array.from(storeNotifications.values()),
    count,
    lastFetched,
    isLoading: isLoading || isFetching || readAllMutation.isPending,
    setRead,
    setDismissed,
    setAllRead
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

/* ── Public hook ────────────────────────────────────────────────── */

export const useNotifications = (): NotificationContextValue => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return ctx;
};
