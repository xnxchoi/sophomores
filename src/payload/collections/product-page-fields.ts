import english from "../../../messages/en.json";
import { InlineToolbarFeature, ItalicFeature, LinkFeature, ParagraphFeature, lexicalEditor } from "@payloadcms/richtext-lexical";
import type { Field } from "payload";

// Product page content (owner, 23 Nov: stripe.press-style content fields, "1. yes"; spec by UI-Commerce,
// product-content-fields-spec-20261123.md). Business-supplied content, edited in Payload (owner rule, 19 Nov).
// Every field is optional, so nothing blocks publishing; a missing field hides its section. Read access is the
// product's own (published and approved products only); no field here takes part in commerce.
const label = english.Staff.schema;

// Paragraphs, italics and links to an outside page only (no internal-document links).
const proseEditor = lexicalEditor({ features: [ParagraphFeature(), ItalicFeature(), LinkFeature({ enabledCollections: [] }), InlineToolbarFeature()] });

const httpsOnly = (value: unknown) =>
  value == null || value === "" || (typeof value === "string" && value.startsWith("https://") && URL.canParse(value)) || "Use a full https:// link";
const wholeNumber = (value: unknown) => value == null || (Number.isSafeInteger(value) && Number(value) >= 0) || "Use a whole number, 0 or more";
const oneDecimal = (value: unknown) =>
  value == null || (typeof value === "number" && value >= 0 && Math.abs(value * 10 - Math.round(value * 10)) < 1e-9) || "Use a number with at most one decimal, 0 or more";

export const ProductPageFields: Field[] = [{
  name: "page", type: "group", label: label.productPage,
  fields: [
    { name: "shelfTitle", type: "text", maxLength: 60, label: label.productShelfTitle },
    { name: "shelfOrder", type: "number", label: label.productShelfOrder,
      validate: (value: unknown) => value == null || Number.isSafeInteger(value) || "Use a whole number" },
    { name: "kicker", type: "text", maxLength: 40, label: label.productKicker },
    { name: "byline", type: "text", maxLength: 120, label: label.productByline },
    { name: "stageArt", type: "upload", relationTo: "media", label: label.productStageArt },
    { name: "longDescription", type: "richText", editor: proseEditor, label: label.productLongDescription },
    { name: "about", type: "group", label: label.productAbout, fields: [
      { name: "heading", type: "text", maxLength: 40, label: label.productAboutHeading },
      { name: "body", type: "richText", editor: proseEditor, label: label.productAboutText },
      { name: "links", type: "array", maxRows: 6, label: label.productAboutLinks, fields: [
        { name: "label", type: "text", required: true, label: label.productLinkLabel },
        { name: "url", type: "text", required: true, validate: httpsOnly, label: label.productLinkURL },
      ] },
    ] },
    { name: "formats", type: "array", maxRows: 4, label: label.productOtherFormats, fields: [
      { name: "label", type: "text", required: true, label: label.productLinkLabel },
      { name: "url", type: "text", validate: httpsOnly, label: label.productLinkURL },
      { name: "note", type: "text", label: label.productFormatNote },
      { name: "effect", type: "select", defaultValue: "none", label: label.productFormatEffect, options: [
        { label: label.productEffectNone, value: "none" },
        { label: label.productEffectHologram, value: "hologram" },
        { label: label.radio, value: "radio" },
      ] },
    ] },
    { name: "praise", type: "array", maxRows: 8, label: label.productPraise, fields: [
      { name: "quote", type: "textarea", required: true, maxLength: 600, label: label.productPraiseQuote },
      { name: "name", type: "text", required: true, label: label.productPraiseName },
      { name: "role", type: "text", label: label.productPraiseRole },
      { name: "url", type: "text", validate: httpsOnly, label: label.productLinkURL },
    ] },
    { name: "details", type: "group", label: label.productDetails, fields: [
      { name: "trimWidthMM", type: "number", validate: oneDecimal, label: label.productTrimWidth },
      { name: "trimHeightMM", type: "number", validate: oneDecimal, label: label.productTrimHeight },
      { name: "spineMM", type: "number", validate: oneDecimal, label: label.productSpine },
      { name: "weightG", type: "number", validate: wholeNumber, label: label.productWeight },
      { name: "pages", type: "number", validate: wholeNumber, label: label.productPages },
      { name: "words", type: "number", validate: wholeNumber, label: label.productWords },
    ] },
    { name: "typefaces", type: "array", label: label.productTypefaces, fields: [
      { name: "name", type: "text", required: true, label: label.productPraiseName },
      { name: "foundry", type: "text", label: label.productFoundry },
    ] },
    { name: "materials", type: "array", label: label.productMaterials, fields: [{ name: "item", type: "text", required: true, label: label.productListItem }] },
    { name: "techniques", type: "array", label: label.productTechniques, fields: [{ name: "item", type: "text", required: true, label: label.productListItem }] },
    { name: "gallery", type: "array", maxRows: 12, label: label.productGallery, fields: [
      { name: "image", type: "upload", relationTo: "media", required: true, label: label.productGalleryImage },
      { name: "caption", type: "text", label: label.productGalleryCaption },
    ] },
    { name: "book", type: "group", label: label.productBook, fields: [
      { name: "coverDiffuse", type: "upload", relationTo: "media", label: label.productBookCoverArt },
      { name: "coverBumpBase", type: "upload", relationTo: "media", label: label.productBookGrainBump },
      { name: "coverBumpCustom", type: "upload", relationTo: "media", label: label.productBookEmbossBump },
      { name: "coverFoil", type: "upload", relationTo: "media", label: label.productBookFoilMask },
      { name: "coverGloss", type: "upload", relationTo: "media", label: label.productBookGlossMask },
      { name: "coverGlitter", type: "upload", relationTo: "media", label: label.productBookGlitterTile },
      { name: "pages", type: "array", maxRows: 24, label: label.productBookPages, fields: [
        { name: "front", type: "upload", relationTo: "media", label: label.productBookPageFront },
        { name: "back", type: "upload", relationTo: "media", label: label.productBookPageBack },
      ] },
    ] },
  ],
}];
