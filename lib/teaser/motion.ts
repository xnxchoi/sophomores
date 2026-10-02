export function launchLabel(iso: string | null, now: Date): string {
  if (
    !iso ||
    !Number.isFinite(Date.parse(iso)) ||
    !Number.isFinite(now.getTime())
  )
    return "Date to be announced";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Seoul"
  }).format(new Date(iso));
}
