import { CallToActionBlock } from "src/blocks/CallToAction/Component";

import { CodeBlock, Props as CodeBlockProps } from "src/blocks/Code/Component";
import { PostedImage } from "src/blocks/ImageBlock/Component";
import { AnchorMarkers } from "src/components/UX/AmbientAudio/AnchorMarkers";
import { cn } from "src/lib/utils";

import type {
  AmbientAudioAnchorBlock,
  CallToActionBlock as CTABlockProps,
  Image as MediaBlockProps
} from "src/payload-types";
import { createId } from "@paralleldrive/cuid2";
import {
  DefaultNodeTypes,
  type DefaultTypedEditorState,
  SerializedBlockNode,
  SerializedInlineBlockNode,
  SerializedLinkNode
} from "@payloadcms/richtext-lexical";
import {
  JSXConvertersFunction,
  RichText as ConvertRichText
} from "@payloadcms/richtext-lexical/react";
import * as m from "motion/react-m";
import { Link } from "@/components/core/Link/Link";
import { CollectionSlug } from "payload";
import React, { ComponentPropsWithoutRef } from "react";
import {
  IS_BOLD,
  IS_CODE,
  IS_ITALIC,
  IS_STRIKETHROUGH,
  IS_SUBSCRIPT,
  IS_SUPERSCRIPT,
  IS_UNDERLINE
} from "./nodeFormat";

type NodeTypes =
  | DefaultNodeTypes
  | SerializedBlockNode<CTABlockProps | MediaBlockProps | CodeBlockProps>
  | SerializedInlineBlockNode<AmbientAudioAnchorBlock>;

const internalDocToHref = ({ linkNode }: { linkNode: SerializedLinkNode }) => {
  const { value, relationTo } = linkNode.fields.doc!;
  if (typeof value !== "object") {
    throw new Error("Expected value to be an object");
  }
  const slug = value.slug;
  return relationTo === "pages" ? `/${slug}` : `/${relationTo}/${slug}`;
};

