"use client";
import { Link } from "@/hideaway/components/core/Link/Link";
import { cn } from "@/lib/utils";
import { TagOverview } from "@/types/collections/meta-collections";
import { MakeRequired, RequireByKeys } from "@/hideaway/utilities/typeUtilities";
import { ComponentProps } from "react";

export const TagButton = ({
  tag: tagg,
  className,

  rel,

  selected = false,
  ...props
}: Omit<ComponentProps<typeof Link>, "href"> & {
  selected?: boolean;
  tag: RequireByKeys<TagOverview, "title" | "slug">;
}) => {
  return (
    <Link
      className={cn(
        "relative mr-3.5 flex items-center rounded-[100px] border-[1px] border-solid border-transparent bg-faded-foreground/10 transition-colors ease-out-power2 hover:border-faded-foreground hover:bg-transparent data-[current=true]:border-faded-foreground data-[current=true]:bg-transparent",
        className
      )}
      {...props}
      href={`/tagged/${tagg.slug}`}
      rel={rel || "noopener follow"}
      disabled={false}
      data-current={selected}
      data-active={selected}
    >
      <div className="px-6.5 py-2 text-sm leading-[20px] whitespace-nowrap">
        {tagg.title}
      </div>
    </Link>
  );
};
