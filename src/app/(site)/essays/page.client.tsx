import { type ReactNode, useEffect } from "react";
import { useHeaderTheme } from "@/providers/HeaderTheme";

const PageClient = (props: { children: ReactNode }) => {
  /* Force the header to be dark mode while we have an image behind it */
  const { setHeaderTheme } = useHeaderTheme();

  useEffect(() => {
    setHeaderTheme("dark");
  }, [setHeaderTheme]);
  return <div className="py-15"> {props.children}</div>;
};

export default PageClient;
