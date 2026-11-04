import {
  type AccentIdentity,
  DEFAULT_IDENTITY,
  isAccentName,
  isArchiveLayout
} from "./types";

type MaybeIdentityCarrier =
  | {
      identity?: {
        accent?: string | null;
        layout?: string | null;
      } | null;
    }
  | null
  | undefined;

export function getCategoryAccent(
  source: MaybeIdentityCarrier
): AccentIdentity {
  const raw = source?.identity;
  if (!raw) return DEFAULT_IDENTITY;

  return {
    accent: isAccentName(raw.accent) ? raw.accent : DEFAULT_IDENTITY.accent,
    layout: isArchiveLayout(raw.layout) ? raw.layout : DEFAULT_IDENTITY.layout
  };
}

export function hasSignatureAccent(identity: AccentIdentity): boolean {
  return identity.accent !== "none";
}
