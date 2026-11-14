import configPromise from "@payload-config";
import { getPayloadAuth } from "payload-auth/better-auth";
import type { ConstructedBetterAuthPluginOptions } from "@/lib/auth/options";

export const getPayload = async () =>
  getPayloadAuth<ConstructedBetterAuthPluginOptions>(configPromise);
