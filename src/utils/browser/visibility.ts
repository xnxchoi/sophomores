/** Browser visibility shared by flame playback, story animation and account timers. */
export function subscribeVisibility(listener: () => void): () => void {
  document.addEventListener('visibilitychange', listener);
  return () => document.removeEventListener('visibilitychange', listener);
}

export function serverSnapshot(): false {
  return false;
}
