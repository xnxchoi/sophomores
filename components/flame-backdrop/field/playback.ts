export interface FieldPlaybackState {
  readonly paused: boolean;
  readonly visible: boolean;
  readonly hidden: boolean;
}

/** One gate for runtime updates; disabling it never discards accumulated active time. */
export function canPlayField(state: FieldPlaybackState): boolean {
  return state.visible && !state.paused && !state.hidden;
}
