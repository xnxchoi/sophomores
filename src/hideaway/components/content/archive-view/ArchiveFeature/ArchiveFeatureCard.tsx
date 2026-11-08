import { CoverCard } from "@/blocks/heros/ArtHero/components";
import { Link } from "@/hideaway/components/core/Link/Link";
import { FrontImage } from "@/hideaway/components/core/Media/FrontImage";
import { AspectRatio } from "@/hideaway/components/core/Media/types";
import { RP_BadgeTag } from "@/hideaway/components/UX/RP_BadgeTag";
import { cn } from "@/lib/utils";
import { RalueAsDataWithRelation } from "@/types/collections/image-collections";
import {
  CollectionOverviewMap,
  OverviewSlugs
} from "@/types/collections/index";
import { TagOverview } from "@/types/collections/meta-collections";
import { AuthorOverview } from "@/types/collections/users";
import type { ComponentProps, ReactNode } from "react";

export type OverviewItem<T extends OverviewSlugs = OverviewSlugs> = {
  [x in OverviewSlugs]: {
    relationTo: x;
    value: CollectionOverviewMap[x];
  };
}[T];
type LayoutDirection = "left" | "right";
export type OverviewAgnosticItem = {
  id: string;
  authority?: number;
  allowList?: string[];
  title: string;
  subtitle?: string | null;
  url: string;
  image?: RalueAsDataWithRelation | null;
  locked?: boolean;
  publishedAt?: string | null;
  author?: string;
  updatedAt?: string | null;
  bookmarks?: string[];
  bookmarksCount?: number;
  category: string;
  tagged: TagOverview[];
};

export function ArchiveFeatureCard(props: {
  contents: OverviewAgnosticItem[];
  type?: LayoutDirection;
}) {
  const { contents, type = "left" } = props;
  let first, second, third, fourth;
  if (contents.length > 0) {
    first = contents[0];
  }
  if (contents.length > 1) {
    second = contents[1];
  }
  if (contents.length > 2) {
    third = contents[2];
  }
  if (contents.length > 3) {
    fourth = contents[3];
  }
  return (
    <OuterWrap>
      {first && <FocusHero direction={type} {...first} />}
      {second && <SideHero direction={type} {...second} />}
      {third && fourth && <SplitBar type={type} items={[third, fourth]} />}
    </OuterWrap>
  );
}

function OuterWrap({ children }: { children: ReactNode }) {
  return (
    <div className={"h-full p-0"}>
      <div className={"relative h-full w-full"}>
        <div
          className={
            "relative z-[150] flex w-[calc(100%-4rem)] max-w-576 flex-col items-center justify-center px-0 py-[1rem]"
          }
        >
          <CoverCard>
            <div
              className={
                "grid gap-y-24 lg:grid-cols-[repeat(6,1fr)] lg:gap-x-8 lg:gap-y-[2.4rem]"
              }
            >
              {children}
            </div>
          </CoverCard>
        </div>
      </div>
    </div>
  );
}

function FocusHero({
  title,
  author,
  category,
  image,
  url,
  subtitle: subt,
  direction = "left"
}: OverviewAgnosticItem & {
  direction?: LayoutDirection;
}) {
  // const {value, relationTo} = item;
  // const {
  // 	title,
  // 	author,
  // 	category,
  // 	slug,
  // } = value;
  return (
    <div
      className={cn(
        "relative col-1 grid items-center gap-y-8 rounded-2xl p-8 text-center lg:mb-0 lg:grid-cols-[1fr_1fr] lg:gap-x-[2rem]",
        "bg-[var(--accent-gradient,oklch(from_var(--foreground)_l_c_h/.05))]",
        direction === "left"
          ? "lg:col-[1/5] lg:row-[1/3]"
          : "lg:col-[3/-1] lg:row-[1/3]"
      )}
    >
      <Link className={"absolute inset-0 z-0 h-full w-full"} href={url} />
      <div
        className={
          "relative col-[1] min-h-px w-full min-w-px self-start overflow-hidden rounded-2xl pt-[100%] lg:row-[1/5]"
        }
      >
        {image ? (
          <FrontImage
            pictureClassName="absolute inset-0"
            imgClassName="rounded-[5px] absolute object-cover top-0 block w-auto h-auto max-w-[100%] border-0 transition-opacity duration-400 backface-hidden"
            resource={image}
          />
        ) : (
          <CoverPlaceholder />
        )}
      </div>
      {category && (
        <RP_BadgeTag
          wrapperClassName={
            "order-2 col-[2/-1] *:text-foreground! *:border-foreground!"
          }
          content={category}
        />
      )}
      <p
        className={
          "order-3 col-[2/-1] m-0 text-3xl leading-[.9] font-light tracking-[-.01em] uppercase lg:text-[4.2rem]"
        }
      >
        {title}
      </p>
      <div
        className={
          "order-5 col-[2] inline-block font-sans text-[1.12rem] uppercase"
        }
      >
        {author && (
          <>
            <div
              className={
                "mx-auto mt-0 mb-[2rem] block h-[1.28rem] w-[1.28rem] bg-current clip-sun"
              }
            />
            {"By " + author}
          </>
        )}
      </div>
      <p
        className={
          "order-4 m-0 block leading-[1.2] lg:col-[2] lg:text-[1.6rem]"
        }
      >
        {subt}
      </p>
    </div>
  );
}

