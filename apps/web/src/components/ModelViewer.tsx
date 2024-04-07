import { useRef, useState, useEffect, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { CameraControls, Html } from '@react-three/drei'
import type { Build } from '../utils/types'
import { useConfig } from '../stores/config'
import { useBuilds } from '../stores/data'
import { Color, InstancedMesh, Object3D } from 'three'
import { count3DArray, rotate3DArray } from '../utils/arrayUtils'
import Button from '../components/Button'

interface ModelViewerProps {
    buildName: string
    build: Build
    width?: string
    height?: string
}

export default function ModelViewer({
    buildName,
    build: initialBuild,
    width = '25%',
    height = '50%'
}: ModelViewerProps) {
    const disableRender = useConfig(store => store.disableRender)
    const { updateBuild } = useBuilds()

    const [build, setBuild] = useState<Build>(initialBuild)

    useEffect(() => {
        setBuild(initialBuild)
    }, [buildName, initialBuild])
    const elementCount = useMemo(() => count3DArray(build.shape), [build])

    // what ?
    if (build === undefined) {
        return (
            <div
                style={{ width, height }}
                className='d-flex justify-content-center align-items-center border'
            ></div>
        )
    }
    if (disableRender) return <></>

    // THING TO CHANGE HERE
    // don't push the build to the server each time we rotate it, add a "save/apply" button

    return (
        <div style={{ width, height }} className='border'>
            <Canvas>
                <ambientLight />
                <Panel>
                    <h4>{buildName}</h4>
                    <p>{blockCountString(elementCount)}</p>
                </Panel>
                <Mesh build={build} count={elementCount} />
                <CameraControls />
                <axesHelper args={[50]} />
            </Canvas>
            <div className='w-100 d-flex justify-content-center mt-3'>
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
                    className='mx-2'
                >
                    Rotate Y (Green Axis)
                </Button>
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
            </div>
        </div>
    )
}

interface MeshProps {
    build: Build
    count: number
}

function Mesh({ build, count }: MeshProps) {
    const meshRef = useRef<InstancedMesh>(null)

    useEffect(() => {
        if (meshRef == null) return
        if (meshRef.current == null) return

        const tempObject = new Object3D()
        let i = 1

        const height = build.shape.length
        const depth = build.shape[0].length
        const width = build.shape[0][0].length

        tempObject.position.set(-width / 2, -height / 2, -depth / 2)
        tempObject.scale.set(1, 1, 1)
        tempObject.updateMatrix()

        meshRef.current.setMatrixAt(0, tempObject.matrix)
        meshRef.current.setColorAt(0, new Color(0, 1, 0))

        for (let y = 0; y < height; y++) {
            for (let z = 0; z < depth; z++) {
                for (let x = 0; x < width; x++) {
                    if (build.shape[y][z][x] === 1) {
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
    }, [build])

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
            <boxGeometry args={[1, 1, 1]}></boxGeometry>
            <meshBasicMaterial />
        </instancedMesh>
    )
}

interface PanelProps {}
function Panel({ children }: React.PropsWithChildren<PanelProps>) {
    return (
        <Html calculatePosition={() => [0, 0, 0]} wrapperClass='panel-wrapper'>
            <div className='panel'>{children}</div>
        </Html>
    )
}

function blockCountString(number: number) {
    // add spaces every 3 digits
    const numberString = number.toString()
    const len = numberString.length
    let result = ''
    for (let i = len - 1; i >= 0; i--) {
        if ((len - i - 1) % 3 === 0) {
            result = ' ' + result
        }
        result = numberString[i] + result
    }
    return `${result} block${number === 1 ? '' : 's'}`
}
