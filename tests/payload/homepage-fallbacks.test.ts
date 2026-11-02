import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { loadEnvConfig } from "@next/env";
import { capturePayloadTestLifecycle } from "../support/payload-lifecycle";

// Explicit database suite: fixtures are synthetic and no delivery is requested.
test("homepage copy draft versions and fallback designation rules", {
  skip: process.env.PAYLOAD_DATABASE_TESTS !== "1",
}, async (t) => {
  loadEnvConfig(process.cwd());
  const previousHmr = process.env.DISABLE_PAYLOAD_HMR;
  process.env.DISABLE_PAYLOAD_HMR = "true";
  t.after(() => {
    if (previousHmr === undefined) delete process.env.DISABLE_PAYLOAD_HMR;
    else process.env.DISABLE_PAYLOAD_HMR = previousHmr;
  });
  const { getPayload } = await import("../../lib/payload");
  const payload = await getPayload();
  const closePayload = capturePayloadTestLifecycle(payload);
  const fixtureTag = `homepage-test-${randomUUID()}`;
  let ownedHomepageIds: string[] = [];
  let ownedAdminIds: string[] = [];

  t.after(async () => {
    try {
      // Auto-created fallback copies retain their source's unique fixture name.
      const copies = await payload.find({
        collection: "home-page", overrideAccess: true, draft: true, limit: 100,
        where: { name: { contains: fixtureTag } },
      });
      for (const id of new Set([...ownedHomepageIds, ...copies.docs.map((copy) => copy.id)])) {
        await payload.delete({ collection: "home-page", id, overrideAccess: true });
      }
      for (const id of ownedAdminIds) {
        await payload.delete({ collection: "admins", id, overrideAccess: true });
      }
    } finally {
      await closePayload();
    }
  });

  const admin = await payload.create({
    collection: "admins", overrideAccess: true,
    data: { name: "Synthetic Homepage Admin", email: `${fixtureTag}-admin@example.invalid`, role: "admin" },
  });
  ownedAdminIds = [...ownedAdminIds, admin.id];
  const adminUser = { ...admin, collection: "admins" as const, _strategy: "staff-better-auth" };
  const staff = await payload.create({
    collection: "admins", overrideAccess: true,
    data: { name: "Synthetic Homepage Staff", email: `${fixtureTag}-staff@example.invalid`, role: "staff" },
  });
  ownedAdminIds = [...ownedAdminIds, staff.id];
  const staffUser = { ...staff, collection: "admins" as const, _strategy: "staff-better-auth" };

  await t.test(
    "staff can create and save drafts, but cannot publish or change fallback",
    async () => {
      // 1. Staff can create a draft
      const newDraft = await payload.create({
        collection: "home-page",
        data: {
          name: `${fixtureTag} Staff Proposal Draft`,
          brandWordmark: "sophomores",
          preludeTitleLeft: "Staff Left",
          preludeTitleRight: "Staff Right",
          warpPassageLine1: "Staff line 1",
          warpPassageLine2: "Staff line 2",
          notice1Sender: "From: staff",
          notice1Body: "Intro text",
          notice2Sender: "Ticket info",
          notice2Time: "Tomorrow",
          notice2Body: "Body text",
          centerHeadline: "Center headline",
          peopleHeadline: "People headline",
          invitationHeadline: "Invitation headline",
          rsvpButtonLabel: "RSVP",
          rsvpButtonSubtext: "Soon",
          footerCopyright: "© 2026",
          footerDomain: "sophomores.co",
          modalHeading: "Heading",
          modalLead: "Lead",
          modalDisclaimer1: "D1",
          modalDisclaimer2: "D2",
          modalReturnButton: "Return",
          isFallback: false,
          _status: "draft",
        },
        user: staffUser,
        overrideAccess: false,
        draft: true,
      });
      ownedHomepageIds = [...ownedHomepageIds, newDraft.id];
      assert.ok(newDraft.id);
      assert.equal(newDraft._status, "draft");

      // 2. Staff cannot publish
      await assert.rejects(
        async () => {
          await payload.update({
            collection: "home-page",
            id: newDraft.id,
            data: {
              _status: "published",
            },
            user: staffUser,
            overrideAccess: false,
            draft: false,
          });
        },
        /Only Super Admins are authorized to publish/
      );

      // 3. Field access removes the forbidden assignment before beforeChange.
      const unchanged = await payload.update({
        collection: "home-page",
        id: newDraft.id,
        data: { isFallback: true },
        user: staffUser,
        overrideAccess: false,
        draft: true,
      });
      assert.equal(unchanged.isFallback, false);
    }
  );

  await t.test(
    "only one draft doc can be designated as fallback at any given time",
    async () => {
      // Create two distinct drafts
      const draftA = await payload.create({
        collection: "home-page",
        data: {
          name: `${fixtureTag} Draft A`,
          brandWordmark: "sophomores",
          preludeTitleLeft: "A",
          preludeTitleRight: "A",
          warpPassageLine1: "A",
          warpPassageLine2: "A",
          notice1Sender: "A",
          notice1Body: "A",
          notice2Sender: "A",
          notice2Time: "A",
          notice2Body: "A",
          centerHeadline: "A",
          peopleHeadline: "A",
          invitationHeadline: "A",
          rsvpButtonLabel: "RSVP",
          rsvpButtonSubtext: "A",
          footerCopyright: "A",
          footerDomain: "A",
          modalHeading: "A",
          modalLead: "A",
          modalDisclaimer1: "A",
          modalDisclaimer2: "A",
          modalReturnButton: "A",
          isFallback: false,
          _status: "draft",
        },
        user: adminUser,
        overrideAccess: false,
        draft: true,
      });

      ownedHomepageIds = [...ownedHomepageIds, draftA.id];

      const draftB = await payload.create({
        collection: "home-page",
        data: {
          name: `${fixtureTag} Draft B`,
          brandWordmark: "sophomores",
          preludeTitleLeft: "B",
          preludeTitleRight: "B",
          warpPassageLine1: "B",
          warpPassageLine2: "B",
          notice1Sender: "B",
          notice1Body: "B",
          notice2Sender: "B",
          notice2Time: "B",
          notice2Body: "B",
          centerHeadline: "B",
          peopleHeadline: "B",
          invitationHeadline: "B",
          rsvpButtonLabel: "RSVP",
          rsvpButtonSubtext: "B",
          footerCopyright: "B",
          footerDomain: "B",
          modalHeading: "B",
          modalLead: "B",
          modalDisclaimer1: "B",
          modalDisclaimer2: "B",
          modalReturnButton: "B",
          isFallback: false,
          _status: "draft",
        },
        user: adminUser,
        overrideAccess: false,
        draft: true,
      });

      ownedHomepageIds = [...ownedHomepageIds, draftB.id];

      // Super admin designates draft A as fallback
      await payload.update({
        collection: "home-page",
        id: draftA.id,
        data: { isFallback: true },
        user: adminUser,
        overrideAccess: false,
        draft: true,
      });

      let updatedA = await payload.findByID({
        collection: "home-page",
        id: draftA.id,
        draft: true,
      });
      assert.equal(updatedA.isFallback, true);

      // Now super admin designates draft B as fallback
      await payload.update({
        collection: "home-page",
        id: draftB.id,
        data: { isFallback: true },
        user: adminUser,
        overrideAccess: false,
        draft: true,
      });

      const updatedB = await payload.findByID({
        collection: "home-page",
        id: draftB.id,
        draft: true,
      });
      assert.equal(updatedB.isFallback, true);

      // Verify draft A was automatically unset to isFallback = false
      updatedA = await payload.findByID({
        collection: "home-page",
        id: draftA.id,
        draft: true,
      });
      assert.equal(updatedA.isFallback, false);

      // Verify across the entire collection, only ONE doc has isFallback = true
      const allFallbacks = await payload.find({
        collection: "home-page",
        where: { isFallback: { equals: true } },
        draft: true,
      });
      assert.equal(allFallbacks.totalDocs, 1);
      assert.equal(allFallbacks.docs[0].id, draftB.id);
    }
  );

  await t.test(
    "published doc cannot be designated as fallback; trying so auto-duplicates a draft that receives designation",
    async () => {
      const published = await payload.create({
        collection: "home-page", overrideAccess: false, user: adminUser,
        data: {
          name: `${fixtureTag} Published`, brandWordmark: "sophomores",
          preludeTitleLeft: "Published", preludeTitleRight: "Published",
          warpPassageLine1: "Published", warpPassageLine2: "Published",
          notice1Sender: "Published", notice1Body: "Published", notice2Sender: "Published",
          notice2Time: "Published", notice2Body: "Published", centerHeadline: "Published",
          peopleHeadline: "Published", invitationHeadline: "Published", rsvpButtonLabel: "RSVP",
          rsvpButtonSubtext: "Published", footerCopyright: "Published", footerDomain: "example.invalid",
          modalHeading: "Published", modalLead: "Published", modalDisclaimer1: "Published",
          modalDisclaimer2: "Published", modalReturnButton: "Return", isFallback: false, _status: "published",
        },
        draft: false,
      });
      ownedHomepageIds = [...ownedHomepageIds, published.id];

      const countBefore = (
        await payload.find({
          collection: "home-page",
          draft: true,
        })
      ).totalDocs;

      // Attempt to designate published document as fallback
      const result = await payload.update({
        collection: "home-page",
        id: published.id,
        data: {
          isFallback: true,
        },
        user: adminUser,
        overrideAccess: false,
      });

      // The published document must remain NOT fallback
      assert.equal(result.isFallback, false);
      const recheckedPublished = await payload.findByID({
        collection: "home-page",
        id: published.id,
      });
      assert.equal(recheckedPublished.isFallback, false);

      // A duplicate draft was created that received the designation
      const countAfter = (
        await payload.find({
          collection: "home-page",
          draft: true,
        })
      ).totalDocs;
      assert.equal(countAfter, countBefore + 1);

      const currentFallback = (
        await payload.find({
          collection: "home-page",
          where: { isFallback: { equals: true } },
          draft: true,
          limit: 1,
        })
      ).docs[0];
      assert.ok(currentFallback);
      assert.notEqual(currentFallback.id, published.id);
      assert.equal(currentFallback._status, "draft");
      assert.equal(currentFallback.isFallback, true);
      assert.match(currentFallback.name, /Fallback/);
    }
  );

  await t.test(
    "at least one fallback draft copy must always be retained",
    async () => {
      // Find the current designated fallback doc
      let currentFallback = (
        await payload.find({
          collection: "home-page",
          where: { isFallback: { equals: true } },
          draft: true,
          limit: 1,
        })
      ).docs[0];

      // If no fallback doc exists yet, designate a draft
      if (!currentFallback) {
        const draft = (
          await payload.find({
            collection: "home-page",
            where: { _status: { equals: "draft" } },
            draft: true,
            limit: 1,
          })
        ).docs[0];
        await payload.update({
          collection: "home-page",
          id: draft.id,
          data: { isFallback: true },
          user: adminUser,
          overrideAccess: false,
          draft: true,
        });
        currentFallback = await payload.findByID({
          collection: "home-page",
          id: draft.id,
          draft: true,
        });
      }
      assert.ok(currentFallback);

      // Trying to simply turn off fallback without another fallback designated must fail
      await assert.rejects(
        async () => {
          await payload.update({
            collection: "home-page",
            id: currentFallback.id,
            data: {
              isFallback: false,
            },
            user: adminUser,
            overrideAccess: false,
            draft: true,
          });
        },
        /At least one draft copy must remain designated as the effective fallback/
      );
    }
  );

  await t.test(
    "effective copy resolution serves published copy, or fallback copy if published is missing",
    async () => {
      const { GET } = await import("../../app/api/globals/home-page/route");

      // 1. Standard request returns published copy
      const reqPublished = new Request("http://localhost:3000/api/globals/home-page?locale=en");
      const resPublished = await GET(reqPublished);
      const jsonPublished = await resPublished.json();
      assert.equal(resPublished.status, 200);
      assert.equal(jsonPublished._status, "published");
      assert.equal(jsonPublished.isFallback, false);

      // 2. Draft request with specific draftId returns that exact draft
      const fallbackDoc = (
        await payload.find({
          collection: "home-page",
          where: { isFallback: { equals: true } },
          draft: true,
          limit: 1,
        })
      ).docs[0];
      assert.ok(fallbackDoc);

      const reqDraft = new Request(`http://localhost:3000/api/globals/home-page?locale=en&draftId=${fallbackDoc.id}`);
      const resDraft = await GET(reqDraft);
      const jsonDraft = await resDraft.json();
      assert.equal(resDraft.status, 200);
      assert.equal(jsonDraft.id, fallbackDoc.id);
      assert.equal(jsonDraft.isFallback, true);
    }
  );
});
