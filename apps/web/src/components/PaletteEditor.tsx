import { forwardRef, useMemo, useRef } from 'react'
import { ALL_BLOCKS } from '../stores/blockPreset'
import { getBlockIconURL, getBlockName } from '../utils/utils'
import { get_base_color, get_map_color_name } from 'build-bindings'
import Tooltip from './Tooltip'

interface PaletteEditorProps {
    palette: string[]
    onChange: (palette: string[]) => void
}
export default function PaletteEditor({
    palette,
    onChange
}: PaletteEditorProps) {
    const selected = useMemo(
        () =>
            ALL_BLOCKS.map(
                blocks => blocks.find(b => palette.includes(b)) ?? null
            ),
        [palette]
    )

    const handleSelect = (color_id: number, block: string | null) => {
        return () => {
            if (selected[color_id] === block) return
            const newSelected = [...selected]
            newSelected[color_id] = block
            const newPalette = Array.from(Object.values(newSelected)).filter(
                e => e !== null
            )
            onChange(newPalette)
        }
    }

    const containerRef = useRef<HTMLDivElement>(null)
    return (
        <div ref={containerRef}>
            <table>
                <thead>
                    <tr>
                        <th className='p-2'>Color</th>
                        <th className='p-2'>Blocks</th>
                    </tr>
                </thead>
                <tbody>
                    {ALL_BLOCKS.map((blocks, color_id) =>
                        blocks.length > 0 ? (
                            <tr key={color_id}>
                                <td>
                                    <Tooltip
                                        placement='top'
                                        delay={{ show: 200, hide: 0 }}
                                        container={containerRef}
                                        tooltipContent={get_map_color_name(
                                            color_id
                                        )}
                                    >
                                        <div
                                            style={{
                                                width: 32,
                                                height: 32,
                                                backgroundColor: `#${get_base_color(color_id).toString(16).padStart(6, '0')}`
                                            }}
                                        />
                                    </Tooltip>
                                </td>
                                <td className='p-1'>
                                    {/* <Tooltip
                                        placement='top'
                                        tooltipContent='None'
                                        delay={{ show: 200, hide: 0 }}
                                        container={containerRef}
                                    >
                                        <img
                                            onClick={handleSelect(
                                                color_id,
                                                null
                                            )}
                                            className='mx-1'
                                            style={{
                                                boxShadow:
                                                    selected[color_id] === block
                                                        ? '0 0 0 2px red'
                                                        : '0 0 0 2px transparent',
                                                cursor: 'pointer'
                                            }}
                                            width={48}
                                            src={getBlockIconURL(block)}
                                        />
                                    </Tooltip> */}
                                    <Tooltip
                                        placement='top'
                                        tooltipContent='None'
                                        delay={{ show: 200, hide: 0 }}
                                        container={containerRef}
                                    >
                                        <BlockImage
                                            id='minecraft:barrier'
                                            selected={
                                                selected[color_id] === null
                                            }
                                            onClick={handleSelect(
                                                color_id,
                                                null
                                            )}
                                        />
                                    </Tooltip>
                                    {blocks.map(block => (
                                        <Tooltip
                                            placement='top'
                                            tooltipContent={getBlockName(block)}
                                            delay={{ show: 200, hide: 0 }}
                                            container={containerRef}
                                            key={block}
                                        >
                                            <BlockImage
                                                id={block}
                                                selected={
                                                    selected[color_id] === block
                                                }
                                                onClick={handleSelect(
                                                    color_id,
                                                    block
                                                )}
                                            />
                                        </Tooltip>
                                    ))}
                                </td>
                            </tr>
                        ) : undefined
                    )}
                </tbody>
            </table>
        </div>
    )
}

interface BlockImageProps {
    id: string
    selected: boolean
    onClick: () => void
}
const BlockImage = forwardRef<HTMLImageElement, BlockImageProps>(
    ({ id, selected, onClick, ...props }, ref) => {
        return (
            <img
                ref={ref}
                onClick={onClick}
                className='mx-1'
                style={{
                    boxShadow: selected
                        ? '0 0 0 2px red'
                        : '0 0 0 2px transparent',
                    cursor: 'pointer'
                }}
                width={48}
                src={getBlockIconURL(id)}
                {...props}
            />
        )
    }
)
