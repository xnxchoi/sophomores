"use client";
import type { SyncedNotification } from "@/payload/collections/Notifications/hooks/types";
import type { QueryFunction } from "@tanstack/react-query";
import { useMemo } from "react";

export const useNotificationFn = ({
  lastFetched
}: {
  lastFetched?: number;
}): {
  fn: QueryFunction<SyncedNotification[], [string, { user: string }, string]>;
  queryString: string;
} => {

  return useMemo(
    () => ({
      fn: async ({ queryKey }) => {
        const [_, k, fetchString] = queryKey;
        const { user } = k as { user: string };
        if (!user) {
          return [];
        }

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SERVER_URL}/api/notifications/me${fetchString}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json"
            },
            credentials: "include"
          }
        );
        if (!response.ok) {
          console.error(response);
          throw new Error("Failed to fetch notifications");
        } else {
          const re = await response
            .json()
            .then((r) => r.notifications as SyncedNotification[]);
          return re;
        }
      },
      queryString: lastFetched ? `?timestamp=${lastFetched}` : ``
    }),
    [lastFetched]
  );
};
