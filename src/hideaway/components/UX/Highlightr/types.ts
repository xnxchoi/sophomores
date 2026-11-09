import {Citation} from "@/payload-types";
import { AuthorOverview } from "@types/collections/users";
import type {Operation} from "payload";
import type * as rangey from "rangy";

export type RangeUpdateParams = {
  memo?: string | null;
  private?: boolean;
};
export type RangeSaveParams = {
  author: string;
  selection: {
    text: string;
    before: string;
    after: string;
  };
  target: {
    value: string;
    relationTo: Citation["target"]["relationTo"];
  };
  cited: string;
  reference: string;

  memo?: string | null;
  private?: boolean;
};
/**
 * Type for expected data passed in Citation Collection hooks for create operations
 *
 * Consider it a subset of what's actually required for creation, accounting for fields handled automatically in beforeValidate:
 * - quote
 * - path
 */
export type CreateCitationData = {
  author: string;
  cited: string;
  reference: string;
  memo?: string | null;
  private: boolean;
  selection: {
    text: string;
    before: string;
    after: string;
  };
  target: {
    value: string;
    relationTo: Citation["target"]["relationTo"];
  };
};
/**
 * Type for expected data passed in Citation Collection hooks for update operations
 *
 * This serves two purposes:
 *  1) To omit fields that should not be updated
 *    - id
 *    - reference
 *    - selection
 *    - cited
 *    - target
 *    - createdAt
 *    - updatedAt
 *    - author
 *  2) To omit fields that should be handled programmatically
 *    - path
 *    - quote
 */
export type UpdateCitationData = Partial<
  Pick<CreateCitationData, "memo" | "private" | "selection">
>;
/**
 * What should be returned when making changes in beforeValidate/beforeChange hooks for Citation
 */
export type ReturnedCitationData = {
  reference: string;
  selection: {
    text: string;
    before: string;
    after: string;
  };
  path: string;
  author: string;
  quote: string;
  cited: string;
  target: {
    value: string;
    relationTo: Citation["target"]["relationTo"];
  };
  memo?: string | null;
  private: boolean;
};
export type CitationData<T extends Operation> = T extends "create"
  ? CreateCitationData
  : T extends "update"
    ? UpdateCitationData
    : undefined | Partial<Citation>;
export type RangeCreateParams = RangeSaveParams;
export type CreateCallbackParams = Omit<
  RangeCreateParams,
  "selection" | "target" | "author" | "reference" | "cited" | "color"
>;
export type CitationCreateParamKeys = keyof RangeCreateParams;
export type CitationUpdateParamKeys = keyof RangeUpdateParams;
export type FetchedCitation = {
  id: string;
  cited: string;
  quote: string;
  selection: {
    text: string;
    before: string;
    after: string;
  };
  target: {
    value: string;
    relationTo: Citation["target"]["relationTo"];
  };
  author: AuthorOverview;
  memo?: string | null;
  private: boolean;
  reference: string;
  createdAt: string;
  updatedAt: string;
  path: string;
};
export type PreppedRangy = Partial<
  Pick<FetchedCitation, "id" | "updatedAt" | "createdAt" | "path">
> &
  Omit<FetchedCitation, "id" | "updatedAt" | "createdAt" | "path">;
export type ProcessedRangy = FetchedCitation;
export type HighlightedRange = ProcessedRangy & {
  range: rangey.RangyRange;
  els: Element[];
};

export type CitationRange = Pick<
  Citation,
  | "selection"
  | "id"
  | "private"
  | "reference"
  | "createdAt"
  | "quote"
  | "path"
  | "memo"
>;
export type HighlightsCollectionSlug = Citation["target"]["relationTo"];
