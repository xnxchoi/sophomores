export type Jump = {
  id: string;
  href: string;
  title: string;
  hint?: string;
};

export const DISCOVER_JUMPS: Jump[] = [
  { id: "j-home", href: "/", title: "Reception", hint: "Home" },
  { id: "j-essays", href: "/essays", title: "Essays", hint: "Long-form" },
  { id: "j-surf", href: "/surf", title: "Surf", hint: "Short waves" },
  { id: "j-radio", href: "/radio", title: "Radio", hint: "Listening room" },
  { id: "j-directory", href: "/users", title: "Directory", hint: "Members" },
  { id: "j-team", href: "/the-team", title: "The Team", hint: "About" },
  { id: "j-plans", href: "/plans", title: "Membership", hint: "Plans" }
];

export const SIGNED_IN_JUMPS = (slug: string): Jump[] => [
  {
    id: "j-profile",
    href: `/@${slug}`,
    title: "Your profile",
    hint: `@${slug}`
  },
  { id: "j-saved", href: "/me/library/saved", title: "Saved", hint: "Library" },
  {
    id: "j-lists",
    href: "/me/library/lists",
    title: "My lists",
    hint: "Library"
  },
  {
    id: "j-posts",
    href: "/me/posts",
    title: "Your posts",
    hint: "Authorship"
  },
  { id: "j-inbox", href: "/me/inbox", title: "Inbox", hint: "Messages" },
  { id: "j-settings", href: "/me/settings", title: "Settings", hint: "Account" }
];

export const SETTINGS_JUMPS: Jump[] = [
  {
    id: "j-set-general",
    href: "/me/settings/general",
    title: "Settings · General",
    hint: "Language, theme"
  },
  {
    id: "j-set-profile",
    href: "/me/settings/profile",
    title: "Settings · Profile",
    hint: "Public identity"
  },
  {
    id: "j-set-account",
    href: "/me/settings/account",
    title: "Settings · Account",
    hint: "Sign-in, billing"
  },
  {
    id: "j-set-security",
    href: "/me/settings/security",
    title: "Settings · Security",
    hint: "2FA, sessions, passkeys"
  },
  {
    id: "j-set-notifications",
    href: "/me/settings/notifications",
    title: "Settings · Notifications",
    hint: "Preferences"
  }
];

export const SIGNED_OUT_JUMPS: Jump[] = [
  {
    id: "j-register",
    href: "/register",
    title: "Create account",
    hint: "Get started"
  },
  { id: "j-sign-in", href: "/sign-in", title: "Sign in" },
  { id: "j-plans", href: "/plans", title: "Membership", hint: "Plans" }
];
