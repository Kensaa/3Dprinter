import { useEffect, useState } from 'react'
import configStore from '../stores/config'
import { Build } from '../types'
import { blobToBase64, getImageDimensions } from '../utils/utils'

interface ImageViewerProps {
    build: Build
    width?: string
    height?: string
}

export default function ImageViewer({
    build,
    width,
    height
}: ImageViewerProps) {
    const address = configStore(state => state.address)
    const [image, setImage] = useState('')
    const [dimensions, setDimensions] = useState('')

    useEffect(() => {
        fetch(`${address}/image/arrayToImage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(build.shape[0])
        })
            .then(res => res.blob())
            .then(blob => blobToBase64(blob))
            .then(image => {
                setImage(image)
                getImageDimensions(image).then(dims => {
                    setDimensions(`${dims.w}x${dims.h}`)
                })
            })
    }, [address, build])

    return (
        <div
            style={{ width: width, height: height }}
            className='d-flex flex-column align-items-center'
        >
            <img className='w-100 h-100' src={image} />
            <h1>{dimensions}</h1>
        </div>
    )
}
