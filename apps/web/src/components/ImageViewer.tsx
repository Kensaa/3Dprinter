import { useEffect, useMemo, useState } from 'react'
import {
    blockCountString,
    getBlockIconURL,
    getBlockName,
    getImageDimensions
} from '../utils/utils'
import Tooltip from './Tooltip'

interface ImageViewerProps {
    image: string
    blockCount: number
    individualBlockCount?: Record<string, number>
    width?: string
    height?: string
    maxWidth?: string
    maxHeight?: string
}

export default function ImageViewer({
    image,
    blockCount,
    individualBlockCount,
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
    }, [image])

    const sortedEntries = useMemo(() => {
        if (!individualBlockCount) {
            return []
        }

        return Object.entries(individualBlockCount).sort(
            ([, a], [, b]) => b - a
        )
    }, [individualBlockCount])

    return (
        <div
            style={{ width, height, maxWidth, maxHeight }}
            className='d-flex flex-column align-items-center'
        >
            <img
                style={{ maxWidth: '100%', maxHeight: '100%' }}
                className='border'
                src={image}
            />
            <h1>{dims}</h1>
            <h5>{blockCount && blockCountString(blockCount)}</h5>

            {individualBlockCount !== undefined ? (
                <>
                    <table>
                        <thead>
                            <tr>
                                <th>Block</th>
                                <th>Count</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedEntries.map(([block, count]) => (
                                <tr key={block}>
                                    <td>
                                        <Tooltip
                                            placement='top'
                                            tooltipContent={getBlockName(block)}
                                            delay={{ show: 200, hide: 0 }}
                                            key={block}
                                        >
                                            <img
                                                width={48}
                                                src={getBlockIconURL(block)}
                                            />
                                        </Tooltip>
                                    </td>
                                    <td>{blockCountString(count)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </>
            ) : undefined}
        </div>
    )
}
