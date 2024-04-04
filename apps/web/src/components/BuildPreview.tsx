import ModelViewer from './ModelViewer'
import ImageViewer from './ImageViewer'
import { useBuilds } from '../stores/data'
import { useMemo } from 'react'
import type { Build } from '../utils/types'
import { stringToArray3D } from '../utils/arrayUtils'

interface BuildPreviewProps {
    buildName: string
}

export default function BuildPreview({ buildName }: BuildPreviewProps) {
    const { builds } = useBuilds()

    const build = useMemo(() => {
        if (!buildName || !builds[buildName]) return undefined
        const compressedBuild = builds[buildName]
        const build: Build = {
            ...compressedBuild,
            shape: stringToArray3D(compressedBuild.shape)
        }
        return build
    }, [builds, buildName])

    if (!build) {
        return <div></div>
    }
    return (
        <>
            {build.type === 'model' ? (
                <ModelViewer
                    buildName={buildName}
                    build={build}
                    width='100%'
                    height='100%'
                />
            ) : (
                <ImageViewer image={build.preview} width='100%' height='100%' />
            )}
        </>
    )
}
