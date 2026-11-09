//TODO: Decide whether to colocate layout shells like these with its children, or with other shells
import type { ReactNode } from "react";

/** The Hideaway auth card: centered, 384px, sans title, faded ground. */
export function AuthPanel({
  title,
  description,
  children,
  footer
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[384px] flex-col gap-6">
      <div className="rounded-xl bg-faded-bg/50 px-6 py-6">
        <header className="mb-2 text-center">
          <h2 className="mb-2 font-sans text-[22.5px] font-medium tracking-tight text-off-fg">
            {title}
          </h2>
          {description ? (
            <p className="font-sans text-[12px] text-muted-foreground">
              {description}
            </p>
          ) : null}
        </header>
        {children}
        {footer ? (
          <div className="mt-6 text-center text-[12px] text-muted-foreground">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
