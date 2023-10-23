/* eslint-disable @typescript-eslint/ban-ts-comment */
import { useRef, useState, useEffect, useMemo } from 'react'
import { Canvas, ThreeEvent } from '@react-three/fiber'
import { OrbitControls, Stage, Edges, Html } from '@react-three/drei'
import { Build } from '../utils/types'
import chevronLeft from '../assets/chevron-left.svg'
import chevronRight from '../assets/chevron-right.svg'
import { edit3DArray, trim3DArray } from '../utils/arrayUtils'
import { Button } from 'react-bootstrap'
import dataStore from '../stores/data'
import configStore from '../stores/config'

interface ModelViewerProps {
    buildName: string
    build: Build
    width?: string
    height?: string
    editable?: boolean
}

export default function ModelViewer({
    buildName,
    build: defaultBuild,
    width = '25%',
    height = '50%',
    editable = false
}: ModelViewerProps) {
    const [selectedLayer, setSelectedLayer] = useState(0)
    const [build, setBuild] = useState(defaultBuild)
    const updateBuild = dataStore(store => store.updateBuild)
    const disableRender = configStore(store => store.disableRender)

    useEffect(() => setBuild(defaultBuild), [defaultBuild])

    const layers = useMemo(() => {
        console.log('recreating layers')
        const constructLayer = (y: number, build: Build) => {
            return build.shape[y].map((row, z) =>
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
                                addBlock={
                                    editable
                                        ? (x: number, y: number, z: number) => {
                                              const shape = build.shape
                                              edit3DArray(shape, x, y, z, 1)
                                              console.log(shape)
                                              setBuild({ ...build, shape })
                                          }
                                        : undefined
                                }
                                deleteBlock={
                                    editable
                                        ? (x: number, y: number, z: number) => {
                                              //TODO: At least 1 block left at all times
                                              const shape = build.shape
                                              edit3DArray(shape, x, y, z, 0)
                                              trim3DArray(shape)
                                              console.log(shape)
                                              setBuild({ ...build, shape })
                                          }
                                        : undefined
                                }
                            />
                        )
                )
            )
        }
        return selectedLayer === 0
            ? build.shape.map((_, y) => constructLayer(y, build))
            : constructLayer(selectedLayer - 1, build)
    }, [selectedLayer, build, editable])

    if (build === undefined) {
        return (
            <div
                style={{ width, height }}
                className='d-flex justify-content-center align-items-center border'
            ></div>
        )
    }
    if (disableRender) return <></>

    return (
        <div style={{ width, height }} className='border'>
            <Canvas>
                <ambientLight />
                <Stage adjustCamera>{layers}</Stage>
                <Panel>
                    <div className='d-flex flex-column align-items-center'>
                        Select layer to show
                        <NumberSelect
                            min={0}
                            max={build.shape.length}
                            onChange={setSelectedLayer}
                            valueLabels={{ 0: 'all' }}
                        />
                    </div>
                </Panel>
                <OrbitControls makeDefault minDistance={1} maxDistance={20} />
            </Canvas>
            {editable && (
                <div className='w-100 d-flex justify-content-center mt-3'>
                    {
                        //@ts-ignore
                        <Button
                            onClick={() => updateBuild(buildName, build)}
                            variant='outline-primary'
                        >
                            Save Model
                        </Button>
                    }
                </div>
            )}
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
    addBlock?: (x: number, y: number, z: number) => void
    deleteBlock?: (x: number, y: number, z: number) => void
}
function Box({
    position,
    color = 0x515151,
    hoveredColor = 0x454545,
    addBlock,
    deleteBlock
}: BoxProps) {
    const meshRef = useRef(null)
    const [hover, setHover] = useState(false)

    const clicked = (event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation()
        if (!addBlock) return
        if (!deleteBlock) return
        const position = event.eventObject.position
        if (event.ctrlKey || event.shiftKey) {
            // remove
            deleteBlock(position.x, position.y - 1, position.z)
            console.log('deleted block', position)
        } else {
            const newPos = { ...position }
            const index = event.face?.materialIndex
            switch (index) {
                case 0:
                    newPos.x += 1 // west
                    break
                case 1:
                    newPos.x -= 1 // east
                    break
                case 2:
                    newPos.y += 1 // up
                    break
                case 3:
                    newPos.y -= 1 // down
                    break
                case 4:
                    newPos.z += 1 // south
                    break
                case 5:
                    newPos.z -= 1 // north
                    break
                default:
                    return
            }
            addBlock(newPos.x, newPos.y - 1, newPos.z)
            console.log('added block', newPos)
        }
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
            {[...Array(6)].map((_, index) => (
                <meshStandardMaterial
                    key={index}
                    color={hover && addBlock ? hoveredColor : color}
                    attach={`material-${index}`}
                />
            ))}
            <boxGeometry args={[1, 1, 1]} />
            <Edges />
        </mesh>
    )
}
