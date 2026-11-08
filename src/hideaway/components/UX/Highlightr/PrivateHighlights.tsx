"use client";
import { errorToast, successToast } from "@/hideaway/components/ui/sonner";
import { HA_Textarea as Textarea } from "@/components/ui/textarea";
import { useCharacterLimit } from "@/hooks/use-character-limit";
import { useRPSession } from "@/lib/auth/session/RP_SessionProvider";
import { cn } from "@/lib/utils";
import {
  autoUpdate,
  FloatingFocusManager,
  FloatingPortal,
  offset,
  useClick,
  useDismiss,
  useFloating,
  UseFloatingReturn,
  useInteractions,
  UseInteractionsReturn,
  useMergeRefs,
  useRole,
  useTransitionStatus
} from "@floating-ui/react";
import { Button } from "@payloadcms/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  ChangeEventHandler,
  ComponentProps,
  createContext,
  MouseEvent,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState
} from "react";
import { Dialog, DialogContent, DialogHeading } from "./floatDialog";
import { useHighlighter } from "./providers/HighlighterProvider";
import { useRanger } from "./providers/RangerProvider";

import { useCitations } from "./providers/CitationProvider";
import { useShallow } from "zustand/shallow";
import { SignInCard, UserBar } from "./providers/author-ui";
import "./styles/_privateNote.scss";
import { HighlightedRange } from "./types";

