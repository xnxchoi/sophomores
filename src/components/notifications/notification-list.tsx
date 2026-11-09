"use client";
import { useTranslations } from "next-intl";

import type { Notification } from "@/lib/content/slots";
import { useNotificationInbox } from "./notification-inbox";

export function NotificationList({ notifications }: { notifications: Notification[] }) {
  const t = useTranslations("Interface.notifications");
  const inbox = useNotificationInbox(notifications);
  if (inbox.notifications.length === 0) {
    return <p className="port-copy text-[oklch(from_var(--port-shade)_l_c_h_/_0.72)] text-sm">{t("empty")}</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {inbox.notifications.map((notification) => (
        <li key={notification.id} className="port-rule border-[oklch(from_var(--port-shade)_l_c_h_/_0.16)] flex items-start justify-between gap-3 rounded-lg border bg-faded-bg px-4 py-3">
          <div className="min-w-0">
            <a href={notification.href} className="text-base font-medium">
              {notification.title}
            </a>
            <p className="port-meta text-[oklch(from_var(--port-shade)_l_c_h_/_0.55)] mt-1 font-sans text-xs uppercase tracking-[0.18em]">{notification.body}</p>
          </div>
          {notification.read ? (
            <span className="pt-2 text-xs">{t("read")}</span>
          ) : (
            <button
              type="button"
              className="min-h-11 shrink-0 px-3 text-sm"
              onClick={() => inbox.markRead(notification.id)}
            >
              {t("markRead")}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
