"use client";

import {
  DataTableActionBar,
  DataTableActionBarAction,
  DataTableActionBarSelection
} from "@/hideaway/components/ui/data-table/data-table-action-bar";
import { HA_Separator as Separator } from "@/components/ui/separator";
import type { SyncedNotification } from "@/payload/collections/Notifications/hooks/types";
import { useNotifications } from "@/hideaway/providers/Notifications";
import { Cross2Icon, EyeOpenIcon } from "@radix-ui/react-icons";
import type { Table } from "@tanstack/react-table";
import { useCallback, useState } from "react";

/**
 * Notification table action bar.
 *
 * Two operations: mark selected rows read, or dismiss them. There is no
 * "Set as Unread" because the server-side beforeChange hook on the
 * `notifications` collection treats `read` as monotonic — writing
 * `read: false` is silently reverted. Re-introducing reversibility
 * would require either a dedicated endpoint or a hook adjustment; for
 * now the action is omitted to keep affordance in lock-step with
 * behavior. (The previous version of this file rendered an "Eye
 * Closed" button that silently called `setRead` under the hood — a
 * confusing no-op for the user.)
 */

const actions = ["mark-as-read", "dismiss"] as const;
type Action = (typeof actions)[number];

interface NorTableActionBarProps {
  table: Table<SyncedNotification>;
}

export function NAction({ table }: NorTableActionBarProps) {
  const rows = table.getFilteredSelectedRowModel().rows;

  const [currentAction, setCurrentAction] = useState<Action | null>(null);
  const { setDismissed, setRead, isLoading } = useNotifications();

  const onMarkRead = useCallback(() => {
    const ids = rows.map((row) => row.original.id);
    if (ids.length === 0) return;
    setCurrentAction("mark-as-read");
    setRead({ ids });
  }, [rows, setRead]);

  const onDismiss = useCallback(() => {
    const ids = rows.map((row) => row.original.id);
    if (ids.length === 0) return;
    setCurrentAction("dismiss");
    setDismissed({ ids });
    table.toggleAllRowsSelected(false);
  }, [rows, table, setDismissed]);

  return (
    <DataTableActionBar table={table} visible={rows.length > 0}>
      <DataTableActionBarSelection table={table} />
      <Separator
        orientation="vertical"
        className="hidden data-[orientation=vertical]:h-5 sm:block"
      />
      <div className="flex items-center gap-1.5">
        <DataTableActionBarAction
          size="icon"
          tooltip="Mark as read"
          isPending={currentAction === "mark-as-read" && isLoading}
          onClick={onMarkRead}
        >
          <EyeOpenIcon />
        </DataTableActionBarAction>
        <DataTableActionBarAction
          size="icon"
          tooltip="Dismiss"
          isPending={currentAction === "dismiss" && isLoading}
          onClick={onDismiss}
        >
          <Cross2Icon />
        </DataTableActionBarAction>
      </div>
    </DataTableActionBar>
  );
}
