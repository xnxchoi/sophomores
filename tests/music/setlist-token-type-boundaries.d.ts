// Scoped compiler boundary only: do not traverse auth bootstrap / Payload config.
// These callers use standard Payload methods and the existing generated User.
import type { Payload } from "payload";
import type { User } from "../../src/lib/payload/payload-types";

export declare function getPayload(): Promise<Payload>;
export declare function currentUser(): Promise<User | null>;
