export const BrightGrains = () => {
  /* Mersi's grain (--texture-grain), footer only, at the owner's values: 150 px tiles, two layers, the second half a
          tile off (owner, 21 Nov: "a bit more texture"). isolate keeps the blend in the footer, and -z-1 puts it under the
          text, over only the footer's colour (Review-B: over the text it cost ~7 % contrast). Color-dodge, on the footer
          ground in both themes. Owner, 28 Nov: "dim the grain a bit": from his 45 % and 35 % to 22 % and 17 %, the same
          ratio, the least dimming that keeps the single brightest speck next to Singer Stone at 7:1 (measured 4.8:1 live
          before; simulated with the real texture over gunmetal: 30 %/23 % would leave 6.2:1). */
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-1 bg-(image:--texture-grain) bg-size-[150px] bg-center opacity-22 mix-blend-color-dodge"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-1 bg-(image:--texture-grain) bg-size-[150px] bg-position-[75px_75px] opacity-17 mix-blend-color-dodge"
      />
    </>
  );
};
