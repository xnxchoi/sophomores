import dynamic from "next/dynamic";
import { Suspense } from "react";
const VGradient = dynamic(() =>
  import("./index.client").then((r) => r.VGradient)
);
export default function Gradient() {
  return (
    <Suspense>
      <VGradient />
    </Suspense>
  );
}
