import { useMemo, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { CameraControls, Edges, Stage } from '@react-three/drei'
import { useBuilds, useCurrentTask } from '../stores/data'
import * as THREE from 'three'
import LoadingSpinner from './LoadingSpinner'
import { ModelMetadata } from 'build-bindings'

export interface ProgressViewerProps {
    width?: string
    height?: string
}

export default function ProgressViewer({
    width = '100%',
    height = '100%'
}: ProgressViewerProps) {
    const { currentTask } = useCurrentTask()
    const { builds } = useBuilds()

    const baseTexture = useMemo(() => {
        if (!currentTask) return null
        const build = builds[currentTask.buildName]
        if (!build) return null
        if (build.metadata.type instanceof ModelMetadata) return null
        const image = build.metadata.type.preview
        const t = new THREE.Texture()
        const img = new Image()
        img.onload = () => {
            t.image = img
            t.needsUpdate = true
        }
        img.src = image
        return t
    }, [currentTask, builds])

    const buildWidth = useMemo(
        () =>
            currentTask
                ? Math.max(...currentTask.partsPositions.map(p => p[0])) + 1
                : 1,
        [currentTask]
    )
    const buildDepth = useMemo(
        () =>
            currentTask
                ? Math.max(...currentTask.partsPositions.map(p => p[2])) + 1
                : 1,
        [currentTask]
    )

    const cubes = useMemo(() => {
        if (!currentTask) return []
        return Array.from({ length: currentTask.partCount }, (_, i) => {
            const position = currentTask.partsPositions[i]
            let color = 0x000000
            if (currentTask.currentlyBuildingParts.includes(i)) {
                // yellow
                color = 0xffff00
            } else if (currentTask.completedParts.includes(i)) {
                if (baseTexture) {
                    color = 0xffffff
                } else {
                    color = 0x00ff00
                }
            }
            return (
                <Box
                    key={i}
                    position={[position[2], position[1], position[0]]}
                    color={color}
                    baseTexture={baseTexture}
                    buildWidth={buildWidth}
                    buildDepth={buildDepth}
                />
            )
        })
    }, [currentTask, baseTexture, buildWidth, buildDepth])

    return (
        <div style={{ width, height }}>
            {currentTask ? (
                <Canvas>
                    {/* <Stage>{createCubes(currentTask)}</Stage> */}
                    <Stage>{cubes}</Stage>

                    <CameraControls />
                </Canvas>
            ) : (
                <LoadingSpinner style={{ width: '100%', height: '100%' }} />
            )}
        </div>
    )
}

interface BoxProps {
    position: [number, number, number]
    baseTexture: THREE.Texture | null
    color?: number
    buildWidth: number
    buildDepth: number
}
function Box({
    position,
    baseTexture,
    buildDepth,
    buildWidth,
    color = 0x000000
}: BoxProps) {
    const meshRef = useRef(null)

    const slicedTexture = useMemo(() => {
        if (!baseTexture) return null
        const [x, , z] = position
        const t = baseTexture.clone()
        t.needsUpdate = true
        t.repeat.set(1 / buildWidth, 1 / buildDepth)
        t.offset.set(x / buildWidth, 1 - (z + 1) / buildDepth)
        return t
    }, [baseTexture, position, buildWidth, buildDepth])

    return (
        <mesh position={position} ref={meshRef}>
            {[...Array(6)].map((_, index) => (
                <meshStandardMaterial
                    key={index}
                    color={color}
                    attach={`material-${index}`}
                    {...(index === 2 && slicedTexture
                        ? { map: slicedTexture }
                        : {})}
                />
            ))}
            <boxGeometry args={[1, 1, 1]} />
            <Edges />
        </mesh>
    )
}
