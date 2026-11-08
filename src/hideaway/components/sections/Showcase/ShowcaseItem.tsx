import { CardPostData } from "@/hideaway/payload/components/Card";
import { Media } from "@/hideaway/components/core/Media";
import { Link } from "@/hideaway/components/core/Link/Link";
import { DateTime } from "luxon";
import { Fragment } from "react";

export const ShowcaseItem = (props: {
  alignItems?: "center";
  className?: string;
  doc?: CardPostData;
  relationTo?: "posts";
  showCategories?: boolean;
  title?: string;
}) => {
  const {
    className,
    doc,
    relationTo,
    showCategories,
    title: titleFromProps
  } = props;

  const { slug, category, image, title } = doc || {};

  const titleToUse = titleFromProps || title;

  const href = relationTo === "posts" && slug ? `/essays/${slug}` : "/";
  return (
    <li className="showcaseItem relative">
      <article className="post-card">
        {titleToUse && <h2 className="sr-only">{titleToUse}</h2>}
        <Link className="post-card__inner crops-f uppercase" href={href}>
          <header className="post-card__header relative">
            <div className="post-card__meta lead lead--1">
              <span></span>
            </div>
            <h2 className="post-card__title display--3 font-bold">
              {titleToUse || `Untitled, ${DateTime.now().get("year")}`}{" "}
            </h2>
          </header>
          <footer className="post-card__footer">
            <div
              className="post-card__meta lead lead--1"
              itemProp="description"
            >
              {(category && typeof category === "object" && category.title) ||
                "Untitled Category"}
            </div>
            <div className="post-card__image">
              {!image && <div>No image</div>}
              {(image && typeof image !== "string" && (
                <Media resource={image} size="360px" />
              )) || <div>No Image</div>}
            </div>
          </footer>
          <div className="homepage-grid__deco">
            <svg
              width={12}
              height={10}
              viewBox="0 0 12 10"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M11 1.81398C8.79259 4.15866 6.37683 6.09794 3.59237 7.69177C2.71861 8.19191 2.50452 5.45083 2.38215 4.76667C2.31835 4.40997 2.2364 1.442 2.27575 1.48283C3.76254 3.02535 5.24069 4.60901 6.78417 6.11884C7.72216 7.03638 8.14858 8.03866 8.12738 6.3672C8.10848 4.87687 7.65503 3.55101 7.42253 2.10373C7.18418 0.620073 7.47769 5.11674 7.35603 6.61556C7.30702 7.21934 7.34336 8.26182 7.05015 8.80938C6.56065 9.72352 6.92823 6.72171 6.87726 5.67732C6.82776 4.66297 6.70128 3.65822 6.69107 2.64183C6.68923 2.45872 6.8309 0.388555 6.53148 1.17928C5.57231 3.71233 4.5426 6.24246 3.49928 8.74039C2.95503 10.0434 3.02148 6.04186 2.98061 5.56693C2.97216 5.46881 2.75455 3.24141 2.83432 3.24893C3.44798 3.30681 4.57701 4.8774 5.13507 5.26339C5.94679 5.82482 8.18486 7.56526 7.72841 6.67075C6.86246 4.97377 3.65586 3.94661 2.07627 3.20754C-0.724536 1.89709 2.71094 3.58034 3.71206 3.85603C6.08603 4.50977 8.56933 5.17909 11 5.53934"
                stroke="#EA0F32"
                strokeLinecap="round"
              />
            </svg>
            <span className="lead lead--1">Latest</span>
          </div>
        </Link>
      </article>
    </li>
  );
};
