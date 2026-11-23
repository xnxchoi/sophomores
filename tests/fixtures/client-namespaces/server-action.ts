"use server";
import english from "../../../messages/en.json";

export async function saveLocale(locale: string) {
  return locale in english ? locale : null;
}
