"use client";

import {
  createContext,
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

const InTray = createContext(false);
const trayTransition = {
  duration: motionTokens.duration.normal,
  ease: motionTokens.easing.smooth
};

export function VerificationTrayTitle({
  children
}: {
  children: ReactElement;
}) {
  return useContext(InTray) ? (
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
  cancelLabel = "Cancel"
}: VerificationTrayProps) {
  const viewport = useTrayViewport();
  const locked = mode === "focused";
  const compact = chrome === "compact";
  const compactFocused = compact && locked;
  const modal = locked || Boolean(viewport && (viewport.width >= 640 || viewport.finePointer));
  const [contentHeight, setContentHeight] = useState(0);
  const geometry = viewport
    ? {
        ...authenticationViewportGeometry({
          ...viewport,
          contentHeight,
          locked
        }),
        width: Math.min(locked ? (compact ? 420 : 460) : 380, Math.max(0, viewport.width - 24))
      }
    : undefined;
  // Keep the same inset when clipped, avoiding a height/affordance feedback loop.
  const clippedChooser = compact && !locked && !modal && Boolean(geometry && contentHeight > geometry.maxHeight);
  return (
    <InTray.Provider value>
      <Drawer.Root
        open={open}
        onOpenChange={(nextOpen) => {
          if (nextOpen || !locked) onOpenChange(nextOpen);
        }}
        dismissible={!locked}
        handleOnly
        autoFocus
        repositionInputs={false}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm" />
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
              document
                .getElementById(headingId)
                ?.focus({ preventScroll: true });
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
              className="max-w-none! scrollbar-none data-[authentication-presentation=modal]:data-[state=open]:animate-in! data-[authentication-presentation=modal]:data-[state=closed]:animate-out! data-[authentication-presentation=modal]:fade-in-0 data-[authentication-presentation=modal]:fade-out-0 data-[authentication-presentation=modal]:zoom-in-95 data-[authentication-presentation=modal]:zoom-out-95 data-[authentication-presentation=modal]:animation-duration-200 data-[authentication-presentation=modal]:fill-mode-both"
              animate={
                geometry
                  ? { ...geometry, borderRadius: locked ? 24 : 32 }
                  : undefined
              }
              initial={false}
              transition={trayTransition}
            >
              <ContentHeight open={open} onMeasure={setContentHeight}>
                <Bar
                  data-authentication-chrome={compact ? mode : undefined}
                  className={cn(
                    "px-6 py-0 pr-16 sm:px-6 sm:pr-16",
                    compact ? "[font-family:system-ui]" : "font-message",
                    compactFocused ? "h-0 min-h-0 bg-transparent backdrop-blur-none" : compact ? "px-6! pb-0!" : "min-h-18",
                    compact && !locked && (modal ? "pt-6!" : "pt-8!")
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
                    animate={{ opacity: locked ? 0 : 1 }}
                    initial={false}
                    transition={trayTransition}
                    inert={locked}
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-x-0 top-2",
                      locked && "pointer-events-none"
                    )}
                  >
                    <Drawer.Handle
                      aria-hidden="true"
                      tabIndex={-1}
                      preventCycle
                      className={cn("!absolute left-1/2 !m-0 !h-1 !w-8 -translate-x-1/2 !bg-white/20", (modal || clippedChooser) && "hidden!")}
                    />
                  </motion.div>
                  <div className={cn(
                    "absolute shrink-0",
                    compactFocused ? "top-4 right-4 h-11 w-14" : compact ? "top-0 right-0 size-11" : "top-1.5 right-1.5 size-11"
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
                        <Close
                          data-authentication-close=""
                          className={cn("group rounded-full hover:bg-transparent", compact && "focus-visible:outline-none", compact && !modal && !clippedChooser && "pointer-events-none opacity-0 focus:pointer-events-auto focus:opacity-100")}
                          aria-label={closeLabel}
                          disabled={locked}
                          tabIndex={locked ? -1 : 0}
                        >
                          <span
                            data-authentication-close-disc=""
                            aria-hidden="true"
                            className={cn("absolute inset-2 rounded-full bg-white/6 transition-colors duration-200 ease-out group-hover:bg-white/10", compact && "group-focus-visible:ring-2 group-focus-visible:ring-inset group-focus-visible:ring-neutral-100")}
                          />
                          <X
                            className="relative"
                            size={16}
                            strokeWidth={1.5}
                            aria-hidden="true"
                          />
                        </Close>
                      </Drawer.Close>
                    </motion.div>
                    {onCancel && (
                      <motion.button
                        data-authentication-cancel=""
                        type="button"
                        onClick={onCancel}
                        aria-label={cancelLabel}
                        aria-hidden={!locked}
                        disabled={!locked}
                        tabIndex={locked ? 0 : -1}
                        initial={false}
                        animate={{ opacity: locked ? 1 : 0 }}
                        transition={trayTransition}
                        className={cn(
                          "absolute inset-0 flex h-11 w-full items-center justify-center text-neutral-300 transition-colors duration-200 ease-out hover:text-white focus-visible:outline-2 focus-visible:outline-white",
                          compactFocused ? "rounded-xl bg-neutral-900 px-2 text-sm font-medium hover:bg-neutral-800" : "rounded-lg text-xs hover:bg-white/10",
                          locked ? "" : "pointer-events-none"
                        )}
                      >
                        {cancelLabel}
                      </motion.button>
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
    </InTray.Provider>
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
    const measure = () => {
      const naturalHeight = element.getBoundingClientRect().height;
      setHeight(naturalHeight);
      onMeasure(naturalHeight);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
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
