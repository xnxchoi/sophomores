"use client";

import type { ComponentProps, CSSProperties, ReactNode } from "react";
import type { OverviewAgnosticItem } from "./ArchiveFeatureCard";
import { FrontImage } from "@/components/core/Media/FrontImage";
import { Link } from "@/components/core/Link/Link";
import { RP_BadgeTag } from "@/components/UX/RP_BadgeTag";

export function ThreeFeatureCard({
  contents
}: {
  contents: [OverviewAgnosticItem, OverviewAgnosticItem, OverviewAgnosticItem];
}) {
  return (
    <OuterWrap>
      <FirstCard item={contents[0]} />
      <SecondCard item={contents[1]} />
      <ThirdCard item={contents[2]} />
    </OuterWrap>
  );
}
function FirstCard({ item }: { item: OverviewAgnosticItem }) {
  return (
    <div
      className={
        "relative col-span-full row-1 flex flex-col gap-y-8 lg:col-[7/-1]"
      }
    >
      <Link
        className={"absolute inset-0 z-0 h-full w-full"}
        // href={`/${item.relationTo === "posts" ? "essays" : "surf"}/${item.value.slug}`}
        href={item.url}
      />

      <div className={"relative order-1 min-h-px w-full min-w-px rounded-2xl"}>
        {"image" in item && item.image && (
          <FrontImage
            imgClassName="absolute object-cover top-0 block w-full h-full max-w-[100%] border-0 transition-opacity duration-400 backface-hidden"
            resource={item.image}
          />
        )}
      </div>
      <RP_BadgeTag
        wrapperClassName={
          "order-3 [&_>*]:!text-foreground [&_>*]:!border-foreground"
        }
        content={item.category}
      />
      <p className="order-4 m-0 font-sans text-[3rem] leading-[1.1] font-bold tracking-[-.01em] lg:text-[4.2rem]">
        {item.title}
      </p>

      <div className={"order-6 inline-block font-sans text-small uppercase"}>
        {(!!item.author && `By ${item.author}`) || `A Hideaway Story`}
      </div>
      <p className="order-5 m-0 block font-sans text-base leading-[1.1] font-bold tracking-[-.01em] lg:text-[1.6rem]">
        {"subtitle" in item ? item.subtitle : ""}
      </p>
    </div>
  );
}

function SecondCard({ item }: { item: OverviewAgnosticItem }) {
  return (
    <div
      className={
        "col-2 row-2 flex items-start gap-y-8 rounded-2xl p-8 lg:col-[4/7] lg:row-1"
      }
    >
      <Link className={"absolute inset-0 z-0 h-full w-full"} href={item.url} />

      <div className={"relative order-5 min-h-px w-full min-w-px rounded-2xl"}>
        {"image" in item && item.image && (
          <FrontImage
            imgClassName="absolute object-cover top-0 block w-full h-full max-w-[100%] border-0 transition-opacity duration-400 backface-hidden"
            resource={item.image}
          />
        )}
      </div>
      <RP_BadgeTag
        wrapperClassName={
          "order-2 [&_>*]:!text-foreground [&_>*]:!border-foreground"
        }
        content={item.category}
      />
      <p className="order-3 m-0 font-serif text-[3rem] leading-[1.1] font-bold tracking-[-.01em] lg:text-[4.2rem]">
        {item.title}
      </p>
      <div className={"order-4 inline-block font-sans text-[1rem] uppercase"}>
        {`By ${item.author}`}
      </div>
      <p className="order-5 m-0 block font-sans text-base leading-[1.1] font-bold tracking-[-.01em] lg:order-2 lg:text-[1.6rem]">
        {"subtitle" in item ? item.subtitle : ""}
      </p>
    </div>
  );
}
function ThirdCard({ item }: { item: OverviewAgnosticItem }) {
  return (
    <div
      className={"relative mb-[8px] flex flex-col gap-y-[2rem] lg:col-[1/4]"}
    >
      <Link className={"absolute inset-0 z-0 h-full w-full"} href={item.url} />

      <div className={"relative order-1 min-h-px w-full min-w-px rounded-2xl"}>
        {"image" in item && item.image && (
          <FrontImage
            imgClassName="absolute object-cover top-0 block w-full h-full max-w-[100%] border-0 transition-opacity duration-400 backface-hidden"
            resource={item.image}
            aspectRatio={20 / 23}
          />
        )}
      </div>
      <RP_BadgeTag
        wrapperClassName={
          "order-3 [&_>*]:!text-foreground [&_>*]:!border-foreground"
        }
        content={item.category}
      />
      <p className="order-4 m-0 font-sans text-[3rem] leading-[1.1] font-bold tracking-[-.01em] lg:text-[4.2rem]">
        {item.title}
      </p>
      <div className={"order-6 inline-block font-sans text-[1rem] uppercase"}>
        {`By ${item.author}`}
      </div>
      <p className="order-5 m-0 block font-sans text-base leading-[1.1] font-bold tracking-[-.01em] lg:order-2 lg:text-[1.6rem]">
        {"subtitle" in item ? item.subtitle : ""}
      </p>
    </div>
  );
}
function CoverCard(props: ComponentProps<"div">) {
  const { style, children, ...rest } = props;
  return (
    <div {...rest} style={{ ...style }}>
      {children}
    </div>
  );
}
function OuterWrap({ children }: { children: ReactNode }) {
  return (
    <div className={"flex flex-col items-center justify-center py-[1.6rem]"}>
      <div
        className={
          "relative z-[150] flex w-[calc(100%-4rem)] max-w-[1440px] flex-col items-center justify-center px-0 py-[1rem]"
        }
      >
        <CoverCard
          style={
            {
              "--highlight": "var(--bleu-400)"
            } as CSSProperties
          }
        >
          <div
            className={
              "grid gap-y-[6rem] lg:grid-cols-[repeat(6,1fr)] lg:gap-x-[2rem] lg:gap-y-[2.4rem]"
            }
          >
            {children}
          </div>
        </CoverCard>
      </div>
    </div>
  );
}
