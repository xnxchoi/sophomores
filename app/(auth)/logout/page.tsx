export const dynamic = "force-dynamic";

export default function LogoutPage() {
  return (
    <>
      <h1 className="mb-2 text-4xl font-medium tracking-[-1.5px]">Sign out?</h1>
      <p className="my-4 text-preview-secondary">This will end the preview session in this browser.</p>
      <form method="post" action="/api/session/logout">
        <button
          className="mt-7 w-full cursor-pointer rounded-md border-0 bg-preview-accent p-3.25 font-semibold text-preview-on-accent focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-preview-accent"
          type="submit"
        >
          Sign out
        </button>
      </form>
      {/* Native navigation is intentional: the login document cannot load client JS. */}
      <p className="my-4">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className="text-preview-accent underline focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-preview-accent" href="/">
          Back to preview
        </a>
      </p>
    </>
  );
}
