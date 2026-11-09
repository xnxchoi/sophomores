import {ReactNode} from "react";
import {RP_SessionProvider} from "@/lib/auth/session/RP_SessionProvider";

export function SessionProvider({children}: { children: ReactNode }) {
	return <RP_SessionProvider>{children}</RP_SessionProvider>;
}
