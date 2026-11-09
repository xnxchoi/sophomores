"use client";
import { useDomCursor } from "@/hideaway/components/core/cursorWrapper";
import { MotionBtnProps } from "@/hideaway/components/core/Link/types";
import { HA_DialogContent as DialogContent, HA_DialogFooter as DialogFooter, HA_DialogHeader as DialogHeader, HA_DialogRoot as DialogRoot, HA_DialogTitle as DialogTitle, HA_DialogTrigger as DialogTrigger } from "@/components/ui/dialog";
import { errorToast, successToast } from "@/hideaway/components/ui/sonner";
import { TWEEN_EASE } from "@/hideaway/constants/animations";
import { useRPSession } from "@/hideaway/lib/auth/session/RP_SessionProvider";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import "./styles/_highlightMenu.scss";
import { useMotionValue, useTransform } from "motion/react";

import * as m from "motion/react-m";
import { useTranslations } from "next-intl";
import React, {
  ComponentPropsWithRef,
  CSSProperties,
  type MouseEventHandler,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/shallow";
import { HighlightMenuButton, HighlightMenuProps, MenuButtonCaption } from "./index";
import { MotionPill } from "@/hideaway/components/core/Button";
import { HighlightCreateError, HighlightError } from "./HighlightErrors";
import { usePrivateNote } from "./PrivateHighlights";
import { useArticle } from "./providers/ArticleProvider";
import { SignInCard } from "./providers/author-ui";
import { useCitations } from "./providers/CitationProvider";
import { useFloater } from "./providers/FloatProvider";
import { useHighlighter } from "./providers/HighlighterProvider";
import { MemoInput } from "./providers/memo-input";
import { useRanger } from "./providers/RangerProvider";
import { HighlightColors, HighlightPalette, Palettes } from "./stores";

type ViewStates = "edit" | "signin" | "new";
type DialogText = "header" | "title" | "description";
type ViewStateMap = Record<ViewStates, Record<DialogText, string>>;

export const FloatHighlightMenu = ({
  mounted,
  handleChangeHighlightColor,
  postDisabled,
  ref,
  style,
  floatingStyles,
  status,
  ...rest
}: ComponentPropsWithRef<"div"> &
  HighlightMenuProps & {
    floatingStyles: CSSProperties;
    mounted: boolean;
    status: "close" | "initial" | "open" | "unmounted";
  }) => {
  const createCallback = useCitations((r) => r.create);
  const handleUpdate = useCitations((r) => r.update);
  const deleteHighlight = useCitations((r) => r.delete);
  const targetContainer = useRanger((r) => r.targetContainer);
  const containerRef = useRef(targetContainer);
  useEffect(() => {
    containerRef.current = targetContainer;
  }, [targetContainer]);
  const palettee = useMemo(() => Palettes, []);
  const privateMemoOpen = usePrivateNote((r) => r.open);
  const [memoOpen, setMemoOpen] = useState(false);
  const [highlightSaving, setHighlightSaving] = useState(false);
  const t = useTranslations();
  const ranger = useRanger((r) => r.ranger);
  const focusedHighlight = useHighlighter(
    useShallow((r) => r.focusedHighlight)
  );
  const fc = useRef(focusedHighlight);
  useEffect(() => {
    fc.current = focusedHighlight;
  }, [focusedHighlight]);
  const targetId = useArticle(useShallow((r) => r.id));
  const targetSlug = useArticle(useShallow((r) => r.slug));
  const user = useRPSession(useShallow((r) => r.id as null | string));
  useEffect(() => {
    setEditorEnabled(!!user);
  }, [user]);

  const currentHighlightColor = useHighlighter(
    useShallow((r) => r.currentColor)
  );
  const lastVisible = useRef(false);
  const [memo, setMemo] = useState("");
  const memoRef = useRef(memo);
  useEffect(() => {
    memoRef.current = memo;
  }, [memo]);
  const [editorEnabled, setEditorEnabled] = useState(!!user);
  const savedSelectionRef = useRef<rangy.savedSelection | null>(null);
  const qc = useQueryClient();
  const [memoView, setMemoView] = useState<ViewStates>("signin");
  const setFocused = useHighlighter((r) => r.setFocusedHighlight);

  const handleSaveHighlight: MouseEventHandler = useCallback(
    async (e) => {
      e.stopPropagation();
      const focus = fc.current;
      const container = containerRef.current;
      if (!container) return;
      if (!targetContainer || highlightSaving) return;
      setHighlightSaving(true);
      try {
        if (!user) {
          throw new HighlightCreateError("user", "not_authenticated");
        }
        if (postDisabled) {
          throw new HighlightCreateError("target", "disabled");
        }
        if (focus) {
          await deleteHighlight({ focusedHighlight: focus });
        } else {
          await createCallback({
            params: { private: false },
            container
          });
        }
      } catch (e) {
        if (e instanceof HighlightError) {
          errorToast(e.message);
        }
      } finally {
        setHighlightSaving(false);
      }
    },
    [
      createCallback,
      deleteHighlight,
      highlightSaving,
      postDisabled,
      targetContainer,
      user
    ]
  );
  const onSave: MouseEventHandler = useCallback(
    (e) => {
      e.preventDefault();

      try {
        const container = containerRef.current;

        if (!container) {
          throw new HighlightCreateError("params", "container");
        }
        if (!targetId) {
          throw new HighlightCreateError("target", "invalid");
        }
        if (!targetSlug) {
          throw new HighlightCreateError("target", "invalid");
        }
        if (!user) {
          setMemoView("signin");
          toast(t("Highlights.error.save.signin"));
          return setSaving(false);
        }
        const mamu = memoRef.current;
        if (!mamu) {
          throw new HighlightCreateError("memo", "empty");
        }
        if (mamu.length < 1) {
          throw new HighlightCreateError("memo", "empty");
        }
        setSaving(true);
        const ff = fc.current;
        if (!ff && !savedSelectionRef.current) {
          throw new HighlightCreateError("selection", "invalid");
        }
        return (
          ff
            ? handleUpdate({
                ...ff,
                memo: mamu
              })
            : (ranger.restoreSelection(
                savedSelectionRef.current as rangy.savedSelection
              ),
              createCallback({
                params: { private: false, memo: mamu },
                container
              }))
        )
          .then((r) => {
            setFocused(r.reference);

            successToast(t("Highlights.saved"));
            qc.invalidateQueries({
              queryKey: [
                "savedHighlights",
                { value: targetId, userId: user, slug: targetSlug }
              ]
            });
            savedSelectionRef.current &&
              ranger.removeMarkers(savedSelectionRef.current);
            savedSelectionRef.current = null;
            setDirty(false);
            setMemoOpen(false);
          })
          .catch((e) => {
            if (e instanceof HighlightCreateError) {
              throw e;
            } else {
              throw new HighlightCreateError("unknown", "unknown");
            }
          });
      } catch (e) {
        if (e instanceof HighlightCreateError) {
          errorToast(e.message);
        } else {
          errorToast(t("Highlights.error.save.default"));
        }
      } finally {
        setSaving(false);
      }
    },
    [
      handleUpdate,
      ranger,
      createCallback,
      setFocused,
      t,
      qc,
      targetId,
      targetSlug,
      user
    ]
  );
  const setRender = useFloater((r) => r.setOpen);
  const [saving, setSaving] = useState(false);

  const viewMap = useMemo<ViewStateMap>(
    () => ({
      signin: {
        title: "Check In",
        description: "Check in",
        header: "Memo"
      },
      edit: {
        title: "Edit",
        description: "",
        header: "Edit Memo"
      },
      new: {
        header: "Memo",
        description: "",
        title: "Memo"
      }
    }),
    []
  );
  const innerRef = useRef<HTMLDivElement>(null);
  const closeMemo = useCallback(() => {
    setMemoOpen(false);
  }, []);
  const doMe = useCallback(
    (e: Event) => {
      if (!e.target) return;
      if (
        !innerRef.current ||
        !innerRef.current.contains(e.target as HTMLElement)
      ) {
        !innerRef.current?.contains(e.target as HTMLElement) &&
          setRender(false);
        document.body.removeEventListener("click", doMe);
      }
    },
    [setRender]
  );
  const [dirty, setDirty] = useState(false);
  const lastValue = useRef<string>(memo);
  const debouncedValue = useRef<string>(memo);
  const checkDirty = useCallback(() => {
    const a = lastValue.current;
    const b = debouncedValue.current;
    setDirty(a.length < 1 || a !== b);
    debouncedValue.current = a;
  }, []);
  const [dOpen, setDOpen] = useState(false);
  useEffect(() => {
    let to: ReturnType<typeof setTimeout> | null = null;
    if (editorEnabled && dOpen) {
      to && clearTimeout(to);
      to = setTimeout(checkDirty, 20);
    }
    return () => {
      to && clearTimeout(to);
      to = null;
      debouncedValue.current = "";
    };
  }, [memoView, memoOpen, checkDirty, editorEnabled, dOpen]);
  const setMemoValue = useCallback((e: string) => {
    setMemo(e);
    lastValue.current = e;
  }, []);
  const handleShareHighlight: MouseEventHandler<HTMLButtonElement> =
    useCallback(
      (e) => {
        e.stopPropagation();
        const se = ranger.getSelection();
        let a = se?.toString();
        if (!a && focusedHighlight) {
          a = focusedHighlight.els
            .map((e) => (e as HTMLElement).innerText)
            .join(" ");
        }
        if (!a) {
          errorToast(t("Highlights.error.share.copy"));
          return;
        }
        navigator.clipboard
          .writeText(a)
          .then((r) => {
            successToast(t("Highlights.share.copy"));
          })
          .catch(() => errorToast(t("Highlights.error.share.copy")));
      },
      [focusedHighlight, ranger, t]
    );

  const setPrivateNotary = usePrivateNote((r) => r.setOpen);
  const setPrivateView = usePrivateNote((r) => r.setView);

  const onPrivateClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    (e) => {
      e.preventDefault();
      setPrivateView("edit");
      setPrivateNotary(true);
      setRender(false);
    },
    [setPrivateView, setPrivateNotary, setRender]
  );
  useEffect(() => {
    if (memoOpen) {
      setMemoView(!editorEnabled ? "signin" : fc.current ? "edit" : "new");
      if (editorEnabled && !fc.current) {
        savedSelectionRef.current = ranger.saveSelection();
      } else {
        savedSelectionRef.current &&
          (ranger.removeMarkers(savedSelectionRef.current),
          (savedSelectionRef.current = null));
      }
    } else {
      savedSelectionRef.current &&
        (ranger.removeMarkers(savedSelectionRef.current),
        (savedSelectionRef.current = null));
    }
    setDOpen(memoOpen);
  }, [editorEnabled, memoOpen, ranger]);
  return (
    mounted && (
      <div
        ref={ref}
        key={"res"}
        className={cn(
          "z-[250] m-0 flex overflow-hidden rounded-[12px] border-none",
          "pointer-events-auto"
        )}
        data-themed={"background-color"}
        style={{
          ...floatingStyles
        }}
        {...rest}
      >
        <div
          ref={innerRef}
          data-status={status}
          className={
            "highlightMenu relative h-full w-full bg-faded-foreground/10 p-0 backdrop-blur-xl"
          }
          style={{ ...style, backdropFilter: "blur(10px)" }}
        >
          <m.div
            initial={{
              opacity: 0.001
            }}
            animate={{
              opacity: 1
            }}
            exit={{
              opacity: 0.001
            }}
            transition={{
              type: "tween",
              duration: 0.2,
              ease: TWEEN_EASE.power2.out
            }}
            className={
              "absolute top-0 left-0 z-2 h-full w-full opacity-[0.00001] backdrop-blur-[8px]"
            }
          />
          <m.div
            className={
              "z-[23] flex h-[44px] items-center px-3.5 text-off-foreground"
            }
          >
            <DialogRoot open={dOpen} onOpenChange={setMemoOpen}>
              <DialogTrigger
                nativeButton={true}
                render={
                  <HighlightMenuButton onClick={() => setMemoOpen(true)}>
                    <MenuButtonCaption icon={false}>
                      {viewMap[memoView].header}
                    </MenuButtonCaption>
                  </HighlightMenuButton>
                }
              />
              <DialogContent onClick={(e) => e.stopPropagation()}>
                <DialogHeader>
                  <DialogTitle>{viewMap[memoView].title}</DialogTitle>
                </DialogHeader>
                {editorEnabled ? (
                  <>
                    <div className="grid gap-3">
                      <MemoInput
                        value={memo}
                        onChange={setMemoValue}
                        placeholder="Write a short note…"
                        maxLength={200}
                        className=""
                      />
                    </div>
                    <DialogFooter>
                      <div className="ml-auto flex items-center gap-2">
                        <MotionPill className="rp_btn" onClick={closeMemo}>
                          {dirty ? "Cancel" : "Close"}
                        </MotionPill>
                        <MotionPill
                          className={cn(
                            "rp_btn data-[disabled=true]:pointer-events-none",
                            saving
                              ? "pointer-events-none animate-pulse"
                              : "pointer-events-auto"
                          )}
                          onClick={onSave}
                          data-disabled={!dirty}
                        >
                          {saving ? "Saving…" : "Save"}
                        </MotionPill>
                      </div>
                    </DialogFooter>
                  </>
                ) : (
                  <div className="grid gap-3">
                    <SignInCard onSignInClick={closeMemo} />
                  </div>
                )}
              </DialogContent>
            </DialogRoot>
            <HighlightMenuButton
              onClick={handleSaveHighlight}
              disabled={highlightSaving}
              className={
                highlightSaving
                  ? "pointer-events-none animate-pulse"
                  : undefined
              }
            >
              <MenuButtonCaption icon={false}>
                {highlightSaving
                  ? focusedHighlight
                    ? "Deleting…"
                    : "Saving…"
                  : focusedHighlight
                    ? "Delete"
                    : "Highlight"}
              </MenuButtonCaption>
            </HighlightMenuButton>
            {user && (
              <HighlightMenuButton onClick={onPrivateClick}>
                <MenuButtonCaption icon={false}>Private Note</MenuButtonCaption>
              </HighlightMenuButton>
            )}
            <HighlightMenuButton onClick={handleShareHighlight}>
              <MenuButtonCaption icon={false}>Share</MenuButtonCaption>
            </HighlightMenuButton>
            {focusedHighlight && (
              <m.div
                initial={{
                  scaleX: 0.001,
                  opacity: 0
                }}
                animate={{
                  scaleX: 1,
                  opacity: 1
                }}
                exit={{
                  scaleX: 0.001,
                  opacity: 0
                }}
                transition={{
                  type: "tween",
                  duration: 0.2,
                  ease: "easeOut"
                }}
                className={"z-[13] mr-[16px] ml-[16px] flex gap-[4px]"}
              >
                {palettee.map((palette) => (
                  <HighlightColorPickerItem
                    key={palette}
                    color={palette}
                    handleSelect={handleChangeHighlightColor}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    onMouseUp={(e) => e.stopPropagation()}
                  />
                ))}
              </m.div>
            )}
          </m.div>
        </div>
      </div>
    )
  );
};
const HighlightColorPickerItem = ({
  handleSelect,
  children,
  className,
  onClick,
  onMouseUp,
  ref,
  color,
  style,
  ...props
}: MotionBtnProps & {
  color: HighlightColors;
  handleSelect: (color: HighlightColors) => void;
}) => {
  const currentColor = useHighlighter(useShallow((r) => r.currentColor));
  const [isActive, setIsActive] = useState(currentColor === color);
  const palette = useMotionValue(color);
  const paletteColor = useTransform(
    palette,
    (c) => `oklch(from ${HighlightPalette[c]} l c h/.9)`
  );
  const onMouseDown: MouseEventHandler<HTMLButtonElement> = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleSelect(color);
    },
    [color, handleSelect]
  );
  const variants = useMemo(
    () => ({
      hidden: {
        opacity: 0,
        scale: 0
      },
      active: {
        opacity: 1,
        scale: 1,
        borderRadius: 3
      },
      inactive: {
        opacity: 1,
        scale: 1,
        borderRadius: 2
      }
    }),
    []
  );
  const [variant, setVariant] = useState<keyof typeof variants>(
    isActive ? "active" : "inactive"
  );
  const lastActive = useRef(isActive);
  useEffect(() => {
    const aa = currentColor === color;
    setIsActive(aa);
    setVariant(aa ? "active" : "inactive");
    lastActive.current = aa;
  }, [currentColor, color]);

  const { onMouseEnter, onMouseLeave } = useDomCursor({
    enterCondition: () => (lastActive.current ? null : "FOCUS")
  });
  /**
   * after:absolute after:rounded-[1px] after:w-[calc(100%-1px)] after:h-[calc(100%-1px)] after:border-[1px] after:border-solid after:inset-[.5px] after:content-['']
   */
  return (
    <m.button
      className={cn(
        "relative h-[12px] w-[16px] border-[1px] border-solid border-transparent bg-off-foreground data-[active=true]:border-[1px] data-[active=true]:border-muted-faded-background/60",
        className
      )}
      onClick={onClick}
      ref={ref}
      initial={"hidden"}
      whileHover={{ scale: isActive ? 1 : 1.2 }}
      transition={{ type: "spring", bounce: 0.25 }}
      whileTap={{ scale: isActive ? 1 : 0.9 }}
      animate={variant}
      variants={variants}
      data-active={isActive}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        backgroundColor: paletteColor,
        ...style
      }}
      disabled={isActive}
      {...props}
    >
      {children}
    </m.button>
  );
};
