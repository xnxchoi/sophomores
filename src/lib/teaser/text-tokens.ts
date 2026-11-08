// Sharp holds; a brief fade-through handoff avoids superimposed paragraphs.
export const textTransition = {
  offsets: [-0.6, -0.5, -0.4, 0.4, 0.5, 0.6],
  opacity: [0, 0, 1, 1, 0, 0],
  blur: [
    "blur(4px)",
    "blur(4px)",
    "blur(0px)",
    "blur(0px)",
    "blur(4px)",
    "blur(4px)"
  ],
  hero: {
    input: [1.5, 1.75, 2],
    blur: ["blur(4px)", "blur(0px)", "blur(0px)"]
  }
};

export function textKeyframes(index: number) {
  return textTransition.offsets.map((offset) => index + offset);
}
