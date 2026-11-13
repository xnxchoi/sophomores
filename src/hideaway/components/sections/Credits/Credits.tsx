"use server";
import {getPayload} from "@/payload";
import {roleToAuthority} from "@/payload/plugins/locker/fields/authority/utils";
import {RP_Roles} from "@/hideaway/stores/Notification/NotificationStore";

export async function Credits() {
	const payload = await getPayload();
	const teams = await payload.find({
		collection: "users",
		where: {
			and: [
				{
					banned: {
						not_equals: true,
					},
				},
				{
					role: {
						in: ["admin", "patron", "author", "editor"],
					},
				},
			],
		},
		limit: 100,
		select: {
			slug: true,
			name: true,
			displayUsername: true,
			image: true,
			description: true,
			role: true,
			link: true,
		},
	}).then((data) => {
		return data.docs.map((person) => {
			return {
				...person,
				role: person.role ?? "user",
				link: person.link ?? `/@${person.slug}`,
				label: person.displayUsername ?? `@${person.slug}`,
				image: person.image ?? "/images/default-avatar.png",
				patronage:
					roleToAuthority(person?.role ?? ("user" as RP_Roles)) >=
					roleToAuthority("editor"),
				position: person.role ?? "user",
			};
		});
	}).catch(() => {
		return [];
	});
}
