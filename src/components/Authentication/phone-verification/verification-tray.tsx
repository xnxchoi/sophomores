"use client";

import {
  createContext,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
  type RefObject,
  useContext,
  useLayoutEffect,
  useRef,
  useState
} from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { motionTokens } from "@/lib/motion-tokens";
import { Drawer } from "vaul";
import { authenticationViewportGeometry } from "@/lib/authentication-entry";
import { Bar, Close, Modal } from "./verification-ui";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { usePrivatePortalContainer } from "@/components/auth/private-page-guard";

type VerificationTrayProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
  headingId: string;
  descriptionId: string;
  description: string;
  closeLabel: string;
  locale: string;
  children: ReactNode;
  header?: ReactNode;
  chrome?: "standard" | "compact";
} & (
  | { mode?: "focused"; onCancel: () => void; cancelLabel: string }
  | { mode: "chooser"; onCancel?: () => void; cancelLabel?: string }
);

export const VerificationPresentation = createContext<"tray" | "modal" | null>(null);
const trayTransition = {
  duration: motionTokens.duration.normal,
  ease: motionTokens.easing.smooth
};
/**
 * The phone tray's offset and height limit follow the visual viewport (the keyboard) at once. Easing them replayed a
 * slide every time a field gained or lost focus (owner, 26 Nov: "reanimating every time focus changed"). Only real
 * changes, width and radius, ease.
 */
const trayViewportTransition = { ...trayTransition, bottom: { duration: 0 }, maxHeight: { duration: 0 }, top: { duration: 0 } };
/**
 * The desktop modal opens centred, then keeps its top: content height changes (typing folding the other ways in, a
 * lookup result, the next step) grow or shrink it downward instead of re-centring it (owner, 26 Nov; AGENTS: anchored,
 * content-sized surfaces). Its top eases only when it must move: a smaller window, or content that would pass the
 * bottom edge.
 */
const modalTransition = { ...trayTransition, bottom: { duration: 0 } };

function TrayDismissButton({
  touch,
  className,
  ...props
}: ComponentProps<typeof Close> & { touch: boolean }) {
  return (
    <Close
      className={cn("group rounded-full hover:bg-transparent", touch ? "size-12" : "size-10", className)}
      {...props}
    >
      <span
        data-authentication-close-disc=""
        aria-hidden="true"
        className="absolute inset-0 rounded-full bg-transparent transition-colors duration-200 ease-out group-hover:bg-muted"
      />
      <X className="relative" size={16} strokeWidth={1.5} aria-hidden="true" />
    </Close>
  );
}

export function VerificationTrayTitle({
  children
}: {
  children: ReactElement;
}) {
  return useContext(VerificationPresentation) ? (
    <Drawer.Title asChild>{children}</Drawer.Title>
  ) : (
    children
  );
}

