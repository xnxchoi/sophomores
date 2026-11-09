'use client';

type Dir = 'back' | 'forward' | 'traverse';

declare global {
	interface History { _idxPatched?: boolean }
}

function fire(name: string, detail?: any) {
	window.dispatchEvent(new CustomEvent(name, { detail }));
}

(function patchHistoryIndex() {
	if (history._idxPatched) return;
	history._idxPatched = true;

	const idx = () => (history.state && typeof history.state._idx === 'number' ? history.state._idx : null);

	if (idx() === null) {
		try { history.replaceState({ ...(history.state ?? {}), _idx: 0 }, ''); } catch {}
	}

	const rp = history.replaceState;
	history.replaceState = function (s: any, t: string, u?: string | URL | null) {
		const cur = idx() ?? 0;
		const next = s && typeof s === 'object' ? { ...s, _idx: cur } : { _idx: cur };
		return rp.call(history, next, t, u as any);
	};

	const pp = history.pushState;
	history.pushState = function (s: any, t: string, u?: string | URL | null) {
		const cur = idx() ?? 0;
		const next = s && typeof s === 'object' ? { ...s, _idx: cur + 1 } : { _idx: cur + 1 };
		return pp.call(history, next, t, u as any);
	};
})();

export function initBackForwardDetection() {
	let last = history.state?._idx ?? 0;

	// Back/Forward within the same document
	window.addEventListener('popstate', () => {
		const cur = history.state?._idx;
		let dir: Dir = 'traverse';
		if (typeof cur === 'number') {
			if (cur < last) dir = 'back';
			else if (cur > last) dir = 'forward';
			last = cur;
		}
		fire('nav:direction', { dir });

		// after the new view is painted (including BFCache restores in some cases)
		queueMicrotask(() => requestAnimationFrame(() => fire('nav:complete')));
	});

	// Cross-document BFCache restore or initial show
	window.addEventListener('pageshow', () => {
		requestAnimationFrame(() => fire('nav:complete'));
	});
}