import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { EnglishMessages } from "./english-messages";

/** SSR-only boundary; don't bundle React's server renderer into browser fixtures. */
export function renderWithEnglishMessages(children: ReactNode) {
  return renderToStaticMarkup(<EnglishMessages>{children}</EnglishMessages>);
}
