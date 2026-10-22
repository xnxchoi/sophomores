export const dynamic = "force-dynamic";

interface LoginPageProps {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const invalid = (await searchParams).error === "credentials";
  return (
    <>
      {invalid && (
        <p className="my-4 border-l-2 border-current pl-3 text-preview-error" role="alert">
          The username or password is incorrect. Please try again.
        </p>
      )}
      <form method="post" action="/api/session">
        <label className="mt-5 block" htmlFor="username">User</label>
        <input
          className="mt-1.5 block w-full rounded-md border border-preview-border bg-preview-input p-3 text-inherit focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-preview-accent"
          id="username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={128}
          required
        />
        <label className="mt-5 block" htmlFor="password">Passcode</label>
        <input
          className="mt-1.5 block w-full rounded-md border border-preview-border bg-preview-input p-3 text-inherit focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-preview-accent"
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          maxLength={1024}
          required
        />
        <label className="mt-5 flex items-center gap-3">
          <input
            className="size-5 shrink-0 accent-preview-accent focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-preview-accent"
            type="checkbox"
            name="remember"
            value="yes"
            defaultChecked
          />
          Remember
        </label>
        <button
          className="mt-7 w-full cursor-pointer rounded-md border-0 bg-preview-accent p-3.25 font-semibold text-preview-on-accent focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-preview-accent"
          type="submit"
        >
          Preview
        </button>
      </form>
    </>
  );
}
