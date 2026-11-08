"use client";

import { Link } from "@/hideaway/components/core/Link/Link";
import { UserAvatar } from "@/hideaway/components/auth";
import { useRPSession } from "@/lib/auth/session/RP_SessionProvider";
import { useRPStore } from "@/hideaway/providers/RP_Pro";
import { Menu } from "@base-ui/react";
import { useLenis } from "lenis/react";
import { HTMLMotionProps } from "motion/react";
import * as m from "motion/react-m";
import {
  ButtonHTMLAttributes,
  HTMLAttributes,
  useCallback,
  useEffect,
  useState
} from "react";
import { useShallow } from "zustand/shallow";
import { signOut } from "@/lib/auth/client";
import { Button, MotionPillButton } from "@/hideaway/components/core/Button";

interface SlitProps extends HTMLAttributes<HTMLDivElement> {
  style: HTMLAttributes<HTMLDivElement>["style"] & {
    "--orz": string;
    "--id": number;
    "--ol": string;
    "--tm": string;
    "--thx": string;
  };
  size: "T" | "S";
}

// const Slit = forwardRef<HTMLDivElement, SlitProps>((props, ref) => {
//   let { size, ...rest } = props
//   return <div className={cn({ sh: size === 'S', tl: size === 'T' })} ref={ref} {...rest} />
// })
export type RP_DDProps = HTMLAttributes<HTMLDivElement> & {
  moves: HTMLElement[];
};

export interface DD_ToggleButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "style"
> {
  style: HTMLAttributes<HTMLButtonElement>["style"] & {
    "--of"?: string | number;
  };
}

interface DDUser {
  name: string;
  role: string;
  slug: string;
  id: string;
  image?: string | null;
}

