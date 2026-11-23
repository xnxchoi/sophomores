/** Stand-in for next/font/local outside Next's compiler: a loader returns its CSS variable name. */
export default function localFont({ variable }: { variable: string }) {
  return { className: variable, variable, style: { fontFamily: variable } };
}
