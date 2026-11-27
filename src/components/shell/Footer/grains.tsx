export const BrightGrains = () => {
  /* Mersi's grain (--texture-grain), footer only, at the owner's values: 150 px tiles, two layers, the second half a
          tile off (owner, 21 Nov: "a bit more texture"). isolate keeps the blend in the footer, and -z-1 puts it under the
          text, over only the footer's colour (Review-B: over the text it cost ~7 % contrast). Color-dodge at the owner's
          opacities (27 Nov), on the footer ground in both themes. */
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-1 bg-(image:--texture-grain) bg-size-[150px] bg-center opacity-45 mix-blend-color-dodge"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-1 bg-(image:--texture-grain) bg-size-[150px] bg-position-[75px_75px] opacity-35 mix-blend-color-dodge"
      />
    </>
  );
};
