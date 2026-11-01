export type AuthenticationStep = "chooser" | "login" | "signup";

export function isAuthenticationLocked(step: AuthenticationStep) {
  return step !== "chooser";
}

type AuthenticationViewport = {
  width: number;
  finePointer: boolean;
  viewportHeight: number;
  offsetTop: number;
  layoutHeight: number;
  gutter: number;
  contentHeight: number;
  locked: boolean;
};

/** Target geometry uses natural content, never the in-flight animated height. */
export function authenticationViewportGeometry({
  width,
  finePointer,
  viewportHeight,
  offsetTop,
  layoutHeight,
  gutter,
  contentHeight,
  locked
}: AuthenticationViewport) {
  const maxHeight = Math.max(0, viewportHeight - gutter * 2);
  const height = Math.min(Math.max(0, contentHeight), maxHeight);
  const occlusion = Math.max(0, layoutHeight - offsetTop - viewportHeight);
  return {
    bottom: occlusion + (width >= 640 || finePointer || locked ? (viewportHeight - height) / 2 : gutter),
    maxHeight
  };
}
