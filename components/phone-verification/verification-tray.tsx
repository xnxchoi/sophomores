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
import { motionTokens } from "../../lib/motion-tokens";
import { Drawer } from "vaul";
import { authenticationViewportGeometry } from "../../lib/authentication-entry";
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
  mode = "focused",
  onCancel,
  cancelLabel = "Cancel"
}: VerificationTrayProps) {
  const viewport = useTrayViewport();
  const locked = mode === "focused";
  const [contentHeight, setContentHeight] = useState(0);
  const geometry = viewport
    ? {
        ...authenticationViewportGeometry({
          ...viewport,
          contentHeight,
          locked
        }),
        width: Math.min(locked ? 460 : 380, Math.max(0, viewport.width - 24))
      }
    : undefined;
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
              className={cn(
                "max-w-none!",
                !locked && "[scrollbar-gutter:auto]"
              )}
              animate={
                geometry
                  ? { ...geometry, borderRadius: locked ? 24 : 32 }
                  : undefined
              }
              initial={false}
              transition={trayTransition}
            >
              <ContentHeight open={open} onMeasure={setContentHeight}>
                <Bar className="min-h-18 px-6 py-0 pr-16 font-message sm:px-6 sm:pr-16">
                  <motion.div
                    initial={false}
                    animate={{ opacity: locked ? 0 : 1 }}
                    transition={trayTransition}
                    inert={locked}
                    aria-hidden={locked}
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
                      locked ? "pointer-events-none" : ""
                    )}
                  >
                    <Drawer.Handle
                      aria-hidden="true"
                      tabIndex={-1}
                      preventCycle
                      className="!absolute left-1/2 !m-0 !h-1 !w-8 -translate-x-1/2 !bg-white/20"
                    />
                  </motion.div>
                  <div className="absolute top-1.5 right-1.5 size-11 shrink-0">
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
                          className="group rounded-full hover:bg-transparent"
                          aria-label={closeLabel}
                          disabled={locked}
                          tabIndex={locked ? -1 : 0}
                        >
                          <span
                            data-authentication-close-disc=""
                            aria-hidden="true"
                            className="absolute inset-2 rounded-full bg-white/6 transition-colors duration-200 ease-out group-hover:bg-white/10"
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
                          "absolute inset-0 flex size-11 items-center justify-center rounded-lg text-xs text-neutral-300 transition-colors duration-200 ease-out hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white",
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
  }>();
  useLayoutEffect(() => {
    const viewport = window.visualViewport;
    const update = () => {
      const gutter = window.matchMedia("(min-width: 640px)").matches ? 24 : 12;
      const height = viewport?.height ?? window.innerHeight;
      const offset = viewport?.offsetTop ?? 0;
      const layoutHeight = window.innerHeight;
      const width = window.innerWidth;
      setBounds((current) =>
        current?.viewportHeight === height &&
        current.offsetTop === offset &&
        current.layoutHeight === layoutHeight &&
        current.gutter === gutter &&
        current.width === width
          ? current
          : {
              viewportHeight: height,
              offsetTop: offset,
              layoutHeight,
              gutter,
              width
            }
      );
    };
    update();
    window.addEventListener("resize", update);
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    return () => {
      window.removeEventListener("resize", update);
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
    };
  }, []);
  return bounds;
}
