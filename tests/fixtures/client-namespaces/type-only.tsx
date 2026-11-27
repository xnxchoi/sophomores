"use client";
// Negative: every form here is erased by TypeScript, so nothing reaches the bundle.
import type english from "../../../messages/en.json";
import { type messagesByLocale } from "@/i18n/messages";
export type { Locale } from "@/i18n/locales";
export type { default as Catalogue } from "../../../messages/en.json";

export type Copy = typeof english | (typeof messagesByLocale)["en"];
