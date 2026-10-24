/** Decorative loops follow their own visibility, not the card-reading clock. */
export function canPlayStoryArtwork({
  inView,
  visible,
  revealed
}: {
  inView: boolean;
  visible: boolean;
  revealed: boolean;
}) {
  return inView && visible && revealed;
}
