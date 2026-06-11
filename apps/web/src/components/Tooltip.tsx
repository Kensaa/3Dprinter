import type { PropsWithChildren, ReactNode } from 'react'
import {
    OverlayTrigger,
    Tooltip as BTooltip,
    type OverlayTriggerProps,
    type TooltipProps as BTooltipProps
} from 'react-bootstrap'

type TooltipProps = PropsWithChildren<
    BTooltipProps &
        Omit<OverlayTriggerProps, 'overlay'> & { tooltipContent: ReactNode }
>
export default function Tooltip({
    children,
    tooltipContent,
    ...props
}: TooltipProps) {
    return (
        <OverlayTrigger
            {...props}
            // placement='top'
            overlay={<BTooltip>{tooltipContent}</BTooltip>}
        >
            {children}
        </OverlayTrigger>
    )
}
