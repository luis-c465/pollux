import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
	const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
		undefined,
	);

	React.useEffect(() => {
		const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
		const onChange = () => {
			setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
		};
		mql.addEventListener("change", onChange);
		setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
		return () => mql.removeEventListener("change", onChange);
	}, []);

	return !!isMobile;
}

/**
 * Returns true when the primary pointing device is a touchscreen
 * (i.e. `pointer: coarse` — no fine hover capability).
 * This is more reliable than viewport-width checks for detecting
 * touch-only devices where tooltips don't work.
 */
export function useIsTouchDevice() {
	const [isTouch, setIsTouch] = React.useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		return window.matchMedia("(pointer: coarse)").matches;
	});

	React.useEffect(() => {
		const mql = window.matchMedia("(pointer: coarse)");
		const onChange = (e: MediaQueryListEvent) => setIsTouch(e.matches);
		mql.addEventListener("change", onChange);
		return () => mql.removeEventListener("change", onChange);
	}, []);

	return isTouch;
}
