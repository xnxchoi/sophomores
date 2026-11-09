import {authClient} from "@/lib/auth/client";

import {
	GotUser,
	RP_Bookmark,
	UserRPSelectKeys
} from "@/payload/collections/Users/endpoints/userFieldSelect";
import type {BetterPaidSession, BetterPaidUser} from "@/lib/auth/types";

export type RP_SessionData = {
	user:
		BetterPaidUser
	session: BetterPaidSession
	error: ReturnType<typeof authClient.useSession>["error"];
	isPending: ReturnType<typeof authClient.useSession>["isPending"];
	refetch: ReturnType<typeof authClient.useSession>["refetch"];
};

export type SessionType = Omit<RP_SessionData, "user"> & {
	user: Omit<RP_SessionData["user"], UserRPSelectKeys> & Omit<GotUser, "bookmarks"> & {
		bookmarks: RP_Bookmark
	};
};
