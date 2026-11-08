"use client";

import {useTheme} from "@/providers/Theme";
import {Toaster as Sonner, toast, ToasterProps} from "sonner";

export const Toaster = ({...props}: ToasterProps) => {
	const theme = useTheme((r) => r.theme);

	return (
		<Sonner theme={theme as ToasterProps["theme"]} className="toaster group" toastOptions={{
			classNames: {
				toast:
					"group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
				description: "group-[.toast]:text-muted-foreground",
				actionButton:
					"group-[.toast]:bg-primary group-[.toast]:text-primary-foreground font-medium",
				cancelButton:
					"group-[.toast]:bg-muted group-[.toast]:text-muted-foreground font-medium",
			},
		}}
		        {...props} />
	);
};

export const errorToast = (message: string) =>
	toast.error(message, {
		duration: 3000,
		style: {
			backgroundColor: "var(--rouge-400)",
			color: "var(--rouge-50)",
		},
	});
export const successToast = (message: string) =>
	toast.success(message, {
		duration: 3000,
		style: {
			backgroundColor: "var(--bleu-400)",
			color: "var(--bleu-50)",
		},
	});
