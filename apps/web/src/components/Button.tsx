import { Button as RBButton } from 'react-bootstrap'
import type { ButtonProps } from 'react-bootstrap'

export default function Button({
    children,
    ...props
}: React.PropsWithChildren<ButtonProps>) {
    return (
        <>
            {
                // @ts-expect-error react-bootstrap types are broken
                <RBButton {...props}>{children}</RBButton>
            }
        </>
    )
}
