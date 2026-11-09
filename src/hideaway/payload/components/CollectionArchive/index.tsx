import React from "react";
import { cn } from "@/lib/utils";
import { RPCard } from "@/hideaway/payload/components/Card";
import { PostOverview } from "@/types/collections/posts";

export type Props = {
  posts: PostOverview[];
};

export const CollectionArchive: React.FC<Props> = (props) => {
  const { posts } = props;
  return (
    <div className={cn("container")}>
      <div>
        <div className="grid grid-cols-4 gap-4 sm:grid-cols-8 lg:grid-cols-12 lg:gap-8 xl:gap-x-8">
          {posts?.map((result, index) => {
            if (typeof result === "object" && result !== null) {
              return <div className="col-span-4" key={index}></div>;
            }
            return null;
          })}
        </div>
      </div>
    </div>
  );
};
