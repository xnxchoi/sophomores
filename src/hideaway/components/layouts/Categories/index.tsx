"use client";
import { Link } from "@/hideaway/components/core/Link/Link";
import { FrontImage } from "@/hideaway/components/core/Media/FrontImage";
import { RP_BadgeTag } from "@/hideaway/components/UX/RP_BadgeTag";
import { cn } from "@/lib/utils";
import { PostOverview } from "@/types/collections/posts";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { ComponentProps, useState } from "react";

export type SectionHeroProps = {
  posts: PostOverview[];
};
export const SectionHero = ({ posts }: SectionHeroProps) => {
  const postList = posts.slice(0, 3);
  return (
    <div className="relative h-full w-full">
      <div className="relative flex flex-col items-center justify-center py-[1.6rem]">
        <div className="mx-[10px] w-[calc(100%-20px)] max-w-[1440px] rounded-[10px]">
          <div className="grid gap-y-[3rem] lg:grid-cols-[repeat(6,1fr)] lg:gap-x-[2rem] lg:gap-y-[2.4rem]">
            {postList.map((post, index) => {
              switch (index) {
                case 0:
                  return <HeroTop key={post.slug} post={post} />;
                case 1:
                  return <HeroFeature key={post.slug} post={post} />;
                case 2:
                  return (
                    <HeroSub
                      className={
                        "lg:col-[1/3]! lg:border-r-[1px] lg:pr-[2rem]! lg:pl-0!"
                      }
                      key={post.slug}
                      post={post}
                    />
                  );
                case 3:
                  return (
                    <HeroSub
                      className={"lg:col-[3/5]! lg:-ml-[2rem] lg:px-[2rem]!"}
                      key={post.slug}
                      post={post}
                    />
                  );
              }
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
const HeroTop = ({
  post,
  className,
  ...rest
}: { post: PostOverview } & ComponentProps<"div">) => {
  const { title, slug, subtitle, image, author, category } = post;
  return (
    <div
      className={
        "col-[1] grid items-center gap-y-[1rem] rounded-2xl bg-background p-[1rem] text-center text-foreground lg:col-[1/5] lg:row-[1/3] lg:mb-0 lg:grid-cols-[1fr_1fr] lg:gap-x-[1rem]"
      }
    >
      <Link
        className="absolute top-0 left-0 z-0 h-full w-full"
        href={`/essays/${slug}`}
      ></Link>
      <HeroTopMedia image={image} />
      <HeroTopTag tag={category.title} />
      <HeroTopTitle title={title} />
      <HeroTopMeta author={author} />
      <HeroTopSubtitle subtitle={subtitle} />
    </div>
  );
};
const HeroTopTag = ({ tag }: { tag: string }) => {
  return (
    <div className="text-sans order-2 col-[2/-1] text-[1rem] uppercase">
      <RP_BadgeTag content={tag} />
    </div>
  );
};
const RP_Image = (
  post: { image: PostOverview["image"] } & ComponentProps<"div">
) => {
  const { image, className } = post;
  const [isLoading, setIsLoading] = useState(true);
  return (
    <div
      className={cn("w-full self-start rounded-[.5rem] pt-[100%]", className)}
      data-loading={isLoading}
    >
      <AnimatePresence mode={"sync"} initial={false}>
        {isLoading && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{
              opacity: 0.2,
              transition: {
                type: "tween",
                duration: 0.2,
                ease: "easeIn"
              }
            }}
            exit={{
              opacity: 0,
              transition: {
                type: "tween",
                duration: 0.2,
                ease: "easeOut"
              }
            }}
            className="absolute top-[50%] left-[50%] block h-[3.2rem] w-[3.2rem] origin-[0_0] transform-[translate(-50%,-50%)] animate-spinner bg-foreground clip-sun"
          ></m.div>
        )}
      </AnimatePresence>
      <FrontImage
        imgClassName={"absolute top-0 left-0"}
        resource={image}
        onLoad={() => setIsLoading(false)}
      />
    </div>
  );
};
const HeroTopMedia = ({ image }: { image: PostOverview["image"] }) => {
  return (
    <RP_Image
      image={image}
      className={"relative col-1 row-[1/4] min-h-px min-w-px lg:row-[1/5]"}
    />
  );
};
const HeroTopTitle = ({ title }: { title: PostOverview["title"] }) => {
  return (
    <p
      className={
        "order-3 col-[2/-1] m-0 font-sans text-[3.2rem] leading-[.9] font-bold tracking-[-0.02em] uppercase lg:text-[3.5rem]"
      }
    >
      {title}
    </p>
  );
};
const HeroTopSubtitle = ({
  subtitle
}: {
  subtitle: PostOverview["subtitle"];
}) => {
  return (
    <p className={"order-4 m-0 block text-[1.2rem] leading-[1.2] lg:col-[2]"}>
      {subtitle}
    </p>
  );
};
const HeroTopMeta = ({ author }: { author: PostOverview["author"] }) => {
  return (
    <div
      className={
        "order-5 inline-block font-sans text-[1rem] font-medium uppercase opacity-100 before:m-[0_auto_10px] before:block before:h-[12px] before:w-[12px] before:bg-foreground before:clip-sun lg:col-[2]"
      }
    >
      By {author.name}
    </div>
  );
};
const HeroSub = ({
  className,
  post,
  ...rest
}: { post: PostOverview } & ComponentProps<"div">) => {
  const { title, slug, subtitle, image, author, category } = post;
  return (
    <div
      className={cn(
        "relative grid grid-cols-[minmax(100px,1fr)_repeat(3,1fr)] grid-rows-[repeat(2,auto)_1fr] gap-x-[2rem] gap-y-[1rem] lg:border-t-[1px] lg:border-b-[1px] lg:px-0 lg:py-[2.4rem]",
        className
      )}
    >
      <Link
        className="absolute top-0 left-0 z-0 h-full w-full"
        href={`/essays/${slug}`}
      ></Link>
      <SubMedia image={post.image} />
      <SubTag tag={category.title} />
      <SubTitle title={title} />
    </div>
  );
};
const SubMedia = ({ image }: { image: PostOverview["image"] }) => {
  return <RP_Image className={"col-[1] row-[1/4] rounded-2xl"} image={image} />;
};
const SubTag = ({ tag }: { tag: string }) => {
  return (
    <div className={"text-sans order-2 col-[2/-1] text-[1rem] uppercase"}>
      <RP_BadgeTag content={tag} />
    </div>
  );
};
const SubTitle = ({ title }: { title: string }) => {
  return (
    <p
      className={
        "text-sans order-3 col-[2/-1] text-[1.5rem] leading-[1.1] font-bold uppercase"
      }
    >
      {title}
    </p>
  );
};
const HeroFeature = ({ post }: { post: PostOverview }) => {
  return (
    <div
      className={
        "relative row-[4] grid grid-cols-[2rem_1fr_2rem] grid-rows-[1fr] gap-y-[2rem] rounded-[.5rem] lg:col-[5/-1] lg:row-[1/4]"
      }
    >
      <Link
        className="absolute top-0 left-0 z-0 h-full w-full"
        href={"/public"}
      ></Link>
      <RP_Image
        image={post.image}
        className={
          'z-0 col-[1/-1] row-[1/8] min-h-px self-start overflow-hidden rounded-2xl pt-[177%] after:absolute after:inset-0 after:bg-gradient-to-b after:from-muted-background/10 after:to-muted-background after:to-[80.6%] after:mix-blend-multiply after:content-[""] lg:h-full lg:pt-0'
        }
      />
      <div
        className={
          "text-sans z-[1] order-2 col-[2] row-[3] text-[1rem] uppercase"
        }
      >
        <RP_BadgeTag content={"tag"} />
      </div>
      <p
        className={
          "text-sans z-[1] order-3 col-[2] row-[4] m-0 text-[2rem] leading-[1.1] font-bold uppercase lg:text-[3rem]"
        }
      >
        A title{" "}
      </p>
      <div className="z-[1] order-2 col-[2] row-[6] inline-block font-sans text-[1rem] font-medium uppercase">
        By Someone
      </div>
      <p className="z-[1] col-[2] row-[5] text-[1rem] leading-[1.2]">
        Subtitle{" "}
      </p>
    </div>
  );
};
