import { DateTime } from "luxon";

export const formatRelativeTime = (
  isoTime: string,
  locale: string,
  now?: DateTime
): string => {
  if (!isoTime) return "";
  const date = DateTime.fromISO(isoTime);
  if (!date.isValid) return "";
  const base = (now ?? DateTime.now()).setLocale(locale);
  return date.setLocale(locale).toRelative({ base, locale }) ?? "";
};
