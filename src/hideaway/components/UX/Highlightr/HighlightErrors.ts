import type { KeysOfUnion, NestedKeysUnion } from "@/hideaway/utilities/typeUtilities";

export type HighlightOperationTypes = "fetch" | "create" | "update" | "delete";

type HighlightBaseErrors = typeof baseErrors;
type HighlightCRUDErrors = typeof baseCRUD;
type HighlightErrors = HighlightBaseErrors & HighlightCRUDErrors;
type HighlightBaseErrorCategories = keyof HighlightBaseErrors;
type HighlightCRUDErrorsCategories = keyof HighlightCRUDErrors;
type HighlightErrorCategories =
  | HighlightCRUDErrorsCategories
  | HighlightBaseErrorCategories;
type FetchErrors = typeof baseFetch;
type CreateErrors = typeof baseCreate;
type UpdateErrors = typeof baseUpdate;
type DeleteErrors = typeof baseDelete;
type PerTypeErrors<T extends HighlightOperationTypes> = T extends "fetch"
  ? FetchErrors
  : T extends "create"
    ? CreateErrors
    : T extends "update"
      ? UpdateErrors
      : T extends "delete"
        ? DeleteErrors
        : never;
type PerTypeErrorCategories<T extends HighlightOperationTypes> =
  | keyof PerTypeErrors<T>
  | HighlightErrorCategories;
type HighlightErrorObject<
  M extends HighlightOperationTypes,
  T extends HighlightErrorCategories,
  E extends keyof HighlightErrors[T]
> = {
  message: string;
  cause: unknown;
  operation: M;
  type: T;
  errorType: E;
  [key: string]: unknown;
};
const baseErrors = {
  user: {
    unauthorized: "You are not authorized to add highlights.",
    not_authenticated: "Please check in to add highlights."
  },
  network: {
    not_found: "Target document not found.",
    unknown:
      "Something went wrong- we're not sure exactly what. We do know it's likely a network issue. Check your connection, or reach out to us- we're here to help.",
    connection:
      "Failed to connect to the network. Check your connection and try again.",
    timeout: "Request timed out. Try again in a few secs!",
    aborted: "Request was aborted.",
    too_many_requests:
      "You made too many requests at once! If it's really you, let's slow down a little."
  },
  unknown: {
    unknown:
      "Something went wrong- we're not sure exactly what. We do know it's likely a network issue. Check your connection, or reach out to us- we're here to help."
  }
};
const baseRUCD = {
  target: {
    invalid: "Target document is invalid.",
    disabled: "Highlighting is disabled for the document."
  }
};
const baseUCD = {
  params: {
    invalid:
      "Some of the information you passed to us is invalid. If you are stuck - or it just doesn't seem right - let us know.",
    missing:
      "The data you passed us is missing a few required fields. If you are stuck - or it just doesn't seem right - let us know."
  }
};
const baseUC = {
  selection: {
    invalid:
      "Selection is invalid; check that you are not selecting random stuff on the page.",
    empty: "Empty selection!",
    too_long: "Selection is too long- can we trim that down a little?",
    too_short: "Selection is too short- can we make it a bit longer?"
  }
};
const baseCreate = {
  memo: {
    empty: "You can't save an empty memo."
  },
  params: {
    ...baseUCD.params,
    container:
      "There was an issue locating something: it'll most likely be solved with a reload! If this persists, let us know."
  },
  unknown: {
    unknown:
      "We couldn't create your highlight! Try again after a bit, erase your cookies & history if that doesn't work. Let us know if we can help. Two (or more) heads are better than one!"
  }
};
const baseUpdate = {
  unknown: {
    unknown:
      "We couldn't update your highlight! Try again after a bit, erase your cookies & history if that doesn't work. Let us know if we can help. Two (or more) heads are better than one!"
  }
};
const baseFetch = {
  unknown: {
    unknown:
      "We couldn't fetch your highlights! Please check the network connection and try again. If the issue persists, please  let us know."
  }
};
const baseDelete = {
  unknown: {
    unknown:
      "We couldn't delete your highlight! Try again after a bit, erase your cookies & history if that doesn't work. Let us know if we can help. Two (or more) heads are better than one!"
  }
};

