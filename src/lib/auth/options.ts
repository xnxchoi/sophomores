import { memberSocialProviders, memberTrustedOrigins, readySocialProviders } from "@/lib/auth/social-providers";
import { MEMBER_EMAIL_CODE_SEND_PATH, memberEmailCodeRateLimit, memberEmailEntry } from "@/lib/member-auth/email-entry";
import { sendTrackedEmailCode } from "@/lib/member-auth/email-code-delivery.server";
import { generateRandomString } from "better-auth/crypto";
import { APIError } from "better-auth/api";
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
  assertPayloadUserCreation,
  createPayloadAuthBefore,
  beforePayloadSessionCreate,
  createPayloadPasskeyPolicy
} from "@/lib/member-auth/payload-policy";
import { customerAccess, protectCustomerFields } from "@/lib/auth/access";
import { isVerifiedStaff, ensureStaffAdminProvisioned, isStaffAddress, onStaffSignIn } from "@/lib/auth/staff";
import { bootstrapSuperAdminEmail } from "@/payload/seed/super-admin";
import { logAuthFailure } from "@/lib/auth/failure-log";
import { assertReviewEditorRecipient, hasReviewOwner, isReviewEditorProfile, staffAuthOrigin } from "@/lib/auth/review-editor-policy";

const appURL = staffAuthOrigin();
const reviewOnly = isReviewEditorProfile(appURL);
const providers = reviewOnly ? {} : memberSocialProviders();
export const getAuthMailer = () => {
  try {
    if (isReviewEditorProfile(appURL) && !hasReviewOwner(appURL)) return null;
    const config = loadMemberMailConfig(process.env);
    const transport = config
      ? createMemberMailer(config, appURL, {
          production: appURL.startsWith("https://"),
          magicLinkDestinations: [cmsAdminCallbackPath]
        })
      : null;
    if (!transport) return null;
    const mailer: MemberMailer = async notification => {
      if (isReviewEditorProfile(appURL)) assertReviewEditorRecipient(appURL, notification.email);
      await transport(notification);
    };
    return mailer;
  } catch {
    return null;
  }
};

export function createBetterAuthPlugins(
  delivery: { mailer?: MemberMailer | null; appURL?: string } = {}
) {
  const origin = delivery.appURL ?? appURL;
  return [
    memberEmailEntry(origin),
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
      disableSignUp: !isReviewEditorProfile(origin),
      rateLimit: { window: 60, max: 3 },
      sendMagicLink: async ({ email, url }, ctx) => {
        if (isReviewEditorProfile(origin)) assertReviewEditorRecipient(origin, email);
        else if (!(await ctx?.context.internalAdapter.findUserByEmail(email.toLowerCase()))) return;
        // The same staff-address rule as sign-in, so the configured first super admin gets the CMS link.
        if (!adminMagicLinkAllowed(email, url, (address) => isStaffAddress(address, origin))) return;
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
      disableSignUp: !isReviewEditorProfile(origin),
      rateLimit: { window: 60, max: 3 },
      changeEmail: { enabled: false },
      sendVerificationOTP: ({ email, otp, type }) => sendTrackedEmailCode(async () => {
        if (isReviewEditorProfile(origin)) assertReviewEditorRecipient(origin, email);
        if (type !== "sign-in")
          throw new Error("This verification flow is unavailable.");
        const mailer = "mailer" in delivery ? delivery.mailer : getAuthMailer();
        if (!mailer) throw new Error("Email delivery is unavailable.");
        await mailer({ type: "email-otp", email, otp });
      })
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
  trustedOrigins: reviewOnly ? [appURL] : memberTrustedOrigins(appURL, providers),
  secret: process.env.BETTER_AUTH_SECRET || process.env.PAYLOAD_SECRET,
  plugins: betterAuthPlugins,
  socialProviders: providers,
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
    customRules: { "/sign-in/email-otp": { window: 60, max: 5 }, [MEMBER_EMAIL_CODE_SEND_PATH]: memberEmailCodeRateLimit }
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
    },
    // https site URLs (production) always issue Secure cookies; local http keeps Better Auth defaults.
    ...(appURL.startsWith("https://") ? { useSecureCookies: true } : {})
  },
  hooks: { before: createPayloadAuthBefore(appURL, () => readySocialProviders(providers)) },
  databaseHooks: {
    session: { create: { before: async (session, ctx) => {
      if (isReviewEditorProfile(appURL)) {
        // Magic-link verification has no email in the request; bind the
        // allowlist to the canonical user before any session can be minted.
        const user = await ctx?.context.internalAdapter.findUserById(session.userId);
        if (!user || !isVerifiedStaff(user, appURL)) {
          throw new APIError("FORBIDDEN", { message: "This authentication request is unavailable." });
        }
      }
      return beforePayloadSessionCreate(session, ctx);
    }, after: async (session, ctx) => {
      // Every sign-in of the configured first super admin, even when its admins row already exists.
      // Nothing runs, not even the user lookup, unless a bootstrap address is configured outside the
      // review copy; and nothing here can fail a sign-in.
      if (!bootstrapSuperAdminEmail() || isReviewEditorProfile(appURL)) return;
      try {
        const user = await ctx?.context.internalAdapter.findUserById(session.userId);
        if (user) await onStaffSignIn(user);
      } catch (error) {
        logAuthFailure("Staff sign-in bootstrap retry failed.", error);
      }
    } } },
    user: {
      create: {
        before: async (user, ctx) => {
          assertPayloadUserCreation(appURL, user, ctx);
          return { data: { ...user, name: accountDisplayName(user.email, user.name) } };
        },
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
        // Review sessions authenticate only through the separate admins bridge.
        ...(isReviewEditorProfile(appURL)
          ? { auth: { ...(typeof options.collection.auth === "object" ? options.collection.auth : {}),
              disableLocalStrategy: true, strategies: [] }, endpoints: [] }
          : {}),
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
