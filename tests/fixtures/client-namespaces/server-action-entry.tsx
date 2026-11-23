"use client";
// Negative: a client module calling a server action; the action module's imports stay on the server.
import { saveLocale } from "./server-action";

export const save = () => saveLocale("en");
