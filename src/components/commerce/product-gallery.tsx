"use client";

import { Tabs } from "@base-ui/react/tabs";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { CommerceOffer } from "@/lib/commerce/catalogue";

export function CommerceProductGallery({ images, title, fill = false }: {
  images: CommerceOffer["images"];
  title: string;
  /** From lg the plate fills its parent's height (the product page's pinned stage) instead of a square. */
  fill?: boolean;
}) {
  const t = useTranslations("Customer.components_commerce_offer");
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());

  function markUnavailable(src: string) {
    setFailed((previous) => previous.has(src) ? previous : new Set([...previous, src]));
  }

  function checkImage(element: HTMLImageElement | null, src: string) {
    // The browser may have finished a server-rendered image before React bound onError.
    if (element?.complete && element.naturalWidth === 0) markUnavailable(src);
  }

  const media = images.flatMap(({ image }, sourceIndex) =>
    typeof image === "object" && image.url
      ? [{ id: image.id, src: image.url, alt: image.alt || title, sourceIndex }]
      : []
  );

  if (media.length === 0 || (media.length === 1 && failed.has(media[0].src))) return (
    <p className={cn("flex aspect-square items-center justify-center bg-(image:--texture-travertine) bg-cover bg-center px-8 text-center text-sm leading-relaxed text-foreground/70 dark:bg-muted dark:bg-blend-multiply", fill && "lg:aspect-auto lg:h-full")}>
      {t("imagesUnavailable")}
    </p>
  );

  if (media.length === 1) return (
    // Preserve the configured media host and the first usable image loading priority.
    // Mersi M1: the same flat plate as the multi-image stage (a blend can't reach an img's own background).
    <div className={cn("aspect-square w-full overflow-hidden bg-(image:--texture-travertine) bg-cover bg-center dark:bg-muted dark:bg-blend-multiply", fill && "lg:aspect-auto lg:h-full")}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={media[0].src} alt={media[0].alt} loading="eager"
        ref={(element) => checkImage(element, media[0].src)} onError={() => markUnavailable(media[0].src)}
        className="size-full object-contain mix-blend-multiply dark:mix-blend-normal" />
    </div>
  );

  return (
    <Tabs.Root defaultValue={0} className={cn("flex min-w-0 flex-col gap-4", fill && "lg:h-full")}>
      <Tabs.List activateOnFocus loopFocus={false} aria-label={t("galleryLabel")}
        className="order-2 flex flex-wrap gap-3">
        {media.map((image, index) => (
          <Tabs.Tab key={`${image.id}:${image.sourceIndex}`} value={index}
            aria-label={t("gallerySelectImage", { number: index + 1, count: media.length })}
            className="relative flex size-18 min-h-12 min-w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-transparent bg-transparent p-1 text-foreground transition-colors outline-offset-4 hover:border-border focus-visible:outline-2 data-active:border-foreground">
            {!failed.has(image.src) && (
              // The tab's accessible name replaces this duplicate thumbnail description.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image.src} alt="" loading="lazy" ref={(element) => checkImage(element, image.src)} onError={() => markUnavailable(image.src)}
                className="size-full rounded-sm object-contain" />
            )}
            <span aria-hidden="true" className="absolute right-1 bottom-1 flex min-w-5 items-center justify-center rounded-sm bg-background/90 px-1 text-[10px] leading-5 tabular-nums">
              {index + 1}
            </span>
          </Tabs.Tab>
        ))}
      </Tabs.List>
      <div className={cn("order-1 grid min-w-0", fill && "lg:min-h-0 lg:flex-1")}>
        {media.map((image, index) => (
          <Tabs.Panel key={`${image.id}:${image.sourceIndex}`} value={index} keepMounted
            className={cn("col-start-1 row-start-1 min-w-0 outline-offset-4 transition-opacity duration-250 ease-out focus-visible:outline-2 data-hidden:hidden data-starting-style:opacity-0 data-ending-style:opacity-0", fill && "lg:h-full")}>
            {/* Mersi M1 (owner: "4. M1, M2."): the art sits on a material plate, flat, with no frame or card. */}
            <div className={cn("aspect-square overflow-hidden bg-(image:--texture-travertine) bg-cover bg-center dark:bg-muted dark:bg-blend-multiply", fill && "lg:aspect-auto lg:h-[calc(100%-2rem)]")}>
              {failed.has(image.src) ? (
                <p className="flex size-full items-center justify-center px-6 text-center text-sm leading-relaxed text-muted-foreground">
                  {t("imagesUnavailable")}
                </p>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image.src} alt={image.alt} loading={index === 0 ? "eager" : "lazy"}
                  ref={(element) => checkImage(element, image.src)} onError={() => markUnavailable(image.src)} className="size-full object-contain mix-blend-multiply dark:mix-blend-normal" />
              )}
            </div>
            <p className="mt-3 text-xs text-muted-foreground tabular-nums">
              {t("galleryImagePosition", { number: index + 1, count: media.length })}
            </p>
          </Tabs.Panel>
        ))}
      </div>
    </Tabs.Root>
  );
}
