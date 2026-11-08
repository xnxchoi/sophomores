import type {PaginatedDocs, Where} from "payload";
import type {User} from "@/payload-types";
import {stringify} from "qs-esm";
import {roleToAuthority} from "@/payload/plugins/locker/fields/authority/utils";

export async function getPeople() {
	const queryString: Where = {
		where: {
			//@ts-expect-error Local API Where Query typing weirdness
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
		//@ts-expect-error Local API Where Query typing weirdness
		limit: 100,
		select: {
			//@ts-expect-error Local API Where Query typing weirdness
			name: true,
			label: true,
			image: true,
			description: true,
			role: true,
			link: true,
		},
	};
	const query = stringify(queryString);
	const teams = await fetch(`/api/users${query}`).then((res) => res.json()).then(
		(
			data: PaginatedDocs<
				Pick<
					User,
					| "image"
					| "name"
					| "bio"
					| "role"
					| "link"
					| "slug"
					| "displayUsername"
				>
			>,
		) => {
			return data.docs.map((person) => {
				return {
					...person,
					role: person.role ?? "user",
					link: person.link ?? `/@${person.slug}`,
					label: person.displayUsername ?? `@${person.slug}`,
					image: person.image ?? "/images/default-avatar.png",
					patronage:
						roleToAuthority(person.role!) >= roleToAuthority("editor"),
					position: person.role ?? "user",
				};
			});
		},
	).catch(() => {
		return [];
	});
	if (teams.length < 1) return [];
	return teams;
}
