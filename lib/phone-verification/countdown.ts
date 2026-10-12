import { remainingSeconds } from "./model";

type CountdownEnvironment = {
  now: () => number;
  setInterval: (callback: () => void, delay: number) => number;
  clearInterval: (id: number) => void;
  page: Pick<EventTarget, "addEventListener" | "removeEventListener">;
  visibility: Pick<EventTarget, "addEventListener" | "removeEventListener">;
};

type CountdownSubscription = {
  expiresAt: number;
  onTick: (seconds: number) => void;
  onExpire: () => void;
};

export function subscribeToCountdown(
  { expiresAt, onTick, onExpire }: CountdownSubscription,
  environment: CountdownEnvironment
) {
  let stopped = false;
  const update = () => {
    if (stopped) return;
    const seconds = remainingSeconds(expiresAt, environment.now());
    onTick(seconds);
    if (seconds === 0) {
      cleanup();
      onExpire();
    }
  };
  const interval = environment.setInterval(update, 1_000);
  environment.page.addEventListener("pageshow", update);
  environment.visibility.addEventListener("visibilitychange", update);

  function cleanup() {
    if (stopped) return;
    stopped = true;
    environment.clearInterval(interval);
    environment.page.removeEventListener("pageshow", update);
    environment.visibility.removeEventListener("visibilitychange", update);
  }

  update();
  return cleanup;
}
