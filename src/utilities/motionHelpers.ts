export function motionCallback(
  onForwards: () => void,
  onBackwards?: () => void
) {
  let done = false;

  return (p: number) => {
    if (p >= 1 && !done) {
      done = true;
      onForwards();
    } else if (p < 1 && done) {
      done = false;
      onBackwards?.();
    }
  };
}