const jsxConverters: JSXConvertersFunction<NodeTypes> = ({
  defaultConverters
}) => ({
  ...defaultConverters,
  autolink: ({ node, nodesToJSX }) => {
    const children = nodesToJSX({
      nodes: node.children
    });

    const rel: string | undefined = node.fields.newTab
      ? "noopener noreferrer"
      : undefined;
    const target: string | undefined = node.fields.newTab
      ? "_blank"
      : undefined;

    return node.fields.url ? (
      <Link
        className={"underline underline-offset-1"}
        href={node.fields.url}
        {...{ rel, target }}
      >
        {children}
      </Link>
    ) : (
      <span className={"underline underline-offset-1"}>{children}</span>
    );
  },
  horizontalrule: ({ node, nodesToJSX }) => {
    return <hr className={"my-4"} />;
  },
  link: ({ node, nodesToJSX }) => {
    const children = nodesToJSX({
      nodes: node.children
    });

    const rel: string | undefined = node.fields.newTab
      ? "noopener noreferrer"
      : undefined;
    const target: string | undefined = node.fields.newTab
      ? "_blank"
      : undefined;

    let href: string = node.fields.url ?? "";
    if (node.fields.linkType === "internal") {
      if (internalDocToHref) {
        href = internalDocToHref({ linkNode: node });
      } else {
        console.error(
          "Lexical => JSX converter: Link converter: found internal link, but internalDocToHref is not provided"
        );
        href = "#"; // fallback
      }
    }

    return (
      <Link data-themed="color" href={href} {...{ rel, target }}>
        {children}
      </Link>
    );
  },
  list: ({ node, nodesToJSX }) => {
    const children = nodesToJSX({
      nodes: node.children
    });

    const NodeTag = node.tag;

    return <NodeTag className={`list-${node?.listType}`}>{children}</NodeTag>;
  },
  listitem: ({ node, nodesToJSX, parent }) => {
    const hasSubLists = node.children.some((child) => child.type === "list");

    const children = nodesToJSX({
      nodes: node.children
    });

    if ("listType" in parent && parent?.listType === "check") {
      const uuid = createId();

      return (
        <li
          data-themed="color"
          data-selectable={true}
          aria-checked={node.checked ? "true" : "false"}
          className={`list-item-checkbox${node.checked ? "list-item-checkbox-checked" : "list-item-checkbox-unchecked"}${hasSubLists ? "nestedListItem" : ""}`}
          // eslint-disable-next-line jsx-a11y/no-noninteractive-element-to-interactive-role
          role="checkbox"
          style={{ listStyleType: "none" }}
          tabIndex={-1}
          value={node?.value}
        >
          {hasSubLists ? (
            children
          ) : (
            <>
              <input
                checked={node.checked}
                id={uuid}
                readOnly={true}
                type="checkbox"
              />
              <label htmlFor={uuid}>{children}</label>
              <br />
            </>
          )}
        </li>
      );
    } else {
      return (
        <li
          className={`${hasSubLists ? "nestedListItem" : ""}`}
          style={hasSubLists ? { listStyleType: "none" } : undefined}
          value={node?.value}
        >
          {children}
        </li>
      );
    }
  },
  text: ({ node, childIndex }) => {
    let text: React.ReactNode = node.text;

    if (node.format & IS_BOLD) {
      text = <strong data-key={childIndex}>{text}</strong>;
    }
    if (node.format & IS_ITALIC) {
      text = <em data-key={childIndex}>{text}</em>;
    }
    if (node.format & IS_STRIKETHROUGH) {
      text = (
        <span
          data-themed="color"
          data-selectable={true}
          data-key={childIndex}
          style={{ textDecoration: "line-through" }}
        >
          {text}
        </span>
      );
    }
    if (node.format & IS_UNDERLINE) {
      text = (
        <span
          data-themed="color"
          data-selectable={true}
          data-key={childIndex}
          style={{ textDecoration: "underline" }}
        >
          {text}
        </span>
      );
    }
    if (node.format & IS_CODE) {
      text = <code data-key={childIndex}>{text}</code>;
    }
    if (node.format & IS_SUBSCRIPT) {
      text = <sub data-key={childIndex}>{text}</sub>;
    }
    if (node.format & IS_SUPERSCRIPT) {
      text = <sup data-key={childIndex}>{text}</sup>;
    }

    return text;
  },
  quote: ({ node, nodesToJSX, childIndex }) => {
    const children = nodesToJSX({
      nodes: node.children
    });

    return (
      <blockquote data-selectable={true} data-key={childIndex}>
        {children}
      </blockquote>
    );
  },
  heading: ({ node, nodesToJSX, childIndex }) => {
    const children = nodesToJSX({
      nodes: node.children
    });

    const NodeTag = node.tag;

    return <NodeTag data-key={childIndex}>{children}</NodeTag>;
  },

  paragraph: ({ node, nodesToJSX, childIndex }) => {
    const children = nodesToJSX({
      nodes: node.children
    });

    if (!children?.length) {
      return (
        <p>
          <br />
        </p>
      );
    }
    return (
      <p data-key={childIndex} data-selectable={true}>
        {children}
      </p>
    );
  },
  blocks: {
    image: ({ node }) =>
      !!node.fields.media ? (
        <PostedImage {...node.fields} media={node.fields.media} />
      ) : (
        <></>
      ),
    code: ({ node }) => <CodeBlock className="col-start-2" {...node.fields} />,
    cta: ({ node }) => <CallToActionBlock {...node.fields} />
  },
  inlineBlocks: {
    ambientAudioAnchor: ({ node }) => {
      const { groupId, kind, source } = node.fields;
      if (!groupId || !kind) return null;
      return <AnchorMarkers kind={kind} groupId={groupId} source={source} />;
    }
  }
});

type Props = {
  collection?: CollectionSlug;
  data: DefaultTypedEditorState;
  enableGutter?: boolean;
  enableProse?: boolean;
} & ComponentPropsWithoutRef<"div">;

export default function RichText(props: Props) {
  const { className, enableProse = true, enableGutter = true, ...rest } = props;
  return (
    <m.div layout>
      <ConvertRichText
        disableContainer={true}
        converters={jsxConverters}
        className={cn(
          "payload-richtext",
          {
            container: enableGutter,
            "max-w-none": !enableGutter,
            "md:prose-md mx-auto prose dark:prose-invert": enableProse
          },
          className
        )}
        {...rest}
      />
    </m.div>
  );
}
