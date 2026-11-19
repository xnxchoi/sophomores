export type Theme = 'dark' | 'light'

export interface ThemeContextType {
	theme: Theme
	pageTheme: Theme | null

	savedTheme: Theme | null
	locked: boolean
	/** The theme the current route holds (pageThemes), and the one a page holds itself (the 404). */
	routeTheme?: Theme | null
	ownTheme?: Theme | null
	/** Whether savedTheme is the visitor's pick, rather than the device setting. */
	picked?: boolean
}

export function themeIsValid(string: null | string): string is Theme {
	return string ? ['dark', 'light'].includes(string) : false
}
