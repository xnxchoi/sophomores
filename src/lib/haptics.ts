const attachments = new WeakMap<HTMLElement, () => void>();
const noop = () => {};

function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isDisabled(element: HTMLElement) {
  return element.matches(":disabled, [aria-disabled='true']");
}

/**
 * Optional tactile tap affordance, not confirmation of asynchronous success.
 * iOS uses Safari's trusted switch interaction; other devices may vibrate.
 * Device hardware, browser support and system settings still determine output.
 */
export function attachHaptics(element: HTMLElement | null): (() => void) | undefined {
  if (!element || typeof window === "undefined" || typeof navigator === "undefined") return;
  if (attachments.has(element)) return noop;

  const detach = isIos() ? attachIos(element) : attachNative(element);
  if (!detach) return;
  let attached = true;
  const cleanup = () => {
    if (!attached) return;
    attached = false;
    detach();
    attachments.delete(element);
  };
  attachments.set(element, cleanup);
  return cleanup;
}

function attachNative(element: HTMLElement) {
  if (typeof navigator.vibrate !== "function") return;
  const vibrate = navigator.vibrate.bind(navigator);
  const onClick = (event: MouseEvent) => {
    if (!event.isTrusted || isDisabled(element)) return;
    try {
      vibrate(8);
    } catch {
      // Optional hardware feedback can be denied; never interrupt the action.
    }
  };
  element.addEventListener("click", onClick);
  return () => element.removeEventListener("click", onClick);
}

function attachIos(element: HTMLElement) {
  let disposed = false;
  let detach: (() => void) | undefined;
  // Dynamic import also keeps the import-only package compatible with the
  // project's Node/CJS test runner and out of non-iOS clients' initial path.
  void import("ios-haptics").then(({ hapticTrigger }) => {
    if (!disposed) detach = installIos(element, hapticTrigger);
  }).catch((error: unknown) => {
    console.warn("Optional iOS haptics could not load", error);
  });
  return () => { disposed = true; detach?.(); };
}

function installIos(element: HTMLElement, hapticTrigger: (element: HTMLElement) => void) {
  if (element.querySelector("[data-haptic-trigger]")) return;
  const initialPosition = element.style.position;
  hapticTrigger(element);
  const changedPosition = element.style.position !== initialPosition;
  const overlay = element.querySelector<HTMLElement>("[data-haptic-trigger]");
  if (!overlay) return;

  // npm 3.2.0 still ships the full-size input overlay. Upstream main fixes its
  // scroll interception with a label and an off-finger switch. Reconcile that
  // shape here while keeping the published dependency pinned and reproducible.
  const label = overlay.tagName === "INPUT" ? wrapSwitch(element, overlay) : overlay;
  const input = label.querySelector<HTMLInputElement>("input[switch]");
  if (input) input.tabIndex = -1;
  const preventDisabledToggle = (event: Event) => {
    if (isDisabled(element)) event.preventDefault();
  };
  const stopForwardedClick = (event: Event) => event.stopPropagation();
  label.addEventListener("click", preventDisabledToggle, true);
  input?.addEventListener("click", stopForwardedClick);

  return () => {
    label.removeEventListener("click", preventDisabledToggle, true);
    input?.removeEventListener("click", stopForwardedClick);
    label.remove();
    // Preserve positioning changes made by the application after attachment.
    if (changedPosition && element.style.position === "relative") {
      element.style.position = initialPosition;
    }
  };
}

function wrapSwitch(element: HTMLElement, input: HTMLElement) {
  const label = document.createElement("label");
  label.setAttribute("data-haptic-trigger", "");
  label.setAttribute("aria-hidden", "true");
  // These are mechanical hit-target styles, matching upstream's native bridge;
  // the application continues to own all visible button styling in Tailwind.
  label.style.cssText = "position:absolute;inset:0;touch-action:manipulation;-webkit-tap-highlight-color:transparent";
  input.removeAttribute("data-haptic-trigger");
  input.style.cssText = "position:absolute;width:1px;height:1px;margin:0;visibility:hidden";
  label.append(input);
  element.insertAdjacentElement("beforeend", label);
  return label;
}
