"use client";
import React from "react";
import type { PostOverview } from "@/types/collections/posts";
import { useClickableCardRP } from "@/utilities/useClickableCard";
import { Link } from "@/components/core/Link/Link";
import { FrontImage } from "@/components/core/Media/FrontImage";

export type CardPostData = PostOverview;
export const RPCard: React.FC<{
  alignItems?: "center";
  className?: string;
  doc?: CardPostData;
  relationTo?: "posts";
  showCategories?: boolean;
  title?: string;
}> = (props) => {
  const { card, link } = useClickableCardRP({});
  const {
    className,
    doc,
    relationTo,
    showCategories,
    title: titleFromProps
  } = props;
  const { slug, category, title, subtitle, image } = doc || {};
  const titleToUse = titleFromProps || title;
  const href = `/${relationTo}/${slug}`;

  return (
    <article className="more-link relative" ref={card.ref}>
      <div className="OO4">
        <div className="more-thumb ap2" style={{ paddingTop: "100%" }}>
          {image && (
            <FrontImage
              imgClassName={"more-img css-filter size-thumbnail"}
              resource={image}
              size="(max-width: 150px) 100vw, 150px"
            />
          )}
        </div>
      </div>
      <div className="more-wrap">
        {(category && typeof category !== "string" && (
          <div className="more-tags">{category.title}</div>
        )) ||
          null}
        {titleToUse && (
          <div className="more-title m-0 text-[16px] leading-[1.1] font-extrabold">
            {titleToUse}
          </div>
        )}
      </div>
      <Link
        className="absolute"
        href={href}
        ref={link.ref}
        style={{ position: "absolute", inset: "0" }}
      />
    </article>
  );
};

/**
 *
 * @example
 * <article
 *       className={cn(
 *         "overflow-hidden rounded-lg border border-border bg-card hover:cursor-pointer",
 *         className
 *       )}
 *       ref={card.ref}
 *     >
 *       <div className="relative w-full ">
 *         {!metaImage && <div className="">No image</div>}
 *
 *       </div>
 *       <div className="p-4">
 *
 *         {titleToUse && (
 *           <div className="prose">
 *             <h3>
 *
 *             </h3>
 *           </div>
 *         )}
 *         {description && <div className="mt-2">{description && <p>{sanitizedDescription}</p>}</div>}
 *       </div>
 *     </article>
 *
 *
 */
