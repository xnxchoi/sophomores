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

export interface SlotSubmissionInput {
  slotIndex: number;
  track: MusicTrackItem;
  note?: string;
}

export type IneligibilityReason =
  | "unauthenticated"
  | "ineligible_product"
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
  slotIndex?: number;
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
    ownerUserToken?: string | null;
  } | null;
  spotify?: {
    playlistId?: string | null;
    playlistUrl?: string | null;
  } | null;
  totalTracks: number;
  tracks: ContributedTrackView[];
}

export interface SlotStateItem {
  slotIndex: 1 | 2;
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
