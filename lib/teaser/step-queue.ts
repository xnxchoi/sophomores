import { nextDisplayedStep } from "./step-motion";

type Controls = { stop(): void; pause(): void; play(): void };
type QueueCallbacks = {
  start(destination: number, complete: () => void): Controls;
  display(destination: number): void;
  snap(destination: number): void;
  settle(settled: boolean): void;
};

/** Scroll updates the pending destination; an active adjacent tween owns its full duration. */
export function createStepQueue(initial: number, callbacks: QueueCallbacks) {
  let completed = initial;
  let destination = initial;
  let controls: Controls | undefined;
  let generation = 0;
  let disposed = false;
  let paused = false;

  const advance = () => {
    if (disposed || controls) return;
    if (completed === destination) {
      callbacks.settle(true);
      return;
    }
    const next = nextDisplayedStep(completed, destination);
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
      destination = next;
      if (snap) {
        generation += 1;
        controls?.stop();
        controls = undefined;
        completed = next;
        callbacks.snap(next);
        callbacks.display(next);
        callbacks.settle(true);
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
