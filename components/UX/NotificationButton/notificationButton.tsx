"use client";
import { ReferencedLink } from "@/components/core/Link/ReferencedLink";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, MotionLink } from "@/components/core/Link/Link";
import { cn } from "@/lib/utils";
import { useHumanTime } from "@/hooks/useLocaleDate";
import type { SyncedNotification } from "@/payload/collections/Notifications/hooks/types";
import { useIsMobile } from "@/providers/MiddleMan";
import { useNotifications } from "@/providers/Notifications";
import { useRPStore } from "@/providers/RP_Pro";
import { sortByDate } from "@/stores/Notification/NotificationStore";
import { AuthorOverview } from "@/types/collections/users";
import { useWindowResize } from "@/utilities/use_window_resize";
import { Popover } from "@base-ui/react/popover";
import NumberFlow, { continuous } from "@number-flow/react";
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
import { Cross1Icon } from "@radix-ui/react-icons";
import { useQuery } from "@tanstack/react-query";
import Lenis from "lenis";
import { useLenis } from "lenis/react";
import { AnimatePresence, type HTMLMotionProps, stagger } from "motion/react";
import * as m from "motion/react-m";
import { usePathname } from "next/navigation";
import type { CollectionSlug } from "payload";
import {
  ComponentProps,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { useShallow } from "zustand/shallow";
import { useDomCursor } from "@/components/core/cursorWrapper";
import { Button, MotionBtn, MotionPillButton } from "@/components/core/Button";
import { FrontImage } from "@/components/core/Media/FrontImage";
import { ImageMedia } from "@/components/core/Media/Image";

const MotionPopoverTrigger = m.create(Popover.Trigger);
export const NotificationButton = (props: HTMLMotionProps<"button">) => {
  const { setDismissed, notifications, setRead, setAllRead } =
    useNotifications();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const widths = useMemo(() => {
    return {
      mobile: 32,
      desktop: 24
    };
  }, []);

  const [expanded, setExpanded] = useState(true),
    navIsOpen = useRPStore(useShallow((store) => store.navIsOpen)),
    windowReside = useWindowResize({
      detectHeightChange: false,
      debounce: 100
    });
  const { isMobile } = useIsMobile();
  const onDismiss = useCallback(
    ({ ids }: { ids: string[] }) => {
      setDismissed({ ids });
    },
    [setDismissed]
  );
  const onRead = useCallback(
    ({ ids }: { ids: string[] }) => {
      setRead({ ids });
    },
    [setRead]
  );
  // Display set is derived from the provider's notifications. Drop
  // dismissed items, sort newest-first. No local shadow state — the
  // optimistic cache update flows through the store mirror in the
  // provider and lands here in the same render cycle.
  const nItems = useMemo(
    () =>
      notifications
        .filter((n) => !n.dismissed)
        .sort((a, b) =>
          sortByDate({ order: "DESC" })(a.updatedAt, b.updatedAt)
        ),
    [notifications]
  );
  const closer = useCallback(() => {
    setOpen(false);
  }, []);
  const icon = useRef<SVGSVGElement>(null!),
    txt = useRef<HTMLDivElement>(null!);
  const { count } = useNotifications();
  const variants = useMemo(
    () => ({
      expanded: {
        minWidth: 32,
        scaleX: 1,
        opacity: 1
      },
      collapsed: {
        minWidth: 24,
        scaleX: 0,
        opacity: 0
      }
    }),
    []
  );
  const [animation, setAnimation] =
    useState<keyof typeof variants>("collapsed");
  useEffect(() => {
    if (expanded) {
      setAnimation("expanded");
    } else {
      setAnimation("collapsed");
    }
  }, [expanded]);
  const { onMouseEnter, onMouseLeave } = useDomCursor({});

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <MotionPopoverTrigger
        render={({ children, className, ...props }) => (
          <MotionPillButton
            onMouseEnter={onMouseEnter}
            data-state={navIsOpen}
            data-themed={
              "border-color,fill,stroke,outline-color,color,background-color"
            }
            onMouseLeave={onMouseLeave}
            initial={{
              opacity: 0,
              scaleX: 0.01
            }}
            variants={variants}
            animate={animation}
            exit={{
              opacity: 0,
              scaleX: 0.01
            }}
            transition={{
              duration: 0.2,
              ease: "easeOut"
            }}
            data-expanded={expanded}
            className={cn(
              "rp_btn bt_sm bell-button !gap-2 px-2 hover:border-current! hover:bg-transparent! data-[state=true]:border-current!",
              className
            )}
            {...(props as HTMLMotionProps<"button">)}
          >
            {children}
          </MotionPillButton>
        )}
        nativeButton={true}
        {...props}
      >
        <AnimatePresence initial={true} mode="sync">
          {expanded && (
            <m.div
              ref={txt}
              initial={{
                opacity: 0
              }}
              animate={{
                opacity: 1
              }}
              exit={{
                opacity: 0
              }}
              transition={{
                duration: 0.2,
                ease: "easeInOut"
              }}
              className="pointer-events-none text-sm leading-[114%] tracking-[-0.01em] whitespace-nowrap min-md:block min-md:min-w-fit min-md:leading-[120%]"
            >
              <NumberFlow
                className={"text-sm"}
                respectMotionPreference={false}
                locales={"en-US"}
                plugins={[continuous]}
                value={count}
                format={{ notation: "compact", compactDisplay: "short" }}
              />
            </m.div>
          )}
        </AnimatePresence>
        <m.svg
          ref={icon}
          className="aspect-square w-[1.2rem] bg-transparent stroke-[1.25px] min-md:w-[1.4rem]"
          viewBox="0 0 45 45"
          data-themed={"stroke,fill"}
          fill="none"
          fillRule={"evenodd"}
          stroke="currentColor"
        >
          <path
            d="m40.7,34.79c-1.21-1.07-2.26-2.31-3.14-3.66-.96-1.87-1.53-3.92-1.69-6.01v-6.18c.02-6.81-5.04-12.57-11.8-13.44v-1.61c0-.92-.75-1.67-1.67-1.67s-1.67.75-1.67,1.67v1.64c-6.69.93-11.68,6.65-11.66,13.41v6.18c-.16,2.1-.73,4.14-1.69,6.01-.86,1.35-1.9,2.58-3.09,3.66-.27.24-.42.58-.42.94v1.7c0,.69.56,1.25,1.25,1.25h34.75c.69,0,1.25-.56,1.25-1.25v-1.7c0-.36-.16-.7-.43-.94Zm-34.22,1.39c1.16-1.12,2.19-2.38,3.05-3.75,1.21-2.26,1.91-4.75,2.06-7.31v-6.18c-.2-6.03,4.52-11.08,10.55-11.29,6.03-.2,11.08,4.52,11.29,10.55,0,.25,0,.49,0,.74v6.18c.15,2.56.86,5.05,2.06,7.31.86,1.37,1.89,2.63,3.05,3.75H6.48Z"
            stroke="currentColor"
          />
          <path
            d="m22.56,42.85c1.63-.04,2.99-1.24,3.22-2.85h-6.58c.24,1.66,1.68,2.87,3.35,2.85Z"
            stroke="currentColor"
          />
        </m.svg>
      </MotionPopoverTrigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={20} positionMethod={"fixed"}>
          <Popover.Popup className="relative max-h-[25rem] min-h-[15rem] min-w-[25rem] origin-[var(--transform-origin)] overflow-hidden rounded-lg bg-faded-background/30 px-4.5 py-6 text-faded-foreground/90 shadow-lg/25 shadow-lg shadow-muted-faded-background/30 outline-1 outline-muted-faded-foreground/20 backdrop-blur-xs transition-[transform,scale,opacity,background-color,color,box-shadow] duration-200 data-[ending-style]:scale-90 data-[ending-style]:opacity-0 data-[starting-style]:scale-90 data-[starting-style]:opacity-0 dark:bg-faded-background/60 dark:shadow-xl/40 dark:shadow-gray-900/30 dark:outline-muted-faded-foreground/40">
            <div
              className={"absolute inset-0 opacity-30 mix-blend-multiply"}
              style={{
                backgroundImage: "url(/assets/noise.png)",
                backgroundSize: "20%",
                backgroundPosition: "center"
              }}
            />
            <Popover.Title className="mb-1 text-base font-semibold tracking-[-0.01em]">
              Notifications
            </Popover.Title>
            <NotificationScroll
              nItems={nItems}
              onDismiss={onDismiss}
              onRead={onRead}
              closer={closer}
            />
            <AnimatePresence>
              {pathname !== "/me/inbox" && nItems.length > 0 && (
                <MotionLink
                  className={
                    "absolute right-0 bottom-1 left-0 flex w-full items-center justify-center px-3 py-1 font-sans"
                  }
                  initial={{
                    opacity: 0,
                    translateY: "50%"
                  }}
                  animate={{
                    opacity: 1,
                    translateY: "0%"
                  }}
                  transition={{
                    type: "tween",
                    duration: 0.15,
                    ease: "easeOut"
                  }}
                  href="/me/inbox"
                  onClick={closer}
                >
                  See All
                </MotionLink>
              )}
            </AnimatePresence>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
};
const NotificationScroll = (props: {
  nItems: SyncedNotification[];
  onDismiss: ({ ids }: { ids: string[] }) => void;
  onRead: ({ ids }: { ids: string[] }) => void;
  closer: () => void;
}) => {
  const { nItems, onDismiss, onRead, closer } = props;
  const wrapperRef = useRef<HTMLDivElement>(null!);
  const scrollRef = useRef<HTMLDivElement>(null!);
  const lenisRef = useRef<Lenis>(null!);
  const ogLenis = useLenis();
  const onEnter = useCallback(() => {
    ogLenis?.stop();
  }, [ogLenis]);
  const onLeave = useCallback(() => {
    ogLenis?.start();
  }, [ogLenis]);
  const onScroll = useCallback((lenis: Lenis) => {
    const { progress, isScrolling, direction } = lenis;
    if (isScrolling) {
      const isNearEnd =
        (direction === 1 && progress < 0.01) ||
        (progress > 0.99 && direction === -1);

      if (isNearEnd) {
        // requestAnimationFrame(() => {
        //   return requestAnimationFrame(() => {
        //     if (lenis.direction === direction) {
        //       const isStillSame =
        //         direction === 1
        //           ? lenis.progress < progress
        //           : lenis.progress > progress;
        //       if (isStillSame) {
        //         ogLenis?.start();
        //       }
        //     }
        //   });
        // });
      }
    }
  }, []);
  useEffect(() => {
    if (lenisRef.current) return;
    const content = scrollRef.current;
    const wrapper = wrapperRef.current;
    const container = wrapper?.parentElement;
    if (!content || !wrapper || !container) return;
    const lenny = new Lenis({
      wrapper,
      content,
      autoRaf: true
    });
    lenisRef.current = lenny;
    lenny.on("scroll", onScroll);
    container.addEventListener("mouseover", onEnter);
    container.addEventListener("mouseout", onLeave);
    return () => {
      if (lenisRef.current) {
        lenisRef.current.off("scroll", onScroll);
        container.removeEventListener("mouseover", onEnter);
        container.removeEventListener("mouseout", onLeave);
        lenisRef.current.destroy();
        ogLenis?.start();
        lenisRef.current = null!;
      }
    };
  }, [onScroll, onEnter, onLeave, ogLenis]);
  return (
    <m.div
      className="relative mb-4 max-h-[17rem] w-full flex-col items-center justify-start overflow-y-auto overscroll-contain px-3 py-6"
      ref={wrapperRef}
      layoutScroll={true}
    >
      <m.div
        ref={scrollRef}
        className={"flex flex-col gap-2.5"}
        transition={{
          delayChildren: stagger(0.05)
        }}
      >
        <AnimatePresence mode="sync" initial={false}>
          {nItems.map((item, index) => {
            if (item.trigger) {
              switch (item.trigger.relationTo) {
                case "users": {
                  switch (item.type) {
                    case "follow":
                      return (
                        <UserNotification
                          key={item.id + index}
                          id={item.trigger.value as string}
                          item={{
                            ...item,
                            trigger: {
                              relationTo: "users",
                              value: item.trigger.value as string
                            },
                            type: "follow",
                            id: item.id
                          }}
                          onDismiss={onDismiss}
                          onRead={onRead}
                        />
                      );
                  }
                }
                default:
                  return (
                    <NotificationItem
                      key={item.id + index}
                      item={{
                        ...item,
                        id: item.id
                      }}
                      onDismiss={onDismiss}
                      onRead={onRead}
                    />
                  );
              }
            } else {
              return (
                <NotificationItem
                  key={item.id + index}
                  item={{
                    ...item,
                    id: item.id
                  }}
                  onDismiss={onDismiss}
                  onRead={onRead}
                />
              );
            }
          })}
          {nItems.length < 1 && (
            <m.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex h-[10rem] w-full items-center justify-center"
            >
              <Popover.Description className="text-sm leading-[114%] font-medium tracking-[-0.01em]">
                You are all caught up!
              </Popover.Description>
            </m.div>
          )}
          {/* {nItems.length > 5 && ( */}
        </AnimatePresence>
      </m.div>
    </m.div>
  );
};
export const ScrollArea = (props: ComponentProps<"div">) => {};
const NotificationItem = (
  props: HTMLMotionProps<"div"> & {
    item: SyncedNotification;
    onDismiss: ({ ids }: { ids: string[] }) => void;
    onRead: ({ ids }: { ids: string[] }) => void;
  }
) => {
  const {
    ref,
    className,
    transition,
    item,
    onDismiss: oD,
    onRead: oR,
    ...rest
  } = props;
  const onDismiss = () => {
    oD({ ids: [item.id] });
  };
  const onRead = () => {
    oR({ ids: [item.id] });
  };
  const {
    title,
    id,
    dismissed,
    type,
    fallbackImage,
    thumbnail,
    actionLink,
    content
  } = item;
  const [hovered, setHovered] = useState(false);
  const [mutating, setMutating] = useState(false);
  const { onMouseEnter, onMouseLeave } = useDomCursor({
    onEnter: (e) => {
      setHovered(true);
    },
    enterCondition: () => null,

    onLeave: (e) => {
      setHovered(false);
    }
  });

  return (
    <m.div
      key={props.title}
      ref={ref}
      className="relative h-full overflow-hidden rounded-[8px] bg-transparent text-base outline-1 outline-muted-faded-foreground/0 transition-colors duration-150 ease-out-power2 hover:outline-muted-faded-foreground/30 max-lg:w-[90vw] max-lg:min-w-[20rem] min-lg:min-h-[6rem] min-lg:w-[15vw]"
      data-themed="background-color,border-color"
      initial={{
        translateX: "50%"
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      animate={{
        translateX: "0%",
        transition: {
          type: "spring",
          damping: 12,
          mass: 0.5,
          visualDuration: 0.1
        }
      }}
      exit={{
        translateX: "-100%"
      }}
      {...(hovered ? { "data-hovered": true } : {})}
    >
      <div className="relative flex h-full w-full">
        <div className="bg-transparent-base/15 absolute inset-0 z-[5] rounded-[8px] backdrop-blur-[0.5px]" />
        <article
          className="relative z-20 flex h-full w-full items-center justify-center gap-5 p-4 text-base"
          data-type="type"
        >
          <MotionBtn
            className="absolute top-2 right-2 z-[12] flex aspect-square h-[2rem] items-center justify-center rounded-full"
            aria-label="Close notification"
            initial={{
              scale: 0.9
            }}
            animate={{
              scale: 0.9,

              transition: {
                type: "tween",
                ease: "easeOut",
                duration: 0.2
              }
            }}
            onClick={onDismiss}
          >
            <svg
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="h-[1rem] w-[1rem]"
            >
              <path
                data-themed="stroke"
                d="M2.625 2.625L9.375 9.375"
                stroke="currentColor"
                style={{}}
              />
              <path
                data-themed="stroke"
                d="M2.625 9.375L9.375 2.625"
                stroke="currentColor"
                style={{}}
              />
            </svg>
          </MotionBtn>
          <div className="grid w-full grid-cols-[4.8rem_1fr] items-center gap-5 min-lg:items-start">
            <div className="relative aspect-square h-auto w-full [&_img]:block [&_img]:h-auto [&_img]:w-full [&_img]:max-w-full">
              {(thumbnail && <FrontImage resource={thumbnail} />) ||
                (fallbackImage && (
                  <ImageMedia src={fallbackImage.path} fill={true} />
                ))}
            </div>
            <h1
              className="mb-[6px] font-sans text-sm leading-[114%] font-semibold tracking-[-0.01em] min-lg:mb-[12px] min-lg:leading-[120%]"
              data-themed="color"
              style={{}}
            >
              {(actionLink && actionLink.url && (
                <ReferencedLink
                  href={actionLink.url}
                  onClick={onRead}
                  link={actionLink}
                  className="z-[5] inline-block bg-transparent"
                  target="_blank"
                  rel="noreferrer"
                >
                  {title}
                </ReferencedLink>
              )) || <span>{title}</span>}
            </h1>
          </div>
        </article>
      </div>
    </m.div>
  );
};

function UserNotification({
  item,
  onDismiss: oD,
  onRead: oR,
  id
}: {
  item: SyncedNotification & {
    trigger: { relationTo: Extract<CollectionSlug, "users">; value: string };
  };
  id: string | number;
  onDismiss: ({ ids }: { ids: string[] }) => void;
  onRead: ({ ids }: { ids: string[] }) => void;
}) {
  const { id: itemId, title, content, actionLink, createdAt } = item;
  const onDismiss = useCallback(() => {
    oD({ ids: [itemId] });
  }, [itemId, oD]);
  const onRead = useCallback(() => {
    oR({ ids: [itemId] });
  }, [itemId, oR]);
  const { data, isLoading, isPending } = useQuery({
    placeholderData: {
      name: "",
      displayUsername: "",
      image: "",
      id: "",
      slug: ""
    } as AuthorOverview,
    queryKey: ["user", item.trigger.value],
    queryFn: async ({ queryKey }: { queryKey: ["user", string] }) => {
      const res = await fetch(`/api/users/${queryKey[1]}/overview`);
      if (!res.ok) {
        throw new Error("Failed to fetch user overview");
      }
      const r = (await res.json()) as { data: AuthorOverview };
      if ("data" in r && r.data) {
        return r.data as AuthorOverview;
      }
      throw new Error("Failed to fetch user overview");
    },
    staleTime: Infinity,
    enabled: !!item.trigger.value
  });
  const humanTime = useHumanTime(createdAt);

  return (
    // To make the notification fixed, add classes like `fixed bottom-4 right-4` to the container element.

    <div className="z-50 max-w-[400px] rounded-md border bg-background p-4 shadow-lg">
      <div className="flex gap-3">
        {(!isLoading && (
          <Avatar>
            {(data?.image && (
              <AvatarImage src={data.image} width={32} height={32} alt="" />
            )) || <AvatarFallback>{data?.name?.at(0)}</AvatarFallback>}
          </Avatar>
        )) || <Skeleton className="size-[32px] rounded-full" />}
        <div className="flex grow flex-col gap-3">
          <div className="space-y-3">
            {(isLoading && (
              <>
                <Skeleton className="h-[12px] w-[250px]" />
                <Skeleton className="h-[12px] w-[250px]" />
              </>
            )) || (
              <>
                <p className="text-sm text-muted-foreground">
                  <Link
                    className="relative z-[4] inline-block font-medium text-foreground hover:underline"
                    href={`/@${data?.slug}`}
                  >
                    {data?.name}
                  </Link>
                  {(item.type === "mention" && "mentioned you") ||
                    (item.type === "follow" && "followed you") ||
                    (item.type === "comment" && "commented") ||
                    (item.type === "bookmark" && "bookmarked")}
                  {actionLink.url && (
                    <ReferencedLink
                      href={actionLink.url}
                      link={actionLink}
                      onClick={onRead}
                      className={
                        "absolute inset-0 z-[0] bg-faded-foreground/10 opacity-0 transition-opacity duration-200 ease-out-power2 hover:opacity-100"
                      }
                    />
                  )}
                  .
                </p>
                <p className="text-xs text-muted-foreground">{humanTime}</p>
              </>
            )}
          </div>
          {/* <div className="flex gap-2">
					 <Button
					 className={
					 "bg-faded-foreground text-nav-button-inverted"
					 }
					 >
					 Accept
					 </Button>
					 <Button
					 className={
					 "border-[1px] border-solid border-nav-button-border text-nav-button"
					 }
					 >
					 Decline
					 </Button>
					 </div> */}
        </div>
        <Button
          className="group -my-1.5 -me-2 size-8 shrink-0 p-0 hover:bg-transparent"
          aria-label="Close notification"
          onClick={onDismiss}
        >
          <Cross1Icon
            className="opacity-60 transition-opacity group-hover:opacity-100"
            aria-hidden="true"
          />
        </Button>
      </div>
    </div>
  );
}
