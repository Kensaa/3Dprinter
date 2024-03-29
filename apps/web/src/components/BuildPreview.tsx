import ModelViewer from './ModelViewer'
import ImageViewer from './ImageViewer'
import { useBuilds } from '../stores/data'

interface BuildPreviewProps {
    buildName?: string
}

export default function BuildPreview({ buildName }: BuildPreviewProps) {
    const { builds } = useBuilds()

    if (!buildName || !builds[buildName]) {
        return <div></div>
    }

    const build = builds[buildName]

    return (
        <>
            {build.type === 'model' ? (
                <ModelViewer buildName={buildName} width='100%' height='100%' />
            ) : (
                <ImageViewer image={build.preview} width='100%' height='100%' />
            )}
        </>
    )
}