export function UserDropdown(props: HTMLMotionProps<"button">) {
  const name = useRPSession(useShallow((r) => r.name));
  const slug = useRPSession(useShallow((r) => r.slug));
  const id = useRPSession(useShallow((r) => r.id));
  const dropdownOpen = useRPStore(useShallow((store) => store.dropdownOpen));
  const setD = useRPStore((store) => store.setDropdownOpen);
  const [isOpen, setIsOpen] = useState(false);
  const lnis = useLenis();
  const offD = useCallback(() => {
    setD(false);
    lnis?.off("scroll", offD);
  }, [setD, lnis]);
  useEffect(() => {
    if (dropdownOpen) {
      setIsOpen(true);
      lnis?.on("scroll", offD);
    } else {
      setIsOpen(false);
    }
    return () => {
      lnis?.off("scroll", offD);
    };
  }, [dropdownOpen, lnis, offD]);
  const onSignOut = () => {
    signOut();
  };

  return (
    <m.div
      initial={{ opacity: 0, scaleX: 0.01 }}
      animate={{ opacity: 1, scaleX: 1 }}
      exit={{ opacity: 0, scaleX: 0.01 }}
      key={id}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <Menu.Root open={isOpen} onOpenChange={setD}>
        <Menu.Trigger
          render={
            <MotionPillButton
              className={
                "rp_btn bt-sm flex aspect-square items-center justify-center p-0 hover:border-current!"
              }
              {...props}
              aria-label={`@${name}`}
            >
              <UserAvatar
                classNames={{ skeleton: "bg-muted-faded-background/10" }}
                user={{ name, id }}
              />
            </MotionPillButton>
          }
        />
        <Menu.Portal>
          <Menu.Positioner className={"outline-none"} sideOffset={10}>
            <Menu.Popup
              className="origin-(--transform-origin) rounded-md bg-faded-background/40 px-[12px] py-[16px] text-faded-foreground shadow-sm/25 outline-1 outline-muted-faded-foreground/20 backdrop-blur-sm transition-[transform,scale,opacity] data-ending-style:scale-90 data-ending-style:opacity-0 data-starting-style:scale-90 data-starting-style:opacity-0 dark:bg-faded-background/80 dark:shadow-md/40 dark:shadow-gray-900/30 dark:-outline-offset-1 dark:outline-muted-faded-foreground/40"
              data-themed="color,border-color,background-color,outline-color,box-shadow"
            >
              <div className="flex flex-col">
                <Menu.Item
                  render={
                    <Link
                      className={
                        "flex h-full w-full py-[8px] pr-[32px] pl-[16px] text-sm leading-[16px] text-faded-foreground/90! transition-colors duration-200 ease-out-power2 outline-none select-none before:transition-colors before:duration-200 before:ease-out-power2 hover:text-faded-background data-highlighted:relative data-highlighted:z-0 data-highlighted:text-faded-background! data-highlighted:before:absolute data-highlighted:before:inset-x-[4px] data-highlighted:before:inset-y-0 data-highlighted:before:z-[-1] data-highlighted:before:rounded-sm data-highlighted:before:bg-muted-faded-foreground/30"
                      }
                      data-themed="color, border-color, background-color, outline-color,box-shadow"
                      href={`/@${slug}`}
                      title={"Profile"}
                    >
                      Profile
                    </Link>
                  }
                />
                <Menu.Item
                  render={
                    <Link
                      className={
                        "flex h-full w-full py-[8px] pr-[32px] pl-[16px] text-sm leading-[16px] text-faded-foreground/90! transition-colors duration-200 ease-out-power2 outline-none select-none before:transition-colors before:duration-200 before:ease-out-power2 hover:text-faded-background data-highlighted:relative data-highlighted:z-0 data-highlighted:text-faded-background! data-highlighted:before:absolute data-highlighted:before:inset-x-[4px] data-highlighted:before:inset-y-0 data-highlighted:before:z-[-1] data-highlighted:before:rounded-sm data-highlighted:before:bg-muted-faded-foreground/30"
                      }
                      href={`/me/settings`}
                      title={"Settings"}
                    >
                      Settings
                    </Link>
                  }
                />
                <Menu.Item
                  render={
                    <Link
                      className={
                        "flex h-full w-full py-[8px] pr-[32px] pl-[16px] text-sm leading-[16px] text-faded-foreground/90! transition-colors duration-200 ease-out-power2 outline-none select-none before:transition-colors before:duration-200 before:ease-out-power2 hover:text-faded-background data-highlighted:relative data-highlighted:z-0 data-highlighted:text-faded-background! data-highlighted:before:absolute data-highlighted:before:inset-x-[4px] data-highlighted:before:inset-y-0 data-highlighted:before:z-[-1] data-highlighted:before:rounded-sm data-highlighted:before:bg-muted-faded-foreground/30"
                      }
                      href={"/tickets/my"}
                      title="Tickets"
                    >
                      Tickets
                    </Link>
                  }
                />
                <Menu.Item
                  render={
                    <Link
                      className={
                        "flex h-full w-full py-[8px] pr-[32px] pl-[16px] text-sm leading-[16px] text-faded-foreground/90! transition-colors duration-200 ease-out-power2 outline-none select-none before:transition-colors before:duration-200 before:ease-out-power2 hover:text-faded-background data-highlighted:relative data-highlighted:z-0 data-highlighted:text-faded-background! data-highlighted:before:absolute data-highlighted:before:inset-x-[4px] data-highlighted:before:inset-y-0 data-highlighted:before:z-[-1] data-highlighted:before:rounded-sm data-highlighted:before:bg-muted-faded-foreground/30"
                      }
                      href={"/me/posts"}
                      title="Your Posts"
                    >
                      Your Posts
                    </Link>
                  }
                />
                <Menu.Separator
                  className="mx-4 my-1.5"
                  style={{
                    backgroundImage:
                      "linear-gradient(to right, oklch(from var(--faded-fg) l c h/ 0.1) 0%, oklch(from var(--faded-fg) l c h/ .25) 50%, oklch(from var(--faded-fg) l c h/ 0.1) 100%)",
                    height: "1px"
                  }}
                />
                <Menu.Item
                  nativeButton={true}
                  render={
                    <Button
                      className={
                        "flex h-full w-full py-[8px] pr-[32px] pl-[16px] text-sm leading-[16px] text-rouge-700/90! transition-colors duration-200 ease-out-power2 outline-none select-none before:transition-colors before:duration-200 before:ease-out-power2 hover:text-faded-background data-highlighted:relative data-highlighted:z-0 data-highlighted:text-rouge-500! data-highlighted:before:absolute data-highlighted:before:inset-x-[4px] data-highlighted:before:inset-y-0 data-highlighted:before:z-[-1] data-highlighted:before:rounded-sm data-highlighted:before:bg-rouge-500/15 dark:data-highlighted:text-rouge-200! dark:data-highlighted:before:bg-rouge-400/20"
                      }
                      onClick={async (e) => {
                        e.preventDefault();
                        await fetch("/api/users/logout", {
                          method: "POST",
                          headers: {
                            "content-type": "application/json"
                          }
                        });
                        location.reload();
                      }}
                      title="Logout"
                    >
                      Sign Out
                    </Button>
                  }
                />
              </div>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </m.div>
  );
}
