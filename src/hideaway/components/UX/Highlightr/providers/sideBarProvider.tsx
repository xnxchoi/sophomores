"use client";
import { useDomCursor } from "@/hideaway/components/core/cursorWrapper";
import { Link } from "@/hideaway/components/core/Link/Link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { errorToast } from "@/hideaway/components/ui/sonner";
import { HighlightCreateError } from "@/hideaway/components/UX/Highlightr/HighlightErrors";
import { HighlightPalette } from "@/hideaway/components/UX/Highlightr/stores";
import type { HighlightedRange } from "@/hideaway/components/UX/Highlightr/types";
import { TWEEN_EASE } from "@/hideaway/constants/animations";
import { useRPSession } from "@/lib/auth/session/RP_SessionProvider";
import { useCursor } from "@/hideaway/providers/RP_Pro";
import type { AuthorOverview } from "@/types/collections/users";
import type { RequiredAndNonNullable } from "@/hideaway/utilities/typeUtilities";
import { useLenis } from "lenis/react";
import { DateTime } from "luxon";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { useLocale, useTranslations } from "next-intl";
import {
  createContext,
  CSSProperties,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from "react";
import { Drawer } from "vaul";
import { useShallow } from "zustand/shallow";
import { Button } from "@/hideaway/components/core/Button";
import { isValidAuthor, SignInTriggerButton, UserBar } from "./author-ui";
import { useCitations } from "./CitationProvider";
import { useHighlighter } from "./HighlighterProvider";

export interface HighlightSidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  setContent: (content: Omit<ResponseNode, "top"> | null) => void;
  content: Omit<ResponseNode, "top"> | null;
  writing: boolean;
  setWriting: (writing: boolean) => void;
}

const HighlightSidebarContext = createContext<HighlightSidebarProps>({
  open: false,
  setOpen: () => {},
  toggle: () => {},
  setContent: (_) => {},
  content: null,
  writing: false,
  setWriting: (_) => {}
});

