import * as React from "react";
import {cn} from "@/lib/utils";
import { HA_Button as Button, HA_ButtonProps as ButtonProps, HA_buttonVariants as buttonVariants } from "@/components/ui/button";
import {
	ChevronLeftIcon,
	ChevronRightIcon,
	DotsHorizontalIcon,
} from "@radix-ui/react-icons";

const Pagination = ({className, ...props}: React.ComponentProps<"nav">) => (
	<nav aria-label="pagination" className={cn("mx-auto flex w-full justify-center", className)}
	     role="navigation"
	     {...props} />
);

const PaginationContent: React.FC<
	{ ref?: React.Ref<HTMLUListElement> } & React.HTMLAttributes<HTMLUListElement>
> = ({className, ref, ...props}) => (
	<ul className={cn("flex flex-row items-center gap-1", className)} ref={ref}
	    {...props} />
);

const PaginationItem: React.FC<
	{ ref?: React.Ref<HTMLLIElement> } & React.HTMLAttributes<HTMLLIElement>
> = ({className, ref, ...props}) => (
	<li className={cn("", className)} ref={ref} {...props} />
);

type PaginationLinkProps = {
	isActive?: boolean;
} & Pick<ButtonProps, "size"> &
	React.ComponentProps<"button">;

const PaginationLink = ({
	className,
	isActive,
	size = "icon",
	...props
}: PaginationLinkProps) => (
	<Button aria-current={isActive ? "page" : undefined} className={cn(
		buttonVariants({
			size,
			variant: isActive ? "outline" : "ghost",
		}),
		className,
	)}
	        {...((isActive && {"data-active": isActive}) || {})}
	        {...props} />
);

const PaginationPrevious = ({
	className,
	...props
}: React.ComponentProps<typeof PaginationLink>) => (
	<PaginationLink aria-label="Go to previous page" className={cn("gap-1 pl-2.5", className)}
	                size="default"
	                {...props}
	>
		<ChevronLeftIcon className="h-4 w-4" />
		<span>Previous</span>
	</PaginationLink>
);

const PaginationNext = ({
	className,
	...props
}: React.ComponentProps<typeof PaginationLink>) => (
	<PaginationLink aria-label="Go to next page" className={cn("gap-1 pr-2.5", className)}
	                size="default"
	                {...props}
	>
		<span>Next</span>
		<ChevronRightIcon className="h-4 w-4" />
	</PaginationLink>
);

const PaginationEllipsis = ({
	className,
	...props
}: React.ComponentProps<"span">) => (
	<span aria-hidden className={cn("flex h-9 w-9 items-center justify-center", className)}
	      {...props}
	>
    <DotsHorizontalIcon className="h-4 w-4" />
    <span className="sr-only">More pages</span>
  </span>
);

export {
	Pagination,
	PaginationContent,
	PaginationLink,
	PaginationItem,
	PaginationPrevious,
	PaginationNext,
	PaginationEllipsis,
};
