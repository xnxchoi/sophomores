import { getCachedGlobal } from "@/hideaway/utilities/getGlobals";

import type { Header } from "@/payload-types";
import React from "react";
import { HeaderClient } from "./Component.client";

export async function Header() {
  const header: Header = (await getCachedGlobal("header", 1)) as Header;

  return <HeaderClient header={header} />;
}
