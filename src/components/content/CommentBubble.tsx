import { Link } from "@/components/core/Link/Link";

export const CommentBubble = (props: {
  commentCount?: number;
  url: string;
}) => {
  const { commentCount = 0, url } = props;
  return (
    <Link
      className="relative z-10 inline-block min-w-[27px] rounded-[3px_3px_3px_0] border-[1px] border-muted bg-transparent px-[3px] py-[4px] text-center whitespace-nowrap before:absolute before:-bottom-[4.5px] before:left-0 before:h-[5.5px] before:w-[5.5px] before:bg-background before:content-[''] before:[clip-path:polygon(0_0,0_100%,100%_0)] after:absolute after:bottom-[-7px] after:-left-[1px] after:h-[7px] after:w-[7px] after:bg-muted after:content-[''] after:[clip-path:polygon(0_0,0_100%,100%_0)]"
      href={`${url}#comments`}
    >
      <span
        className="group before:relative before:top-px before:text-[16px] before:leading-[4px] data-[count=0]:before:content-['+']"
        data-count={commentCount}
      >
        <span className="text-[1.1rem] leading-[1] tracking-[-0.1em] text-faded-foreground uppercase group-data-[count=0]:hidden">
          {commentCount}
        </span>
      </span>
    </Link>
  );
};
