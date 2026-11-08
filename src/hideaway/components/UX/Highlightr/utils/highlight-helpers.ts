export interface IdentifyableNode extends Element {
  id: string;
  tagName:Uppercase<keyof Pick<HTMLElementTagNameMap,'p'|'blockquote'|'li'|'span'|'div'>>|"MARK";
  dataset: {
    key: string | number;
    selectable: boolean;
  };
}

export function isIdentifyableNode(
  node: Node | null
): node is IdentifyableNode {
  return Boolean(
    node &&
      node.nodeType === Node.ELEMENT_NODE &&
      "dataset" in node &&
      node.dataset &&
      typeof node.dataset === "object" &&
      "selectable" in node.dataset &&
      "key" in node.dataset
  );
}

export function getAnchestorIdentifyableNode(node: Node | null | undefined) {
	// Guard against undefined/null nodes
	if (!node) {
		return false;
	}
  
  if (isIdentifyableNode(node)) {
    switch (node.tagName) {
      case "BLOCKQUOTE":
        return node as HTMLQuoteElement & {
          dataset: {
            key: string | number;
            selectable: boolean;
            [key: string]: unknown;
          }
        };
        case "LI":
          return node as HTMLLIElement & {
            dataset: {
              key: string | number;
              selectable: boolean;
              [key: string]: unknown;
            }
          }
      case "SPAN":
        return node as HTMLSpanElement & {
          dataset: {
            key: string | number;
            selectable: boolean;
            [key: string]: unknown;
          };
        };
      case "DIV":
        return node as HTMLDivElement & {
          dataset: {
            key: string | number;
            selectable: boolean;
            [key: string]: unknown;
          };
        };
      case "P":
        return node as HTMLParagraphElement & {
          dataset: {
            key: string | number;
            selectable: boolean;
            [key: string]: unknown;
          };
        };
      default:
        return node;
    }
  }
  if (node.parentNode) {
    return getAnchestorIdentifyableNode(node.parentNode);
  }
  return false;
}

/**
 * Walks nodes until callback returns something other than undefined
 * @param {Node} node
 * @param {function} func
 * @param {function} callback
 */
export function walkNodes<T>(
  node: Node | undefined | null,
  func: (node: Node | undefined) => Node | null,
  callback: (node: Node | undefined) => T | null | undefined
) {
  if (node === null) return null;
  const ret = callback(node);
  if (ret === null || ret) return ret;
  return walkNodes(func(node), func, callback);
}

export function prevNode(node: Node | null | undefined) {
  let d: Node | null | undefined = node;
  while (d && !d.previousSibling) d = d.parentNode;
  if (!d) return null;
  return d.previousSibling as ChildNode;
}

export function nextNode(node: Node | null | undefined) {
  if (node?.hasChildNodes()) {
    return node.firstChild;
  } else {
    let d: Node | null | undefined = node;
    while (d && !d.nextSibling) d = d.parentNode;
    if (!d) return null;
    const f = d.nextSibling as NonNullable<typeof d.nextSibling>;
    switch (f.nodeType) {
      case Node.ELEMENT_NODE:
        return f as Element & ChildNode;
      case Node.TEXT_NODE:
        return f as Text & ChildNode;
      default:
        return f as ChildNode;
    }
  }
}

/**
 *
 * @param {Element} elem
 * @param {*} target
 */
export function nextUntil(elem: Element, target: Element) {
  const siblings = [elem];
  if (elem === target) return siblings;
  // Get the next sibling element
  let lem = elem.nextElementSibling;

  // As long as a sibling exists
  while (lem) {
    // Otherwise, push it to the siblings array
    siblings.push(lem);
    // If we've reached our match, bail
    if (lem === target) break;
    // Get the next sibling element
    lem = lem.nextElementSibling;
  }
  return siblings;
}

export const isMarkable = (selection: rangy.RangySelection) => {
  const callback = (
    node: Node | undefined
  ):
    | Node
    | undefined
    | (IdentifyableNode &
        (
          | HTMLElement
          | HTMLSpanElement
          | HTMLDivElement
          | HTMLParagraphElement|HTMLQuoteElement
        )) => {
    if (node === undefined) return node;
    if (node.nextSibling && isIdentifyableNode(node.nextSibling)) {
      const t = node.nextSibling.tagName;
      switch (t) {
        case 'BLOCKQUOTE':
          return node.nextSibling as unknown as IdentifyableNode &
            HTMLQuoteElement;
        case "SPAN":
          return node.nextSibling as unknown as IdentifyableNode &
            HTMLSpanElement;
        case "DIV":
          return node.nextSibling as unknown as IdentifyableNode &
            HTMLDivElement;
        case "P":
          return node.nextSibling as unknown as IdentifyableNode &
            HTMLParagraphElement;
        case "MARK":
          return node.nextSibling as unknown as IdentifyableNode & HTMLElement;
        default:
          return node.nextSibling as unknown as IdentifyableNode & HTMLElement;
      }
    }

    return node;
  };
  // Guard against empty selections to avoid IndexSizeError
  if (!selection || selection.rangeCount === 0) return false;
  const range = selection.getRangeAt(0);
  if (selection.isCollapsed) return false;
  const startElement = walkNodes(range.startContainer, prevNode, callback);

  const endElement = walkNodes(range.endContainer, prevNode, callback);
  if (!startElement || !endElement) return false;
  let isSame = startElement === endElement;
  if (!isSame) {
    if (
      startElement.nodeType === Node.TEXT_NODE &&
      endElement.nodeType === Node.TEXT_NODE
    ) {
      const startParent = getAnchestorIdentifyableNode(startElement);
      const endParent = getAnchestorIdentifyableNode(endElement);
      isSame =
        startParent &&
        endParent &&
        startParent.dataset.key === endParent.dataset.key;
    }
  }
  return Boolean(
    isSame &&
      selection.anchorNode &&
      selection.focusNode &&
      getAnchestorIdentifyableNode(selection.anchorNode) &&
      getAnchestorIdentifyableNode(selection.focusNode)
  );
};
/**
 * Returns a safe rangy range if available, otherwise null.
 */
export function ensureRange(
  sel?: rangy.RangySelection | null
): rangy.RangyRange | null {
  if (!sel || typeof sel.rangeCount !== "number" || sel.rangeCount === 0)
    return null;
  try {
    return sel.getRangeAt(0);
  } catch {
    return null;
  }
}

/**
 * Clears the selection safely if possible.
 */
export function clearSelection(sel?: rangy.RangySelection | null): void {
  try {
    sel?.removeAllRanges?.();
  } catch {
    // noop
  }
}
