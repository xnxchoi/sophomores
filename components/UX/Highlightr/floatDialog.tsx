"use client";
import {
  FloatingFocusManager,
  FloatingFocusManagerProps,
  FloatingOverlay,
  FloatingPortal,
  useClick,
  useDismiss,
  useFloating,
  useId,
  useInteractions,
  useMergeRefs,
  useRole
} from "@floating-ui/react";
import {
  cloneElement,
  ComponentProps,
  ComponentPropsWithRef,
  createContext,
  Dispatch,
  isValidElement,
  ReactElement,
  ReactNode,
  SetStateAction,
  useContext,
  useLayoutEffect,
  useMemo,
  useState
} from "react";
import { Button } from "@/components/core/Button";

interface DialogOptions {
  initialOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function useDialog({
  initialOpen = false,
  open: controlledOpen,
  onOpenChange: setControlledOpen
}: DialogOptions = {}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(initialOpen);
  const [labelId, setLabelId] = useState<string | undefined>();
  const [descriptionId, setDescriptionId] = useState<string | undefined>();

  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = setControlledOpen ?? setUncontrolledOpen;

  const data = useFloating({
    open,
    onOpenChange: setOpen
  });

  const context = data.context;

  const click = useClick(context, {
    enabled: controlledOpen == null
  });
  const dismiss = useDismiss(context, { outsidePressEvent: "mousedown" });
  const role = useRole(context);

  const interactions = useInteractions([click, dismiss, role]);

  return useMemo(
    () => ({
      open,
      setOpen,
      ...interactions,
      ...data,
      labelId,
      descriptionId,
      setLabelId,
      setDescriptionId
    }),
    [open, setOpen, interactions, data, labelId, descriptionId]
  );
}

type ContextType =
  | (ReturnType<typeof useDialog> & {
      setLabelId: Dispatch<SetStateAction<string | undefined>>;
      setDescriptionId: Dispatch<SetStateAction<string | undefined>>;
    })
  | null;

const DialogContext = createContext<ContextType>(null);

export const useDialogContext = () => {
  const context = useContext(DialogContext);

  if (context == null) {
    throw new Error("Dialog components must be wrapped in <Dialog />");
  }

  return context;
};

export function Dialog({
  children,
  ...options
}: {
  children: ReactNode;
} & DialogOptions) {
  const dialog = useDialog(options);
  return (
    <DialogContext.Provider value={dialog}>{children}</DialogContext.Provider>
  );
}

interface DialogTriggerProps {
  children: ReactNode;
  asChild?: boolean;
}

export const DialogTrigger = <
  T extends ComponentPropsWithRef<"button"> & DialogTriggerProps
>({
  children,
  asChild = false,
  ...props
}: T) => {
  const context = useDialogContext();
  const childrenRef = (children as any).ref;
  const ref = useMergeRefs([context.refs.setReference, childrenRef]);

  // `asChild` allows the user to pass any element as the anchor
  if (asChild && isValidElement(children)) {
    return cloneElement(
      children,
      context.getReferenceProps({
        ref,
        ...props,
        ...((children as ReactElement).props || {}),
        "data-state": context.open ? "open" : "closed"
      } as ComponentProps<"button">)
    );
  }

  return (
    <button
      ref={ref}
      // The user can style the trigger based on the state
      data-state={context.open ? "open" : "closed"}
      {...context.getReferenceProps(props)}
    >
      {children}
    </button>
  );
};

export const DialogContent = ({
  ref: propRef,
  children,
  overlay = true,
  lockScroll = true,
  focusManager: { ...focusProps },
  ...props
}: ComponentPropsWithRef<"div"> & {
  overlay?: boolean;
  lockScroll?: boolean;
  focusManager?: Omit<FloatingFocusManagerProps, "context" | "children">;
}) => {
  const { context: floatingContext, ...context } = useDialogContext();
  const ref = useMergeRefs([context.refs.setFloating, propRef]);

  if (!floatingContext.open) return null;

  return (
    <FloatingPortal>
      {overlay ? (
        <FloatingOverlay
          className=""
          lockScroll={overlay && lockScroll}
          style={{
            ...((!overlay && {
              backgroundColor: "transparent",
              pointerEvents: "none",
              zIndex: -1
            }) ||
              {})
          }}
        >
          <FloatingFocusManager context={floatingContext} {...focusProps}>
            <div
              ref={ref}
              aria-labelledby={context.labelId}
              aria-describedby={context.descriptionId}
              {...context.getFloatingProps(props)}
            >
              {children}
            </div>
          </FloatingFocusManager>
        </FloatingOverlay>
      ) : (
        <div
          ref={ref}
          aria-labelledby={context.labelId}
          aria-describedby={context.descriptionId}
          {...context.getFloatingProps(props)}
        >
          {children}
        </div>
      )}
    </FloatingPortal>
  );
};

export const DialogHeading = ({
  children,
  ref,
  ...props
}: ComponentProps<"h2">) => {
  const { setLabelId } = useDialogContext();
  const id = useId();

  // Only sets `aria-labelledby` on the Dialog root element
  // if this component is mounted inside it.
  useLayoutEffect(() => {
    setLabelId(id);
    return () => setLabelId(undefined);
  }, [id, setLabelId]);

  return (
    <h2 {...props} ref={ref} id={id}>
      {children}
    </h2>
  );
};

export const DialogDescription = ({
  children,
  ref,
  ...props
}: ComponentProps<"p">) => {
  const { setDescriptionId } = useDialogContext();
  const id = useId();

  // Only sets `aria-describedby` on the Dialog root element
  // if this component is mounted inside it.
  useLayoutEffect(() => {
    setDescriptionId(id);
    return () => setDescriptionId(undefined);
  }, [id, setDescriptionId]);

  return (
    <p {...props} ref={ref} id={id}>
      {children}
    </p>
  );
};

export const DialogClose = ({ ref, ...props }: ComponentProps<"button">) => {
  const { setOpen } = useDialogContext();
  return (
    <Button type="button" {...props} ref={ref} onClick={() => setOpen(false)} />
  );
};
