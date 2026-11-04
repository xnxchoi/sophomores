import {createStore} from 'zustand/vanilla'

export type RP_Search = {
	value: string
	open: boolean
	subMenuOpen: boolean
}
export type RP_Searching = {
	setValue: (value: string) => void
	setOpen: (open: boolean) => void
	toggleOpen: () => void
	setSubMenuOpen: (subMenuOpen: boolean) => void
	toggleSubMenuOpen: () => void
}
export type RP_SearchBar = RP_Search & RP_Searching
export const init: RP_Search = {
	open: false,
	value: '',
	subMenuOpen: false,
}
export const createSearchBarStore = (initState: RP_Search = init) => {
	return createStore<RP_SearchBar>()((set) => ({
		...initState,
		subMenuOpen: false,
		setSubMenuOpen: (subMenuOpen: boolean) =>
			set((state) => ({
				...state,
				subMenuOpen: subMenuOpen,
			})),
		setOpen: (l: boolean) =>
			set((state) => ({
				...state,
				open: l,
			})),
		setValue: (l: string) =>
			set((state) => ({
				...state,
				value: l,
			})),
		toggleOpen: () =>
			set((state) => ({
				...state,
				open: !state.open,
			})),
		toggleSubMenuOpen: () =>
			set((state) => ({
				...state,
				subMenuOpen: !state.subMenuOpen,
			})),
	}))
}
