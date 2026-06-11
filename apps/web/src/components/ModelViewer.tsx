import { useRef, useEffect, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { CameraControls, Html } from '@react-three/drei'
import { useConfig } from '../stores/config'
import { useBuilds } from '../stores/data'
import { Color, InstancedMesh, Object3D } from 'three'
import { blockCountString } from '../utils/utils'
import type { CompressedBuild } from 'build-bindings'
import { Button } from 'react-bootstrap'

interface ModelViewerProps {
    buildName: string
    compressedBuild: CompressedBuild
    width?: string
    height?: string
}

export default function ModelViewer({
    buildName,
    compressedBuild,
    width = '25%',
    height = '50%'
}: ModelViewerProps) {
    const disableRender = useConfig(store => store.disableRender)
    const { updateBuild } = useBuilds()

    const build = useMemo(() => {
        return compressedBuild.uncompress()
    }, [compressedBuild])
    const buildShape = useMemo(() => build.get_shape() as number[][][], [build])

    if (disableRender) return <></>

    // THING TO CHANGE HERE
    // don't push the build to the server each time we rotate it, add a "save/apply" button
    const handleRotate = (xAxis: boolean, yAxis: boolean, zAxis: boolean) => {
        build.rotate(xAxis, yAxis, zAxis)
        updateBuild(buildName, build.compress())
    }
    return (
        <div style={{ width, height }} className='border'>
            <Canvas>
                <ambientLight />
                <Panel>
                    <h4>{buildName}</h4>
                    <p>{blockCountString(build.metadata.block_count)}</p>
                </Panel>
                <Mesh shape={buildShape} count={build.metadata.block_count} />
                <CameraControls />
                <axesHelper args={[50]} />
            </Canvas>
            <div className='w-100 d-flex justify-content-center mt-3'>
                <Button
                    onClick={() => {
                        handleRotate(true, false, false)
                    }}
                    variant='outline-primary'
                >
                    Rotate X (Red Axis)
                </Button>
                <Button
                    onClick={() => {
                        handleRotate(false, true, false)
                    }}
                    variant='outline-primary'
                    className='mx-2'
                >
                    Rotate Y (Green Axis)
                </Button>
                <Button
                    onClick={() => {
                        handleRotate(false, false, true)
                    }}
                    variant='outline-primary'
                >
                    Rotate Z (Blue Axis)
                </Button>
            </div>
        </div>
    )
}

interface MeshProps {
    shape: number[][][]
    count: number
}

function Mesh({ shape, count }: MeshProps) {
    const meshRef = useRef<InstancedMesh>(null)

    useEffect(() => {
        if (meshRef == null) return
        if (meshRef.current == null) return

        const tempObject = new Object3D()
        let i = 1

        const height = shape.length
        const depth = shape[0].length
        const width = shape[0][0].length

        tempObject.position.set(-width / 2, -height / 2, -depth / 2)
        tempObject.scale.set(1, 1, 1)
        tempObject.updateMatrix()

        meshRef.current.setMatrixAt(0, tempObject.matrix)
        meshRef.current.setColorAt(0, new Color(0, 1, 0))

        for (let y = 0; y < height; y++) {
            for (let z = 0; z < depth; z++) {
                for (let x = 0; x < width; x++) {
                    if (shape[y][z][x] === 1) {
                        tempObject.position.set(
                            x - width / 2,
                            y - height / 2,
                            z - depth / 2
                        )
                        tempObject.updateMatrix()
                        const id = i++
                        meshRef.current.setMatrixAt(id, tempObject.matrix)
                        meshRef.current.setColorAt(
                            id,
                            id % 2 == 0
                                ? new Color(0, 0, 0)
                                : new Color(0.1, 0.1, 0.1)
                        )
                    }
                }
            }
        }

        meshRef.current.instanceMatrix.needsUpdate = true
    }, [shape])

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
            <boxGeometry args={[1, 1, 1]}></boxGeometry>
            <meshBasicMaterial />
        </instancedMesh>
    )
}

function Panel({ children }: React.PropsWithChildren<unknown>) {
    return (
        <Html calculatePosition={() => [0, 0, 0]} wrapperClass='panel-wrapper'>
            <div className='panel'>{children}</div>
        </Html>
    )
}
