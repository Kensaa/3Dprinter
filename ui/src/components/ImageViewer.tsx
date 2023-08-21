import { useEffect, useState } from 'react'
import configStore from '../stores/config'
import { Build } from '../types'

interface ImageViewerProps {
    build: Build
    width?: string
    height?: string
}

export default function ImageViewer({
    build,
    width = '25%',
    height = '50%'
}: ImageViewerProps) {
    const address = configStore(state => state.address)
    const [image, setImage] = useState('')

    useEffect(() => {
        fetch(`${address}/image/arrayToImage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(build.shape[0])
        })
            .then(res => res.blob())
            .then(blob => blobToBase64(blob))
            .then(image => setImage(image))
    }, [address, build])

    return (
        <div style={{ width, height }} className='border'>
            <img className='w-100 h-100' src={image} />
        </div>
    )
}

const blobToBase64 = async (blob: Blob) => {
    return new Promise<string>((onSuccess, onError) => {
        try {
            const reader = new FileReader()
            reader.onload = function () {
                onSuccess(this.result as string)
            }
            reader.readAsDataURL(blob)
        } catch (e) {
            onError(e)
        }
    })
}
