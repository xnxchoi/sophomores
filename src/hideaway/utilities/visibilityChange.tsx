"use client";
import tabMessages from "@/constants/tabMessages.json";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { createStore, useStore } from "zustand";
import { randomNumber } from "./randomNumber";

type TabMessageStore = {
  title: string;
  screenSaverTitle: string;
};
type TabMessageActions = {
  setTitle: (title: string) => void;
  setScreenSaverTitle: (title: string) => void;
};
type TabMessengerType = TabMessageStore & TabMessageActions;
const createTabMessageStore = (initState: TabMessageStore) => {
  return createStore<TabMessengerType>((set) => ({
    ...initState,
    setTitle: (title) => set({ title }),
    setScreenSaverTitle: (title) => set({ screenSaverTitle: title })
  }));
};
type TabMessengerAPI = ReturnType<typeof createTabMessageStore>;
const TabMessageContext = createContext<TabMessengerAPI | undefined>(undefined);
const FALLBACK_TITLE = "THE HIDEAWAY";
const TabMessengerProvider = ({ children }: { children: React.ReactNode }) => {
  const store = useRef<TabMessengerAPI>(undefined!);

  if (!store.current) {
    store.current = createTabMessageStore({
      title: FALLBACK_TITLE,
      screenSaverTitle: ""
    });
  }

  return (
    <TabMessageContext.Provider value={store.current}>
      {children}
    </TabMessageContext.Provider>
  );
};
export const useTabMessenger = <T,>(
  selector: (store: TabMessengerType) => T
): T => {
  const store = useContext(TabMessageContext);
  if (!store) {
    throw new Error(
      "useTabMessenger must be used within a TabMessengerProvider"
    );
  }
  return useStore(store, selector);
};
const InternalTabMessenger = () => {
  const ogDocTitle = useRef(FALLBACK_TITLE);
  const emojis = useMemo(() => tabMessages.icons, []);
  const messages = useMemo(() => tabMessages.messages, []);

  const screenSaverTitle = useRef(FALLBACK_TITLE);
  const pathName = usePathname();
  const [visible, setVisible] = useState(true);
  const lastPathName = useRef<string>(null!);
  useEffect(() => {
    if (lastPathName.current !== pathName) {
      ogDocTitle.current = document.title;
    }
    lastPathName.current = pathName;
  }, [pathName]);

  const visibleCallback = useCallback(() => {
    const isVisible = !document.hidden;
    setVisible(isVisible);
    document.title = isVisible ? ogDocTitle.current : screenSaverTitle.current;
  }, []);

  useEffect(() => {
    document.addEventListener("visibilitychange", visibleCallback);
    return () => {
      document.title = ogDocTitle.current;
      ogDocTitle.current = document.title;
      document.removeEventListener("visibilitychange", visibleCallback);
    };
  }, [visibleCallback]);
  const lastScreenSaverTitle = useRef("");
  const lastScreenSaverEmoji = useRef("");
  const delayerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const screensaver = useCallback(() => {
    let message = messages[randomNumber(0, messages.length - 1)];
    let emoji = emojis[randomNumber(0, emojis.length - 1)];
    let totalRetries = 3;
    while (message === lastScreenSaverTitle.current && totalRetries > 0) {
      totalRetries--;
      message = messages[randomNumber(0, messages.length - 1)];
    }
    totalRetries = 3;
    while (emoji === lastScreenSaverEmoji.current && totalRetries > 0) {
      totalRetries--;
      emoji = emojis[randomNumber(0, emojis.length - 1)];
    }
    screenSaverTitle.current = `${emoji} ${message}`;
    lastScreenSaverTitle.current = message;
    lastScreenSaverEmoji.current = emoji;
    document.title = screenSaverTitle.current;
  }, [emojis, messages]);
  useEffect(() => {
    delayerRef.current && clearInterval(delayerRef.current);
    delayerRef.current = visible
      ? ((document.title = ogDocTitle.current), null)
      : setInterval(screensaver, 20000);
    return () => {
      delayerRef.current && clearInterval(delayerRef.current);
      delayerRef.current = null;
    };
  }, [screensaver, visible]);
  return <></>;
};
export const TabMessenger = () => {
  return (
    <TabMessengerProvider>
      <InternalTabMessenger />
    </TabMessengerProvider>
  );
};
