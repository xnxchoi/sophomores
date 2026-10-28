import configPromise from "@payload-config";
import "@payloadcms/next/css";
import { RootLayout, handleServerFunctions } from "@payloadcms/next/layouts";
import React from "react";
import { importMap } from "./admin/importMap.js";

export { metadata } from "@payloadcms/next/layouts";

type Args = {
  children: React.ReactNode;
};

const Layout = ({ children }: Args) => (
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
    {children}
  </RootLayout>
);

export default Layout;
