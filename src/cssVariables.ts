// Keep these in sync with the CSS variables in your tailwind configuration
const breakpoints = {
	"3xl": 1920,
	"2xl": 1440,
	xl: 1280,
	lg: 1024,
	md: 768,
	sm: 640,
	xs: 480
} as const;
export const cssVariables = {
	breakpoints
} as const;
// Default `sizes` attribute for content images. The previous value used `w`
// descriptors, which are only valid inside `srcSet` — when used as `sizes`
// they're silently ignored, so the browser falls back to `100vw` and fetches
// the largest variant. This default targets the `max-w-7xl` (1280px) editorial
// column: viewports below that get full-width; wider viewports cap at 1280px.
// Hero/full-bleed and grid-card surfaces should pass an explicit `sizes` prop
// rather than rely on this default.
export const breakString = "(min-width: 1280px) 1280px, 100vw";
