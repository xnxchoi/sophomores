import { generateRandomString } from "better-auth/crypto";
import { passkey } from "@better-auth/passkey";
import { emailOTP } from "better-auth/plugins/email-otp";
import { magicLink } from "better-auth/plugins/magic-link";
import { phoneNumber } from "better-auth/plugins/phone-number";
import { multiSession } from "better-auth/plugins/multi-session";
import { nextCookies } from "better-auth/next-js";
import type { PayloadAuthOptions } from "payload-auth";
import type { BetterAuthOptions as BetterAuthOptionsType } from "better-auth";
import { loadMemberMailConfig } from "@/lib/member-auth/mail-config";
import { createMemberMailer, type MemberMailer } from "@/lib/member-auth/mail";
import {
  adminMagicLinkAllowed,
  cmsAdminCallbackPath
} from "@/lib/auth/cms-login";
import { accountDisplayName } from "@/lib/auth/staff-email";
import {
  createPayloadAuthBefore,
  beforePayloadSessionCreate,
  createPayloadPasskeyPolicy
} from "@/lib/member-auth/payload-policy";
import { customerAccess, protectCustomerFields } from "@/lib/auth/access";
import { isVerifiedStaff, ensureStaffAdminProvisioned } from "@/lib/auth/staff";

const getAppURL = () => {
  const url =
    process.env.NEXT_PUBLIC_SERVER_URL ||
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
    "http://localhost:3000";
  return url.replace(/\/+$/, "");
};

const appURL = getAppURL();
export const getAuthMailer = () => {
  try {
    const config = loadMemberMailConfig(process.env);
    return config
      ? createMemberMailer(config, appURL, {
          magicLinkDestinations: [cmsAdminCallbackPath]
        })
      : null;
  } catch {
    return null;
  }
};

export function createBetterAuthPlugins(
  delivery: { mailer?: MemberMailer | null; appURL?: string } = {}
) {
  const origin = delivery.appURL ?? appURL;
  return [
    // Keep the installed schema stable, but phone is proof/identification, never authentication.
    phoneNumber({
      expiresIn: 300,
      allowedAttempts: 3,
      sendOTP: async () => {
        throw new Error("Phone authentication is unavailable.");
      }
    }),
    // Email magic link authentication
    magicLink({
      expiresIn: 300,
      storeToken: "hashed",
      rateLimit: { window: 60, max: 3 },
      sendMagicLink: async ({ email, url }) => {
        if (!adminMagicLinkAllowed(email, url)) return;
        const mailer = "mailer" in delivery ? delivery.mailer : getAuthMailer();
        if (!mailer) throw new Error("Email delivery is unavailable.");
        await mailer({ type: "magic-link", email, url });
      }
    }),
    // 3. Email OTP fallback
    emailOTP({
      otpLength: 6,
      generateOTP: () => generateRandomString(6, "A-Z", "0-9"),
      expiresIn: 300,
      allowedAttempts: 3,
      storeOTP: "hashed",
      rateLimit: { window: 60, max: 3 },
      changeEmail: { enabled: false },
      async sendVerificationOTP({ email, otp, type }) {
        if (type !== "sign-in")
          throw new Error("This verification flow is unavailable.");
        const mailer = "mailer" in delivery ? delivery.mailer : getAuthMailer();
        if (!mailer) throw new Error("Email delivery is unavailable.");
        await mailer({ type: "email-otp", email, otp });
      }
    }),
    // 4. Passkey biometric authentication
    passkey({
      rpID: new URL(origin).hostname,
      rpName: "Sophomores",
      origin,
      ...createPayloadPasskeyPolicy(),
      authenticatorSelection: {
        userVerification: "required",
        residentKey: "required"
      }
    }),
    multiSession(),
    nextCookies()
  ] satisfies BetterAuthOptionsType["plugins"];
}

export const betterAuthPlugins = createBetterAuthPlugins();

