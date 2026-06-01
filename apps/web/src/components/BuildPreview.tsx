import ModelViewer from './ModelViewer'
import ImageViewer from './ImageViewer'
import { useBuilds } from '../stores/data'
import { useMemo } from 'react'
import { ModelMetadata } from 'build-bindings'

interface BuildPreviewProps {
    buildName: string
}

export default function BuildPreview({ buildName }: BuildPreviewProps) {
    const { builds } = useBuilds()

    const compressedBuild = useMemo(() => {
        if (!builds[buildName]) return undefined
        const compressedBuild = builds[buildName]
        return compressedBuild
    }, [builds, buildName])

    if (!compressedBuild) {
        return <div></div>
    }
    return (
        <>
            {compressedBuild.metadata.type instanceof ModelMetadata ? (
                <ModelViewer
                    buildName={buildName}
                    compressedBuild={compressedBuild}
                    width='100%'
                    height='100%'
                />
            ) : (
                <ImageViewer
                    image={compressedBuild.metadata.type.preview}
                    blockCount={compressedBuild.metadata.block_count}
                    width='100%'
                    height='100%'
                />
            )}
        </>
    )
}
