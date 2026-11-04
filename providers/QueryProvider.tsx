import { errorToast } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from "react";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

const loadO = {
  user: true,
  notification: true,
  content: true,
  comment: true,
  highlight: true
};
const loadAr = [...Object.keys(loadO)] as Array<keyof typeof loadO>;

interface DataFetchState {
  isLoading: boolean;
  isError: boolean;
  key: keyof typeof loadO;
  error: Error | null;
  errorMessage: string;
}

type LoadKeys = keyof typeof loadO;
type LoadEntities = {
  [x in LoadKeys]: {
    error: Error | null;
    errorMessage: string;
    isError: boolean;
    isLoading: boolean;
    onLoad?: (isLoading: boolean) => void;
  };
};

type LoaderStore = {
  entities: LoadEntities;
  setIsLoading: (isLoading: boolean, target: keyof LoadEntities) => void;
  setError: (
    obj: {
      error: Error | null;
      errorMessage?: string;
    },
    target: keyof LoadEntities
  ) => void;
  isLoading: (target: keyof LoadEntities) => boolean | Error | null;
  onLoad: (
    fn: (isLoading: boolean) => void,
    target: keyof LoadEntities
  ) => void;
  setLoadState: (
    obj: {
      isLoading?: boolean;
      error?: Error | null;
      isError?: boolean;
      errorMessage?: string;
    },
    target: keyof LoadEntities
  ) => void;
};
const initt = loadAr.reduce((acc, v) => {
  acc[v] = {
    error: null,
    errorMessage: "",
    isError: false,
    isLoading: false
  };
  return acc;
}, {} as LoadEntities);
export const createLoaderStore = (initState: LoaderStore["entities"] = initt) =>
  createStore<LoaderStore>()((set, get) => ({
    entities: initState,
    setIsLoading: (isLoading, target) =>
      set((state) => {
        const ta = state.entities[target];
        if (!ta || typeof ta !== "object") return state;
        ta.onLoad && ta.onLoad(isLoading);

        return {
          ...state,
          entities: {
            ...state.entities,
            [target]: {
              ...ta,
              isLoading
            }
          }
        };
      }),
    isLoading: (target) => {
      const ta = get().entities[target];
      if (!ta || typeof ta !== "object") return null;
      if (ta.isError) {
        if (ta.error instanceof Error) return ta.error;
        return new Error(ta.errorMessage);
      }
      return ta.isLoading;
    },
    onLoad: (fn, target) =>
      set((state) => ({
        ...state,
        entities: {
          ...state.entities,
          [target]: { ...state.entities[target], onLoad: fn }
        }
      })),
    setError: (obj, target) =>
      set((state) => ({
        ...state,
        entities: {
          ...state.entities,
          [target]: {
            ...state.entities[target],
            ...obj
          }
        }
      })),
    setLoadState: (obj, target) =>
      set((state) => {
        let toPass = {};
        if (obj.isLoading !== undefined) {
          toPass = { isLoading: obj.isLoading };
        }
        if (obj.isError !== undefined) {
          if (obj.isError) {
            toPass = { ...toPass, isError: true };
            toPass = {
              ...toPass,
              error: obj.error || new Error(obj.errorMessage || "")
            };
            if (obj.errorMessage !== undefined) {
              toPass = { ...toPass, errorMessage: obj.errorMessage };
            }
          } else {
            toPass = {
              ...toPass,
              isError: false,
              error: null,
              errorMessage: ""
            };
          }
        }
        return {
          ...state,
          entities: {
            ...state.entities,
            [target]: {
              ...state.entities[target],
              ...toPass
            }
          }
        };
      })
  }));
export type LoaderAPI = ReturnType<typeof createLoaderStore>;
export const LoaderContext = createContext<LoaderAPI | undefined>(undefined);
export const LoaderProvider = ({ children }: { children: ReactNode }) => {
  const loader = useRef<LoaderAPI>(undefined!);
  if (!loader.current) {
    loader.current = createLoaderStore();
  }
  return (
    <LoaderContext.Provider value={loader.current}>
      {children}
    </LoaderContext.Provider>
  );
};
export const useLoader = <T,>(selector: (store: LoaderStore) => T): T => {
  const loader = useContext(LoaderContext);
  if (!loader) {
    throw new Error("Loader context not found");
  }
  return useStore(loader, selector);
};
export const useLoadState = ({
  isLoading,
  setIsLoading
}: {
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
}) => {
  const [load, setLoad] = useState<boolean>(false);
  useEffect(() => {
    setLoad(isLoading);
  }, [isLoading]);
  useEffect(() => {
    setIsLoading(load);
  }, [load, setIsLoading]);
  return { loading: load };
};
export const useRetrieve = ({
  isLoading,
  isError,
  error,
  errorMessage,
  key
}: DataFetchState) => {
  // const setIsLoad = useLoader((l) => l.setIsLoading);
  // const setError = useLoader((l) => l.setError);
  const setLoaderState = useLoader((l) => l.setLoadState);
  // const setIsLoading = useCallback(
  //   (isLoading: boolean) => {
  //     setIsLoad(isLoading, key);
  //   },
  //   [key, setIsLoad],
  // );
  // const setIsError = useCallback(
  //   (props: {
  //     isError: boolean;
  //     error?: Error | null;
  //     errorMessage?: string;
  //   }) => {
  //     const { isError, error, errorMessage } = props;
  //     const errMsg =
  //       (errorMessage && errorMessage) || "No error message provided";
  //     const toPass = {
  //       isError,
  //       errorMessage: isError ? errMsg : "",
  //       ...(isError
  //         ? error instanceof Error
  //           ? { error }
  //           : {
  //               error: new Error(errMsg),
  //             }
  //         : { error: null }),
  //     };
  //     setError(toPass, key);
  //   },
  //   [setError, key],
  // );
  const setLoadState = useCallback(
    (props: {
      isLoading?: boolean;
      error?: Error | null;
      isError?: boolean;
      errorMessage?: string;
    }) => {
      setLoaderState(props, key);
    },
    [key, setLoaderState]
  );
  useEffect(() => {
    setLoadState({
      isLoading,
      isError: isError,
      error,
      errorMessage
    });
  }, [isError, error, errorMessage, isLoading, setLoadState]);
};

export function QueryProvider({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 2
      }
    }
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

export const useErrorNotification = (isError: boolean, title: string) => {
  useEffect(() => {
    if (isError) {
      errorToast(title);
    }
  }, [isError, title]);
};