function SunIcon({
  className,
  ...props
}: Omit<ComponentProps<"div">, "children">) {
  return (
    <div
      className={cn(
        "mx-auto mt-0 mb-[2rem] block h-[1.28rem] w-[1.28rem] bg-current clip-sun",
        className
      )}
      {...props}
    ></div>
  );
}

function Subtitle({
  subtitle,
  className,
  ...props
}: Omit<ComponentProps<"p">, "children"> & {
  subtitle: string | undefined | ReactNode;
}) {
  return (
    <p
      className={cn(
        "order-4 col-[2] row-[5] m-0 block leading-[1.2] lg:text-[1.6rem]",
        className
      )}
      {...props}
    >
      {subtitle}
    </p>
  );
}

function AuthorName({
  name,
  className,
  ...props
}: Omit<ComponentProps<"div">, "children" | "name"> &
  Pick<AuthorOverview, "name">) {
  return (
    <div
      className={cn(
        "z-10 order-2 col-[2] row-[6] inline-block font-sans text-[1.12rem] uppercase",
        className
      )}
      {...props}
    >
      <SunIcon className="block" />
      {"By " + name}
    </div>
  );
}

function Title({ className, children, ...props }: ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "m-0 text-[1.5rem] leading-[.9] font-medium tracking-[-.01em]",
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}

function HeroImage({
  className,
  image,
  aspectRatio,
  imgClassName,
  ...rest
}: Omit<ComponentProps<"div">, "children"> &
  Pick<OverviewItem<"posts">["value"], "image"> & {
    aspectRatio?: AspectRatio;
    imgClassName?: string;
  }) {
  return (
    <div className={cn("relative", className)} {...rest}>
      {image ? (
        <FrontImage
          imgClassName={cn(
            "rounded-[5px] absolute object-cover top-0 block w-full h-full max-w-full border-0 transition-opacity duration-400 backface-hidden",
            imgClassName
          )}
          resource={image}
          aspectRatio={aspectRatio}
        />
      ) : (
        <CoverPlaceholder />
      )}
    </div>
  );
}

/**
 * Typographic stand-in shown when a post has no cover image.
 * Mirrors the editorial empty-state pattern in CLAUDE.md (mono symbol over a
 * tinted panel) — never a random photo, never a colour wash.
 */
function CoverPlaceholder({ symbol = "◇" }: { symbol?: string }) {
  return (
    <div
      aria-hidden
      className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-[5px] bg-foreground/[0.04]"
    >
      <span className="font-sans text-[clamp(56px,9vw,128px)] font-light text-foreground/[0.08] select-none">
        {symbol}
      </span>
    </div>
  );
}

