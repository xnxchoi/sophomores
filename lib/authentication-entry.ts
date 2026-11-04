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
};

/** Place natural content by viewport and pointer, never by dismissal locks. */
export function authenticationViewportGeometry({
  width,
  finePointer,
  viewportHeight,
  offsetTop,
  layoutHeight,
  gutter,
  contentHeight
}: AuthenticationViewport) {
  const maxHeight = Math.max(0, viewportHeight - gutter * 2);
  const height = Math.min(Math.max(0, contentHeight), maxHeight);
  const occlusion = Math.max(0, layoutHeight - offsetTop - viewportHeight);
  return {
    bottom: occlusion + (width >= 640 || finePointer ? (viewportHeight - height) / 2 : gutter),
    maxHeight
  };
}
