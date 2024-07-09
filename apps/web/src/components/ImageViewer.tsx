import { useEffect, useState } from 'react'
import { blockCountString, getImageDimensions } from '../utils/utils'

interface ImageViewerProps {
    image: string
    blockCount: number
    width?: string
    height?: string
    maxWidth?: string
    maxHeight?: string
}

export default function ImageViewer({
    image,
    blockCount,
    width,
    height,
    maxWidth,
    maxHeight
}: ImageViewerProps) {
    const [dims, setDims] = useState<string>()
    useEffect(() => {
        getImageDimensions(image).then(({ w, h }) => {
            setDims(`${w}x${h}`)
        })
    })

    return (
        <div
            style={{ width, height, maxWidth, maxHeight }}
            className='d-flex flex-column align-items-center'
        >
            <img className='w-100 h-100 border' src={image} />
            <h1>{dims}</h1>
            <h5>{blockCount && blockCountString(blockCount)}</h5>
        </div>
    )
}
