import { useRef, useState } from 'react'
import { Canvas, ThreeEvent } from '@react-three/fiber'
import { OrbitControls, Stage, Edges, Html } from '@react-three/drei'
import { Model } from '../types'
import chevronLeft from '../assets/chevron-left.svg'
import chevronRight from '../assets/chevron-right.svg'
import { Spinner } from 'react-bootstrap'

interface ModelViewerProps {
    model: Model | undefined
    width?: string
    height?: string
}

export default function ModelViewer({
    model,
    width = '25%',
    height = '50%'
}: ModelViewerProps) {
    const [selectedLayer, setSelectedLayer] = useState(0)

    const constructLayer = (y: number, model: Model) => {
        return model.shape[y].map((row, z) =>
            row.map(
                (col, x) =>
                    col === 1 && (
                        <Box
                            key={`${x},${y},${z}`}
                            position={[x, y + 1, z]}
                            color={
                                y === 0 && z === 0 && x === 0
                                    ? 0x005500
                                    : undefined
                            }
                            hoveredColor={
                                y === 0 && z === 0 && x === 0
                                    ? 0x004900
                                    : undefined
                            }
                        />
                    )
            )
        )
    }

    if (model === undefined) {
        return (
            <div
                style={{ width, height }}
                className='d-flex justify-content-center align-items-center border'
            ></div>
        )
    }

    return (
        <div style={{ width, height }} className='border'>
            <Canvas>
                <ambientLight />
                <Stage adjustCamera>
                    {selectedLayer === 0
                        ? model.shape.map((_, y) => constructLayer(y, model))
                        : constructLayer(selectedLayer - 1, model)}
                </Stage>
                <Panel>
                    <div className='d-flex flex-column align-items-center'>
                        Select layer to show
                        <NumberSelect
                            min={0}
                            max={model.shape.length}
                            onChange={setSelectedLayer}
                            valueLabels={{ 0: 'all' }}
                        />
                    </div>
                </Panel>
                <OrbitControls makeDefault minDistance={5} maxDistance={20} />
            </Canvas>
        </div>
    )
}

interface NumberSelector {
    min: number
    max: number
    onChange: (value: number) => void
    valueLabels?: Record<number, string>
}

function NumberSelect({
    min,
    max,
    onChange,
    valueLabels = {}
}: NumberSelector) {
    const [value, setValue] = useState(min)

    const update = (value: number) => {
        setValue(value)
        onChange(value)
    }

    const left = () => {
        if (value === min) {
            update(max)
        } else {
            update(value - 1)
        }
    }

    const right = () => {
        if (value === max) {
            update(min)
        } else {
            update(value + 1)
        }
    }

    return (
        <div className='d-flex justify-content-center w-100'>
            <img className='img-btn' src={chevronLeft} onClick={left} />
            {/*<Form.Control
                className='text-center unselectable'
                readOnly
                plaintext
                value={valueLabels[value] ?? value}
    />*/}
            <label className='text-center unselectable w-50'>
                {valueLabels[value] ?? value}
            </label>
            <img className='img-btn' src={chevronRight} onClick={right} />
        </div>
    )
}

interface PanelProps {
    children: JSX.Element
}
function Panel({ children }: PanelProps) {
    return (
        <Html calculatePosition={() => [0, 0, 0]} wrapperClass='panel-wrapper'>
            <div className='panel'>{children}</div>
        </Html>
    )
}

interface BoxProps {
    position: [number, number, number]
    color?: number
    hoveredColor?: number
}
function Box({
    position,
    color = 0x515151,
    hoveredColor = 0x454545
}: BoxProps) {
    const meshRef = useRef(null)
    const [hover, setHover] = useState(false)

    const clicked = (event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation()
    }

    return (
        <mesh
            position={position}
            onClick={clicked}
            onPointerOver={e => {
                e.stopPropagation()
                setHover(true)
            }}
            onPointerOut={e => {
                e.stopPropagation()
                setHover(false)
            }}
            ref={meshRef}
        >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={hover ? hoveredColor : color} />
            <Edges />
        </mesh>
    )
}
