"use client";
import { useContext, createContext, useState } from "react";

type FloaterHightlight = {
  setOpen: (open: boolean) => void;
  open: boolean;
	setShown: (open: boolean) => void
	shown: boolean;
};
const FloaterContext = createContext<FloaterHightlight>({
  setOpen: (open: boolean) => {},
	open: false,
	setShown: (open) => {
	},
	shown: false
});
export const FloatMenuProvider = ({
  children
}: {
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(false);
	const [shown, setShown] = useState(false)
  return (
	  <FloaterContext.Provider value={{setOpen, open, shown, setShown}}>
      {children}
    </FloaterContext.Provider>
  );
};
export const useFloater = <T,>(selector: (state: FloaterHightlight) => T) => {
  const ctx = useContext(FloaterContext);
  return selector(ctx);
};
