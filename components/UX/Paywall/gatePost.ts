import {
  roleToAuthority,
  authorityToRole,
  type Role
} from "@/payload/plugins/locker/fields/authority/utils";

export type PostLike = {
  id: string;
  authority?: number | null;
  locked?: boolean | null;
  allowList?: string[] | { id: string }[] | null;
  author?: string | { id: string } | null;
};

export type UserLike = {
  id?: string;
  role: Role;
} | null;

export type GateResult = {
  readable: boolean;
  currentRole: Role;
  requiredRole: Role | null;
  requiredAuthority: number;
  currentAuthority: number;
  reason:
    | "public"
    | "owner"
    | "allowlisted"
    | "tier-met"
    | "tier-required"
    | "auth-required";
};

const normalizeAllowList = (raw: PostLike["allowList"]): string[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((entry) => (typeof entry === "string" ? entry : (entry?.id ?? null)))
      .filter((v): v is string => typeof v === "string");
  }
  return [];
};

const normalizeAuthor = (raw: PostLike["author"]): string | null => {
  if (!raw) return null;
  if (typeof raw === "string") return raw;
  if (typeof raw === "object" && raw !== null && "id" in raw) return raw.id;
  return null;
};

export function gatePostForUser(post: PostLike, user: UserLike): GateResult {
  const requiredAuthority =
    post.locked && typeof post.authority === "number" ? post.authority : 0;
  const currentRole = user?.role || "guest";
  const currentAuthority = roleToAuthority(currentRole);
  const requiredRole =
    requiredAuthority > 0 ? authorityToRole(requiredAuthority) : null;

  if (!post.locked || requiredAuthority === 0) {
    return {
      readable: true,
      currentRole,
      requiredRole: null,
      requiredAuthority: 0,
      currentAuthority,
      reason: "public"
    };
  }

  const author = normalizeAuthor(post.author);
  if (user?.id && author && author === user.id) {
    return {
      readable: true,
      currentRole,
      requiredRole,
      requiredAuthority,
      currentAuthority,
      reason: "owner"
    };
  }

  const allowList = normalizeAllowList(post.allowList);
  if (user?.id && allowList.includes(user.id)) {
    return {
      readable: true,
      currentRole,
      requiredRole,
      requiredAuthority,
      currentAuthority,
      reason: "allowlisted"
    };
  }

  if (currentAuthority >= requiredAuthority) {
    return {
      readable: true,
      currentRole,
      requiredRole,
      requiredAuthority,
      currentAuthority,
      reason: "tier-met"
    };
  }

  return {
    readable: false,
    currentRole,
    requiredRole,
    requiredAuthority,
    currentAuthority,
    reason: (!!user?.id && "tier-required") || "auth-required"
  };
}
