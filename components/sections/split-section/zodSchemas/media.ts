import {z} from "zod/v4";

export const sizeImageSchema = z.object({
	url: z.string().optional(),
	width: z.number().optional(),
	height: z.number().optional(),
	mimeType: z.string().optional(),
	filesize: z.number().optional(),
	filename: z.string().optional(),
});
export const userMediaSchema = z.object({
	id: z.string(),
	alt: z.string().optional(),
	caption: z.string().optional(),
	darkmode: z.boolean().optional(),
	author: z.number().optional(),
	updatedAt: z.string(),
	createdAt: z.string(),
	_status: z.enum(["draft", "published"]).optional(),
	url: z.url().optional(),
	thumbnailURL: z.url().optional(),
	filename: z.string().optional(),
	mimeType: z.string().optional(),
	filesize: z.number().optional(),
	width: z.number().optional(),
	height: z.number().optional(),
	focalX: z.number().optional(),
	focalY: z.number().optional(),
	sizes: z.object({
		thumbnail: sizeImageSchema,
		square: sizeImageSchema,
		small: sizeImageSchema,
		medium: sizeImageSchema,
		large: sizeImageSchema,
		xlarge: sizeImageSchema,
		og: sizeImageSchema,
	}).optional(),
});
