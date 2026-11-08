// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const messages: Record<string, string> = {
  "signIn.title": "Sign In",
  "signIn.description": "Enter your email below to login to your account",
  "signIn.action": "Login",
  "signIn.usernamePlaceholder": "Username or email",
  "signIn.forgotPasswordLink": "Forgot your password?",
  "signUp.title": "Sign Up",
  "signUp.description": "Enter your information to create an account",
  "signUp.action": "Create an account",
  "forgotPassword.title": "Forgot Password",
  "forgotPassword.description": "Enter your email to reset your password",
  "forgotPassword.action": "Send reset link",
  "resetPassword.title": "Reset Password",
  "resetPassword.description": "Enter your new password below",
  "resetPassword.action": "Save new password",
  "resetPassword.newPassword": "New Password",
  "resetPassword.newPasswordPlaceholder": "New Password",
  "resetPassword.newPasswordRequired": "New password is required",
  "fields.email": "Email",
  "fields.username": "Username",
  "fields.password": "Password",
  "fields.name": "Name",
  "fields.location": "Location",
  "fields.bio": "Bio",
  "fields.link": "Link",
  "fields.passwordPlaceholder": "Password",
  "fields.emailPlaceholder": "m@example.com",
  "fields.namePlaceholder": "Name",
  "fields.usernamePlaceholder": "Username",
  "fields.locationPlaceholder": "Seoul, South Korea",
  "fields.bioPlaceholder": "I am an artist...",
  "fields.linkPlaceholder": "",
  "fields.isRequired": "is required",
  "fields.isInvalid": "is invalid",
  "fields.passwordRequired": "Password is required",
  "providers.signInWith": "Sign in with",
  "providers.orContinueWith": "Or continue with",
  "providers.passkey": "Passkey",
  "footer.dontHaveAccount": "Don't have an account?",
  "footer.alreadyHaveAccount": "Already have an account?",
  "footer.goBack": "Go back",
  "footer.termsLead": "By clicking continue, you agree to our",
  "footer.terms": "Terms of Service",
  "footer.privacy": "Privacy Policy",
  "footer.termsAnd": "and",
  requestFailed: "Request failed"
};

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => messages[key] ?? key
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn()
  }),
  usePathname: () => "/sign-in"
}));

vi.mock("next-transition-router", () => ({
  Link: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  useTransitionRouter: () => ({
    push: vi.fn(),
    replace: vi.fn()
  })
}));

vi.mock("@/components/core/Link/Link", () => ({
  Link: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

vi.mock("@/lib/auth/client", () => ({
  authClient: {
    signIn: {
      social: vi.fn(),
      email: vi.fn(),
      username: vi.fn(),
      passkey: vi.fn()
    },
    signUp: { email: vi.fn() },
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
    useSession: () => ({ refetch: vi.fn() })
  }
}));

vi.mock("@/lib/auth/passkey-enabled", () => ({
  isPasskeyEnabled: () => true
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  )
}));

afterEach(() => {
  document.body.innerHTML = "";
});

async function renderCard(
  view: "SIGN_IN" | "SIGN_UP" | "FORGOT_PASSWORD" | "RESET_PASSWORD"
) {
  const { AuthCard } = await import("./AuthCard");
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(<AuthCard view={view} redirectTo="/me" />);
  });
  return { container, root };
}

describe("AuthCard", () => {
  it("renders the sign-in heading, credentials fields, and social providers", async () => {
    const { container, root } = await renderCard("SIGN_IN");

    expect(container.textContent).toContain("Sign In");
    expect(container.textContent).toContain("Enter your email below to login to your account");
    expect(container.querySelector('input[placeholder="Username or email"]')).not.toBeNull();
    expect(
      container.querySelector('button[aria-label="Sign in with Google"]')
    ).not.toBeNull();
    expect(
      container.querySelector('button[aria-label="Sign in with Naver"]')
    ).not.toBeNull();
    expect(
      container.querySelector('button[aria-label="Sign in with Kakao"]')
    ).not.toBeNull();
    expect(container.textContent).toContain("Passkey");
    expect(container.textContent).toContain("Or continue with");
    expect(container.textContent).toContain("Don't have an account?");
    expect(container.querySelector('a[href="/sign-up"]')).not.toBeNull();
    expect(container.querySelector('a[href="/terms"]')).not.toBeNull();
    expect(container.querySelector('a[href="/privacy"]')).not.toBeNull();
    expect(
      container.querySelector('a[href="/forgot-password"]')?.textContent
    ).toContain("Forgot your password?");

    await act(async () => root.unmount());
  });

  it("renders sign-up extra fields with an account-switch footer", async () => {
    const { container, root } = await renderCard("SIGN_UP");

    expect(container.textContent).toContain("Sign Up");
    expect(container.querySelector('input[placeholder="Name"]')).not.toBeNull();
    expect(container.querySelector('input[placeholder="Username"]')).not.toBeNull();
    expect(container.querySelector('input[placeholder="m@example.com"]')).not.toBeNull();
    expect(
      container.querySelector('input[placeholder="Seoul, South Korea"]')
    ).not.toBeNull();
    expect(container.textContent).toContain("Already have an account?");
    expect(container.querySelector('a[href="/sign-in"]')).not.toBeNull();

    await act(async () => root.unmount());
  });

  it("does not call sign-in when the form is submitted empty", async () => {
    const { container, root } = await renderCard("SIGN_IN");
    const { authClient } = await import("@/lib/auth/client");
    const form = container.querySelector("form");
    expect(form).not.toBeNull();

    await act(async () => {
      form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    expect(authClient.signIn.email).not.toHaveBeenCalled();
    expect(authClient.signIn.username).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Sign In");
    expect(container.textContent).toMatch(/Username is required|Password is required/);

    await act(async () => root.unmount());
  });

  it("renders reset-password card title without the forgot-password description", async () => {
    const { container, root } = await renderCard("RESET_PASSWORD");

    expect(container.textContent).toContain("Reset Password");
    expect(container.textContent).toContain("Enter your new password below");
    expect(container.textContent).not.toContain(
      "Enter your email to reset your password"
    );

    await act(async () => root.unmount());
  });

  it("renders forgot-password with a go-back footer and no social providers", async () => {
    const { container, root } = await renderCard("FORGOT_PASSWORD");

    expect(container.textContent).toContain("Forgot Password");
    expect(container.querySelector('input[type="email"]')).not.toBeNull();
    expect(container.textContent).toContain("Go back");
    expect(container.querySelector('a[href="/sign-in"]')).not.toBeNull();
    expect(container.textContent).toContain("Send reset link");
    expect(container.textContent).not.toContain("Or continue with");
    expect(
      container.querySelector('button[aria-label="Sign in with Google"]')
    ).toBeNull();

    await act(async () => root.unmount());
  });

  it("renders reset-password without social providers", async () => {
    const { container, root } = await renderCard("RESET_PASSWORD");

    expect(container.textContent).not.toContain("Or continue with");
    expect(
      container.querySelector('button[aria-label="Sign in with Google"]')
    ).toBeNull();
    expect(container.querySelector('a[href="/sign-in"]')).not.toBeNull();

    await act(async () => root.unmount());
  });
});
