import { getCachedGlobal } from "src/utilities/getGlobals";

import type { Header } from "src/payload-types";
import React from "react";
import { HeaderClient } from "./Component.client";

export async function Header() {
  const header: Header = (await getCachedGlobal("header", 1)) as Header;

  return <HeaderClient header={header} />;
}
