export { TapePlayer } from "./TapePlayer";
export { useHaptics } from "./hooks/useHaptics";
export type {
  TapePlayerVariant,
  TapePlayerProps,
  HapticPattern
} from "./types";
export { SIZES, ICON_PATHS } from "./constants";

// Layout variants (for direct import if needed)
export { FullPlayer } from "./layouts/FullPlayer";
export { SidebarPlayer } from "./layouts/SidebarPlayer";
export { DrawerPlayer } from "./layouts/DrawerPlayer";
export { HeroPlayer } from "./layouts/HeroPlayer";

// Individual controls (for composition in custom layouts)
export { PlayPauseButton } from "./controls/PlayPauseButton";
export { RewindButton } from "./controls/RewindButton";
export { TransportBar } from "./controls/TransportBar";

// Visual sub-components
export { TapeReels } from "./visuals/TapeReels";
export { TapeCounter } from "./visuals/TapeCounter";
export { TrackInfo } from "./visuals/TrackInfo";
export { ProgressRail } from "./visuals/ProgressRail";
