export type Theme = 'dark' | 'light'

export interface ThemeContextType {
	theme: Theme
	pageTheme: Theme | null

	savedTheme: Theme | null
	locked: boolean
}

export function themeIsValid(string: null | string): string is Theme {
	return string ? ['dark', 'light'].includes(string) : false
}
