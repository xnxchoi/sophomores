import {createContext, ReactNode, useContext, useRef} from "react";
import {StoreApi, useStore} from "zustand";
import {createStore} from "zustand/vanilla";

/**
 * Typing and implementation for UI interface state controls of the "text editor" view of The Hideaway.
 * Meant to provide granular control & customizations in regards to the UX of writing articles.
 */

/**
 * Meant to be used internally by the "text editor" view of The Hideaway.
 *
 */
type EstateInternalState = {
	__userCanEdit: boolean
	__userCanPublish: boolean
	__userCanReview: boolean
	__userCanViewAPI: boolean
}
type EstateInternal = EstateInternalState & {
	__setInternalState: (state: Partial<EstateInternalState>) => void
}
type EstateGutenbergState = {
	fullscreen: boolean
	zenMode: boolean
	showSidebar: boolean
	showToolbar: boolean
	showFooter: boolean
	showHelp: boolean
	viewMode: "editor" | "preview" | "review" | "api"
}
type EstateGutenbergActions = {
	setShowHelp: (showHelp: boolean) => void
	setFullscreen: (fullscreen: boolean) => void
	setZenMode: (zenMode: boolean) => void
	setShowSidebar: (showSidebar: boolean) => void
	setShowToolbar: (showToolbar: boolean) => void
	setShowFooter: (showFooter: boolean) => void
	setViewMode: (viewMode: EstateGutenbergState["viewMode"]) => void
}
export type EstateGutenberg = EstateGutenbergState & EstateGutenbergActions & EstateInternal
const initialState: EstateGutenbergState & EstateInternalState = {
	fullscreen: false,
	zenMode: false,
	showFooter: true,
	showSidebar: true,
	showToolbar: true,
	showHelp: false,
	viewMode: "editor",
	__userCanEdit: false,
	__userCanPublish: false,
	__userCanReview: false,
	__userCanViewAPI: false,
}
const createEstateGutenbergStore = () => createStore<EstateGutenberg>()((set, get) => ({
	...initialState,
	__setInternalState: (internal: Partial<EstateInternalState>) => set(state => ({...state, ...internal})),
	setShowHelp: showHelp => set({showHelp}),
	setFullscreen: fullscreen => set({fullscreen}),
	setZenMode: zenMode => set({zenMode}),
	setShowSidebar: showSidebar => set({showSidebar}),
	setShowToolbar: showToolbar => set({showToolbar}),
	setShowFooter: showFooter => set({showFooter}),
	setViewMode: viewMode => set({viewMode})
}))
const EstateGutenbergContext = createContext<StoreApi<EstateGutenberg> | null>(null)
export const EstateGutenbergProvider = ({children}: { children: ReactNode }) => {
	const ref = useRef<StoreApi<EstateGutenberg>>(null!)
	if (!ref.current) ref.current = createEstateGutenbergStore()
	return (
		<EstateGutenbergContext value={ref.current}>
			{children}
		</EstateGutenbergContext>
	)
}
export const useEstateGutenberg = <T, >(selector: (store: EstateGutenberg) => T) => {
	const ctx = useContext(EstateGutenbergContext);
	if (!ctx) {
		throw new Error("useEstateGutenberg must be used within EstateGutenbergProvider")
	}
	return useStore(ctx, selector)
}