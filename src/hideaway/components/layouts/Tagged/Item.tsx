"use client";
import { OverviewAgnosticItem } from "../../content/archive-view/ArchiveFeature/ArchiveFeatureCard";
import { Link } from "@/hideaway/components/core/Link/Link";
import { FrontImage } from "@/hideaway/components/core/Media/FrontImage";
import { RP_BadgeTag } from "@/hideaway/components/UX/RP_BadgeTag";
import { cn } from "@/lib/utils";
import { PostOverview } from "@/types/collections/posts";
import { DateTime } from "luxon";
import { useLocale } from "next-intl";
import { ComponentProps, useState } from "react";

export const ArchiveWrapper = ({ children }: { children: React.ReactNode }) => {
  return <div className={"mx-auto max-w-[1440px] px-6.5"}>{children}</div>;
};

type ListArticleProps = PostOverview;
export const ArticleArchiveItem = (props: OverviewAgnosticItem) => {
  const {
    title,
    author,
    publishedAt,
    subtitle,
    image: image,
    url,
    category
  } = props;
  const [isLoading, setIsLoading] = useState(true);
  const locale = useLocale();

  return (
    <div
      className={
        "relative mb-[40px] grid grid-cols-[1fr_1fr] grid-rows-4 gap-x-[20px] border-b-[1px] pb-[40px] text-foreground after:absolute after:bottom-0 after:col-[6/-1] after:h-px after:w-full after:bg-nav-foreground after:content-[''] lg:mb-25 lg:grid-cols-[repeat(12,1fr)] lg:grid-rows-[repeat(4,auto)_1fr_auto] lg:items-start lg:border-b-0 lg:pb-0"
      }
    >
      <Link className={"absolute inset-0 z-3 h-full w-full"} href={url} />
      <div
        //pt-[75.2747%] md:pt-[75.1131%]
        className={cn(
          'relative col-[1] row-[1/6] aspect-[3/2] min-h-px min-w-px overflow-hidden rounded-[10px] bg-muted-background after:absolute after:top-[50%] after:left-[50%] after:block after:h-[3.2rem] after:w-[3.2rem] after:origin-[0_0] after:transform-[translate(-50%,-50%)] after:animate-spinner after:bg-foreground after:opacity-0 after:content-[""] after:clip-sun data-[loading=true]:after:opacity-20 lg:col-[3/6] lg:row-[1/7]'
        )}
        data-loading={isLoading}
      >
        <FrontImage resource={image} onLoad={() => setIsLoading(false)} />
      </div>
      <div className="order-2 col-[2] row-[2] font-[10px] uppercase lg:col-[1/3] lg:mb-[16px]">
        <RP_BadgeTag content={category} />
      </div>
      {publishedAt && (
        <time
          dateTime={publishedAt}
          className="col-[2] row-[5] mt-[6px] opacity-90 lg:col-[1/3] lg:row-[4]"
        >
          {DateTime.fromISO(publishedAt)
            .setLocale(locale)
            .toLocaleString(DateTime.DATE_HUGE)}
        </time>
      )}
      <p
        className={
          "col-[2] row-[3] m-0 mx-0 my-[10px] mt-0 mb-[21.6px] text-[16px] leading-[1.1] font-bold -tracking-[.01em] md:text-[25.6px] lg:col-[6/-2] lg:row-[1/6] lg:text-[36.8px]"
        }
      >
        {title}
      </p>
      <div className="hidden md:col-[6/-2] md:row-[6] md:mb-[20px] md:flex md:flex-col md:justify-end md:p-[10px]">
        <div className="h-full font-serif text-[20px] leading-[1.2] text-pretty">
          {subtitle}
        </div>
      </div>
      <div
        className={
          "order-2 col-[2] row-[4] inline-block font-sans text-[11.2px] uppercase opacity-90 lg:col-[1/3] lg:row-[3]"
        }
      >
        {author}
      </div>
    </div>
  );
};
export const CatTitle = ({
  className,
  children,
  title,
  ...props
}: ComponentProps<"h1"> & {
  title?: string;
}) => {
  return (
    <h1
      className={cn(
        "relative mt-[32px] mb-[16px]! w-[calc(100%-80px)] max-w-[calc(100%-80px)] border-b-[1px] border-foreground py-[20px] font-sans text-[62px] leading-[1.2] font-black -tracking-[.045em] capitalize",
        className
      )}
    >
      <span>{children}</span>
    </h1>
  );
};
export const TagTitle = (props: { title: string }) => {
  const { title } = props;
  return (
    <h1
      className={
        'font-400 relative mt-[32px]! mb-[16px]! w-[calc(100%-80px)] max-w-[calc(100%-80px)] border-b-[1px] border-foreground py-[20px] font-serif text-[62px] leading-[1.2] capitalize before:content-["("] after:content-[")"]'
      }
    >
      <span>{title}</span>
    </h1>
  );
};
