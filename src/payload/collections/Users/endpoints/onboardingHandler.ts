import { RegistrationStep } from "@/stores/Tour/TourStore";
import { User } from "@payload-types";
import { NextResponse } from "next/server";
import { addDataAndFileToRequest, PayloadHandler } from "payload";
import { z } from "zod";
import { httpUrl } from "@/lib/api/httpUrlSchema";

export type OnboardingBody = z.infer<typeof reqSchema>;
export type StepAndParams<T extends RegistrationStep = RegistrationStep> = {
  [Z in T]: Extract<OnboardingBody, { step: Z }>;
}[T];
const reqSchema = z.discriminatedUnion("step", [
  z.object({
    step: z.literal("welcome"),
    fields: z
      .object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        bio: z.string().max(500).optional(),
        link: httpUrl.optional(),
        location: z.string().optional()
      })
      .optional(),
    complete: z.boolean().optional()
  }),
  z.object({
    step: z.literal("profile"),
    fields: z.object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      link: httpUrl.optional(),
      location: z.string().optional(),
      bio: z.string().max(500).nullish()
    }),
    complete: z.boolean().optional()
  }),
  z.object({
    step: z.literal("details"),
    fields: z.object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      bio: z.string().max(500).nullish(),
      link: httpUrl.nullish(),
      location: z.string().nullish()
    }),
    complete: z.boolean().optional()
  }),
  z.object({
    step: z.literal("complete"),
    fields: z.object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      bio: z.string().max(500).nullish(),
      link: httpUrl.nullish(),
      location: z.string().nullish()
    }),
    complete: z.boolean().optional()
  })
]);
export const onboardingHandler: PayloadHandler = async (req) => {
  await addDataAndFileToRequest(req);
  const { payload, context, user, data, routeParams } = req;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = routeParams?.id;
  if (!id || typeof id !== "string" || !z.regexes.uuid7.test(id)) {
    return Response.json({ error: "Invalid user id" }, { status: 400 });
  }
  const userId = user.id;
  if (id !== userId) {
    if (user.role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  try {
    const body: OnboardingBody = reqSchema.parse(data);

    const ctx = context;
    const passedData: Partial<User> = {};
    if (body.fields) {
      if ("firstName" in body.fields) {
        if (
          !!body.fields.firstName &&
          body.fields.firstName.length > 0 &&
          body.fields.firstName !== user.firstName
        ) {
          passedData.firstName = body.fields.firstName;
        }
      }
      if ("lastName" in body.fields) {
        if (
          !!body.fields.lastName &&
          body.fields.lastName !== user.lastName &&
          body.fields.lastName.length > 0
        ) {
          passedData.lastName = body.fields.lastName;
        }
      }
      if ("bio" in body.fields) {
        if (body.fields.bio !== user.bio) {
          passedData.bio =
            !!body.fields.bio && body.fields.bio.length > 0
              ? body.fields.bio
              : null;
        }
      }
      if ("link" in body.fields) {
        passedData.link =
          !!body.fields.link && body.fields.link.length > 0
            ? body.fields.link
            : null;
      }
      if ("location" in body.fields) {
        passedData.location =
          !!body.fields.location && body.fields.location.length > 0
            ? body.fields.location
            : null;
      }
    }
    if (body.complete) {
      // Final step — mark onboarded, clear progress
      await payload.update({
        collection: "users",
        id: userId,
        overrideAccess: true,
        context: {
          ...ctx,
          overrideAccess: true
        },
        data: {
          ...passedData,
          onboarded: true,
          onboardingProgress: null
        },
        req
      });

      return NextResponse.json({ ok: true, completed: true });
    }

    // Intermediate step — persist progress
    if (body.step) {
      const existing = await payload.findByID({
        collection: "users",
        id: userId,
        overrideAccess: true,
        select: { onboardingProgress: true }
      });

      const prev =
        (existing.onboardingProgress as Record<string, unknown>) ?? {};
      const completedSteps = Array.isArray(prev.completedSteps)
        ? prev.completedSteps
        : [];

      if (!completedSteps.includes(body.step)) {
        completedSteps.push(body.step);
      }

      await payload.update({
        collection: "users",
        id: userId,
        overrideAccess: true,
        context: ctx,
        data: {
          ...passedData,
          onboarded: body.complete,

          onboardingProgress: {
            lastStep: body.step,
            completedSteps,
            fields: body.fields ?? prev.fields ?? {},
            updatedAt: new Date().toISOString()
          }
        },
        req
      });

      return NextResponse.json({ ok: true, step: body.step });
    }

    // Fallback: legacy call with no body — just mark complete
    await payload.update({
      collection: "users",
      id: userId,
      overrideAccess: true,
      context: ctx,
      data: { onboarded: true },
      req
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[onboarding]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
};
