import { useMemo, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { CameraControls, Edges, Stage } from '@react-three/drei'
import { useCurrentTask } from '../stores/data'
import LoadingSpinner from './LoadingSpinner'

export interface ProgressViewerProps {
    width?: string
    height?: string
}

export default function ProgressViewer({
    width = '100%',
    height = '100%'
}: ProgressViewerProps) {
    const { currentTask } = useCurrentTask()

    const cubes = useMemo(() => {
        if (!currentTask) return []
        const cubes = []
        for (let i = 0; i < currentTask.partCount; i++) {
            const position = currentTask.partsPositions[i]
            let color = 0x111111
            if (currentTask.currentlyBuildingParts.includes(i)) {
                // yellow
                color = 0xffff00
            } else if (currentTask.completedParts.includes(i)) {
                // green
                color = 0x00ff00
            }

            cubes.push(<Box key={i} position={position} color={color} />)
        }
        return cubes
    }, [currentTask])

    return (
        <div style={{ width, height }}>
            {currentTask ? (
                <Canvas>
                    {/* <Stage>{createCubes(currentTask)}</Stage> */}
                    <Stage>{cubes}</Stage>

                    <CameraControls dollySpeed={0} />
                </Canvas>
            ) : (
                <LoadingSpinner style={{ width: '100%', height: '100%' }} />
            )}
        </div>
    )
}

interface BoxProps {
    position: [number, number, number]
    color?: number
}
function Box({ position, color = 0x515151 }: BoxProps) {
    const meshRef = useRef(null)
    return (
        <mesh position={position} ref={meshRef}>
            {[...Array(6)].map((_, index) => (
                <meshStandardMaterial
                    key={index}
                    color={color}
                    attach={`material-${index}`}
                />
            ))}
            <boxGeometry args={[1, 1, 1]} />
            <Edges />
        </mesh>
    )
}
