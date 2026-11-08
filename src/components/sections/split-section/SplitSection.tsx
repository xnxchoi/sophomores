"use client";
import {
  Lanyard,
  MemberCardsType
} from "@/components/layouts/Registration/lanyard";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel
} from "@/components/ui/form";
import { Input, InputFile } from "@/components/ui/input";
import { Link } from "@/components/core/Link/Link";
import { Logo } from "@/components/core/Logo";
import "@/styles/__inputs.scss";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import * as m from "motion/react-m";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";

import { useRPSession } from "@/lib/auth/session/RP_SessionProvider";
import { useTranslations } from "next-intl";
import { useShallow } from "zustand/shallow";
import { zodResolver } from "@hookform/resolvers/zod";

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp"
];

const memberSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  firstName: z.string(),
  lastName: z.string(),
  name: z.string().optional(),
  email: z.string(),
  role: z.enum(["admin", "user", "patron", "author", "editor"]).array(),
  createdAt: z.string(),
  updatedAt: z.string(),
  _status: z.enum(["draft", "published"])
});
const userMediaSchema = z.object({
  id: z.string(),
  alt: z.string().optional(),
  caption: z.string().optional(),

  url: z.string().optional(),
  thumbnailURL: z.string().optional(),
  filename: z.string().optional(),

  filesize: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional()
});
export const SplitSection = () => {
  const t = useTranslations();
  const username = useRPSession(useShallow((r) => r.username));
  const firstName = useRPSession(useShallow((r) => r.firstName));
  const lastName = useRPSession(useShallow((r) => r.lastName));
  const portrait = useRPSession(useShallow((r) => r.portrait));
  const email = useRPSession(useShallow((r) => r.email));
  const [type, setType] = useState<MemberCardsType>("BADGE");

  const profilePictureSchema = z
    .union([
      userMediaSchema,
      z
        .file()
        .mime(ACCEPTED_IMAGE_TYPES, {
          error: t("Register.error.portrait.invalidFile")
        })
        .max(MAX_FILE_SIZE, {
          error: t("Register.error.portrait.maxFileSize")
        }),
      z.literal(null)
    ])
    .optional();
  const userNameSchema = z
    .string()
    .min(2)
    .max(40)
    .refine(
      (name) =>
        /^(?=.{1,30}$)(?=[a-z0-9._]+$)(?=.*[a-z0-9])(?:[a-z0-9]+(?:\.[a-z0-9]+)*|[a-z0-9_]+)+$/.test(
          name
        ),
      {
        error: t("Register.error.username.regex")
      }
    );
  const nameSchema = z
    .string()
    .min(2)
    .max(40)
    .refine((name) => /[a-zA-Z]+$/.test(name), {
      error: t("Register.error.name.specialCharacter")
    });
  const emailSchema = z.email();
  const signupFormSchema = z.object({
    username: userNameSchema,
    firstName: nameSchema,
    lastName: nameSchema,
    email: emailSchema,
    portrait: profilePictureSchema
  });
  const bioSchema = z.string().min(1).max(250);
  const linkSchema = z.string().url().optional();
  const descriptionSchema = z.object({
    bio: bioSchema,
    link: linkSchema
  });
  const form = useForm<z.infer<typeof signupFormSchema>>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      username: username ?? "",
      firstName: firstName ?? "",
      lastName: lastName ?? "",
      portrait: undefined,
      email: email
    }
  });
  const fileRef = form.register("portrait");
  useEffect(() => {
    if (username) {
      setType("BADGE");
      email && form.setValue("email", email);
      username && form.setValue("username", username);
    } else {
      setType("BADGE");
    }
  }, [email, form, username]);

  // 2. Define a submit handler.
  function onSubmit(values: z.infer<typeof signupFormSchema>) {}

  return (
    <m.section
      key={"splitSection"}
      className="relative mb-0 flex min-h-screen w-full gap-[.5em] overflow-clip bg-background p-[.5em]"
      data-themed={"background-color, color"}
    >
      <Form {...form}>
        <div className={"flow-side w-full pt-[25px] lg:w-[35em]"}>
          <div
            className={
              "flex h-full w-full shrink-0 flex-col justify-center gap-x-[2em] gap-y-[2em] p-[1.5em] pt-[23px] lg:w-[30em]"
            }
          >
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className={"relative flex flex-col"}
            >
              <div className="grid grid-cols-8 grid-rows-14 gap-y-4">
                <div
                  className={
                    "form-field col-start-1 col-end-4 row-start-1 row-end-2"
                  }
                ></div>

                <FormField
                  control={form.control}
                  name={"portrait"}
                  render={({ field }) => (
                    <FormItem
                      className={
                        "form-field active relative col-span-full row-3"
                      }
                    >
                      <InputFile {...fileRef} />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={"email"}
                  render={({ field }) => (
                    <FormItem
                      className={
                        "form-field active relative col-span-full row-4"
                      }
                    >
                      <FormControl>
                        <Input
                          autoComplete={"email"}
                          {...field}
                          placeholder={""}
                          className={"w-input"}
                        />
                      </FormControl>
                      <div data-form={"baseline"} />
                      <FormLabel className={"input-label"}>Email</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={"username"}
                  render={({ field }) => (
                    <FormItem
                      className={"form-field active relative col-span-full"}
                    >
                      <FormControl>
                        <Input
                          autoComplete={"username"}
                          {...field}
                          placeholder={""}
                          className={"w-input"}
                        />
                      </FormControl>
                      <div data-form={"baseline"} />
                      <FormLabel className={"input-label"}>Name</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={"firstName"}
                  render={({ field }) => (
                    <FormItem
                      className={"form-field active relative col-span-full"}
                    >
                      <FormControl>
                        <Input
                          autoComplete={"given-name"}
                          {...field}
                          placeholder={""}
                          className={"w-input"}
                        />
                      </FormControl>
                      <div data-form={"baseline"} />
                      <FormLabel className={"input-label"}>
                        First Name
                      </FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={"lastName"}
                  render={({ field }) => (
                    <FormItem
                      className={"form-field active relative col-span-full"}
                    >
                      <FormControl>
                        <Input
                          autoComplete={"family-name"}
                          {...field}
                          placeholder={""}
                          className={"w-input"}
                        />
                      </FormControl>
                      <div data-form={"baseline"} />
                      <FormLabel className={"input-label"}>Last Name</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </form>
            <Link
              className={
                "relative flex w-full max-w-[100%] content-between items-center"
              }
              href={"/public"}
            >
              <div
                className={"pointer-events-none flex shrink-0 content-center"}
              >
                <Logo />
              </div>
            </Link>
          </div>
          <div className={"order-1 shrink-0"}></div>
        </div>
        <div className={"flow-visual relative hidden grow lg:flex"}>
          <Lanyard type={type} />
        </div>
      </Form>
    </m.section>
  );
};
