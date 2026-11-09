"use client";

import { ReferencedLink } from "@/hideaway/components/core/Link/ReferencedLink";
import {
  Archive,
  AtSignIcon,
  Bell,
  BellOff,
  CheckCircle2,
  Eye,
  MessageCircle,
  Search,
  User2,
  XCircle
} from "lucide-react";
import { AnimatePresence } from "motion/react";
import * as motion from "motion/react-m";
import { useCallback, useEffect, useState } from "react";

import { HA_Badge as Badge } from "@/components/ui/badge";
import { Button, PillButton } from "@/hideaway/components/core/Button";
import { HA_Card as Card, HA_CardContent as CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HA_Separator as Separator } from "@/components/ui/separator";
import { Skeleton } from "@/hideaway/components/ui/skeleton";

import { FrontImage } from "@/hideaway/components/core/Media/FrontImage";
import { useHumanDate } from "@/hooks/useLocaleDate";
import type { SyncedNotification } from "@/payload/collections/Notifications/hooks/types";
import { useNotifications } from "@/hideaway/providers/Notifications";
import { BookmarkIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

type FilterType = "all" | "unread" | "read" | "dismissed";
type SortType = "newest" | "oldest" | "type";

interface NotificationCenterProps {
  className?: string;
}
const ScrollArea = dynamic(
  () => import("@/components/ui/scroll-area").then((m) => m.ScrollArea),
  {
    ssr: false
  }
);
export const NotificationCenter = ({ className }: NotificationCenterProps) => {
  const { notifications, isLoading, count, setRead, setDismissed, setAllRead } =
    useNotifications();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [sortType, setSortType] = useState<SortType>("newest");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const filterNotifications = useCallback(
    ({
      notifications,
      searchQuery,
      filterType,
      sortType
    }: {
      notifications: SyncedNotification[];
      searchQuery: string;
      filterType: FilterType;
      sortType: SortType;
    }) => {
      let filtered = notifications;

      // Apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (notification) =>
            notification.title.toLowerCase().includes(query) ||
            notification.content?.toLowerCase().includes(query) ||
            notification.type.toLowerCase().includes(query)
        );
      }

      // Apply status filter
      switch (filterType) {
        case "unread":
          filtered = filtered.filter((n) => !n.read);
          break;
        case "read":
          filtered = filtered.filter((n) => n.read && !n.dismissed);
          break;
        case "dismissed":
          filtered = filtered.filter((n) => n.dismissed);
          break;
        default:
          filtered = filtered.filter((n) => !n.dismissed);
      }

      // Apply sorting
      switch (sortType) {
        case "oldest":
          filtered = [...filtered].sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          break;
        case "type":
          filtered = [...filtered].sort((a, b) => a.type.localeCompare(b.type));
          break;
        default: // newest
          filtered = [...filtered].sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
      }

      return filtered;
    },
    []
  );
  // Filter and sort notifications
  const [filteredNotifications, setFilteredNotifications] = useState<
    SyncedNotification[]
  >([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [groupedNotifications, setGroupedNotifications] = useState<
    Record<string, SyncedNotification[]>
  >({});
  useEffect(() => {
    const filtered = filterNotifications({
      notifications,
      searchQuery,
      filterType,
      sortType
    });
    const groups: Record<string, SyncedNotification[]> = {};

    filtered.forEach((notification) => {
      const date = new Date(notification.createdAt);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let groupKey: string;
      if (date.toDateString() === today.toDateString()) {
        groupKey = "Today";
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupKey = "Yesterday";
      } else {
        groupKey = date.toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric"
        });
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(notification);
    });
    setFilteredNotifications(filtered);
    setGroupedNotifications(groups);
    setUnreadCount(filtered.filter((n) => !n.read && !n.dismissed).length);
  }, [notifications, searchQuery, filterType, sortType, filterNotifications]);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredNotifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredNotifications.map((n) => n.id)));
    }
  }, [filteredNotifications, selectedIds.size]);

  const handleBulkAction = useCallback(
    (action: "read" | "dismiss") => {
      const ids = Array.from(selectedIds);
      if (ids.length === 0) return;

      if (action === "read") {
        setRead({ ids });
      } else {
        setDismissed({ ids });
      }
      setSelectedIds(new Set());
    },
    [selectedIds, setRead, setDismissed]
  );

  const handleToggleSelect = useCallback(
    (id: string) => {
      const newSelected = new Set(selectedIds);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      setSelectedIds(newSelected);
    },
    [selectedIds]
  );

  return (
    <div
      className={`mx-auto my-[40px] mt-[10rem] flex h-full max-w-[90vw] flex-col font-sans ${className}`}
    >
      {/* Header — design-system sticky formula */}
      <header className="sticky top-0 z-10 flex flex-col gap-4 border-b border-border/30 bg-background/90 px-6 py-5 backdrop-blur-md xl:px-10">
        <div className="flex items-end justify-between">
          <div className="flex items-center gap-3">
            <Bell className="size-5 text-foreground/70" />
            <div>
              <p className="font-sans text-[10px] tracking-[0.2em] text-muted-foreground/60 uppercase xl:text-xs">
                Inbox
              </p>
              <h1 className="text-3xl font-light tracking-tight xl:text-4xl">
                Notifications
              </h1>
              <p className="mt-1 font-sans text-[11px] text-muted-foreground/65 tabular-nums xl:text-xs">
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
              </p>
            </div>
          </div>

          {unreadCount > 0 && (
            <PillButton onClick={() => setAllRead()} disabled={isLoading}>
              Mark all read
            </PillButton>
          )}
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col gap-[12px] sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-[12px] h-[16px] w-[16px] -translate-y-1/2 transform text-muted-foreground" />
            <Input
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-[40px]"
            />
          </div>

          <div className="flex gap-[8px]">
            <Select
              value={filterType}
              onValueChange={(value: FilterType) => setFilterType(value)}
            >
              <SelectTrigger className="w-[128px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={sortType}
              onValueChange={(value: SortType) => setSortType(value)}
            >
              <SelectTrigger className="w-[128px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="type">By Type</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className={"relative h-16 w-full"}>
          {/* Bulk Actions */}
          {selectedIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-[12px] rounded-lg border bg-background/5 p-[12px]"
            >
              <span className="text-base font-medium">
                {selectedIds.size} selected
              </span>
              <Separator orientation="vertical" className="h-[16px]" />
              <div className="flex gap-[8px]">
                <Button
                  onClick={() => handleBulkAction("read")}
                  className={"flex items-center gap-[4px]"}
                  disabled={isLoading}
                >
                  <Eye className="mr-[4px] h-[16px] w-[16px]" />
                  Mark read
                </Button>
                <Button
                  onClick={() => handleBulkAction("dismiss")}
                  disabled={isLoading}
                >
                  <Archive className="mr-[4px] h-[16px] w-[16px]" />
                  Dismiss
                </Button>
                <Button onClick={() => setSelectedIds(new Set())}>
                  Cancel
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </header>

      {/* Content */}
      <ScrollArea className="max-h-[75vh] flex-1">
        <div className="p-[24px]">
          {isLoading && filteredNotifications.length === 0 ? (
            <NotificationSkeleton />
          ) : Object.keys(groupedNotifications).length === 0 ? (
            <EmptyState searchQuery={searchQuery} filterType={filterType} />
          ) : (
            <div className="space-y-[24px]">
              {Object.entries(groupedNotifications).map(
                ([date, notifications]) => (
                  <motion.div
                    key={date}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h3 className="sticky top-0 mb-[12px] bg-background/80 py-[8px] text-base font-semibold text-muted-foreground backdrop-blur-sm">
                      {date}
                    </h3>
                    <motion.div
                      className="space-y-[12px]"
                      initial="hidden"
                      animate="visible"
                      variants={{
                        visible: {
                          transition: {
                            staggerChildren: 0.05
                          }
                        }
                      }}
                    >
                      <AnimatePresence mode="popLayout">
                        {notifications.map((notification) => (
                          <NotificationCard
                            key={notification.id}
                            notification={notification}
                            isSelected={selectedIds.has(notification.id)}
                            onToggleSelect={handleToggleSelect}
                            onRead={setRead}
                            onDismiss={setDismissed}
                          />
                        ))}
                      </AnimatePresence>
                    </motion.div>
                  </motion.div>
                )
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

// Notification Card Component
interface NotificationCardProps {
  notification: SyncedNotification;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onRead: ({ ids }: { ids: string[] }) => void;
  onDismiss: ({ ids }: { ids: string[] }) => void;
}

const NotificationCard = ({
  notification,
  isSelected,
  onToggleSelect,
  onRead,
  onDismiss
}: NotificationCardProps) => {
  const { getRelativeTime } = useHumanDate();
  const [isHovered, setIsHovered] = useState(false);

  const handleMarkRead = useCallback(() => {
    onRead({ ids: [notification.id] });
  }, [notification.id, onRead]);

  const handleDismiss = useCallback(() => {
    onDismiss({ ids: [notification.id] });
  }, [notification.id, onDismiss]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "follow":
        return <User2 />;
      case "comment":
        return <MessageCircle />;
      case "mention":
        return <AtSignIcon />;
      case "bookmark":
        return <BookmarkIcon />;
      default:
        return <ExclamationTriangleIcon />;
    }
  };

  const getStatusColor = (notification: SyncedNotification) => {
    if (notification.dismissed) return "text-muted-foreground";
    if (!notification.read) return "text-foreground";
    return "text-foreground";
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, x: -100 }}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
      }}
      whileHover={{ scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={cn(
          "group transition-all duration-200",
          !notification.read && !notification.dismissed
            ? "border-muted-faded-background/20 bg-muted-faded-background/5"
            : notification.dismissed
              ? "opacity-60"
              : ""
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => onToggleSelect(notification.id)}
      >
        <CardContent className="p-[16px]">
          <div className="flex gap-[16px]">
            {/* Selection Checkbox */}
            <div className="flex items-start pt-[4px]">
              <div
                className={cn(
                  "flex h-[16px] w-[16px] items-center justify-center rounded border-2 transition-all",
                  isSelected
                    ? "border-muted-faded-background/20 bg-muted-faded-background/5"
                    : "border-muted-foreground/30 hover:border-muted-faded-background/20"
                )}
              >
                {isSelected && (
                  <CheckCircle2 className="text-foreground-foreground h-[12px] w-[12px]" />
                )}
              </div>
            </div>

            {/* Thumbnail */}
            {notification.thumbnail && (
              <div className="h-[48px] w-[48px] flex-shrink-0 overflow-hidden rounded-lg">
                <FrontImage
                  resource={notification.thumbnail}
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-[12px]">
                <div className="flex-1">
                  <div className="mb-[4px] flex items-center gap-[8px]">
                    <span className="text-base">
                      {getNotificationIcon(notification.type)}
                    </span>
                    <Badge variant="secondary" className="text-base">
                      {notification.type}
                    </Badge>
                    {!notification.read && !notification.dismissed && (
                      <div className="h-[8px] w-[8px] rounded-full bg-background" />
                    )}
                  </div>

                  <h4
                    className={cn(
                      "mb-[4px] text-base font-semibold",
                      getStatusColor(notification)
                    )}
                  >
                    {notification.actionLink && notification.actionLink.url ? (
                      <ReferencedLink
                        href={notification.actionLink.url}
                        link={notification.actionLink}
                        onClick={handleMarkRead}
                        className="hover:underline"
                      >
                        {notification.title}
                      </ReferencedLink>
                    ) : (
                      notification.title
                    )}
                  </h4>

                  {notification.content && (
                    <p className="line-clamp-2 text-base text-muted-foreground">
                      {notification.content}
                    </p>
                  )}

                  <p className="mt-[8px] text-base text-muted-foreground">
                    {getRelativeTime({ timestamp: notification.createdAt })}
                  </p>
                </div>

                {/* Actions */}
                <AnimatePresence>
                  {(isHovered || isSelected) && (
                    <motion.div
                      initial={{ opacity: 0, translateZ: 0 }}
                      animate={{ opacity: 1, translateZ: 10 }}
                      exit={{ opacity: 0, translateZ: 0 }}
                      className="flex gap-[4px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {!notification.read && (
                        <Button
                          onClick={handleMarkRead}
                          className="h-[32px] w-[32px] p-0"
                        >
                          <Eye className="h-[16px] w-[16px]" />
                        </Button>
                      )}
                      <Button
                        onClick={handleDismiss}
                        className="h-[32px] w-[32px] p-0 text-muted-foreground hover:text-destructive"
                      >
                        <XCircle className="h-[16px] w-[16px]" />
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Empty State — follows the CLAUDE.md empty-state template:
// monogram symbol at low opacity, light sans headline, mono-caps sub,
// no CTA needed here (the inbox is reached, not navigated-from).
const EmptyState = ({
  searchQuery,
  filterType
}: {
  searchQuery: string;
  filterType: FilterType;
}) => {
  const headline = searchQuery
    ? "Nothing matches that search"
    : filterType === "unread"
      ? "All caught up"
      : "Nothing here yet";
  const sub = searchQuery
    ? `No notifications match “${searchQuery}”`
    : filterType === "unread"
      ? "Anything new will land here"
      : "Inbox is empty until something happens";
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-24 text-center"
    >
      <span
        aria-hidden
        className="mb-4 font-sans text-5xl text-foreground/[0.10]"
      >
        ○
      </span>
      <p className="text-base font-light text-foreground/70">{headline}</p>
      <p className="mt-1.5 max-w-xs font-sans text-[11px] tracking-wide text-muted-foreground/55">
        {sub}
      </p>
    </motion.div>
  );
};

// Loading Skeleton
const NotificationSkeleton = () => (
  <div className="space-y-[24px]">
    {[1, 2, 3].map((group) => (
      <div key={group}>
        <Skeleton className="mb-[12px] h-[16px] w-[80px]" />
        <div className="space-y-[12px]">
          {[1, 2, 3].map((item) => (
            <Card key={item}>
              <CardContent className="p-[16px]">
                <div className="flex gap-[16px]">
                  <Skeleton className="h-[16px] w-[16px] rounded" />
                  <Skeleton className="h-[48px] w-[48px] rounded-lg" />
                  <div className="flex-1 space-y-[8px]">
                    <div className="flex items-center gap-[8px]">
                      <Skeleton className="h-[16px] w-[24px]" />
                      <Skeleton className="h-[16px] w-[64px]" />
                    </div>
                    <Skeleton className="h-[16px] w-3/4" />
                    <Skeleton className="h-[12px] w-full" />
                    <Skeleton className="h-[12px] w-[80px]" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    ))}
  </div>
);
