import { useState, useEffect } from 'react'
import AppNavbar from '../components/AppNavbar'
import dataStore from '../stores/data'
import Selector from '../components/Selector'
import Button from '../components/Button'
import BuildModal from '../modals/BuildModal'
import NewModelModal from '../modals/NewModelModal'
import NewImageModal from '../modals/NewImageModal'
import BuildPreview from '../components/BuildPreview'

export default function Homepage() {
    const { builds, fetchBuilds } = dataStore(state => ({
        builds: state.builds,
        fetchBuilds: state.fetchBuilds
    }))
    const [buildModalShown, setBuildModalShown] = useState(false)

    const [newModelShown, setNewModelShown] = useState(false)
    const [newImageShown, setNewImageShown] = useState(false)
    const [selectedBuild, setSelectedBuild] = useState<string>()

    useEffect(fetchBuilds, [fetchBuilds])

    return (
        <div className='page'>
            <AppNavbar />
            <div className='content'>
                <div className='w-100 h-75 d-flex justify-content-between'>
                    <div className='mx-2 w-25 unselectable'>
                        <h4>Select a Build</h4>

                        <Selector
                            width='100%'
                            elements={Object.entries(builds).map(e => ({
                                name: e[0],
                                type: e[1].type
                            }))}
                            onChange={setSelectedBuild}
                        />
                        <div className='w-100 d-flex justify-content-between'>
                            <Button
                                className='mx-1'
                                disabled={!selectedBuild}
                                variant='outline-success'
                                onClick={() => setBuildModalShown(true)}
                            >
                                Build
                            </Button>
                            <Button
                                className='mx-1'
                                variant='outline-primary'
                                onClick={() => setNewModelShown(true)}
                            >
                                Convert a 3D model
                            </Button>
                            <Button
                                className='mx-1'
                                variant='outline-primary'
                                onClick={() => setNewImageShown(true)}
                            >
                                Convert an image
                            </Button>
                        </div>
                    </div>

                    <div className='w-50 h-100 unselectable'>
                        <h4>Preview</h4>
                        <BuildPreview buildName={selectedBuild} />
                    </div>
                </div>
            </div>
            {selectedBuild && (
                <BuildModal
                    show={buildModalShown}
                    hide={() => setBuildModalShown(false)}
                    buildName={selectedBuild ?? ''}
                />
            )}

            <NewModelModal
                show={newModelShown}
                hide={() => setNewModelShown(false)}
            />
            <NewImageModal
                show={newImageShown}
                hide={() => setNewImageShown(false)}
            />
        </div>
    )
}
