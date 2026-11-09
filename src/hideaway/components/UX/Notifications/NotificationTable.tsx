"use client";

import { DataTableColumnHeader } from "../../ui/data-table/data-table-column-header";
import { DataTableToolbar } from "../../ui/data-table/data-table-toolbar";
import { useDataTable } from "@/hooks/use-data-table";
import type { SyncedNotification } from "@/payload/collections/Notifications/hooks/types";
import { useNotifications } from "@/hideaway/providers/Notifications";

import { HA_DropdownMenu as DropdownMenu, HA_DropdownMenuContent as DropdownMenuContent, HA_DropdownMenuItem as DropdownMenuItem, HA_DropdownMenuTrigger as DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Column, ColumnDef } from "@tanstack/react-table";

import {
  CheckCircle2,
  Circle,
  MoreHorizontal,
  Text,
  XCircle
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { DataTable } from "../../ui/data-table/data-table";
import { HA_Badge as Badge } from "@/components/ui/badge";
import { HA_Checkbox as Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/hideaway/components/core/Button";
import { useHumanDate } from "@/hooks/useLocaleDate";
import type { DataTableRowAction } from "@/types/data-table";
import { NAction } from "./Table/ActionBar";

export const NotificationTable = () => {
  const {
    notifications,
    lastFetched,
    isLoading,
    count,
    setRead: sr,
    setDismissed: sd,
    setAllRead
  } = useNotifications();

  const { getRelativeTime } = useHumanDate();
  const [isActing, setIsActing] = useState(false);
  const [rowAction, setRowAction] =
    useState<DataTableRowAction<SyncedNotification> | null>(null);
  const setRead = useCallback(
    (ids: string[]) => {
      setIsActing(true);
      sr({ ids });
    },
    [sr]
  );
  const setDismissed = useCallback(
    (ids: string[]) => {
      setIsActing(true);
      sd({ ids });
    },
    [sd]
  );
  // Clear the row action immediately after dispatching. The previous
  // version watched the shared `isLoading` flag (which includes the
  // 30s background poll's `isFetching`) — that flipped `rowAction` to
  // null in the middle of any background-poll window, racing the
  // action-dispatch effect below. The mutation's own optimistic update
  // is sufficient feedback; the action signal is single-shot.
  useEffect(() => {
    if (!rowAction) return;
    switch (rowAction.variant) {
      case "update":
        setRead([rowAction.row.original.id]);
        break;
      case "delete":
        setDismissed([rowAction.row.original.id]);
        break;
    }
    // Consume the action and reset acting flag in the same tick so the
    // next click is immediately responsive.
    setRowAction(null);
    setIsActing(false);
  }, [rowAction, setDismissed, setRead]);
  const columns = useMemo<ColumnDef<SyncedNotification>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        size: 32,
        enableSorting: false,
        enableHiding: false
      },
      {
        // Provide an unique id for the column
        // This id will be used as query key for the column filter
        id: "title",
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => <div>{row.getValue("title")}</div>,
        // Define the column meta options for sorting, filtering, and view options
        meta: {
          label: "Title",
          placeholder: "Search notification",
          variant: "text" as const,
          icon: Text
        },
        // By default, the column will not be filtered. Set to `true` to enable filtering.
        enableColumnFilter: true
      },
      {
        id: "status",
        accessorKey: "status",
        accessorFn: (row) => row.status,
        header: ({
          column
        }: {
          column: Column<
            SyncedNotification,
            unknown | SyncedNotification["status"]
          >;
        }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ cell }) => {
          const status = cell.getValue<SyncedNotification["status"]>();
          const Icon = status === "unread" ? CheckCircle2 : XCircle;

          return (
            <Badge variant="outline" className="capitalize">
              <Icon />
              {status}
            </Badge>
          );
        },
        meta: {
          label: "Status",
          variant: "multiSelect",
          options: [
            { label: "Unread", value: "unread", icon: Circle },
            { label: "Read", value: "read", icon: CheckCircle2 },
            { label: "Dismissed", value: "dismissed", icon: XCircle }
          ]
        },
        enableColumnFilter: true,
        enableSorting: true
      },
      {
        id: "createdAt",
        accessorKey: "createdAt",
        accessorFn: (row) => row.createdAt,
        header: ({
          column
        }: {
          column: Column<
            SyncedNotification,
            unknown | SyncedNotification["createdAt"]
          >;
        }) => <DataTableColumnHeader column={column} title="Date" />,
        cell: ({ cell }) => {
          const timestamp = cell.getValue<SyncedNotification["createdAt"]>();
          const rt = getRelativeTime({ timestamp });
          // Mono + tabular-nums per CLAUDE.md typography rules — timestamps
          // are metadata, not body copy. Muted to /60 (within the legibility
          // floor for UI labels) so they sit behind the title without
          // disappearing.
          return (
            <span className="font-sans text-[11px] text-muted-foreground/65 tabular-nums">
              {rt}
            </span>
          );
        },
        enableSorting: true
      },
      {
        id: "actions",
        cell: function Cell({ row }) {
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <MoreHorizontal className="h-[14px] w-[14px]" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={() => setRowAction({ row, variant: "update" })}
                >
                  {`Mark ${row.original.read ? "Unread" : "Read"}`}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    setRowAction({ row, variant: "delete" });
                  }}
                >
                  Dismiss
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
        size: 32
      }
    ],
    [getRelativeTime]
  );
  const { table } = useDataTable({
    data: notifications,
    columns,
    // Pass the total number of pages for the table
    pageCount: 1,
    initialState: {
      sorting: [{ id: "createdAt", desc: true }],
      columnFilters: [
        { id: "status", value: "unread" as const },
        { id: "status", value: "read" as const }
      ],
      pagination: {
        pageIndex: 0,
        pageSize: 10
      }
    },
    // Unique identifier for rows, can be used for unique row selection
    getRowId: (row) => row.id
  });
  return (
    <div className="relative h-full px-6 xl:px-10">
      <div className="h-full max-w-[var(--site-width)] flex-1">
        <div className="data-table-container container flex h-full w-full flex-col items-center justify-center gap-3.5 pt-9 pb-13 md:py-13">
          <DataTable actionBar={<NAction table={table} />} table={table}>
            <DataTableToolbar table={table} />
          </DataTable>
        </div>
      </div>
    </div>
  );
};
