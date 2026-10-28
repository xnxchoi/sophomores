import { passkey } from "@better-auth/passkey";
import { emailOTP } from "better-auth/plugins/email-otp";
import { magicLink } from "better-auth/plugins/magic-link";
import { phoneNumber } from "better-auth/plugins/phone-number";
import { multiSession } from "better-auth/plugins/multi-session";
import { nextCookies } from "better-auth/next-js";
import type { PayloadAuthOptions } from "payload-auth";
import type { BetterAuthOptions as BetterAuthOptionsType } from "better-auth";
import { loadMemberMailConfig } from "@/lib/member-auth/mail-config";
import { createMemberMailer } from "@/lib/member-auth/mail";
import { isStaffEmail, ensureStaffAdminProvisioned } from "@/lib/auth/staff";

const getAppURL = () => {
  const url =
    process.env.NEXT_PUBLIC_SERVER_URL ||
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
    "http://localhost:3000";
  return url.replace(/\/+$/, "");
};

const appURL = getAppURL();
const appHost = (() => {
  try {
    return new URL(appURL).hostname;
  } catch {
    return "localhost";
  }
})();

const getMailer = () => {
  try {
    const config = loadMemberMailConfig(process.env);
    return config ? createMemberMailer(config, appURL) : null;
  } catch {
    return null;
  }
};

export const betterAuthPlugins = [
  // 1. Phone OTP authentication
  phoneNumber({
    expiresIn: 300,
    allowedAttempts: 3,
    sendOTP: async ({ phoneNumber: phone, code }, request) => {
      // In production, dispatch via Korean MMS/SMS carrier endpoint.
      // In development or preview, log OTP to console for immediate verification.
      if (process.env.NODE_ENV !== "production") {
        console.info(`[Phone OTP] Code for ${phone}: ${code}`);
      }
    },
    signUpOnVerification: {
      getTempEmail: (phone) => `${phone.replace(/\D/g, "")}@users.sophomores.co`,
      getTempName: (phone) => `Attendee ${phone.slice(-4)}`,
    },
  }),
  // 2. Email Magic Link authentication
  magicLink({
    expiresIn: 300,
    storeToken: "hashed",
    sendMagicLink: async ({ email, token, url }, request) => {
      const mailer = getMailer();
      if (mailer) {
        try {
          await mailer({ type: "magic-link", email, url });
          return;
        } catch (e) {
          console.error("Failed to send magic link email:", e);
        }
      }
      if (process.env.NODE_ENV !== "production") {
        console.info(`[Magic Link] for ${email} (token: ${token}): ${url}`);
      }
    },
  }),
  // 3. Email OTP fallback
  emailOTP({
    expiresIn: 300,
    allowedAttempts: 3,
    storeOTP: "hashed",
    async sendVerificationOTP({ email, otp, type }) {
      const mailer = getMailer();
      if (mailer) {
        try {
          await mailer({ type: "email-otp", email, otp });
          return;
        } catch (e) {
          console.error("Failed to send OTP email:", e);
        }
      }
      if (process.env.NODE_ENV !== "production") {
        console.info(`[Email OTP] (${type}) for ${email}: ${otp}`);
      }
    },
  }),
  // 4. Passkey biometric authentication
  passkey({
    rpID: appHost,
    rpName: "Sophomores",
    origin: appURL,
    authenticatorSelection: {
      userVerification: "preferred",
      residentKey: "preferred",
    },
  }),
  multiSession(),
  nextCookies(),
] satisfies BetterAuthOptionsType["plugins"];

export const betterAuthOptions = {
  appName: "Sophomores",
  baseURL: appURL,
  trustedOrigins: [appURL],
  secret:
    process.env.BETTER_AUTH_SECRET ||
    process.env.PAYLOAD_SECRET ||
    "sophomores_better_auth_dev_secret_2026",
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
        process.env.GOOGLE_CLIENT_ID || process.env.MEMBER_AUTH_GOOGLE_CLIENT_ID
      ),
    },
  },
  user: {
    additionalFields: {
      phone: {
        type: "string",
        required: false,
      },
      ticketTier: {
        type: "string",
        defaultValue: "none",
        required: false,
      },
      role: {
        type: "string",
        defaultValue: "user",
        input: false,
      },
      verified: {
        type: "boolean",
        defaultValue: false,
        input: false,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 24 hours
    cookieCache: {
      enabled: false,
    },
  },
  advanced: {
    database: {
      generateId: "uuid",
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (isStaffEmail(user.email)) {
            return {
              data: {
                ...user,
                role: "staff",
                membershipStatus: "staff",
              },
            };
          }
        },
        after: async (user) => {
          if (user.email && isStaffEmail(user.email)) {
            await ensureStaffAdminProvisioned({
              email: user.email,
              name: user.name,
              id: user.id,
            });
          }
        },
      },
      update: {
        before: async (user) => {
          if (user.email && isStaffEmail(user.email)) {
            return {
              data: {
                ...user,
                role: "staff",
                membershipStatus: "staff",
              },
            };
          }
        },
        after: async (user) => {
          if (user.email && isStaffEmail(user.email)) {
            await ensureStaffAdminProvisioned({
              email: user.email,
              name: user.name,
              id: user.id,
            });
          }
        },
      },
    },
  },
} satisfies BetterAuthOptionsType;

export const betterAuthPluginOptions: PayloadAuthOptions = {
  disabled: false,
  hidePluginCollections: true,
  users: {
    slug: "users",
    hidden: false,
    roles: ["admin", "editor", "staff", "user"],
    defaultRole: "user",
    adminRoles: ["admin"],
    allowedFields: [
      "name",
      "email",
      "phone",
      "role",
      "membershipStatus",
      "localePreference",
      "ticketTier",
    ],
    collectionOverrides: (options) => {
      // 3. Block users from admin: regular users can NEVER access Payload Admin
      options.collection.access = {
        ...options.collection.access,
        admin: () => false,
      };
      return options.collection;
    },
  },
  pluginCollectionOverrides: {
    passkeys: ({ collection }) => {
      const credField = collection.fields.find(
        (f) => "name" in f && f.name === "credentialId"
      );
      if (credField && typeof credField === "object") {
        (credField as { index?: boolean }).index = true;
      }
      return collection;
    },
  },
  betterAuthOptions,
};

export type ConstructedBetterAuthPluginOptions = typeof betterAuthPluginOptions;
