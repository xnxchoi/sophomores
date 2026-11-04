// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProviderButton } from "./ProviderButton";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const signInSocial = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/auth/client", () => ({
  authClient: {
    signIn: {
      social: (...args: unknown[]) => signInSocial(...args)
    }
  }
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) =>
    key === "providers.signInWith" ? "Sign in with" : key
}));

vi.mock("@/components/ui/button", () => ({
  Button: (props: React.ComponentProps<"button">) => <button {...props} />
}));

vi.mock("@/components/ui/sonner", () => ({
  errorToast: vi.fn()
}));

afterEach(() => {
  vi.useRealTimers();
  signInSocial.mockReset();
  signInSocial.mockResolvedValue(undefined);
  document.body.innerHTML = "";
});

describe("ProviderButton", () => {
  const provider = {
    id: "google",
    name: "Google",
    kind: "social" as const,
    icon: (props: React.SVGProps<SVGSVGElement>) => (
      <svg data-testid="provider-icon" {...props} />
    )
  };

  function setup({ isSubmitting }: { isSubmitting: boolean }) {
    const setIsSubmitting = vi.fn();
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <ProviderButton
          isSubmitting={isSubmitting}
          provider={provider}
          redirectTo="/me"
          setIsSubmitting={setIsSubmitting}
          socialLayout="vertical"
        />
      );
    });

    return {
      button: container.querySelector("button") as HTMLButtonElement,
      container,
      root,
      setIsSubmitting
    };
  }

  it("stays labeled while another authentication method is submitting", () => {
    const { button, container, root } = setup({ isSubmitting: true });

    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain("Sign in with Google");
    expect(container.querySelector('[data-testid="provider-icon"]')).not.toBeNull();
    expect(container.querySelector(".animate-spin")).toBeNull();

    act(() => root.unmount());
  });

  it("shows a spinner only after its own provider is clicked", async () => {
    let resolveSignIn: (() => void) | undefined;
    signInSocial.mockImplementation(
      () => new Promise<void>((resolve) => (resolveSignIn = resolve))
    );
    const { button, container, root, setIsSubmitting } = setup({
      isSubmitting: false
    });

    await act(async () => {
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(setIsSubmitting).toHaveBeenCalledWith(true);
    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-label")).toBe("Sign in with Google");
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(container.querySelector(".animate-spin")).not.toBeNull();
    expect(container.querySelector('[data-testid="provider-icon"]')).toBeNull();

    await act(async () => {
      resolveSignIn?.();
      await Promise.resolve();
      root.unmount();
    });
  });

  it("cancels a reset when the button unmounts", async () => {
    vi.useFakeTimers();
    const { button, root, setIsSubmitting } = setup({
      isSubmitting: false
    });

    await act(async () => {
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });
    act(() => root.unmount());
    await vi.advanceTimersByTimeAsync(10000);

    expect(setIsSubmitting).toHaveBeenCalledTimes(1);
    expect(setIsSubmitting).toHaveBeenNthCalledWith(1, true);
  });

  it("does not schedule a reset when sign-in resolves after unmount", async () => {
    vi.useFakeTimers();
    let resolveSignIn: (() => void) | undefined;
    signInSocial.mockImplementation(
      () => new Promise<void>((resolve) => (resolveSignIn = resolve))
    );
    const { button, root, setIsSubmitting } = setup({
      isSubmitting: false
    });

    await act(async () => {
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });
    act(() => root.unmount());
    await act(async () => {
      resolveSignIn?.();
      await Promise.resolve();
    });
    await vi.advanceTimersByTimeAsync(10000);

    expect(setIsSubmitting).toHaveBeenCalledTimes(1);
    expect(setIsSubmitting).toHaveBeenNthCalledWith(1, true);
  });

  it("signs in generic providers with provider", async () => {
    const setIsSubmitting = vi.fn();
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    const kakao = {
      id: "kakao",
      name: "Kakao",
      kind: "social" as const,
      icon: (props: React.SVGProps<SVGSVGElement>) => <svg {...props} />
    };

    act(() => {
      root.render(
        <ProviderButton
          isSubmitting={false}
          provider={kakao}
          redirectTo="/me"
          setIsSubmitting={setIsSubmitting}
          socialLayout="vertical"
        />
      );
    });

    const button = container.querySelector("button") as HTMLButtonElement;
    await act(async () => {
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(signInSocial).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "kakao",
        callbackURL: "/me"
      })
    );

    act(() => root.unmount());
  });
});
