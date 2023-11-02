/* eslint-disable @typescript-eslint/ban-ts-comment */
import { useRef, useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { CameraControls } from '@react-three/drei'
import { Build } from '../utils/types'
import configStore from '../stores/config'
import dataStore from '../stores/data'
import { Color, InstancedMesh, Object3D } from 'three'
import { count3DArray, rotate3DArray } from '../utils/arrayUtils'
import { Button } from 'react-bootstrap'

interface ModelViewerProps {
    buildName: string
    width?: string
    height?: string
}

export default function ModelViewer({
    buildName,
    width = '25%',
    height = '50%'
}: ModelViewerProps) {
    const disableRender = configStore(store => store.disableRender)
    const { updateBuild, builds } = dataStore(store => ({
        updateBuild: store.updateBuild,
        builds: store.builds
    }))

    const [build, setBuild] = useState<Build>()

    useEffect(() => {
        setBuild(builds[buildName])
    }, [builds, buildName])

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
                <axesHelper args={[50]} />
            </Canvas>
            <div className='w-100 d-flex justify-content-center mt-3'>
                {
                    //@ts-ignore
                    <Button
                        onClick={() => {
                            const newBuild = { ...build }
                            newBuild.shape = rotate3DArray(
                                build.shape,
                                true,
                                false,
                                false
                            )
                            updateBuild(buildName, newBuild)
                            setBuild(newBuild)
                        }}
                        variant='outline-primary'
                    >
                        Rotate X (Red Axis)
                    </Button>
                }
                {
                    //@ts-ignore
                    <Button
                        onClick={() => {
                            const newBuild = { ...build }
                            newBuild.shape = rotate3DArray(
                                build.shape,
                                false,
                                true,
                                false
                            )
                            updateBuild(buildName, newBuild)
                            setBuild(newBuild)
                        }}
                        variant='outline-primary'
                    >
                        Rotate Y (Green Axis)
                    </Button>
                }
                {
                    //@ts-ignore
                    <Button
                        onClick={() => {
                            const newBuild = { ...build }
                            newBuild.shape = rotate3DArray(
                                build.shape,
                                false,
                                false,
                                true
                            )
                            updateBuild(buildName, newBuild)
                            setBuild(newBuild)
                        }}
                        variant='outline-primary'
                    >
                        Rotate Z (Blue Axis)
                    </Button>
                }
            </div>
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
