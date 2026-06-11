import { useMemo, useRef } from 'react'
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
            ALL_BLOCKS.map(blocks =>
                blocks.find(b => palette.includes(b) ?? null)
            ),
        [palette]
    )

    const handleSelect = (color_id: number, block: string) => {
        return () => {
            if (selected[color_id] === block) return
            const newSelected = [...selected]
            newSelected[color_id] = block
            const newPalette = Array.from(Object.values(newSelected)).filter(
                e => e !== undefined
            )
            onChange(newPalette)
        }
    }

    const containerRef = useRef<HTMLDivElement>(null)
    console.log(`0x${get_base_color(1).toString(16).padStart(6, '0')}`)
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
                                    {blocks.map(block => (
                                        <Tooltip
                                            placement='top'
                                            tooltipContent={getBlockName(block)}
                                            delay={{ show: 200, hide: 0 }}
                                            container={containerRef}
                                            key={block}
                                        >
                                            <img
                                                onClick={handleSelect(
                                                    color_id,
                                                    block
                                                )}
                                                className='mx-1'
                                                style={{
                                                    boxShadow:
                                                        selected[color_id] ===
                                                        block
                                                            ? '0 0 0 2px red'
                                                            : '0 0 0 2px transparent',
                                                    cursor: 'pointer'
                                                }}
                                                width={48}
                                                src={getBlockIconURL(block)}
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
