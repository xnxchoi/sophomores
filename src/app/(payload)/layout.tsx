import configPromise from "@payload-config";
import "@payloadcms/next/css";
import { RootLayout, handleServerFunctions } from "@payloadcms/next/layouts";
import React from "react";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { importMap } from "./admin/importMap.js";

export { metadata } from "@payloadcms/next/layouts";

type Args = {
  children: React.ReactNode;
};

const Layout = async ({ children }: Args) => {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
  <RootLayout
    config={configPromise}
    importMap={importMap}
    serverFunction={async (args) => {
      "use server";
      return handleServerFunctions({
        ...args,
        config: configPromise,
        importMap,
      });
    }}
  >
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  </RootLayout>
);
};

export default Layout;
