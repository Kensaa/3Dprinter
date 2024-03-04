import { useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { CameraControls, Edges, Stage } from '@react-three/drei'
import type { Task } from '../utils/types'
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

    return (
        <div style={{ width, height }} className='border'>
            {currentTask ? (
                <Canvas>
                    <Stage>{createCubes(currentTask)}</Stage>
                    <CameraControls />
                </Canvas>
            ) : (
                <LoadingSpinner style={{ width: '100%', height: '100%' }} />
            )}
        </div>
    )
}

function createCubes(task: Task) {
    const cubes = []
    for (let i = 0; i < task.partCount; i++) {
        const position = task.partsPositions[i]
        let color = 0x111111
        if (task.currentlyBuildingParts.includes(i)) {
            // yellow
            color = 0xffff00
        } else if (task.completedParts.includes(i)) {
            // green
            color = 0x00ff00
        }
        cubes.push(<Box position={position} color={color} />)
    }
    return cubes
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
