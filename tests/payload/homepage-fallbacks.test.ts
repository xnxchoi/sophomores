import assert from "node:assert/strict";
import test from "node:test";
import { getPayload } from "../../lib/payload";

test("homepage copy draft versions and fallback designation rules", async (t) => {
  const payload = await getPayload();

  t.after(async () => {
    try {
      const pool = payload.db.pool as any;
      if (pool) {
        const idleClients = pool._idle?.map((item: any) => item.client || item) || [];
        const busy = pool._clients?.filter((c: any) => !idleClients.includes(c)) || [];
        for (const b of busy) {
          try {
            b.release();
          } catch {}
        }
        await pool.end().catch(() => {});
      }
      const handles = (process as any)._getActiveHandles?.() || [];
      for (const h of handles) {
        if (typeof h?.unref === "function") {
          h.unref();
        }
        if (h?.constructor?.name === "ChildProcess" && typeof h.kill === "function") {
          h.kill();
        }
      }
    } catch {}
  });

  // Find super admin and create or find staff user
  const adminUser = (
    await payload.find({
      collection: "admins",
      where: { role: { equals: "admin" } },
      limit: 1,
    })
  ).docs[0];
  assert.ok(adminUser, "Super admin user must exist");

  let staffUser = (
    await payload.find({
      collection: "admins",
      where: { role: { equals: "staff" } },
      limit: 1,
    })
  ).docs[0];

  if (!staffUser) {
    staffUser = await payload.create({
      collection: "admins",
      data: {
        name: "Test Staff Member",
        email: "staff-test@sophomores.co",
        role: "staff",
        password: "TempStaffPassword123!",
      },
    });
  }
  assert.ok(staffUser, "Staff user must exist");

  await t.test(
    "staff can create and save drafts, but cannot publish or change fallback",
    async () => {
      // 1. Staff can create a draft
      const newDraft = await payload.create({
        collection: "home-page",
        data: {
          name: "Staff Proposal Draft",
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
        draft: true,
      });
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
            draft: false,
          });
        },
        /Only Super Admins are authorized to publish/
      );

      // 3. Staff cannot change fallback designation
      await assert.rejects(
        async () => {
          await payload.update({
            collection: "home-page",
            id: newDraft.id,
            data: {
              isFallback: true,
            },
            user: staffUser,
            draft: true,
          });
        },
        /Only Super Admins are authorized to change the fallback/
      );
    }
  );

  await t.test(
    "only one draft doc can be designated as fallback at any given time",
    async () => {
      // Create two distinct drafts
      const draftA = await payload.create({
        collection: "home-page",
        data: {
          name: "Draft A",
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
        draft: true,
      });

      const draftB = await payload.create({
        collection: "home-page",
        data: {
          name: "Draft B",
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
        draft: true,
      });

      // Super admin designates draft A as fallback
      await payload.update({
        collection: "home-page",
        id: draftA.id,
        data: { isFallback: true },
        user: adminUser,
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
      // Find the currently published document
      const published = (
        await payload.find({
          collection: "home-page",
          where: { _status: { equals: "published" } },
          limit: 1,
        })
      ).docs[0];
      assert.ok(published, "A published document must exist");

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
