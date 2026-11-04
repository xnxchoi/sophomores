"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HA_Command as Command, HA_CommandGroup as CommandGroup, HA_CommandItem as CommandItem, HA_CommandList as CommandList, HA_CommandSeparator as CommandSeparator } from "@/components/ui/command";
import { HA_PopoverContent as PopoverContent, HA_PopoverRoot as PopoverRoot, HA_PopoverTrigger as PopoverTrigger } from "@/components/ui/popover";
import { authClient } from "@/lib/auth/client";
import { useBetterAuth } from "@/lib/auth/context";
import { User } from "@payload-types";
import { ChevronDown, PlusCircle } from "lucide-react";
import { useTransitionRouter } from "next-transition-router";
import { use, useMemo, useState } from "react";
import { Button } from "@/components/core/Button";

export default function AccountSwitcher() {
  const { currentUserPromise, deviceSessionsPromise } = useBetterAuth();
  // Combine into one Promise.all so React only sees a single suspending
  // `use()` call. Multiple sequential `use()` calls cause "Rendered more
  // hooks than during the previous render" when their backing promises
  // resolve at different times across re-renders.
  const combinedPromise = useMemo(
    () => Promise.all([currentUserPromise, deviceSessionsPromise]),
    [currentUserPromise, deviceSessionsPromise]
  );
  const [currentUserRaw, deviceSessions] = use(combinedPromise);
  const currentUser = currentUserRaw as (User & { collection: "users" }) | null;
  const [open, setOpen] = useState(false);
  const router = useTransitionRouter();

  return (
    <PopoverRoot open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        nativeButton={true}
        render={() => (
          <Button
            data-expanded={open}
            role="combobox"
            aria-expanded={open}
            aria-label="Select a user"
            className="group flex w-[250px] items-center justify-between rounded-sm border border-border/30 px-4 py-2 text-foreground transition-colors hover:border-border/60"
          >
            <div className="flex items-center gap-2.5">
              <span className="font-sans text-[10px] tracking-widest text-muted-foreground/60 uppercase">
                {open ? "Accounts" : "Current"}
              </span>
              <Avatar className="h-6 w-6">
                <AvatarImage
                  src={currentUser?.image || ""}
                  alt={currentUser?.name ?? ""}
                />
                <AvatarFallback>{currentUser?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="truncate text-sm font-light tracking-tight">
                {currentUser?.name}
              </span>
            </div>
            <div className="transition-transform duration-200 ease-out-power3 group-data-[expanded=true]:rotate-180">
              <ChevronDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
            </div>
          </Button>
        )}
      />
      <PopoverContent className="z-[150] w-[250px] rounded-sm border border-border/30 bg-button-background-inverted p-0 text-foreground shadow-md backdrop-blur-[4px]">
        <Command>
          <CommandList>
            <CommandGroup
              heading="Current Account"
              className={"[&_[cmdk-group-heading]]:text-foreground!"}
            >
              <CommandItem
                onSelect={() => {
                  setOpen(false);
                }}
                className="w-full justify-between hover:bg-accent/50"
                key={`current-account-${currentUser?.id}`}
              >
                <div className="flex items-center">
                  <Avatar className="mr-2 h-5 w-5">
                    <AvatarImage
                      src={currentUser?.image || ""}
                      alt={currentUser?.name ?? ""}
                    />
                    <AvatarFallback className="bg-foreground/10">
                      {currentUser?.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-foreground/80">
                    {currentUser?.name}
                  </span>
                </div>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator className={"bg-nav-foreground/30!"} />
            <CommandGroup
              className={"[&_[cmdk-group-heading]]:text-foreground!"}
              heading="Switch Account"
            >
              {deviceSessions &&
                deviceSessions
                  .filter((session) => session.userId !== currentUser?.id)
                  .map((userSession, index) => (
                    <CommandItem
                      key={index}
                      onSelect={async () => {
                        await authClient.multiSession.setActive({
                          sessionToken: userSession.token
                        });
                        setOpen(false);
                      }}
                      className="transition-colors duration-200 hover:bg-accent"
                    >
                      <Avatar className="mr-2 h-5 w-5">
                        <AvatarImage src={""} alt={userSession.userId} />
                        <AvatarFallback className="bg-secondary/20">
                          {userSession.userId.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex w-full flex-col">
                        <span className="">{userSession.userId}</span>
                        <span className="truncate">{userSession.userId}</span>
                      </div>
                    </CommandItem>
                  ))}
            </CommandGroup>
          </CommandList>
          <CommandSeparator className={"bg-nav-button-foreground/30!"} />
          <CommandList>
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  setOpen(false);
                  router.push("/sign-in");
                }}
                className="group transition-colors duration-200 hover:bg-accent"
              >
                <PlusCircle className="mr-2 h-5 w-5 text-foreground/70 transition-colors duration-200 group-hover:text-foreground" />
                <span className="font-sans text-[11px] tracking-widest text-foreground/70 uppercase transition-colors duration-200 group-hover:text-foreground">
                  Add Account
                </span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </PopoverRoot>
  );
}
