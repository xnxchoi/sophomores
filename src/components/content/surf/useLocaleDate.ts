"use client";

import { DateTime } from "luxon";
import { useFormatter, useLocale, useNow } from "next-intl";
import { useCallback } from "react";

export const useHumanTime = (timestamp: string) => {
  const date = DateTime.fromISO(timestamp, { setZone: true });
  const now = useNow();
  const diff = date.diffNow();
  const formatter = useFormatter();
  const locale = useLocale();
  const jsD = date.toJSDate();
  if (diff.days < 1) {
    if (DateTime.fromJSDate(now).hasSame(date, "day")) {
      return date.toLocaleString(DateTime.TIME_24_WITH_SHORT_OFFSET, {
        locale
      });
    }
  }
  if (diff.weeks < 2) {
    return formatter.relativeTime(jsD, now);
  }
  if (DateTime.fromJSDate(now).hasSame(date, "year")) {
    return date.setLocale(locale).toFormat("LLL d");
  }
  return date.setLocale(locale).toLocaleString(DateTime.DATE_MED);
};

export const useHumanDate = () => {
  const locale = useLocale();
  const formatter = useFormatter();
  const getRelativeTime = useCallback(
    ({ timestamp }: { timestamp: string }) => {
      const now = DateTime.now();
      const date = DateTime.fromISO(timestamp, { setZone: true });
      const diff = date.diffNow();
      const jsD = date.toJSDate();
      if (diff.days < 1) {
        if (now.hasSame(date, "day")) {
          return date.toLocaleString(DateTime.TIME_24_WITH_SHORT_OFFSET, {
            locale
          });
        }
      }
      if (diff.weeks < 2) {
        return formatter.relativeTime(jsD, now.toJSDate());
      }
      if (now.hasSame(date, "year")) {
        return date.setLocale(locale).toFormat("LLL d");
      }
      return date.setLocale(locale).toLocaleString(DateTime.DATE_MED);
    },
    [locale, formatter]
  );
  return { getRelativeTime };
};