function SideHero({
  title,
  author,
  category,
  image,
  url,
  subtitle,
  direction = "left"
}: OverviewAgnosticItem & {
  direction?: LayoutDirection;
}) {
  // const {relationTo, value} = item;
  // const {
  // 	title,
  //
  // 	author,
  //
  // 	category,
  // 	slug,
  // } = item.value;
  return (
    <div
      className={cn(
        "relative grid grid-cols-[2rem_1fr_2rem] grid-rows-[1fr] gap-y-[2rem] overflow-hidden rounded-2xl bg-faded-foreground/20 text-faded-background",
        direction === "left"
          ? "lg:col-[5/-1] lg:row-[1/4]"
          : "lg:col-[1/3] lg:row-[1/4]"
      )}
    >
      <ItemLink url={url} />
      <HeroImage
        className="z-1 col-span-full row-[1/2] self-start rounded-2xl lg:row-[1/8] lg:h-full"
        image={image}
        aspectRatio={{
          base: 4 / 5,
          lg: 100 / 177
        }}
      />
      <div
        className={
          "absolute inset-0 z-[5] h-full w-full bg-linear-180 from-transparent via-faded-background/5 via-65% to-faded-background/90"
        }
      />
      {category && (
        <RP_BadgeTag
          wrapperClassName={"order-2 col-2 row-3 z-10"}
          content={category}
        />
      )}
      <Title className="z-10 order-3 col-2 row-4 text-faded-foreground! uppercase lg:text-h1">
        {title}
      </Title>
      {author && (
        <AuthorName name={author} className="text-faded-foreground!" />
      )}
      <Subtitle
        className="text-faded-foreground!"
        subtitle={subtitle || undefined}
      />
    </div>
  );
}

/**
 * {slug, collection}:
 *                   {
 * 	                  slug: string;
 * 	                  collection: "posts" | "delta"
 *                   }
 */
function ItemLink({ url }: { url: string }) {
  return (
    <Link
      className={"absolute inset-0 z-0 h-full w-full"}
      // href={`/${collection === "posts" ? "essays" : "delta"}/${slug}`}
      href={url}
    />
  );
}

function SplitBar({
  items,
  type = "left"
}: {
  items: [OverviewAgnosticItem, OverviewAgnosticItem];
  type?: LayoutDirection;
}) {
  const [item1, item2] = items;
  const {
    title: title1,

    category: category1,
    url: slug1
  } = item1;
  const {
    title: title2,

    category: category2,
    url: slug2
  } = item2;
  return (
    <>
      <div
        className={cn(
          "lg:border-b-solid lg:border-t-solid lg:border-r-solid relative grid grid-cols-[minmax(100px,1fr)_repeat(3,1fr)] grid-rows-[repeat(2,auto)_1fr] gap-x-[2rem] border-0 border-faded-foreground lg:border-t-[1px] lg:border-r-[1px] lg:border-b-[1px] lg:p-[2.4rem_2rem_2.4rem_0] lg:px-0 lg:py-[2.4rem]",
          type === "left"
            ? "gap-y-[1rem] lg:col-[1/3]"
            : "gap-y-[2rem] lg:col-[3/5]"
        )}
      >
        <ItemLink url={slug1} />
        <HeroImage
          className="col-[1] row-[1/4] min-h-[1px] w-full min-w-[1px] self-start rounded-[5px] pt-[100%] lg:aspect-square"
          image={"image" in item1 ? item1.image : null}
        />

        {category1 && (
          <RP_BadgeTag
            wrapperClassName={
              "order-2 col-[2/-1] [&_>*]:!text-foreground [&_>*]:!border-foreground"
            }
            content={category1}
          />
        )}
        <Title className="order-3 col-[2/-1] text-[16px] lg:text-h4">
          {title1}
        </Title>
      </div>
      <div
        className={cn(
          "lg:border-b-solid lg:border-t-solid relative grid grid-cols-[minmax(100px,1fr)_repeat(3,1fr)] grid-rows-[repeat(2,auto)_1fr] gap-x-8 border-0 border-faded-foreground lg:-ml-8 lg:border-t lg:border-b lg:px-8 lg:py-[2.4rem]",
          type === "left" ? "gap-y-4 lg:col-[3/5]" : "gap-y-8 lg:col-[5/-1]"
        )}
      >
        <ItemLink url={slug2} />
        <HeroImage
          image={"image" in item2 ? item2.image : null}
          aspectRatio={1}
          className="col-1 row-[1/4] min-h-px w-full min-w-px self-start rounded-[5px]"
        />
        {category2 && (
          <RP_BadgeTag
            wrapperClassName={
              "order-2 col-[2/-1] [&_>*]:!text-foreground [&_>*]:!border-foreground"
            }
            content={category2}
          />
        )}
        <Title className="order-3 col-[2/-1] text-[16px] lg:text-[18px]">
          {title2}
        </Title>
      </div>
    </>
  );
}
