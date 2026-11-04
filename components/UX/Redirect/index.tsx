"use client";

import * as m from "motion/react-m";
import { useTransitionRouter } from "next-transition-router";

export const Redirect = ({href}: { href: string }) => {
	const router = useTransitionRouter();
	setTimeout(() => {
		router.push(href);
	}, 300);
	return (
		<m.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" initial={{opacity: 0}}
		       animate={{opacity: 1, zIndex: 1000}} exit={{opacity: 0, zIndex: 0}}
		       transition={{duration: 0.5, ease: "easeInOut"}} />
	);
};
