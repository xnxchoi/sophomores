import { formatRelativeTime } from "@/hideaway/utilities/formatRelativeTime";

export const RelativeTime = ({
  isoTime,
  locale
}: {
  isoTime: string;
  locale: string;
}) => {
  const relativeDate = formatRelativeTime(isoTime, locale);
  return <time dateTime={isoTime}>{relativeDate}</time>;
};
