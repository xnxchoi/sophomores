export type MusicProviderType = "apple_music" | "spotify";

export interface MusicTrackItem {
  id: string;
  provider: MusicProviderType;
  title: string;
  artist: string;
  album?: string;
  isrc?: string;
  duration?: number;
  coverUrl?: string;
  previewUrl?: string;
  url?: string;
}

export interface EntrySubmissionInput {
  track: MusicTrackItem;
  note?: string;
}

export type IneligibilityReason =
  | "unauthenticated"
  | "ineligible_product"
  | "account_unactivated"
  | "deadline_passed"
  | "setlist_locked"
  | "slots_full";

export interface UserEligibility {
  isEligible: boolean;
  reason?: IneligibilityReason;
  maxSlots: number;
  usedSlots: number;
  canEdit: boolean;
}

export interface SetlistSummary {
  id: string;
  title: string;
  slug: string;
  description?: string;
  status: "draft" | "active" | "locked" | "finalized";
  deadline: string;
  isPublic: boolean;
  provider: "apple_music" | "spotify" | "both";
  appleMusicPlaylistUrl?: string;
  spotifyPlaylistUrl?: string;
  totalTracks: number;
  tracks: ContributedTrackView[];
}

export interface ContributedTrackView {
  id: string;
  title: string;
  artist: string;
  albumTitle?: string;
  coverUrl?: string;
  previewUrl?: string;
  duration?: number;
  isrc?: string;
  submittedByName?: string;
  note?: string;
  externalUrl?: string;
}

export type MusicTrackView = ContributedTrackView;

export interface SetlistData {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  status: "draft" | "active" | "locked" | "finalized";
  deadline: string;
  isPastDeadline: boolean;
  provider: "apple_music" | "spotify" | "both";
  appleMusic?: {
    playlistId?: string | null;
    playlistUrl?: string | null;
    isConfigured?: boolean;
  } | null;
  spotify?: {
    playlistId?: string | null;
    playlistUrl?: string | null;
  } | null;
  totalTracks: number;
  tracks: ContributedTrackView[];
}

/**
 * One of the member's entry cards. `position` is the card's place among the
 * member's entries in the staff running order, computed for display; it is not
 * stored. `entryId` is the entry's stable id, or null for an open card.
 */
export interface SlotStateItem {
  position: number;
  entryId: string | null;
  track: ContributedTrackView | null;
  note?: string;
}

export interface UserSlotState {
  eligible: boolean;
  reason?: string;
  campaignStatus: string;
  deadline: string;
  deadlinePassed: boolean;
  slots: SlotStateItem[];
}
