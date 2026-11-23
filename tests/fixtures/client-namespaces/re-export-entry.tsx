"use client";
// The client boundary: everything it imports is bundled for the browser.
import { messagesByLocale } from "./re-export";

export const locales = Object.keys(messagesByLocale);
