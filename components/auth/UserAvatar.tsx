"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { isHangul } from "@/utilities/rp_utils";
import { UserRoundIcon } from "lucide-react";
import type { ComponentProps } from "react";

export interface UserAvatarClassNames {
  base?: string;
  image?: string;
  fallback?: string;
  fallbackIcon?: string;
  skeleton?: string;
}

type AvatarUser = {
  displayName?: string | null;
  name?: string | null;
  fullName?: string | null;
  firstName?: string | null;
  displayUsername?: string | null;
  username?: string | null;
  email?: string | null;
  image?: string | null;
  avatar?: string | null;
  avatarUrl?: string | null;
  id?: string | null;
};

export interface UserAvatarProps {
  classNames?: UserAvatarClassNames;
  isPending?: boolean;
  size?: "sm" | "default" | "lg" | "xl" | null;
  user?: AvatarUser | null;
}

export function UserAvatar({
  className,
  classNames,
  isPending,
  size,
  user,
  ...props
}: UserAvatarProps & ComponentProps<typeof Avatar>) {
  const name =
    user?.displayName ||
    user?.name ||
    user?.fullName ||
    user?.firstName ||
    user?.displayUsername ||
    user?.username ||
    user?.email;
  const src = user?.image || user?.avatar || user?.avatarUrl || undefined;

  if (isPending) {
    return (
      <Skeleton
        className={cn(
          "shrink-0 rounded-full",
          size === "sm"
            ? "size-6"
            : size === "lg"
              ? "size-10"
              : size === "xl"
                ? "size-12"
                : "size-8",
          className,
          classNames?.base,
          classNames?.skeleton
        )}
      />
    );
  }

  return (
    <Avatar
      className={cn(
        "bg-muted",
        size === "sm"
          ? "size-6"
          : size === "lg"
            ? "size-10"
            : size === "xl"
              ? "size-12"
              : "size-8",
        className,
        classNames?.base
      )}
      {...props}
    >
      <AvatarImage
        alt={name || undefined}
        className={classNames?.image}
        src={src}
      />

      <AvatarFallback
        className={cn("text-foreground uppercase", classNames?.fallback)}
        delayMs={src ? 600 : undefined}
      >
        {name ? (
          (isHangul(name) && name?.at(0)) || firstTwoCharacters(name)
        ) : (
          <UserRoundIcon
            className={cn("size-[50%]", classNames?.fallbackIcon)}
          />
        )}
      </AvatarFallback>
    </Avatar>
  );
}

const firstTwoCharacters = (name?: string | null) => name?.slice(0, 2);
