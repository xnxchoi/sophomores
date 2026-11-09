'use client'
import {createContext, ReactNode, useCallback, useContext, useRef, useState} from 'react'

const originalWarn = console.warn
console.warn = (message) => {
	if (message.includes('rafz whilst frameLoop is not set as demand')) {
		return
	}
	originalWarn(message)
}
const modelKinetics = (visible: boolean, setVisible: (l: boolean) => void, move: boolean, setMove: (l: boolean) => void) => {
	return {visible, setVisible, setMove, move}
}
const kineticCtx = createContext<ReturnType<typeof modelKinetics> | undefined>(undefined)
export const KineticProvider = ({children}: { children: ReactNode }) => {
	const [visible, sv] = useState<boolean>(true)
	const setVisible = useCallback((l: boolean) => {
		sv(l)
	}, [sv])
	const [move, sm] = useState<boolean>(false)
	const setMove = useCallback((l: boolean) => {
		sm(l)
	}, [sm])
	//@ts-ignore
	const kineticCtxRef = useRef<ReturnType<typeof modelKinetics> | undefined>(undefined)
	if (!kineticCtxRef.current) {
		kineticCtxRef.current = modelKinetics(visible, setVisible, move, setMove)
	}
	return <kineticCtx.Provider value={kineticCtxRef.current}>{children}</kineticCtx.Provider>
}
export const useKinetics = () => {
	const context = useContext(kineticCtx)
	if (!context) {
		throw new Error('useKinetics must be used within kineticCtx provider!')
	}
	return context
}
