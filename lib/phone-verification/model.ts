export type MessagingPlatform = "ios" | "android" | "manual";

export function normalizeKoreanMobile(raw: string): string | null {
  if (typeof raw !== "string" || raw.length > 40 || !/^[+0-9 -]+$/.test(raw))
    return null;
  const compact = raw.replace(/[ -]/g, "");
  if (/^010\d{8}$/.test(compact)) return `+82${compact.slice(1)}`;
  return /^\+8210\d{8}$/.test(compact) ? compact : null;
}

export function messagingPlatform(
  userAgent: string,
  maxTouchPoints = 0
): MessagingPlatform {
  if (typeof userAgent !== "string") return "manual";
  if (
    /iPhone|iPad|iPod/.test(userAgent) ||
    (/Macintosh|MacIntel/.test(userAgent) && maxTouchPoints > 1)
  )
    return "ios";
  return /Android/i.test(userAgent) ? "android" : "manual";
}

// Compatibility candidates, not a transport guarantee. Physical device testing
// is required: Apple does not document email recipients or body prefilling.
export function buildMessageHref(
  recipient: string,
  body: string,
  platform: MessagingPlatform
): string | null {
  const mailbox =
    /^[A-Za-z0-9]+(?:[._+-][A-Za-z0-9]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/;
  if (
    typeof recipient !== "string" ||
    recipient.length > 254 ||
    !mailbox.test(recipient)
  )
    return null;
  if (
    typeof body !== "string" ||
    !body.trim() ||
    body.length > 500 ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(
      body
    )
  )
    return null;
  if (platform !== "ios" && platform !== "android") return null;
  return `sms:${recipient}${platform === "ios" ? "&" : "?"}body=${encodeURIComponent(body)}`;
}

export function createPreviewChallenge(phone: string, now: number) {
  return {
    phone,
    recipient: "verify@example.invalid",
    body: "SPHMRS PREVIEW — NOT A VALID CODE",
    expiresAt: now + 300_000,
    mode: "preview" as const
  };
}

export type PreviewChallenge = ReturnType<typeof createPreviewChallenge>;

export function canOpenComposer(mode: "preview" | "live"): boolean {
  return mode === "live";
}

export function remainingSeconds(expiresAt: number, now: number): number {
  return Math.max(0, Math.ceil((expiresAt - now) / 1000));
}
