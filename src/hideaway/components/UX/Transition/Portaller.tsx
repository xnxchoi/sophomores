"use client";
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode
} from "react";
type PageTransitionState = {
  isAnimating: boolean;
  animateFn: (animateIn: boolean, callback?: () => void) => void;
};
type Portaller = PageTransitionState & {
  animateTransition: (animateIn: boolean, callback?: () => void) => void;
  setAnimateFn: (
    fn: (animateIn: boolean, callback?: () => void) => void
  ) => void;
};
const PortallerContext = createContext<Portaller>({
  isAnimating: false,
  animateFn: null!,
  animateTransition: null!,
  setAnimateFn: null!
});
export const PortalProvider = ({ children }: { children: ReactNode }) => {
  const [fn, setFn] = useState<
    (animateIn: boolean, callback?: () => void) => void
  >(null!);
  const fnRef = useRef(fn);
  const [isAnimating, setIsAnimating] = useState(false);
  const setAnimateFn = useCallback(
    (fn: (animateIn: boolean, callback?: () => void) => void) => {
      setFn(fn);
      fnRef.current = fn;
    },
    []
  );
  const animateTransition = useCallback(
    (animateIn: boolean, callback?: () => void) => {
      if (!fnRef.current) return;
      setIsAnimating(true);
      fnRef.current(animateIn, () => {
        setIsAnimating(false);
        callback?.();
      });
    },
    []
  );

  return (
    <PortallerContext.Provider
      value={{
        isAnimating,
        animateFn: fnRef.current,
        animateTransition,
        setAnimateFn
      }}
    >
      {children}
    </PortallerContext.Provider>
  );
};
export const usePortaller = <T,>(selector: (state: Portaller) => T) => {
  const context = useContext(PortallerContext);
  if (!context) {
    throw new Error("usePortaller must be used within a PortallerProvider");
  }
  return selector(context);
};