const CitationView = ({
  createdAt,
  updatedAt,
  author,
  quote,
  memo,
  reference,
  ...rest
}: Omit<ResponseNode, "top">) => {
  const uDate = DateTime.fromISO(updatedAt);
  const cDate = DateTime.fromISO(createdAt);
  const updateValid = uDate.isValid;
  const userImage = useRPSession(useShallow((r) => r.image));
  const userName = useRPSession(useShallow((r) => r.name));
  const userSlug = useRPSession(useShallow((r) => r.slug));
  const userId = useRPSession(useShallow((r) => r.id as string | null));
  let isEdited = false;
  if (updateValid) {
    isEdited = uDate.diff(cDate).as("hours") > 0;
  }

  const finalDate = updateValid ? (uDate as DateTime<true>) : cDate;
  const locale = useLocale();
  return (
    <div className={"flex flex-col"}>
      <FocusedCitation
        citation={{
          author,
          quote,
          memo,
          reference
        }}
        {...rest}
      />
      <div
        className={
          "mx-[24px] my-0 border-b-[1px] border-muted-foreground/20 pt-[24px]"
        }
      >
        <div>
          <div className={"text-[14px] leading-[20px]"}>
            <div className={"leading-[20px]"}>
              {userId && (
                <div className={"mb-[20px] block"}>
                  <div className={"mb-[12px] flex items-center"}>
                    <UserBar
                      user={{
                        id: userId,
                        name: userName,
                        image: userImage,
                        slug: userSlug
                      }}
                    />
                  </div>
                  <MemoInputField />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className={"block"}>
        <div className={"block"}>
          <div className={"border-b-none mx-[24px] block"}>
            <ResponseItem
              author={author}
              updatedAt={finalDate.setLocale(locale).toRelative()!}
              memo={memo}
              isEdited={isEdited}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const ResponseItem = ({
  author,
  updatedAt,
  memo,
  isEdited
}: {
  author: AuthorOverview;
  updatedAt: string;
  memo: string;
  isEdited?: boolean;
}) => {
  const locale = useLocale();
  const linked = isValidAuthor(author);
  const avatarNode = (
    <div className={"relative block"}>
      <Avatar>
        {(author.image && (
          <AvatarImage height={32} width={32} src={author.image} />
        )) || (
          <AvatarFallback className={"uppercase"}>
            {author.name.at(0)}
            {author.name.at(1)}
          </AvatarFallback>
        )}
      </Avatar>
    </div>
  );
  return (
    <div>
      <div className={"h-full w-full"}>
        <div className={"block pt-[25px] pb-[16px]"}>
          <div className={"flex justify-between"}>
            <div className={"flex items-center"}>
              <div>
                <div className={"inline-block"}>
                  <div className={"outline-none"} tabIndex={-1}>
                    {linked ? (
                      <Link href={`/@${author.slug}`}>{avatarNode}</Link>
                    ) : (
                      avatarNode
                    )}
                  </div>
                </div>
              </div>
              <div className={"block pl-[12px]"}>
                <div className={"flex items-center"}>
                  <div className={"inline-block"}>
                    <div className={"outline-none"}>
                      {linked ? (
                        <Link href={`/@${author.slug}`}>
                          <p className={"break-all"}>{author.name}</p>
                        </Link>
                      ) : (
                        <p className={"break-all"}>{author.name}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <span>
                    {updatedAt}
                    {isEdited && (
                      <>&nbsp;{locale === "ko" ? "(수정)" : "(edited)"}</>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className={"break-word mt-[5px] block"}>
            <p className={"font-suit text-base"}>{memo}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const MemoInputField = () => {
  const user = useRPSession(useShallow((r) => r.id as string | null));
  const memoVal = useRef(" ");
  const writing = useHighlightSidebar("writing");
  const setIsWriting = useHighlightSidebar("setWriting");
  const [value, setValue] = useState("");
  const setCursorState = useCursor((r) => r.setCursorState);
  const cInputWrapperRef = useRef<HTMLDivElement>(null!);
  const targetContainer = useHighlighter(useShallow((r) => r.targetContainer));
  const focusedHighlight = useHighlighter(
    useShallow((r) => r.focusedHighlight)
  );
  const fc = useRef(focusedHighlight);
  useEffect(() => {
    fc.current = focusedHighlight;
  }, [focusedHighlight]);
  const commentInputRef = useRef<HTMLTextAreaElement>(null!);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (saving) {
      memoVal.current = value;
    }
  }, [value, saving]);
  const creater = useCitations((r) => r.create);
  const saveCallback = useCitations((r) => r.update);
  const t = useTranslations();
  useEffect(() => {
    const ci = cInputWrapperRef.current;
    const input = commentInputRef.current;
    if (ci) {
      if (writing) {
        input && input.focus();
      }
    }
  }, [writing]);
  const [disabled, setDisabled] = useState(value.length === 0);
  useEffect(() => {
    setDisabled(value.length === 0);
  }, [value]);
  const { onMouseEnter, onMouseLeave } = useDomCursor({});
  const setWritinge = useCallback(
    (e: { stopPropagation: () => void; preventDefault: () => void }) => {
      e.stopPropagation();
      e.preventDefault();
      setIsWriting(true);
    },
    [setIsWriting]
  );
  useEffect(() => {
    const ci = cInputWrapperRef.current;
    const input = commentInputRef.current;
    if (ci) {
      if (writing) {
        input && input.focus();
      }
    }
  }, [writing]);
  return (
    <div
      className={
        "group flex flex-col rounded-[6px] bg-muted-faded-background/50 pb-0 transition-[background-color,padding-bottom] duration-400 ease-in-out-2"
      }
      data-active={writing}
    >
      <div className={"relative flex flex-col"}>
        {user ? (
          <AnimatePresence>
            <m.div
              ref={cInputWrapperRef}
              variants={{
                true: {
                  minHeight: "100px",
                  paddingTop: "12px",
                  paddingBottom: "12px"
                },
                false: {
                  minHeight: "15px",
                  paddingTop: "8px",
                  paddingBottom: "8px"
                }
              }}
              initial={`${writing}`}
              animate={`${writing}`}
              transition={{
                duration: 0.4,
                ease: TWEEN_EASE.power2.in
              }}
              className={"flex flex-col justify-between px-[12px] py-[8px]"}
            >
              {(writing && (
                <>
                  <textarea
                    data-slot="textarea"
                    className={
                      "relative flex field-sizing-content min-h-16 min-h-[24px] w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-base whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-none focus-visible:ring-[0px] focus-visible:ring-ring/0 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40"
                    }
                    ref={commentInputRef}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    style={{
                      overflowWrap: "break-word"
                    }}
                  />
                  <div
                    className={
                      "ml-[10px] flex max-h-[100px] items-center justify-between gap-4 opacity-100 transition-[opacity] duration-400 ease-in-out-2"
                    }
                  >
                    <div></div>
                    <div
                      className={
                        "flex max-h-[100px] gap-6 self-end px-[8px] py-0"
                      }
                    >
                      <Button
                        className={"text-xs"}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setCursorState(null);
                          setIsWriting(false);
                          setValue("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        className={
                          saving
                            ? "disabled:fg-muted-background pointer-events-none animate-pulse rounded-[20px] px-[8px] py-[4px] text-base transition-colors duration-400 ease-in-out-2 disabled:bg-muted-foreground"
                            : "disabled:fg-muted-background pointer-events-auto rounded-[20px] px-[8px] py-[4px] text-base transition-colors duration-400 ease-in-out-2 disabled:bg-muted-foreground"
                        }
                        disabled={disabled}
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setCursorState(null);
                          setSaving(true);
                          const mamu = memoVal.current;
                          try {
                            if (!mamu) {
                              throw new HighlightCreateError(
                                "params",
                                "invalid"
                              );
                            } else if (mamu.length < 1) {
                              throw new HighlightCreateError("memo", "empty");
                            }
                            const y = await creater({
                              params: { memo: memoVal.current, private: false },
                              container: targetContainer.current
                            });
                            if (!y)
                              throw new HighlightCreateError(
                                "unknown",
                                "unknown"
                              );
                            setSaving(false);
                            setValue("");
                            setCursorState(null);
                            setIsWriting(false);
                          } catch (e) {
                            errorToast(
                              e instanceof HighlightCreateError
                                ? e.message
                                : t("Highlights.error.save.default")
                            );
                          } finally {
                            setSaving(false);
                          }
                        }}
                        style={{
                          opacity: disabled ? "0.5" : "1",
                          color: disabled
                            ? "var(--muted-faded-background)"
                            : "var(--faded-background)",
                          backgroundColor: disabled
                            ? "var(--muted-faded-foreground)"
                            : "var(--faded-foreground)"
                        }}
                      >
                        Respond
                      </Button>
                    </div>
                  </div>
                </>
              )) || (
                <div
                  className={"h-full w-full"}
                  onMouseLeave={onMouseLeave}
                  onMouseEnter={onMouseEnter}
                  onClick={setWritinge}
                >
                  <span className={"text-base text-muted-foreground"}>
                    Share your thoughts here...
                  </span>
                </div>
              )}
            </m.div>
          </AnimatePresence>
        ) : (
          <SignInTriggerButton />
        )}
      </div>
    </div>
  );
};

export const SideBarProvider = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);
  const lenis = useLenis();
  const [content, setContent] = useState<Omit<ResponseNode, "top"> | null>(
    null
  );
  const [writing, setWriting] = useState(false);
  useEffect(() => {
    lenis && lenis[open ? "stop" : "start"]();
  }, [open, lenis]);
  const currentColor = useHighlighter(useShallow((r) => r.currentColor));
  useEffect(() => {
    if (!open) {
      setContent(null);
    }
  }, [open]);
  return (
    <HighlightSidebarContext.Provider
      value={{
        writing,
        setWriting,
        open,
        setOpen,
        toggle: () => setOpen((o) => !o),
        setContent,
        content
      }}
    >
      {children}
      <Drawer.Root
        open={open}
        onOpenChange={setOpen}
        defaultOpen={false}
        autoFocus={true}
        direction={"right"}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[249] bg-black/40" />
          <Drawer.Content
            className="fixed top-2 right-2 bottom-2 z-[250] flex w-[400px] flex-col gap-4 bg-background p-4"
            style={
              {
                "--initial-transform": "calc(100% + 8px)",
                "--currentHighlight": HighlightPalette[currentColor]
              } as CSSProperties
            }
          >
            <Drawer.Title className="px-5 py-3 text-base font-semibold">
              Response
            </Drawer.Title>
            <Drawer.Description className="sr-only">
              View and respond to your highlight.
            </Drawer.Description>
            {content && <CitationView {...content} />}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </HighlightSidebarContext.Provider>
  );
};

const FocusedCitation = ({
  citation
}: {
  citation: Partial<HighlightedRange> & {
    quote: string;
    author: AuthorOverview;
    reference: string;
  };
}) => {
  return (
    <div className={"block p-[6px_10px_24px]"}>
      <div
        className={
          "m-[10px_14px_0px] rounded-[3px] bg-background px-[16px] py-[20px] shadow-lg"
        }
      >
        <p
          className={
            "mt-[-0.44em] mb-[-0.46em] text-[18px] leading-[28px] font-medium text-foreground"
          }
        >
          <span className={"highlighted"}>{citation.quote}</span>
        </p>
      </div>
    </div>
  );
};

export const useHighlightSidebar = <T extends keyof HighlightSidebarProps>(
  selector: T
): HighlightSidebarProps[T] => {
  const context = useContext(HighlightSidebarContext);
  if (!context)
    throw new Error(
      "useHighlightSidebar must be used within a HighlightSidebarProvider"
    );
  return context[selector];
};

export type ResponseNode = {
  top: number;
} & RequiredAndNonNullable<
  Pick<
    HighlightedRange,
    "reference" | "memo" | "quote" | "author" | "updatedAt" | "createdAt"
  >
>;
