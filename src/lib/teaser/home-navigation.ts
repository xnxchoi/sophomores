type HomeNavigationEvent = {
  button: number;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  defaultPrevented: boolean;
  preventDefault: () => void;
  stopPropagation: () => void;
};

export function navigateHome(
  event: HomeNavigationEvent,
  navigation: { scrollTo: (target: number) => void; updateHash: () => void }
) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    event.shiftKey
  )
    return false;
  // Avoid the native hash jump racing Lenis's element-coordinate anchor handler.
  event.preventDefault();
  event.stopPropagation();
  navigation.updateHash();
  navigation.scrollTo(0);
  return true;
}
