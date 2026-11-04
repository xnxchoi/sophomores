import {ComponentProps, createContext, ReactNode, useContext} from "react";
import {cn} from "@/lib/utils";
import {Tooltip as TooltipPrimitive} from "@base-ui/react/tooltip";
import {createStore} from "zustand/vanilla";

// export function RPTooltip({className, children,}: {
//     className?: string;
//     children?: ReactNode;
//     label?: string
// }) {
//     return (
//         <div className={cn(
//             "tooltip",
//             className || 'ui'
//         )}>
//             <div className="tooltip__content">{children}</div>
//         </div>
//     );
// }

type PositionerProps = ComponentProps<typeof TooltipPrimitive.Positioner>;

export const RPTooltip = ({
                              className, render, children, tooltip, ...props
                          }: Pick<ComponentProps<typeof TooltipPrimitive.Trigger>, "className" | "render" | "children"> & {

    tooltip?: ReactNode;
} & Omit<ComponentProps<typeof TooltipPrimitive.Root>, "children">) => {

    return <TooltipPrimitive.Root {...props}>
        <RPTooltipTrigger className={className} render={render}>{children}</RPTooltipTrigger>
        <RPTooltipContent>
            {tooltip}
        </RPTooltipContent>
    </TooltipPrimitive.Root>
}
export const RPTooltipProvider = (props: ComponentProps<typeof TooltipPrimitive.Provider>) => (
    <TooltipPrimitive.Provider {...props}/>)
export const RPTooltipTrigger = ({
                                     render,
                                     ...props
                                 }: ComponentProps<typeof TooltipPrimitive.Trigger>) => {
    return <TooltipPrimitive.Trigger render={render || (({children, className}) =>
        <div role="button"
             className={cn("size-10 border-0 flex focus-visible:bg-none hover:bg-faded-d-gray/25 rounded-sm data-popup-open:bg-faded-d-gray/25 active:bg-faded-l-gray/25 transition-colors duration-50 ease-out-power2 focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-blue-gray items-center justify-center select-none focus-visible:not-[&:hover]:bg-transparent", className)}>{children}</div>)} {...props}/>
}
export const RPTooltipContent = ({
                                     side,
                                     sideOffset = 10,
                                     positioner,
                                     children,
                                     className,
                                     ...props
                                 }: { positioner?: Omit<PositionerProps, "sideOffset" | "side"> } &
    ComponentProps<typeof TooltipPrimitive.Popup> & Pick<PositionerProps, "side" | "sideOffset">
) => {
    let positionerClassName: PositionerProps["className"];
    let positionerProps: Omit<PositionerProps, "className">;
    if (positioner) {
        const {
            className: p1,
            ...p2
        } = positioner;
        positionerClassName = p1;
        positionerProps = p2;
    } else {
        positionerProps = {}
    }

    return <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner side={side} sideOffset={sideOffset}
                                     className={cn("", positionerClassName)} {...positionerProps}>
            <TooltipPrimitive.Popup
                className={cn("flex outline outline-1 rounded-[6px] outline-muted-faded-foreground/50 max-w-[calc(100vw-24px)] overflow-hidden dark:-outline-offset-1 dark:outline-muted-faded-foreground/90 flex-col py-2 px-3 leading-[1.4] text-sm whitespace-nowrap items-center relative transition-[transform,scale,opacity] data-ending-style:opacity-0 data-ending-style:scale-90 data-instant:transition-none data-starting-style:opacity-0 data-starting-style:scale-90 origin-(--transform-origin)", className)}
                {...props}
            >

                <TooltipPrimitive.Arrow
                    className="bg-foreground fill-foreground data-[side=bottom]:top-[-8px] data-[side=left]:right-[-13px] data-[side=left]:rotate-90 data-[side=right]:left-[-13px] data-[side=right]:-rotate-90 data-[side=top]:bottom-[-8px] data-[side=top]:rotate-180">
                    <svg width="20" height="10" viewBox="0 0 20 10" fill="none">
                        <path
                            d="M9.66437 2.60207L4.80758 6.97318C4.07308 7.63423 3.11989 8 2.13172 8H0V10H20V8H18.5349C17.5468 8 16.5936 7.63423 15.8591 6.97318L11.0023 2.60207C10.622 2.2598 10.0447 2.25979 9.66437 2.60207Z"
                            className="fill-[canvas]"
                        />
                        <path
                            d="M8.99542 1.85876C9.75604 1.17425 10.9106 1.17422 11.6713 1.85878L16.5281 6.22989C17.0789 6.72568 17.7938 7.00001 18.5349 7.00001L15.89 7L11.0023 2.60207C10.622 2.2598 10.0447 2.2598 9.66436 2.60207L4.77734 7L2.13171 7.00001C2.87284 7.00001 3.58774 6.72568 4.13861 6.22989L8.99542 1.85876Z"
                            className="fill-muted-faded-foreground/40 dark:fill-none"
                        />
                        <path
                            d="M10.3333 3.34539L5.47654 7.71648C4.55842 8.54279 3.36693 9 2.13172 9H0V8H2.13172C3.11989 8 4.07308 7.63423 4.80758 6.97318L9.66437 2.60207C10.0447 2.25979 10.622 2.2598 11.0023 2.60207L15.8591 6.97318C16.5936 7.63423 17.5468 8 18.5349 8H20V9H18.5349C17.2998 9 16.1083 8.54278 15.1901 7.71648L10.3333 3.34539Z"
                            className="dark:fill-muted-faded-foreground/90"
                        />
                    </svg>
                    {children}
                </TooltipPrimitive.Arrow>
            </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner></TooltipPrimitive.Portal>
}