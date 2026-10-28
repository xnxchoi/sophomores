import type { CollectionConfig } from "payload";
import { APIError } from "payload";

export const HomePage: CollectionConfig = {
  slug: "home-page",
  labels: {
    singular: "Homepage Copy",
    plural: "Homepage Copies",
  },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "_status", "isFallback", "updatedAt"],
    group: "Website Copy",
    description:
      "Multi-version webpage narrative copies. Any staff can save drafts; only Super Admins can publish or change the designated fallback document.",
    livePreview: {
      url: ({ data, locale }) => {
        const code =
          typeof locale === "object" && locale !== null
            ? locale.code
            : locale || "en";
        const draftParam = data?.id ? `&draftId=${data.id}` : "";
        return `/next/preview?url=/&locale=${code}${draftParam}`;
      },
    },
  },
  versions: {
    drafts: {
      autosave: true,
    },
    maxPerDoc: 50,
  },
  access: {
    read: () => true,
    readVersions: () => true,
    create: ({ req }) => Boolean(req.user?.collection === "admins"),
    update: ({ req }) => Boolean(req.user?.collection === "admins"),
    delete: ({ req }) => req.user?.role === "admin",
  },
  hooks: {
    beforeChange: [
      async ({ data, originalDoc, req }) => {
        // Skip internal maintenance updates to avoid recursive cycles
        if (req.context?.internalFallbackOp) {
          return data;
        }

        const isSuperAdmin = req.user?.role === "admin";
        const willBePublished = data._status === "published";

        // 1. Enforce publishing authorization: only super admin can publish
        if (willBePublished && !isSuperAdmin) {
          throw new APIError(
            "Only Super Admins are authorized to publish webpage copy.",
            403
          );
        }

        // 2. Enforce fallback designation authorization: only super admin can change fallback
        const isAttemptingFallback = Boolean(data.isFallback);
        const originalFallback = Boolean(originalDoc?.isFallback);
        const isFallbackChanged = originalDoc
          ? isAttemptingFallback !== originalFallback
          : isAttemptingFallback;

        if (isFallbackChanged && !isSuperAdmin) {
          throw new APIError(
            "Only Super Admins are authorized to change the fallback document designation.",
            403
          );
        }

        // 3. Fallback designation handling:
        // Rule: "The published doc cannot be designated as fallback; trying so will create a duplicate draft that then receives the designation."
        if (data.isFallback) {
          if (willBePublished) {
            // Cannot designate a published document as fallback
            data.isFallback = false;
            req.context = {
              ...req.context,
              duplicateAsFallback: true,
            };
          } else {
            // A draft doc is being designated as fallback. Flag to unset others in afterChange
            req.context = {
              ...req.context,
              unsetOtherFallbacks: true,
            };
          }
        } else if (willBePublished && originalDoc?.isFallback) {
          // If the fallback draft is being published, it loses fallback status upon publication.
          // Auto-duplicate a draft to retain the required fallback version.
          data.isFallback = false;
          req.context = {
            ...req.context,
            duplicateAsFallback: true,
          };
        } else if (originalDoc?.isFallback && data.isFallback === false) {
          // Rule: "we should retain at least one version of the webpage copy that is designated as the effective fallback"
          const otherFallbacks = await req.payload.find({
            collection: "home-page",
            where: {
              and: [
                { isFallback: { equals: true } },
                { id: { not_equals: originalDoc.id } },
              ],
            },
            draft: true,
            limit: 1,
            req,
          });

          if (otherFallbacks.totalDocs === 0) {
            throw new APIError(
              "At least one draft copy must remain designated as the effective fallback.",
              400
            );
          }
        }

        // 4. Enforce single published document when a document becomes published:
        if (willBePublished && originalDoc?._status !== "published") {
          req.context = {
            ...req.context,
            demoteOtherPublished: true,
          };
        }

        return data;
      },
    ],
    afterChange: [
      async ({ doc, req }) => {
        if (req.context?.internalFallbackOp) {
          return;
        }

        // 1. Unset other fallbacks if this draft doc became the fallback
        if (req.context?.unsetOtherFallbacks && doc.isFallback) {
          req.context.unsetOtherFallbacks = false;
          await req.payload.update({
            collection: "home-page",
            where: {
              and: [
                { isFallback: { equals: true } },
                { id: { not_equals: doc.id } },
              ],
            },
            data: { isFallback: false },
            draft: true,
            req,
            context: { internalFallbackOp: true },
          });
        }

        // 2. Demote any previously published doc to draft
        if (req.context?.demoteOtherPublished && doc._status === "published") {
          req.context.demoteOtherPublished = false;
          await req.payload.update({
            collection: "home-page",
            where: {
              and: [
                { _status: { equals: "published" } },
                { id: { not_equals: doc.id } },
              ],
            },
            data: { _status: "draft" },
            draft: true,
            req,
            context: { internalFallbackOp: true },
          });
        }

        // 3. Create duplicate draft if published doc was designated as fallback
        if (req.context?.duplicateAsFallback) {
          req.context.duplicateAsFallback = false;

          const duplicateData: Record<string, unknown> = { ...doc };
          delete duplicateData.id;
          delete duplicateData.createdAt;
          delete duplicateData.updatedAt;

          // Strip internal IDs from sub-arrays so fresh rows are created
          if (Array.isArray(duplicateData.stories)) {
            duplicateData.stories = duplicateData.stories.map(
              ({ id, ...s }: any) => s
            );
          }
          if (Array.isArray(duplicateData.principles)) {
            duplicateData.principles = duplicateData.principles.map(
              ({ id, ...p }: any) => p
            );
          }
          if (Array.isArray(duplicateData.messages)) {
            duplicateData.messages = duplicateData.messages.map(
              ({ id, ...m }: any) => m
            );
          }
          if (Array.isArray(duplicateData.values)) {
            duplicateData.values = duplicateData.values.map(
              ({ id, ...v }: any) => v
            );
          }

          duplicateData.name = `${doc.name || "Homepage Copy"} (Fallback Copy)`;
          duplicateData._status = "draft";
          duplicateData.isFallback = true;

          const internalReq = {
            ...req,
            context: {
              ...req.context,
              internalFallbackOp: true,
              duplicateAsFallback: false,
            },
          };

          // Clear any previous fallback
          await req.payload.update({
            collection: "home-page",
            where: { isFallback: { equals: true } },
            data: { isFallback: false },
            draft: true,
            req: internalReq as any,
          });

          // Create the duplicate draft with fallback designation
          await req.payload.create({
            collection: "home-page",
            data: duplicateData as any,
            draft: true,
            req: internalReq as any,
          });
        }
      },
    ],
  },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
      defaultValue: "Homepage Narrative Copy",
      admin: {
        description:
          "Internal name identifying this version/draft of the webpage copy (e.g. 'Main Teaser 2026', 'Emergency Fallback').",
      },
    },
    {
      name: "isFallback",
      type: "checkbox",
      defaultValue: false,
      admin: {
        position: "sidebar",
        description:
          "Designate this draft copy as the emergency safety fallback if published copy is unavailable. Only one draft can be fallback at a time.",
      },
      access: {
        update: ({ req }) => req.user?.role === "admin",
      },
    },
    {
      type: "tabs",
      tabs: [
        {
          label: "Act 1: Intro & Warp Prelude",
          description:
            "Top-of-page entry, WebGL warp sequence, notifications, and scrolling statement.",
          fields: [
            {
              name: "brandWordmark",
              type: "text",
              localized: true,
              defaultValue: "sophomores",
              required: true,
              admin: { description: "Fixed brand wordmark in header." },
            },
            {
              type: "row",
              fields: [
                {
                  name: "preludeTitleLeft",
                  type: "text",
                  localized: true,
                  defaultValue: "Experienced.",
                  required: true,
                  admin: {
                    description: "Left half of opening split headline.",
                  },
                },
                {
                  name: "preludeTitleRight",
                  type: "text",
                  localized: true,
                  defaultValue: "Not Finished.",
                  required: true,
                  admin: {
                    description: "Right half of opening split headline.",
                  },
                },
              ],
            },
            {
              type: "row",
              fields: [
                {
                  name: "warpPassageLine1",
                  type: "text",
                  localized: true,
                  defaultValue: "Lorem ipsum dolor sit amet,",
                  required: true,
                  admin: {
                    description: "First passing line during warp travel.",
                  },
                },
                {
                  name: "warpPassageLine2",
                  type: "text",
                  localized: true,
                  defaultValue: "consectetur adipiscing elit sed do.",
                  required: true,
                  admin: {
                    description: "Second passing line during warp travel.",
                  },
                },
              ],
            },
            {
              name: "notice1Sender",
              type: "text",
              localized: true,
              defaultValue: "From: sophomores",
              required: true,
            },
            {
              name: "notice1Body",
              type: "textarea",
              localized: true,
              defaultValue:
                "A private social club for people who have lived a little. And aren’t finished yet.",
              required: true,
            },
            {
              type: "row",
              fields: [
                {
                  name: "notice2Sender",
                  type: "text",
                  localized: true,
                  defaultValue: "Ticket sales open",
                  required: true,
                },
                {
                  name: "notice2Time",
                  type: "text",
                  localized: true,
                  defaultValue: "In ~10 days",
                  required: true,
                },
              ],
            },
            {
              name: "notice2Body",
              type: "textarea",
              localized: true,
              defaultValue:
                "Something is taking shape. Ticket sales open in around ten days. The first night is still under wraps.",
              required: true,
            },
            {
              name: "centerHeadline",
              type: "textarea",
              localized: true,
              defaultValue:
                "It Didn’t Begin With A Club.\nIt Began With A Question.",
              required: true,
              admin: {
                description:
                  "Large center serif statement revealed on scroll.",
              },
            },
          ],
        },
        {
          label: "Act 2: Body & Ethos",
          description:
            "Story cards, rotating principles orbit dial, and interactive dialogue stream.",
          fields: [
            {
              name: "stories",
              type: "array",
              minRows: 4,
              maxRows: 4,
              labels: { singular: "Story Card", plural: "Story Cards" },
              fields: [
                {
                  name: "title",
                  type: "text",
                  localized: true,
                  required: true,
                },
                {
                  name: "body",
                  type: "textarea",
                  localized: true,
                  required: true,
                },
                {
                  name: "tone",
                  type: "select",
                  options: [
                    { label: "Blue", value: "blue" },
                    { label: "Dark", value: "dark" },
                    { label: "Green", value: "green" },
                    { label: "Portrait", value: "portrait" },
                  ],
                  required: true,
                },
              ],
            },
            {
              name: "principles",
              type: "array",
              minRows: 3,
              maxRows: 3,
              labels: { singular: "Principle", plural: "Principles" },
              fields: [
                {
                  name: "title",
                  type: "textarea",
                  localized: true,
                  required: true,
                },
                {
                  name: "body",
                  type: "textarea",
                  localized: true,
                  required: true,
                },
                {
                  name: "color",
                  type: "text",
                  required: true,
                },
              ],
            },
            {
              name: "messages",
              type: "array",
              minRows: 3,
              maxRows: 3,
              labels: { singular: "Chat Message", plural: "Chat Messages" },
              fields: [
                {
                  name: "from",
                  type: "text",
                  localized: true,
                  required: true,
                },
                {
                  name: "text",
                  type: "textarea",
                  localized: true,
                  required: true,
                },
              ],
            },
          ],
        },
        {
          label: "Act 3: Conclusion & RSVP",
          description:
            "People manifesto, value spheres, RSVP action, and modal dialogue.",
          fields: [
            {
              name: "peopleHeadline",
              type: "textarea",
              localized: true,
              defaultValue:
                "Experienced Enough To Know Better. Curious Enough To Go Anyway.",
              required: true,
            },
            {
              name: "values",
              type: "array",
              minRows: 3,
              maxRows: 3,
              labels: { singular: "Value Card", plural: "Value Cards" },
              fields: [
                {
                  name: "body",
                  type: "textarea",
                  localized: true,
                  required: true,
                },
              ],
            },
            {
              name: "invitationHeadline",
              type: "textarea",
              localized: true,
              defaultValue: "Go Ahead, Light Me Up",
              required: true,
            },
            {
              type: "row",
              fields: [
                {
                  name: "rsvpButtonLabel",
                  type: "text",
                  localized: true,
                  defaultValue: "RSVP",
                  required: true,
                },
                {
                  name: "rsvpButtonSubtext",
                  type: "text",
                  localized: true,
                  defaultValue: "In ~10 days",
                  required: true,
                },
              ],
            },
            {
              type: "row",
              fields: [
                {
                  name: "footerCopyright",
                  type: "text",
                  localized: true,
                  defaultValue: "© sophomores 2026",
                  required: true,
                },
                {
                  name: "footerDomain",
                  type: "text",
                  localized: true,
                  defaultValue: "sophomores.co",
                  required: true,
                },
              ],
            },
            {
              name: "modalHeading",
              type: "textarea",
              localized: true,
              defaultValue: "This Is Only\nThe Beginning.",
              required: true,
            },
            {
              name: "modalLead",
              type: "text",
              localized: true,
              defaultValue: "Ticket sales open in ~10 days.",
              required: true,
            },
            {
              name: "modalDisclaimer1",
              type: "text",
              localized: true,
              defaultValue:
                "Date to be announced. Ticket sales are not open yet.",
              required: true,
            },
            {
              name: "modalDisclaimer2",
              type: "text",
              localized: true,
              defaultValue:
                "Preview only. No email is collected and no reservation is made.",
              required: true,
            },
            {
              name: "modalReturnButton",
              type: "text",
              localized: true,
              defaultValue: "Back to Top →",
              required: true,
            },
          ],
        },
      ],
    },
  ],
};