const baseCRUD = {
  ...baseUCD,
  ...baseUC,
  ...baseRUCD,

  unknown: {
    unknown:
      "Something went wrong- we're not sure exactly what. We do know it's likely a network issue. Check your connection, or reach out to us- we're here to help."
  }
};
const highlightCreateErrorMap = {
  ...baseErrors,
  ...baseUCD,
  ...baseUC,
  ...baseRUCD,
  ...baseCreate,
  unknown: {
    ...baseCreate.unknown
  }
};

const highlightUpdateErrorMap = {
  ...baseErrors,
  ...baseUCD,
  ...baseUC,
  ...baseRUCD,
  ...baseUpdate,
  unknown: {
    ...baseUpdate.unknown
  }
};

const highlightDeleteErrorMap = {
  ...baseErrors,
  ...baseUCD,
  ...baseUC,
  ...baseRUCD,
  ...baseDelete,
  unknown: {
    ...baseDelete.unknown
  }
};
const highlightFetchErrorMap = {
  ...baseErrors,
  ...baseRUCD,
  ...baseFetch,
  unknown: {
    ...baseFetch.unknown
  }
};
const highlightErrorMa = {
  fetch: highlightFetchErrorMap,
  create: highlightCreateErrorMap,
  update: highlightUpdateErrorMap,
  delete: highlightDeleteErrorMap
} as const;
type HighlightErrorsMapping = {
  [key in HighlightOperationTypes]: (typeof highlightErrorMa)[key];
};
const highlightErrorMap: HighlightErrorsMapping = {
  fetch: highlightFetchErrorMap,
  create: highlightCreateErrorMap,
  update: highlightUpdateErrorMap,
  delete: highlightDeleteErrorMap
};

export class HighlightError<T extends HighlightOperationTypes> extends Error {
  override name = "HighlightError";

  constructor(
    operation: T,
    type: KeysOfUnion<HighlightErrorsMapping[T]>,
    errorType: NestedKeysUnion<HighlightErrorsMapping[T]>
  ) {
    super();
    this.cause = type;
    this.errorType = errorType;
    const map = highlightErrorMap[operation];
    const vc = map[type];
    this.message = vc[errorType] as unknown as string;
  }

  override message: string;
  override cause: KeysOfUnion<
    HighlightErrorsMapping[keyof HighlightErrorsMapping]
  >;
  errorType: NestedKeysUnion<
    HighlightErrorsMapping[keyof HighlightErrorsMapping]
  >;
}
export class HighlightFetchError extends HighlightError<"fetch"> {
  override name = "HighlightFetchError";

  constructor(
    type: HighlightBaseErrorCategories = "unknown",
    errorType: NestedKeysUnion<HighlightErrorsMapping["fetch"]>
  ) {
    super("fetch", type, errorType);
  }
}

export class HighlightCreateError extends HighlightError<"create"> {
  override name = "HighlightCreateError";

  constructor(
    type: PerTypeErrorCategories<"create"> = "unknown",
    errorType: NestedKeysUnion<HighlightErrorsMapping["create"]>
  ) {
    super("create", type, errorType);
  }
}

export class HighlightUpdateError extends HighlightError<"update"> {
  override name = "HighlightUpdateError";

  constructor(
    type: PerTypeErrorCategories<"update"> = "unknown",
    errorType: NestedKeysUnion<HighlightErrorsMapping["update"]>
  ) {
    super("update", type, errorType);
  }
}
export class HighlightDeleteError extends HighlightError<"delete"> {
  override name = "HighlightDeleteError";

  constructor(
    type: PerTypeErrorCategories<"delete"> = "unknown",
    errorType: NestedKeysUnion<HighlightErrorsMapping["delete"]>
  ) {
    super("delete", type, errorType);
  }
}
