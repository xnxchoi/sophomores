import {cn} from "@/lib/utils"
import * as m from "motion/react-m"
import {HTMLMotionProps} from "motion/react";
import {EASING} from "@/constants/animations";

function Skeleton({className, ...props}: React.ComponentProps<"div">) {
	return (
		<div data-slot="skeleton"
		     className={cn("bg-muted-faded-background animate-pulse rounded-md", className)}
		     {...props} />
	)
}

const ShimmerMotion = ({
	                       className,
	                       initial,
	                       animate,
	                       variants,
	                       exit,
	                       transition,
	                       ...props
                       }: HTMLMotionProps<"div">) => {
	return (
		<m.div data-slot={"skeleton"}
		       className={cn("bg-muted-faded-background rounded-md select-none", className)}
		       initial={initial !== undefined ? initial : {
			       opacity: 0,

		       }}
		       variants={variants}
		       animate={animate !== undefined ? animate : {
			       opacity: 1, transition: {
				       type: "tween",
				       duration: 0.2,
				       ease: EASING.power2.out
			       }
		       }}
		       exit={exit !== undefined ? exit : {
			       opacity: 0,
			       transition: {
				       type: "tween",
				       duration: 0.2,
				       ease: EASING.power2.out
			       }
		       }}
		       {...props} />
	)
}

export {Skeleton, ShimmerMotion}
