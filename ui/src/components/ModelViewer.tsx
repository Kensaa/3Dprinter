/* eslint-disable @typescript-eslint/ban-ts-comment */
import { useRef, useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { CameraControls } from '@react-three/drei'
import { Build } from '../utils/types'
import configStore from '../stores/config'
import { Color, InstancedMesh, Object3D } from 'three'
import { count3DArray } from '../utils/arrayUtils'

interface ModelViewerProps {
    buildName: string
    build: Build
    width?: string
    height?: string
}

export default function ModelViewer({
    build,
    width = '25%',
    height = '50%'
}: ModelViewerProps) {
    const disableRender = configStore(store => store.disableRender)

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
                <Mesh build={build} />
                <CameraControls />
            </Canvas>
        </div>
    )
}

interface MeshProps {
    build: Build
}

function Mesh({ build }: MeshProps) {
    const meshRef = useRef<InstancedMesh>(null)
    const [count, setCount] = useState(count3DArray(build.shape))

    useEffect(() => {
        if (meshRef == null) return
        if (meshRef.current == null) return

        const tempObject = new Object3D()
        let i = 0

        const height = build.shape.length
        const depth = build.shape[0].length
        const width = build.shape[0][0].length

        for (let y = 0; y < build.shape.length; y++) {
            for (let z = 0; z < build.shape[y].length; z++) {
                for (let x = 0; x < build.shape[y][z].length; x++) {
                    if (build.shape[y][z][x] === 1) {
                        tempObject.position.set(
                            x - width / 2,
                            y - height / 2,
                            z - depth / 2
                        )
                        tempObject.scale.set(1, 1, 1)
                        tempObject.updateMatrix()
                        const id = i++
                        meshRef.current.setMatrixAt(id, tempObject.matrix)
                        meshRef.current.setColorAt(
                            id,
                            id % 2 == 0
                                ? new Color(1, 1, 1)
                                : new Color(0, 0, 0)
                        )
                    }
                }
            }
        }

        meshRef.current.instanceMatrix.needsUpdate = true
        setCount(count3DArray(build.shape))
    }, [build])

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
            <boxGeometry args={[1, 1, 1]}></boxGeometry>
            <meshBasicMaterial color={0x515151} />
        </instancedMesh>
    )
}
