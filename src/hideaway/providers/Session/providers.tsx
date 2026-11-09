import {ReactNode} from "react";
import {RP_SessionProvider} from "@/hideaway/lib/auth/session/RP_SessionProvider";

export function SessionProvider({children}: { children: ReactNode }) {
	return <RP_SessionProvider>{children}</RP_SessionProvider>;
}
