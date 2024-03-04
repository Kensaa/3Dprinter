import { useRef, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { CameraControls } from '@react-three/drei'
import type { Task } from '../utils/types'
import { useCurrentTask } from '../stores/data'
import { Color, InstancedMesh, Object3D } from 'three'
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
                    <ambientLight />
                    <Mesh task={currentTask} />
                    <CameraControls />
                </Canvas>
            ) : (
                <LoadingSpinner style={{ width: '100%', height: '100%' }} />
            )}
        </div>
    )
}

interface MeshProps {
    task: Task
}

function Mesh({ task }: MeshProps) {
    const meshRef = useRef<InstancedMesh>(null)

    useEffect(() => {
        if (meshRef == null) return
        if (meshRef.current == null) return

        const tempObject = new Object3D()

        const height = task.divisionHeight
        const depth = task.divisionDepth
        const width = task.divisionWidth

        for (let i = 0; i < task.partCount; i++) {
            const [x, y, z] = task.partsPositions[i]
            tempObject.position.set(
                x - width / 2,
                y - height / 2,
                z - depth / 2
            )
            tempObject.updateMatrix()

            meshRef.current.setMatrixAt(i, tempObject.matrix)

            if (task.currentlyBuildingParts.includes(i)) {
                // yellow
                meshRef.current.setColorAt(i, new Color(1, 1, 0))
            } else if (task.completedParts.includes(i)) {
                // green
                meshRef.current.setColorAt(i, new Color(0, 1, 0))
            } else {
                // gray
                meshRef.current.setColorAt(i, new Color(0.1, 0.1, 0.1))
            }
        }

        meshRef.current.instanceMatrix.needsUpdate = true
    }, [task])

    return (
        <instancedMesh
            ref={meshRef}
            args={[undefined, undefined, task.partCount]}
        >
            <boxGeometry args={[1, 1, 1]}></boxGeometry>
            <meshBasicMaterial />
        </instancedMesh>
    )
}
