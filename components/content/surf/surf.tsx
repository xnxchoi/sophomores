"use client";
import { CommentBubble } from "../CommentBubble";
import { useDomCursor } from "@/components/core/cursorWrapper";
import { CopyLinkButton } from "@/components/ui/copy-button";
import { Link } from "@/components/core/Link/Link";
import { SPRING_EASE } from "@/constants/animations";
import { cn } from "@/lib/utils";
import { createRichtext } from "@/payload/collections/Users/helpers/createRichtext";
import RichText from "../../UX/RichText";
import { useTheme } from "@/providers/Theme";
import { SurfOverview } from "@/types/collections/surf";
import { getClientSideURL } from "@/utilities/getURL";
import { randomNumber } from "@/utilities/randomNumber";
import { Property } from "csstype";
import { DateTime } from "luxon";
import {
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform
} from "motion/react";
import * as m from "motion/react-m";
import { useCallback, useId, useMemo, useRef, useState } from "react";
import { uuidv7 } from "uuidv7";
import { useHumanTime } from "./useLocaleDate";

export const Surf = ({
  surf = {
    author: { name: "Claude", slug: "@claude", id: uuidv7() },
    source: "external",
    slug: "slug",
    title: "Best surfing spots are hidden in plain sight.",
    content: createRichtext("Best surfing spots are hidden in plain sight!"),
    tagged: [],
    category: {
      id: uuidv7(),
      title: "Surfing",
      popularity: 1,
      slug: "surf"
    },
    id: uuidv7(),
    publishedAt:
      DateTime.fromFormat("2021-01-01", "yyyy-LL-dd").toISO() ||
      "2021-01-01T00:00:00.000Z",
    updatedAt: DateTime.now().toISO(),
    commentsEnabled: true,
    bookmarks: [],
    bookmarksCount: 0
  }
}: {
  surf?: SurfOverview;
}) => {
  const { slug } = surf;
  const [hovered, setHovered] = useState(false);
  const { onMouseEnter, onMouseLeave } = useDomCursor({
    onEnter: () => setHovered(true),
    onLeave: () => setHovered(false)
  });
  return (
    <div
      className={cn(
        "group border-muted-fg relative max-w-[600px] border-b-[1px] px-4 pt-[16px] pb-[24px]",
        hovered
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      data-themed={"background-color, border-color,color"}
    >
      <Link
        className="z-[1] after:absolute after:top-0 after:left-0 after:h-full after:w-full after:rounded-[4px] after:bg-transparent after:shadow-md/0 after:shadow-muted after:transition-colors after:duration-200 after:ease-power3 after:content-[''] hover:after:bg-muted-faded-background/10 hover:after:shadow-md/20 dark:hover:after:bg-muted/10 dark:hover:after:shadow-sm/25"
        href="/"
      />
      <div className={"flex p-0 md:py-4"}>
        <SurfMeta surf={surf} />
        <SurfInner {...surf} />
      </div>
    </div>
  );
};

const SurfGradient = ({
  surf: {
    author: { name },
    source
  }
}: {
  surf: SurfOverview;
}) => {
  const gradients: Record<
    SurfSource,
    [[number, number, number], [number, number, number]]
  > = useMemo(
    () => ({
      external: [
        [0.6433, 0.2179, 6.68],
        [0.9234, 0.0749, 95.11]
      ],
      instagram: [
        [0.4461, 0.2336, 296.43],
        [0.5533, 0.2115, 355.73]
      ],
      medium: [
        [0.5498, 0.1745, 142.51],
        [0.4095, 0.0715, 212.58]
      ],
      youtube: [
        [0.5528, 0.2053, 19.43],
        [0.4995, 0.1077, 273.6]
      ],
      substack: [
        [0.8126, 0.1113, 54.36],
        [0.3442, 0.128, 298.2]
      ],
      twitter: [
        [0.9136, 0.0625, 213.94],
        [0.6408, 0.0771, 227.25]
      ],
      x: [
        [0.9136, 0.0625, 213.94],
        [0.6408, 0.0771, 227.25]
      ]
    }),
    []
  );
  const initial = useMemo(() => (name.charAt(0) || "A").toUpperCase(), [name]);
  const { label } = useMemo(() => sourceToMeta({ source }), [source]);

  const palette = useMotionValue(gradients.external);
  const keys = useMemo(
    () => Object.keys(gradients) as SurfSource[],
    [gradients]
  );
  const tid = useRef<ReturnType<typeof setTimeout> | null>(null);
  const switchPalette = useCallback(() => {
    const index = randomNumber(0, keys.length - 1);
    const next = keys[index];
    tid.current && clearTimeout(tid.current);
    tid.current = setTimeout(() => palette.set(gradients[next]), 50);
  }, [gradients, keys, palette]);

  const { onMouseEnter, onMouseLeave } = useDomCursor({
    enterCondition: () => (!tid.current ? "FOCUS" : null)
  });
  const te = useTheme((r) => r.theme),
    themeValue = useMotionValue(te);

  const id = useId();

  const s1 = useTransform(() => palette.get()[0][0]),
    s2 = useTransform(() => palette.get()[0][1]),
    s3 = useTransform(() => palette.get()[0][2]),
    e3 = useTransform(() => palette.get()[1][2]),
    e1 = useTransform(() => palette.get()[1][0]),
    e2 = useTransform(() => palette.get()[1][1]);
  const start = useMotionTemplate`oklch(${s1} ${s2} ${s3})`,
    end = useMotionTemplate`oklch(${e1} ${e2} ${e3})`;
  const iC = useTransform(() => {
      return (
        s1.get() > 0.5 ? "var(--off-black)" : "var(--off-white)"
      ) as Property.Color;
    }),
    initialColor = useSpring(iC, {
      ...SPRING_EASE.power2.inOut,
      visualDuration: 0.3
    }),
    sC = useTransform(
      () =>
        (e1.get() > 0.5
          ? "var(--off-black)"
          : "var(--off-white)") as Property.Color
    ),
    sourceColor = useSpring(sC, {
      ...SPRING_EASE.power2.inOut,
      visualDuration: 0.3
    });
  return (
    <>
      <div className={"absolute z-0 ml-0 w-[24px]"}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={"block max-w-full align-middle"}
          viewBox="0 0 134.51 284.18"
        >
          <defs>
            <linearGradient id={id} gradientTransform="rotate(90)">
              <m.stop offset="40%" stopColor={start}></m.stop>
              <m.stop offset="55%" stopColor={end}></m.stop>
            </linearGradient>
          </defs>
          <path
            fill={`url(#${id})`}
            d="M110.91,165.78h0c-18-15.39-18-32,0-47.39h0a67.26,67.26,0,1,0-87.31,0h0c18,15.39,18,32,0,47.39h0a67.26,67.26,0,1,0,87.31,0Z"
          ></path>
        </svg>
      </div>
      <m.div
        className={
          "z-[10] flex size-[24px] justify-center px-[4px] py-[6px] text-center font-sans text-[11px] leading-[11px] font-bold text-black"
        }
        style={{
          color: initialColor
        }}
      >
        {initial}
      </m.div>
      <m.div
        className={
          "z-[10] mt-[3px] flex size-[24px] justify-center p-2 text-center"
        }
      >
        <span
          className={"flex w-full justify-center"}
          onMouseLeave={onMouseLeave}
          onMouseEnter={onMouseEnter}
          onClick={switchPalette}
        >
          <m.svg
            width="12"
            height="13"
            viewBox="0 0 11 11"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ color: sourceColor }}
          >
            <title>{label}</title>
            <m.path
              style={{ color: "inherit" }}
              fillRule="evenodd"
              clipRule="evenodd"
              d="M6.8999 0.400024H10.8999V4.40002H9.8999V2.10713L4.8999 7.10713L4.1928 6.40002L9.1928 1.40002H6.8999V0.400024ZM2.3999 2.90002C2.12604 2.90002 1.8999 3.12617 1.8999 3.40002V8.90002C1.8999 9.03263 1.95258 9.15981 2.04635 9.25358C2.14012 9.34735 2.26729 9.40002 2.3999 9.40002H7.8999C8.03251 9.40002 8.15969 9.34735 8.25346 9.25358C8.34722 9.15981 8.3999 9.03263 8.3999 8.90002V5.90002H9.3999V8.90002C9.3999 9.29785 9.24187 9.67938 8.96056 9.96068C8.67926 10.242 8.29773 10.4 7.8999 10.4H2.3999C2.00208 10.4 1.62055 10.242 1.33924 9.96068C1.05794 9.67938 0.899902 9.29785 0.899902 8.90002V3.40002C0.899902 2.57388 1.57376 1.90002 2.3999 1.90002H5.3999V2.90002H2.3999Z"
              fill={"currentColor"}
            ></m.path>
          </m.svg>
        </span>
      </m.div>
    </>
  );
};
const SurfMeta = ({ surf }: { surf: SurfOverview }) => {
  return (
    <div className="relative flex w-[38px] min-w-[38px] flex-col items-start">
      <SurfGradient surf={surf} />

      <div className="relative mt-5 flex w-[27px] items-center">
        <CommentBubble commentCount={0} url={`/surf/${surf.slug}#comments`} />
      </div>
    </div>
  );
};
export type SurfSource = SurfOverview["source"];
export const sourceToMeta = ({
  source = "external"
}: {
  source?: SurfSource;
}) => {
  const sourceToLabel = (source: SurfSource) => {
    switch (source) {
      case "twitter":
      case "x":
        return "X";
      case "instagram":
        return "Instagram";

      case "substack":
        return "Substack";
      default:
        return "External Link";
    }
  };
  const label = sourceToLabel(source);
  return {
    label
  };
};
const SurfSource = ({ source }: Pick<SurfOverview, "source">) => {
  const { label } = useMemo(() => sourceToMeta({ source }), [source]);
  return (
    <div
      className={
        "z-[10] mt-[3px] flex size-[24px] justify-center p-2 text-center text-black"
      }
    >
      <span className={"flex w-full justify-center text-black"}>
        <svg
          width="12"
          height="13"
          viewBox="0 0 11 11"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <title>{label}</title>
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M6.8999 0.400024H10.8999V4.40002H9.8999V2.10713L4.8999 7.10713L4.1928 6.40002L9.1928 1.40002H6.8999V0.400024ZM2.3999 2.90002C2.12604 2.90002 1.8999 3.12617 1.8999 3.40002V8.90002C1.8999 9.03263 1.95258 9.15981 2.04635 9.25358C2.14012 9.34735 2.26729 9.40002 2.3999 9.40002H7.8999C8.03251 9.40002 8.15969 9.34735 8.25346 9.25358C8.34722 9.15981 8.3999 9.03263 8.3999 8.90002V5.90002H9.3999V8.90002C9.3999 9.29785 9.24187 9.67938 8.96056 9.96068C8.67926 10.242 8.29773 10.4 7.8999 10.4H2.3999C2.00208 10.4 1.62055 10.242 1.33924 9.96068C1.05794 9.67938 0.899902 9.29785 0.899902 8.90002V3.40002C0.899902 2.57388 1.57376 1.90002 2.3999 1.90002H5.3999V2.90002H2.3999Z"
            fill="currentColor"
          ></path>
        </svg>
      </span>
    </div>
  );
};
const SurfInitials = ({ name }: { name: string }) => {
  const initial = useMemo(() => (name.charAt(0) || "A").toUpperCase(), [name]);
  return (
    <div
      className={
        "z-[10] flex size-[24px] justify-center px-[4px] py-[6px] text-center font-sans text-[11px] leading-[11px] font-bold text-black"
      }
    >
      {initial}
    </div>
  );
};
const SurfInner = (surf: SurfOverview) => {
  return (
    <div className="flex flex-[1_1] flex-col">
      <SurfHeader {...surf} />
      <SurfContent title={surf.title} content={surf.content} />
    </div>
  );
};
const SurfHeader = (props: SurfOverview) => {
  const { slug, author, publishedAt } = props;

  const timestamp = useMemo(() => publishedAt, [publishedAt]);
  const text = useMemo(() => `${getClientSideURL()}/surf/${slug}`, [slug]);
  return (
    <div className={"mb-1.5 flex md:justify-start"}>
      <div
        className={"mr-3 flex flex-wrap items-center"}
        style={{ justifyContent: "left" }}
      >
        <SurfAuthor name={author.name} />
        {timestamp && <SurfTime timestamp={timestamp} />}
      </div>
      <CopyLinkButton
        className="relative flex items-center text-muted group-hover:text-muted-off-foreground"
        textToCopy={text}
      />
    </div>
  );
};
export const SurfAuthor = ({ name }: { name: string }) => {
  return (
    <span
      className={
        "mr-3 inline text-[1.1rem] tracking-[0.1em] text-foreground uppercase"
      }
    >
      {name}
    </span>
  );
};

/**
 *
 * @param timestamp ISO formatted Date.

 */
export const SurfTime = ({ timestamp }: { timestamp: string }) => {
  const formattedDate = useHumanTime(timestamp);
  return (
    <span
      className={
        "mr-3 inline text-[1.1rem] tracking-[0.1em] text-foreground uppercase"
      }
    >
      <time dateTime={timestamp}>{formattedDate}</time>
    </span>
  );
};
export const SurfContent = (props: {
  title: string;
  content: SurfOverview["content"];
}) => {
  const { title, content } = props;

  return (
    <div className={"mb-4 text-base"}>
      <SurfTitle title={title} />
      <RichText
        className={"m-0 leading-[100%] [&_>div]:leading-[100%]"}
        enableProse={true}
        data={content}
      />
    </div>
  );
};
export const SurfTitle = (props: { title: string }) => {
  const { title } = props;
  return (
    <h4 className={"inline pr-[4px] text-base font-medium tracking-normal"}>
      {title}
    </h4>
  );
};
