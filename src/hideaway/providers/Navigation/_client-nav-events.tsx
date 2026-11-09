'use client';

import React, {
	createContext,
	useContext,
	useEffect,
	useRef,
	useState,
	ReactNode,
} from 'react';
import { useTransitionState } from 'next-transition-router';

// back/forward detection
function initBackForwardDetection(callback: (dir: 'back' | 'forward' | 'traverse' | null) => void,init:()=>void) {
	let last = history.state?._idx ?? 0;

	const idx = () =>
		history.state && typeof history.state._idx === 'number'
			? history.state._idx
			: null;

	if (idx() === null) {
		try {
			history.replaceState({ ...(history.state ?? {}), _idx: 0 }, '');
		} catch {}
	}

	const origPush = history.pushState;
	history.pushState = function (s: any, t: string, u?: string | URL | null) {
		const cur = idx() ?? 0;
		const next = s && typeof s === 'object' ? { ...s, _idx: cur + 1 } : { _idx: cur + 1 };
		return origPush.call(history, next, t, u as any);
	};

	const origReplace = history.replaceState;
	history.replaceState = function (s: any, t: string, u?: string | URL | null) {
		const cur = idx() ?? 0;
		const next = s && typeof s === 'object' ? { ...s, _idx: cur } : { _idx: cur };
		return origReplace.call(history, next, t, u as any);
	};

	window.addEventListener('popstate', () => {
		const cur = idx();
		let dir: 'back' | 'forward' | 'traverse' | null = null;
		if (typeof cur === 'number') {
			if (cur < last) dir = 'back';
			else if (cur > last) dir = 'forward';
			else dir = 'traverse';
			last = cur;
		}
		init();
		requestAnimationFrame(() => callback(dir));
	});

	window.addEventListener('pageshow', () => {
		init();
		requestAnimationFrame(() => callback(null));
	});
}

// ---------------- Context ---------------- //

type NavEventsContextType = {
	navComplete: boolean;
	direction: 'back' | 'forward' | 'traverse' | null;
};

const NavEventsContext = createContext<NavEventsContextType>({
	navComplete: true,
	direction: null,
});

export function NavEventsProvider({ children }: { children: ReactNode }) {
	const { stage, isReady } = useTransitionState();
	const prevStage = useRef(stage);
	const [state, setState] = useState<NavEventsContextType>({
		navComplete: true,
		direction: null,
	});

	// Hook up back/forward detection once
	useEffect(() => {
		initBackForwardDetection((dir) =>
			setState({ navComplete: true, direction: dir }),()=>setState({navComplete:false,direction:null})
		);
	}, []);

	// Hook up NTR transitions
	useEffect(() => {
		if (prevStage.current !== stage && stage === 'none' && isReady) {
			requestAnimationFrame(() =>
				setState({ navComplete: true, direction: null })
			);
		} else if (stage === 'leaving' || stage === 'entering') {
			setState((s) => ({ ...s, navComplete: false }));
		}
		prevStage.current = stage;
	}, [stage, isReady]);

	return (
		<NavEventsContext.Provider value={state}>
			{children}
		</NavEventsContext.Provider>
	);
}

// handy hook
export function useNavEvents() {
	return useContext(NavEventsContext);
}