export type PrivateHighlights = {
  memo: string;
  setMemo: (memo: string) => void;
  setOpen: (open: boolean) => void;
  saving: boolean;
  setSaving: (disabled: boolean) => void;
  toggleOpen: () => void;
  open: boolean;
  view: "edit" | "view";
  setView: (view: "edit" | "view") => void;
  ctx: Omit<UseFloatingReturn, "refs" | "floatingStyles"> &
    UseInteractionsReturn;
  isMounted: boolean;
  status: "initial" | "unmounted" | "open" | "close";
  refs: UseFloatingReturn["refs"];
  floatingStyles: UseFloatingReturn["floatingStyles"];
};
export const PrivateMemoContext = createContext<PrivateHighlights>(null!);
export const PrivateMemoizer = (props: { children: ReactNode }) => {
  const { children } = props;

  return (
    <PrivateInternal>
      <Private2>{children}</Private2>
    </PrivateInternal>
  );
};
const Private2 = (props: { children: ReactNode }) => {
  const { children } = props;
  const userId = useRPSession(useShallow((r) => r.id as null | string));
  const userName = useRPSession(useShallow((r) => r.name));
  const userImage = useRPSession(useShallow((r) => r.image));
  const userS = useRPSession(useShallow((r) => r.slug));
  const isOpen = usePrivateNote((r) => r.open);
  const setIsOpen = usePrivateNote((r) => r.setOpen);
  const memo = usePrivateNote((r) => r.memo);
  const view = usePrivateNote((r) => r.view);
  const setSaving = usePrivateNote((r) => r.setSaving);
  return (
    <>
      {children}{" "}
      <PrivateDialog>
        {isOpen && (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent
              focusManager={{
                modal: false
              }}
            >
              <div
                className={
                  "flex items-center bg-muted-faded-background/85 p-[12px_20px]"
                }
              >
                <div
                  className={"mr-[8px] -ml-[4px] block [&_svg]:align-middle"}
                ></div>
                <div className={"relative top-px block flex-[1_1_auto]"}>
                  <DialogHeading
                    className={
                      "text-[13px] leading-[18px] tracking-[0.077em] text-muted-foreground uppercase"
                    }
                  >
                    <span
                      className={
                        "text-[13px] leading-[20px] text-muted-foreground"
                      }
                    >
                      {view === "view" ? "Private Note" : "Edit"}
                    </span>
                  </DialogHeading>
                </div>
                <div className={"relative top-px block flex-[1_1_auto]"}>
                  <p className={"text-[13px] leading-[20px]"}>Learn More </p>
                </div>
              </div>
              {userId ? (
                (view === "edit" && <PrivateNoteEditor />) || (
                  <div className={"block p-[0_20px]"}>
                    <div className={"block p-[12px_0]"}>
                      <div className={"mb-[12px] flex items-center"}>
                        <UserBar
                          user={{
                            name: userName,
                            image: userImage,

                            slug: userS,
                            id: userId
                          }}
                        />
                      </div>
                      <div className={"block whitespace-pre-wrap"}>{memo}</div>
                    </div>
                    <div
                      className={
                        "border-t-px mt-[8px] mb-0 flex border-solid border-muted-faded-background/65 p-[12px_0]"
                      }
                    >
                      <div className={"text-[14px]"}></div>
                    </div>
                  </div>
                )
              ) : (
                <SignInCard
                  onSignInClick={(e) => {
                    e.preventDefault();
                    setSaving(true);
                  }}
                />
              )}
            </DialogContent>
          </Dialog>
        )}
      </PrivateDialog>
    </>
  );
};
const PrivateInternal = (props: { children: ReactNode }) => {
  const { children } = props;

  const [memo, setMemo] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);
  const toggleOpen = () => setIsOpen((o) => !o);

  const ctx = useFloating({
    placement: "right-start",
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [offset(10)],
    whileElementsMounted: autoUpdate
  });
  const { refs, floatingStyles, ...context } = ctx;
  const { status, isMounted } = useTransitionStatus(context.context);

  const click = useClick(context.context);
  const dismiss = useDismiss(context.context, {
    outsidePressEvent: "mousedown"
  });
  const role = useRole(context.context);
  const interactions = useInteractions([click, dismiss, role]);
  const [view, setView] = useState<"edit" | "view">("view");

  const [saving, setSaving] = useState(false);

  return (
    <PrivateMemoContext.Provider
      value={{
        memo,
        setMemo,
        setOpen: setIsOpen,
        setView,
        toggleOpen,
        open: isOpen,
        view,
        saving,
        setSaving,
        refs,
        ctx: { ...ctx, ...interactions },
        floatingStyles,
        isMounted,
        status
      }}
    >
      {children}
    </PrivateMemoContext.Provider>
  );
};
const PrivateNoteEditor = ({
  initialValue = "",
  savedSelection
}: {
  initialValue?: string;
  savedSelection?: rangy.savedSelection | null;
}) => {
  const fc = useHighlighter((r) => r.focusedHighlight);
  const createCallback = useCitations((r) => r.create);
  const handleUpdate = useCitations((r) => r.update);
  const [memoValue, setMemoValue] = useState(initialValue);
  const memoRef = useRef(memoValue);
  useEffect(() => {
    memoRef.current = memoValue;
  }, [memoValue]);
  const textAreaId = useId();
  const {
    value,
    characterCount,
    handleChange,
    maxLength: limit
  } = useCharacterLimit({ maxLength: 200, initialValue });
  const ranger = useRanger((r) => r.ranger);
  const container = useRanger(useShallow((r) => r.targetContainer));
  const lastValue = useRef("");
  const t = useTranslations();
  const [saving, setSaving] = useState(false);
  const setSavingState = usePrivateNote((r) => r.setSaving);
  const currentFocus = useRef(fc);
  const savedRef = useRef(savedSelection);
  useEffect(() => {
    currentFocus.current = fc;
  }, [fc]);
  useEffect(() => {
    savedRef.current = savedSelection;
  }, [savedSelection]);
  useEffect(() => {
    setSavingState(saving);
  }, [saving, setSavingState]);
  const oC: ChangeEventHandler<HTMLTextAreaElement> = useCallback(
    (e) => {
      if (e.target.disabled) return;
      handleChange(e);
    },
    [handleChange]
  );
  useEffect(() => {
    if (lastValue.current !== value) {
      setDirty(true);
    }
    lastValue.current = value;
    setMemoValue(value);
  }, [value]);
  const setOpen = usePrivateNote((r) => r.setOpen);
  const qc = useQueryClient();
  const [dirty, setDirty] = useState<boolean>(false);
  const updateMutation = useMutation({
    mutationFn: (body: HighlightedRange) => handleUpdate(body),
    onMutate: () => setSaving(true),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["savedHighlights"] });
      successToast(t("Highlights.saved"));
      setOpen(false);
      setDirty(false);
    },
    onError: () => {
      errorToast(t("Highlights.error.save.default"));
    },
    onSettled: () => setSaving(false)
  });
  const onSave = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      const sv = savedRef.current;
      const mem = memoRef.current;
      if (mem.length < 1) {
        return setSaving(false);
      }
      if (!currentFocus.current) {
        if (sv) {
          setSaving(true);
          ranger.restoreSelection(sv);
          createCallback({
            params: { private: true, memo: mem },
            container
          })
            .then((r) => {
              if (r) {
                successToast(t("Highlights.saved"));
                ranger.removeMarkers(sv);
              } else {
                errorToast(t("Highlights.error.save.select"));
              }
              qc.invalidateQueries({
                queryKey: ["savedHighlights"]
              });
              setOpen(false);
              setDirty(false);
            })
            .then(() => {
              setSaving(false);
            });
        } else {
          setSaving(false);
        }
        return;
      }
      try {
        setSaving(true);
        // const where: Where = {
        // 	reference: {equals: focusedHighlight.reference},
        // };
        const body = {
          ...currentFocus.current,
          memo: mem,
          private: true
        } satisfies HighlightedRange;
        handleUpdate(body)
          .then(() => {
            qc.invalidateQueries({
              queryKey: ["savedHighlights"]
            });
            successToast(t("Highlights.saved"));
          })
          .then(() => {
            setSaving(false);
          });
      } catch (e) {
        console.log(e);
        errorToast(t("Highlights.error.save.default"));
      } finally {
        setSaving(false);
      }
    },
    [container, createCallback, handleUpdate, qc, ranger, setOpen, t]
  );
  const cancelBtnClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if ((e.currentTarget as HTMLButtonElement)?.disabled) return;
      setOpen(false);
    },
    [setOpen]
  );
  return (
    <div className={"block p-[12px_20px]"}>
      <div className={"block"}>
        <div className={"mb-[12px] flex items-center"}></div>
        <div className={"mb-[12px] block"}>
          <div className={"*:not-first:mt-2"}>
            <Textarea
              placeholder={"Something on this note for your eyes only.."}
              className={cn(
                "min-h-[120px]",
                saving ? "pointer-events-none" : "pointer-events-auto"
              )}
              value={value}
              onChange={oC}
              maxLength={limit}
              id={textAreaId}
              disabled={saving}
            />
            <p
              id={`${textAreaId}-description`}
              className="mt-2 text-right text-xs text-off-foreground"
              role="status"
              aria-live="polite"
            >
              <span className="tabular-nums">{characterCount}</span>/
              <span className={"tabular-nums"}>{limit}</span>
            </p>
          </div>
        </div>
        <div className={"text-[14px] leading-[20px] text-muted-foreground"}>
          <div className={"flex justify-between"}>
            <div className={"flex"}>
              <Button
                className={
                  "bg-transparent text-background opacity-30 transition-[color,opacity] duration-200 ease-in-out-2 disabled:pointer-events-none data-active:not-disabled:opacity-100"
                }
                onClick={onSave}
                disabled={saving || !dirty}
                data-active={dirty}
                {...((saving && { "data-saving": saving }) || {})}
              >
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
            <div className={"flex"}>
              <Button disabled={saving} onClick={cancelBtnClick}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
const PrivateNoteHeader = (props: {}) => {
  const view = usePrivateNote((r) => r.view);

  return (
    <div
      className={"flex items-center bg-muted-faded-background/85 p-[12px_20px]"}
    >
      <div className={"mr-[8px] -ml-[4px] block [&_svg]:align-middle"}></div>
      <div className={"relative top-px block flex-[1_1_auto]"}>
        <h2
          className={
            "text-[13px] leading-[18px] tracking-[0.077em] text-muted-foreground uppercase"
          }
        >
          <span className={"text-[13px] leading-[20px] text-muted-foreground"}>
            {view === "view" ? "Private Note" : "Edit"}
          </span>
        </h2>
      </div>
      <div className={"relative top-px block flex-[1_1_auto]"}>
        <p className={"text-[13px] leading-[20px]"}>Learn More </p>
      </div>
    </div>
  );
};
const PrivateDialog = (
  props: ComponentProps<"div"> & { children: ReactNode }
) => {
  const focusedHighlight = useHighlighter((r) => r.focusedHighlight);
  const floatingStyles = usePrivateNote((r) => r.floatingStyles);
  const fc = useRef(focusedHighlight);
  useEffect(() => {
    fc.current = focusedHighlight;
  }, [focusedHighlight]);
  const status = usePrivateNote((r) => r.status);
  const innerRef = useRef<HTMLDivElement>(null!);
  const { context: floatingContext, ...context } = usePrivateNote((r) => r.ctx);
  const isMounted = usePrivateNote((r) => r.isMounted);
  const refs = usePrivateNote((r) => r.refs);
  const open = usePrivateNote((r) => r.open);
  const { ref: propRef, ...reste } = props;
  const ref = useMergeRefs([refs.setFloating, propRef]);
  const view = usePrivateNote((r) => r.view);
  const [opening, setOpening] = useState(false);
  const savedSelection = useRef<rangy.savedSelection | null>(null);
  const ranger = useRanger((r) => r.ranger);
  useEffect(() => {
    if (isMounted && view === "edit" && !fc.current) {
      savedSelection.current = ranger.saveSelection();
    } else {
      savedSelection.current &&
        (ranger.removeMarkers(savedSelection.current),
        (savedSelection.current = null));
    }
    setOpening(isMounted);
  }, [isMounted, ranger, view]);

  return (
    opening && (
      <FloatingPortal>
        <FloatingFocusManager
          context={floatingContext}
          modal={false}
          disabled={!open || view !== "edit"}
        >
          <div
            className={
              "z-[250] m-0 flex overflow-hidden rounded-2xl border-none"
            }
            {...reste}
            ref={ref}
            {...context.getFloatingProps(reste)}
            style={{ ...floatingStyles }}
          >
            <div
              ref={innerRef}
              data-status={status}
              className={"privateNote relative z-[210] h-full w-full p-0"}
            >
              <div
                className={
                  "absolute top-0 left-0 z-[1] h-full w-full bg-faded-d-gray dark:bg-faded-l-gray"
                }
              />
              {reste.children}
            </div>
          </div>
        </FloatingFocusManager>
      </FloatingPortal>
    )
  );
};
export const usePrivateNote = <T,>(
  selector: (state: PrivateHighlights) => T
) => {
  const context = useContext(PrivateMemoContext);
  if (!context)
    throw new Error("usePrivateNote must be used within a PrivateMemoizer");
  return selector(context);
};