export const betterAuthOptions = {
  appName: "Sophomores",
  baseURL: appURL,
  trustedOrigins: [appURL],
  secret: process.env.BETTER_AUTH_SECRET || process.env.PAYLOAD_SECRET,
  plugins: betterAuthPlugins,
  // 5. Social Providers (Google, etc.)
  socialProviders: {
    google: {
      clientId:
        process.env.GOOGLE_CLIENT_ID ||
        process.env.MEMBER_AUTH_GOOGLE_CLIENT_ID ||
        "",
      clientSecret:
        process.env.GOOGLE_CLIENT_SECRET ||
        process.env.MEMBER_AUTH_GOOGLE_CLIENT_SECRET ||
        "",
      enabled: Boolean(
        (process.env.GOOGLE_CLIENT_ID ||
          process.env.MEMBER_AUTH_GOOGLE_CLIENT_ID) &&
        (process.env.GOOGLE_CLIENT_SECRET ||
          process.env.MEMBER_AUTH_GOOGLE_CLIENT_SECRET)
      ),
      scope: ["openid", "email", "profile"],
      requireEmailVerification: true,
      disableIdTokenSignIn: true,
      includeGrantedScopes: false,
      accessType: "online"
    }
  },
  emailAndPassword: { enabled: false },
  account: {
    encryptOAuthTokens: true,
    skipStateCookieCheck: false,
    storeStateStrategy: "database",
    accountLinking: { enabled: true, disableImplicitLinking: true }
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 60,
    customRules: { "/sign-in/email-otp": { window: 60, max: 5 } }
  },
  telemetry: { enabled: false },
  user: {
    changeEmail: { enabled: false },
    deleteUser: { enabled: false },
    additionalFields: {
      phone: {
        type: "string",
        input: false,
        required: false
      },
      ticketTier: {
        type: "string",
        input: false,
        defaultValue: "none",
        required: false
      },
      role: {
        type: "string",
        defaultValue: "user",
        input: false
      },
      verified: {
        type: "boolean",
        defaultValue: false,
        input: false
      }
    }
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 24 hours
    freshAge: 900,
    cookieCache: {
      enabled: false
    }
  },
  advanced: {
    database: {
      generateId: "uuid"
    }
  },
  hooks: { before: createPayloadAuthBefore(appURL) },
  databaseHooks: {
    session: { create: { before: beforePayloadSessionCreate } },
    user: {
      create: {
        before: async (user) => ({
          data: { ...user, name: accountDisplayName(user.email, user.name) }
        }),
        after: async (user) => {
          if (isVerifiedStaff(user)) await ensureStaffAdminProvisioned(user);
        }
      },
      // before-update sees a partial object. Eligibility is evaluated only from
      // the authoritative merged document in the collection and after hook.
      update: {
        after: async (user) => {
          if (isVerifiedStaff(user)) await ensureStaffAdminProvisioned(user);
        }
      }
    }
  }
} satisfies BetterAuthOptionsType;

export const betterAuthPluginOptions: PayloadAuthOptions = {
  disabled: false,
  hidePluginCollections: true,
  admin: {
    loginMethods: ["emailOTP", "magicLink"]
  },
  users: {
    slug: "users",
    hidden: false,
    roles: ["admin", "editor", "staff", "user"],
    defaultRole: "user",
    adminRoles: [],
    allowedFields: ["name", "localePreference"],
    collectionOverrides: (options) => {
      return {
        ...options.collection,
        access: customerAccess,
        fields: protectCustomerFields(options.collection.fields)
      };
    }
  },
  sessions: {
    collectionOverrides: ({ collection }) => ({
      ...collection,
      fields: collection.fields.map((field) =>
        field.type === "date" && field.name === "createdAt"
          ? { ...field, saveToJWT: true }
          : field
      )
    })
  },
  pluginCollectionOverrides: {
    passkeys: ({ collection }) => {
      return {
        ...collection,
        fields: collection.fields.map((field) =>
          field.type === "text" && field.name === "credentialId"
            ? { ...field, index: true }
            : field
        )
      };
    }
  },
  betterAuthOptions
};

export type ConstructedBetterAuthPluginOptions = typeof betterAuthPluginOptions;
