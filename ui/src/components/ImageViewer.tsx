import { useState } from 'react'
import { Build } from '../utils/types'

interface ImageViewerProps {
    build: Build
    width?: string
    height?: string
    maxWidth?: string
    maxHeight?: string
}

export default function ImageViewer({
    build,
    width,
    height,
    maxWidth,
    maxHeight
}: ImageViewerProps) {
    const [dims, setDims] = useState('0x0')

    if (build.type !== 'image') {
        return <div>Error: Image Viewer is trying to show a model</div>
    }
    return (
        <div
            style={{ width, height, maxWidth, maxHeight }}
            className='d-flex flex-column align-items-center'
        >
            <img
                className='w-100 h-100'
                src={build.preview}
                onLoad={({ currentTarget }) => {
                    setDims(`${currentTarget.width}x${currentTarget.height}`)
                }}
            />
            <h1>{dims}</h1>
        </div>
    )
}
