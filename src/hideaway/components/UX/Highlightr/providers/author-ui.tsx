"use client";
import { PillButton } from "@/hideaway/components/core/Button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HA_Button as UIBtn } from "@/components/ui/button";
import { HA_Card as Card, HA_CardContent as CardContent } from "@/components/ui/card";
import { HA_DialogRoot as DialogRoot, HA_DialogContent as DialogContent, HA_DialogHeader as DialogHeader, HA_DialogTitle as DialogTitle, HA_DialogTrigger as DialogTrigger } from "@/components/ui/dialog";
import { HA_GradientSeparator as GradientSeparator } from "@/components/ui/separator";
import { Link } from "@/hideaway/components/core/Link/Link";
import type { AuthorOverview } from "@/types/collections/users";
import { ProviderButton } from "@/hideaway/components/auth";
import { AUTH_PROVIDERS } from "@/lib/auth/providers";
import { cn } from "@/lib/utils";
import { delay, isHangul } from "@/hideaway/utilities/rp_utils";
import { useTranslations } from "next-intl";
import { useTransitionRouter } from "next-transition-router";
import {
  ComponentPropsWithoutRef,
  MouseEventHandler,
  useCallback,
  useEffect,
  useState
} from "react";

export const isValidAuthor = (user: AuthorOverview) =>
  user.id !== "0" && !!user.slug;

export const UserBar = ({ user }: { user: AuthorOverview }) => {
  const linked = isValidAuthor(user);
  const avatar = (
    <div className={"relative block"}>
      <Avatar>
        {(user.image && (
          <AvatarImage height={32} width={32} src={user.image} />
        )) || (
          <AvatarFallback className={"uppercase"}>
            {user.name.at(0)}
            {!isHangul(user.name) && user.name.at(1)}
          </AvatarFallback>
        )}
      </Avatar>
    </div>
  );
  return (
    <div className={"flex justify-between"}>
      <div className={"flex items-center"}>
        <div>
          <div className={"inline-block"}>
            <div className={"outline-none"} tabIndex={-1}>
              {linked ? <Link href={`/@${user.slug}`}>{avatar}</Link> : avatar}
            </div>
          </div>
        </div>
        <div className={"block pl-[12px]"}>
          <div className={"flex items-center"}>
            <div className={"inline-block"}>
              <div className={"outline-none"} tabIndex={-1}>
                {linked ? (
                  <Link href={`/@${user.slug}`}>
                    <p className={"break-all"}>{user.name}</p>
                  </Link>
                ) : (
                  <p className={"break-all"}>{user.name}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const SignInCard = (
  props: ComponentPropsWithoutRef<"div"> & {
    onSignInClick: MouseEventHandler<HTMLButtonElement>;
  }
) => {
  const { onSignInClick, ...rest } = props;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const t = useTranslations("UI.SignIn");
  useEffect(() => {
    const handlePageHide = () => {
      setIsSubmitting(false);
    };
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      setIsSubmitting(false);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, []);
  const router = useTransitionRouter();
  const onClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    (e) => {
      e.preventDefault();
      if ((e.target as HTMLButtonElement).disabled) return;
      setIsSubmitting(true);
      delay(50).then(async () => {
        await delay(50).then(() => {
          router.push("/sign-in");
        });
        onSignInClick(e);
      });
    },
    [onSignInClick, router]
  );
  const highlightProviders = AUTH_PROVIDERS.filter(
    (provider) => provider.id === "google"
  );
  const lyt = highlightProviders.length > 2 ? "horizontal" : "vertical";

  return (
    <div className={cn("flex flex-col gap-9")}>
      <Card className="bg-faded-background/50">
        <CardContent className={cn("grid gap-9")}>
          <div className="grid gap-4">
            <div
              className={cn(
                "flex w-full items-center justify-between gap-4",
                lyt === "horizontal" ? "flex-wrap" : "flex-col"
              )}
            >
              {highlightProviders.map((provider) => (
                <ProviderButton
                  key={provider.id}
                  isSubmitting={isSubmitting}
                  provider={provider}
                  setIsSubmitting={setIsSubmitting}
                  socialLayout={lyt}
                />
              ))}
            </div>
            <GradientSeparator caption={t("separator")} />
            <UIBtn
              variant="outline"
              onClick={onClick}
              className="*:ease text-md ease border-faded-foreground/&.65)] inline-flex h-14 min-h-[35px] w-full items-center justify-center gap-[8px] rounded-md border bg-off-background/30 px-4 py-3 font-medium whitespace-nowrap text-foreground shadow-sm transition-colors duration-300 *:transition-colors *:duration-300 hover:bg-faded-background/65 hover:*:text-off-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-6 [&_svg]:shrink-0"
              disabled={isSubmitting}
            >
              <span className="">{t("providers")}</span>
            </UIBtn>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const SignInTriggerButton = () => {
  const [isOpen, setOpen] = useState(false);
  const t = useTranslations("UI.SignIn");
  return (
    <DialogRoot open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <PillButton
            className={"h-full w-full px-[12px] py-[8px]"}
            onClick={() => setOpen(true)}
          >
            <span className={"text-base text-muted-foreground"}>
              {t("providers")}
            </span>
          </PillButton>
        }
      />
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Check In</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <SignInCard onSignInClick={() => setOpen(false)} />
        </div>
      </DialogContent>
    </DialogRoot>
  );
};
