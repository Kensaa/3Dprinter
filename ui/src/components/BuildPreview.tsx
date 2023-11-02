import ModelViewer from './ModelViewer'
import ImageViewer from './ImageViewer'
import useDataStore from '../stores/data'

interface BuildPreviewProps {
    buildName?: string
}

export default function BuildPreview({ buildName }: BuildPreviewProps) {
    const builds = useDataStore(store => store.builds)

    if (!buildName || !builds[buildName]) {
        return <div></div>
    }

    const build = builds[buildName]

    return (
        <>
            {build.type === 'model' ? (
                <ModelViewer
                    build={build}
                    buildName={buildName}
                    width='100%'
                    height='100%'
                    editable
                />
            ) : (
                <ImageViewer image={build.preview} width='100%' height='100%' />
            )}
        </>
    )
}
