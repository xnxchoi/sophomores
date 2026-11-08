"use client";
import { Button } from "@/hideaway/components/core/Button";
import DoubleSwitch from "@/hideaway/components/ui/DoubleSwitch";
import { useIsMobile } from "@/hideaway/providers/MiddleMan";
import { ComponentProps, useEffect, useMemo, useState } from "react";
import { Starliner } from "@/hideaway/components/sections/Starliner/Starliner";
import { cn } from "@/lib/utils";
import { Link } from "@/hideaway/components/core/Link/Link";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { useRPSession } from "@/lib/auth/session/RP_SessionProvider";
import { useShallow } from "zustand/shallow";

type PriceCardProps = {
  type: "standard" | "pro" | "founder";
} & ComponentProps<"div">;
export const PriceCard = (props: PriceCardProps) => {
  const { type } = props;
  return (
    <>
      {type === "standard" && <StandardCard />}
      {type === "pro" && <ProCard />}
    </>
  );
};
export const RP_Listing = (props: PriceCardProps) => {
  const { type, children, className, ...rest } = props;
  const { isMobile } = useIsMobile();
  return (
    <AspectRatio
      ratio={
        type === "founder"
          ? isMobile
            ? 16 / 9
            : 45 / 12
          : isMobile
            ? 5 / 4
            : 1
      }
      data-card-state="default"
      className={cn(
        "price-card relative flex h-full flex-col items-center justify-center overflow-hidden rounded-xl border-1 border-faded-foreground bg-muted-faded-background/50 px-[3.75em] py-[4em]",
        className
      )}
    >
      {children}
    </AspectRatio>
  );
};
const StandardCard = () => {
  const user = useRPSession(useShallow((r) => r.id as null | string));
  const userRole = useRPSession(useShallow((r) => r.role));
  const [caption, setCaption] = useState(" Register as Guest");
  const [enabled, setEnabled] = useState(true);
  useEffect(() => {
    if (user) {
      switch (userRole) {
        case "admin":
        case "editor":
        case "author":
        case "patron":
          setCaption("You're More Than a Guest!");
          setEnabled(false);
          break;
        default:
          setCaption(" Register as Guest");
          setEnabled(true);
          break;
      }
    }
  }, [user, userRole]);
  return (
    <div className="w-full px-0 sm:px-[.5em] md:w-1/2">
      <RP_Listing type={"standard"}>
        <div data-price-overlay="main" className="price-card-content">
          <div className="price-card-top">
            <div className="flex flex-row items-center justify-center">
              <h3 className="h-price">FREE</h3>
            </div>
            <div className="flex flex-row items-center justify-center">
              <div className="divider is--dark opacity-25"></div>
              <div className="price-eyebrow-wrap">
                <div className="eyebrow">Guest Of Hideaway.</div>
              </div>
              <div className="divider is--dark opacity-25"></div>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center gap-[.5em]">
            <div className="tag-dark">
              <div className="p-reg">FREE. FOREVER.</div>
            </div>
            <div className="eyebrow opacity-50">Read Stories, Write Yours.</div>
          </div>
          <Link
            data-themed={"background-color, color"}
            aria-label="Become a guest member"
            href="/plans/guest"
            disabled={!enabled}
            className="absolute right-[2.5em] bottom-[2.5em] left-[2.5em] rounded-lg border-2 border-solid border-muted-faded-background px-[1.5em] py-[1em] text-center text-base transition-colors duration-200 ease-in-out hover:bg-muted-faded-background hover:text-accent"
          >
            {caption}
          </Link>
        </div>
        <div data-price-overlay="overlay" className="price-card__overlay"></div>
      </RP_Listing>
    </div>
  );
};
const ProCard = () => {
  const [selected, setSelected] = useState(false);
  const handleOnChange = useMemo(
    () => () => {
      setSelected((v) => !v);
    },
    [setSelected]
  );

  return (
    <div className="w-full px-0 sm:px-[.5em] md:w-1/2">
      <RP_Listing type={"pro"} className="price-card-pro">
        <div data-price-overlay="trigger" className="price-card-tag">
          <Button className="price-card-tag__inner">
            <div className="eyebrow">explore benefits</div>
            <div className="eyebrow circle">?</div>
          </Button>
          <div className="price-overlay__close">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="100%"
              viewBox="0 0 15 14"
              fill="none"
              className="close-icon"
            >
              <path
                d="M7.02441 0.2C7.02441 0.0895426 7.11396 0 7.22441 0H8.57441C8.68487 0 8.77441 0.0895431 8.77441 0.2V13.8C8.77441 13.9105 8.68487 14 8.57441 14H7.22441C7.11396 14 7.02441 13.9105 7.02441 13.8V0.2Z"
                fill="currentColor"
              ></path>
              <path
                d="M14.6994 6.125C14.8099 6.125 14.8994 6.21454 14.8994 6.325V7.675C14.8994 7.78546 14.8099 7.875 14.6994 7.875L1.09941 7.875C0.988957 7.875 0.899414 7.78546 0.899414 7.675L0.899414 6.325C0.899414 6.21454 0.988957 6.125 1.09941 6.125L14.6994 6.125Z"
                fill="currentColor"
              ></path>
              <path
                d="M8.77441 4.375V6.125H10.5244C9.55798 6.125 8.77441 5.34143 8.77441 4.375Z"
                fill="currentColor"
              ></path>
              <path
                d="M8.77441 9.625V7.875H10.5244C9.55798 7.875 8.77441 8.65857 8.77441 9.625Z"
                fill="currentColor"
              ></path>
              <path
                d="M7.02441 4.375V6.125H5.27441C6.24084 6.125 7.02441 5.34143 7.02441 4.375Z"
                fill="currentColor"
              ></path>
              <path
                d="M7.02441 9.625V7.875H5.27441C6.24084 7.875 7.02441 8.65857 7.02441 9.625Z"
                fill="currentColor"
              ></path>
            </svg>
          </div>
        </div>
        <div className="price-card-content">
          <div className="price-card-top">
            <div className="flex flex-row items-center justify-center">
              <div className="price-nr__wrap">
                <h3 data-price="h" className="h-price">
                  ₩25-.{" "}
                </h3>
                <h3 data-price="h" className="h-price">
                  ₩45-.{" "}
                </h3>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="100%"
                  viewBox="0 0 22 46"
                  fill="none"
                  className="price-slash"
                >
                  <path
                    d="M0.919922 46.0002L19.6079 0.240234H21.6559L3.03192 46.0002H0.919922Z"
                    fill="currentColor"
                  ></path>
                </svg>
                <div className="h-price">mo</div>
              </div>
            </div>
            <div className="flex flex-row items-center justify-center">
              <div className="divider opacity-25"></div>
              <div className="price-eyebrow-wrap">
                <div
                  data-alt-text="₩31,200 billed annually"
                  data-price="sub"
                  className="eyebrow"
                >
                  ₩7,800 billed quarterly
                </div>
              </div>
              <div className="divider opacity-25"></div>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center gap-[.5em]">
            <DoubleSwitch
              left={{ value: "regular", label: "Resident", name: "reg" }}
              right={{ value: "pro", label: "Pro", name: "pro" }}
              default={false}
              onChange={handleOnChange}
            />
            <div
              data-alt-text="you're saving €60 a year"
              data-price="note"
              className="eyebrow opacity-50"
            >
              save 20% on an annual plan
            </div>
          </div>
          <p className="p-reg opacity-70">
            All benefits of the Regular Plan, plus priority access to future
            content.{" "}
          </p>
          <p className="p-reg">
            <span className="opacity-80">
              As a bonus for becoming a Lifetime&nbsp;User, we will send you a
              copy of this very website—including animations.
            </span>
            <span data-price-overlay="trigger" className="eyebrow circle dark">
              ?
            </span>
          </p>
        </div>
        <div className="price-card-button">
          <Link
            aria-label="become a Pro member"
            data-subscription-button=""
            data-plausible="Subscription Button"
            href="/plans/subscription"
            className="button w-inline-block"
          ></Link>
        </div>
      </RP_Listing>
    </div>
  );
};
export const FounderCard = () => {
  const pool = 20;
  const spots = 20;
  const [available, setAvailable] = useState(true);
  useEffect(() => {
    setAvailable(pool - spots > 0);
  }, [pool, spots]);
  return (
    <RP_Listing type={"founder"} className={"sold-out founders-card"}>
      <Starliner />
      <div className="price-card-content sold-out">
        <div className="price-card-top">
          <div className="relative flex flex-row items-center justify-center">
            <h3 className={cn("h-price", { "striped-out": !available })}>
              ₩250,000{" "}
            </h3>
            {!available && <div className="h-price-stripe"></div>}
          </div>
          <div className="flex flex-row items-center justify-center">
            <div className="divider opacity-25"></div>
            <div className="price-eyebrow-wrap">
              <div className="eyebrow">FOUNDER OF HIDEAWAY</div>
            </div>
            <div className="divider opacity-25"></div>
          </div>
        </div>
        <div className="gap--small flex flex-col items-center justify-center">
          <div className="tag-dark sold-out">
            <div className="p-reg sold-out">
              {pool - spots}/{pool} spot{pool - spots > 1 ? "s" : null} left
            </div>
          </div>
          <div className="eyebrow opacity-50">LImited to {pool} people</div>
        </div>
      </div>
    </RP_Listing>
  );
};