/** Family-style content sizing; Vaul alone owns the entrance and drag transform. */
export function VerificationTray({
  open,
  onOpenChange,
  returnFocusRef,
  headingId,
  descriptionId,
  description,
  closeLabel,
  locale,
  children,
  header,
  chrome = "standard",
  mode = "focused",
  onCancel,
  cancelLabel: givenCancelLabel
}: VerificationTrayProps) {
  const common = useTranslations("Common");
  const cancelLabel = givenCancelLabel ?? common("cancel");
  const viewport = useTrayViewport();
  const privatePortal = usePrivatePortalContainer();
  const locked = mode === "focused";
  const compact = chrome === "compact";
  const compactFocused = compact && locked;
  // Visual placement is independent of Vaul's modal focus and dismissal behavior.
  const modal = Boolean(viewport && (viewport.width >= 640 || viewport.finePointer));
  const dismissible = !locked || !modal;
  const [contentHeight, setContentHeight] = useState(0);
  // The modal's held top, set on the first measure after it opens and cleared when it opens again.
  const [modalTop, setModalTop] = useState<number | null>(null);
  const [heldFor, setHeldFor] = useState(open);
  if (heldFor !== open) {
    setHeldFor(open);
    if (open) setModalTop(null);
  }
  const placement = viewport ? authenticationViewportGeometry({ ...viewport, contentHeight }) : undefined;
  let top: number | undefined;
  if (viewport && placement && modal && contentHeight > 0) {
    const height = Math.min(contentHeight, placement.maxHeight);
    const centred = viewport.offsetTop + (viewport.viewportHeight - height) / 2;
    const lowest = viewport.offsetTop + viewport.viewportHeight - viewport.gutter - height;
    top = Math.max(viewport.offsetTop + viewport.gutter, Math.min(modalTop ?? centred, lowest));
    if (open && top !== modalTop) setModalTop(top);
  }
  const geometry = viewport && placement
    ? {
        ...(top === undefined ? { bottom: placement.bottom, top: "auto" } : { top, bottom: "auto" }),
        maxHeight: placement.maxHeight,
        width: Math.min(modal && !compact ? locked ? 460 : 380 : 420, Math.max(0, viewport.width - 24))
      }
    : undefined;
  // Keep the same inset when clipped, avoiding a height/affordance feedback loop.
  const clippedChooser = compact && !locked && !modal && Boolean(geometry && contentHeight > geometry.maxHeight);
  return (
    <VerificationPresentation.Provider value={modal ? "modal" : "tray"}>
      <Drawer.Root
        open={open}
        onOpenChange={(nextOpen) => {
          if (nextOpen || dismissible) onOpenChange(nextOpen);
        }}
        dismissible={dismissible}
        handleOnly
        autoFocus
        repositionInputs={false}
      >
        {/* On a private page the tray mounts inside the page's guard, so it hides with the page. */}
        <Drawer.Portal container={privatePortal ?? undefined}>
          <Drawer.Overlay data-authentication-presentation={modal ? "modal" : "tray"} className="fixed inset-0 z-50 bg-transparent backdrop-blur-sm data-[authentication-presentation=tray]:bg-transparent data-[authentication-presentation=tray]:backdrop-blur-[0.5px]" />
          <Drawer.Content
            asChild
            data-verification-sheet=""
            data-authentication-mode={mode}
            lang={locale}
            aria-labelledby={headingId}
            aria-describedby={descriptionId}
            onPointerDownOutside={(event) => {
              if (locked) event.preventDefault();
            }}
            onEscapeKeyDown={(event) => {
              if (locked) event.preventDefault();
            }}
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              const heading = document.getElementById(headingId);
              const active = document.activeElement;
              if (
                active instanceof HTMLElement &&
                heading?.closest("[data-verification-sheet]")?.contains(active) &&
                !active.matches(":disabled") &&
                !active.closest("[inert], [aria-hidden=true]")
              ) return;
              heading?.focus({ preventScroll: true });
            }}
            onCloseAutoFocus={(event) => {
              if (returnFocusRef?.current) {
                event.preventDefault();
                returnFocusRef.current.focus({ preventScroll: true });
              }
            }}
          >
            <Modal
              data-authentication-presentation={modal ? "modal" : "tray"}
              className="max-w-none! data-[authentication-presentation=tray]:scrollbar-none data-[authentication-presentation=tray]:backdrop-blur-[2px] data-[authentication-presentation=modal]:[scrollbar-width:thin]! data-[authentication-presentation=modal]:[&::-webkit-scrollbar]:block! data-[authentication-presentation=modal]:[&::-webkit-scrollbar]:w-1.5 data-[authentication-presentation=modal]:[&::-webkit-scrollbar-thumb]:rounded-full data-[authentication-presentation=modal]:[&::-webkit-scrollbar-thumb]:bg-border data-[authentication-presentation=modal]:scroll-pt-14 data-[authentication-presentation=modal]:scroll-pb-4 data-[authentication-presentation=modal]:data-[state=open]:animate-in! data-[authentication-presentation=modal]:data-[state=closed]:animate-out! data-[authentication-presentation=modal]:fade-in-0 data-[authentication-presentation=modal]:fade-out-0 data-[authentication-presentation=modal]:zoom-in-95 data-[authentication-presentation=modal]:zoom-out-95 data-[authentication-presentation=modal]:animation-duration-200 data-[authentication-presentation=modal]:fill-mode-both"
              animate={
                geometry
                  ? { ...geometry, borderRadius: modal && locked && !compact ? 24 : 32 }
                  : undefined
              }
              initial={false}
              transition={modal ? modalTransition : trayViewportTransition}
            >
              <ContentHeight open={open} onMeasure={setContentHeight}>
                <Bar
                  data-authentication-chrome={compact ? mode : undefined}
                  className={cn(
                    "px-6 py-0 sm:px-6",
                    compact ? "[font-family:system-ui]" : "font-message",
                    !modal && "backdrop-blur-none",
                    compactFocused ? modal ? "h-0 min-h-0 bg-transparent backdrop-blur-none" : "h-14 min-h-14 bg-transparent" : compact ? "px-6! pb-0!" : "min-h-18 pl-16 sm:pl-16",
                    compact && "pr-6!",
                    compact && !locked && (modal ? "pt-6!" : "pt-14!")
                  )}
                >
                  <motion.div
                    initial={false}
                    animate={{ opacity: locked ? 0 : 1 }}
                    transition={trayTransition}
                    inert={locked}
                    aria-hidden={locked}
                    className={compact ? "w-full" : undefined}
                  >
                    {header}
                  </motion.div>
                  <motion.div
                    animate={{ opacity: modal || clippedChooser ? 0 : 1 }}
                    initial={false}
                    transition={trayTransition}
                    inert={modal || clippedChooser}
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-x-0 top-3",
                      (modal || clippedChooser) && "pointer-events-none"
                    )}
                  >
                    <Drawer.Handle
                      aria-hidden="true"
                      tabIndex={-1}
                      preventCycle
                      className={cn("!absolute left-1/2 !m-0 !h-1 !w-10 -translate-x-1/2 !bg-muted [&>[data-vaul-handle-hitarea]]:!size-12 [&>[data-vaul-handle-hitarea]]:!top-3", (modal || clippedChooser) && "hidden!")}
                    />
                  </motion.div>
                  <div className={cn(
                    "absolute shrink-0",
                    compact ? "top-2 left-2" : "top-1.5 left-1.5",
                    modal ? "size-10" : "size-12"
                  )}>
                    <motion.div
                      animate={{ opacity: locked ? 0 : 1 }}
                      initial={false}
                      transition={trayTransition}
                      inert={locked}
                      aria-hidden={locked}
                      className={locked ? "pointer-events-none" : ""}
                    >
                      <Drawer.Close
                        asChild
                        aria-label={closeLabel}
                        disabled={locked}
                      >
                        <TrayDismissButton
                          touch={!modal}
                          data-authentication-close=""
                          aria-label={closeLabel}
                          disabled={locked}
                          tabIndex={locked ? -1 : 0}
                        />
                      </Drawer.Close>
                    </motion.div>
                    {onCancel && (
                      <motion.div
                        aria-hidden={!locked}
                        inert={!locked}
                        initial={false}
                        animate={{ opacity: locked ? 1 : 0 }}
                        transition={trayTransition}
                        className={cn("absolute inset-0", !locked && "pointer-events-none")}
                      >
                        <TrayDismissButton
                          touch={!modal}
                          data-authentication-cancel=""
                          onClick={modal ? onCancel : () => onOpenChange(false)}
                          aria-label={cancelLabel}
                          disabled={!locked}
                          tabIndex={locked ? 0 : -1}
                        />
                      </motion.div>
                    )}
                  </div>
                </Bar>
                <Drawer.Description id={descriptionId} className="sr-only">
                  {description}
                </Drawer.Description>
                {children}
              </ContentHeight>
            </Modal>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </VerificationPresentation.Provider>
  );
}

