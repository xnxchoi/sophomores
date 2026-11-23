import messages from "../../messages/en.json";

/**
 * The sign-in code step uses Arc's six-cell code input (owner-approved sign-in step, 23 Nov): a labelled group of six
 * single-character inputs. A full code typed, pasted or autofilled into the first cell fills all six, as browsers do
 * with one-time codes; these helpers address that first cell and read the code back across the cells.
 */
type LabelQueries = {
  getByLabelText: (text: string) => HTMLElement;
  getAllByLabelText: (text: RegExp) => HTMLElement[];
};

export const codeLabel = messages.AuthPhase.code;

/** The first cell: where a whole code lands. */
export function firstCodeCell(screen: LabelQueries) {
  return screen.getByLabelText(
    `${codeLabel}, digit 1 of 6`
  ) as HTMLInputElement;
}

/** The code as entered, read across all six cells. */
export function enteredCode(screen: LabelQueries) {
  return screen
    .getAllByLabelText(new RegExp(`^${codeLabel}, digit [1-6] of 6$`))
    .map((cell) => (cell as HTMLInputElement).value)
    .join("");
}

/** Replace the whole code, as a person does when retyping it: empty the cells from the end, then enter the new code. */
export function replaceCode(
  screen: LabelQueries,
  change: (element: Element, init: { target: { value: string } }) => unknown,
  value: string
) {
  for (let digit = 6; digit >= 1; digit--)
    change(screen.getByLabelText(`${codeLabel}, digit ${digit} of 6`), {
      target: { value: "" }
    });
  if (value) change(firstCodeCell(screen), { target: { value } });
}

/**
 * What a screen reader announces as the code's description, read from the cells' aria-describedby (every cell must
 * carry the same description): the step's feedback (expired code, cooldown, recovery) and any rejected-code error.
 */
export function codeDescription(screen: LabelQueries) {
  const cells = screen.getAllByLabelText(
    new RegExp(`^${codeLabel}, digit [1-6] of 6$`)
  );
  const ids = cells.map((cell) => cell.getAttribute("aria-describedby") ?? "");
  if (cells.length !== 6 || new Set(ids).size !== 1 || !ids[0])
    throw new Error(`every code cell needs the same aria-describedby, got ${JSON.stringify(ids)}`);
  return ids[0]
    .split(/\s+/)
    .map((id) => {
      const node = document.getElementById(id);
      if (!node) throw new Error(`aria-describedby names a missing element: ${id}`);
      return node.textContent ?? "";
    })
    .join(" ");
}

/** One cell, 1 to 6. */
export function codeCell(screen: LabelQueries, digit: number) {
  return screen.getByLabelText(
    `${codeLabel}, digit ${digit} of 6`
  ) as HTMLInputElement;
}

/** Each cell's character in order, "" for an empty cell, so a gap stays visible. */
export function codeCells(screen: LabelQueries) {
  return [1, 2, 3, 4, 5, 6].map((digit) => codeCell(screen, digit).value);
}

/**
 * The six code cells inside a rendered step or phase (for tests that query by container rather than screen). Throws
 * unless exactly six are present, so an absent code field can never pass as an empty code.
 */
export function codeCellsIn(root: ParentNode) {
  const cells = [...root.querySelectorAll<HTMLInputElement>("[data-email-code-field] input")];
  if (cells.length !== 6) throw new Error(`expected the six code cells, found ${cells.length}`);
  return cells;
}

/** The code as entered, read across the cells inside `root`. */
export function codeIn(root: ParentNode) {
  return codeCellsIn(root).map((cell) => cell.value).join("");
}

/**
 * What assistive technology reads from an element: its text without aria-hidden parts. Arc's field messages render
 * the copy once for assistive technology and once as aria-hidden animated words, so textContent holds it twice.
 */
export function spokenText(element: Element) {
  const copy = element.cloneNode(true) as Element;
  copy.querySelectorAll('[aria-hidden="true"]').forEach((node) => node.remove());
  return copy.textContent ?? "";
}

/** The text shown on screen: the aria-hidden animated copy where there is one, otherwise the plain text. */
export function shownText(element: Element) {
  const words = [...element.querySelectorAll('[aria-hidden="true"]')].filter((node) => node.textContent?.trim());
  return words.length ? words.map((node) => node.textContent ?? "").join("") : (element.textContent ?? "");
}

/** All text that the cells' aria-describedby names, read as assistive technology reads it. */
export function codeDescriptionIn(root: ParentNode) {
  const ids = codeCellsIn(root).map((cell) => cell.getAttribute("aria-describedby") ?? "");
  if (ids.length !== 6 || new Set(ids).size !== 1 || !ids[0])
    throw new Error(`every code cell needs the same aria-describedby, got ${JSON.stringify(ids)}`);
  return ids[0]
    .split(/\s+/)
    .map((id) => {
      const node = document.getElementById(id);
      if (!node) throw new Error(`aria-describedby names a missing element: ${id}`);
      return spokenText(node);
    })
    .join(" ");
}
