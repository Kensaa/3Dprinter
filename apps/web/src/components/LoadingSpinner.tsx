import React from 'react'
import { Spinner } from 'react-bootstrap'

interface LoadingSpinnerProps {
    style: React.CSSProperties
}

export default function LoadingSpinner({ style }: LoadingSpinnerProps) {
    return (
        <div
            style={style}
            className='d-flex justify-content-center align-items-center border'
        >
            <Spinner animation='border' />
        </div>
    )
}