function ContentHeight({
  children,
  open,
  onMeasure
}: {
  children: ReactNode;
  open: boolean;
  onMeasure: (height: number) => void;
}) {
  const content = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();
  useLayoutEffect(() => {
    const element = content.current;
    // Dismissal immediately disposes private session content. Hold the shell's
    // last height while Vaul completes its exit instead of shrinking mid-slide.
    if (!element || !open) return;
    const measure = (entries?: ResizeObserverEntry[]) => {
      const entry = entries?.[0];
      // Entrance transforms change rendered bounds, not the natural layout box.
      // Round outward so fractional content cannot overflow its own wrapper.
      const naturalHeight = Math.ceil(
        entry?.borderBoxSize?.[0]?.blockSize ??
        entry?.contentRect.height ??
        element.offsetHeight
      );
      setHeight(naturalHeight);
      onMeasure(naturalHeight);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element, { box: "border-box" });
    return () => observer.disconnect();
  }, [open, onMeasure]);

  return (
    <motion.div
      initial={false}
      animate={{ height: height ?? "auto" }}
      transition={trayTransition}
    >
      <div ref={content} data-verification-content="" className="flow-root">
        {children}
      </div>
    </motion.div>
  );
}

/** Keep one keyboard geometry owner; Vaul's default leaves a fixed inline height. */
function useTrayViewport() {
  const [bounds, setBounds] = useState<{
    viewportHeight: number;
    offsetTop: number;
    layoutHeight: number;
    gutter: number;
    width: number;
    finePointer: boolean;
  }>();
  useLayoutEffect(() => {
    const viewport = window.visualViewport;
    const pointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => {
      const gutter = window.matchMedia("(min-width: 640px)").matches ? 24 : 12;
      const height = viewport?.height ?? window.innerHeight;
      const offset = viewport?.offsetTop ?? 0;
      const layoutHeight = window.innerHeight;
      const width = window.innerWidth;
      const finePointer = pointer.matches;
      setBounds((current) =>
        current?.viewportHeight === height &&
        current.offsetTop === offset &&
        current.layoutHeight === layoutHeight &&
        current.gutter === gutter &&
        current.width === width &&
        current.finePointer === finePointer
          ? current
          : {
              viewportHeight: height,
              offsetTop: offset,
              layoutHeight,
              gutter,
              width,
              finePointer
            }
      );
    };
    update();
    window.addEventListener("resize", update);
    pointer.addEventListener("change", update);
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    return () => {
      window.removeEventListener("resize", update);
      pointer.removeEventListener("change", update);
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
    };
  }, []);
  return bounds;
}
