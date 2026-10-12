import { nextDisplayedStep } from "./step-motion";

type Controls = { stop(): void; pause(): void; play(): void };
type QueueCallbacks = {
  start(destination: number, complete: () => void): Controls;
  display(destination: number): void;
  snap(destination: number): void;
  settle(settled: boolean): void;
};

/** Chapters queue adjacent reveals; stories can retarget their current pose immediately. */
export function createStepQueue(
  initial: number,
  callbacks: QueueCallbacks,
  mode: "adjacent" | "latest" = "adjacent",
) {
  let completed = initial;
  let destination = initial;
  let controls: Controls | undefined;
  let generation = 0;
  let disposed = false;
  let paused = false;

  const advance = (interrupted = false) => {
    if (disposed || controls) return;
    if (completed === destination && !interrupted) {
      callbacks.settle(true);
      return;
    }
    const next = mode === "latest" ? destination : nextDisplayedStep(completed, destination);
    const ticket = ++generation;
    callbacks.settle(false);
    callbacks.display(next);
    controls = callbacks.start(next, () => {
      if (disposed || ticket !== generation) return;
      completed = next;
      controls = undefined;
      advance();
    });
    if (paused) controls.pause();
  };

  return {
    seek(next: number, snap = false) {
      if (disposed) return;
      const changed = next !== destination;
      destination = next;
      if (snap) {
        generation += 1;
        controls?.stop();
        controls = undefined;
        completed = next;
        callbacks.snap(next);
        callbacks.display(next);
        callbacks.settle(true);
      } else if (mode === "latest" && controls && changed) {
        generation += 1;
        controls.stop();
        controls = undefined;
        // The MotionValue retains its interpolated pose; do not snap on reversal.
        advance(true);
      } else {
        advance();
      }
    },
    setPaused(value: boolean) {
      paused = value;
      if (value) controls?.pause();
      else controls?.play();
    },
    dispose() {
      disposed = true;
      generation += 1;
      controls?.stop();
      controls = undefined;
    },
  };
}
