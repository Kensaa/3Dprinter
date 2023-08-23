/* eslint-disable @typescript-eslint/ban-ts-comment */
import { useState, useEffect, createElement } from 'react'
import AppNavbar from '../components/AppNavbar'
import ModelViewer from '../components/ModelViewer'
import dataStore from '../stores/data'
import Selector from '../components/Selector'
import { Button } from 'react-bootstrap'
import BuildModal from '../modals/BuildModal'
import ImageViewer from '../components/ImageViewer'
import NewModelModalModal from '../modals/NewModelModal'
import NewImageModalModal from '../modals/NewImageModal'

const viewerMap = {
    model: ModelViewer,
    image: ImageViewer
}

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
                            {
                                //@ts-ignore
                                <Button
                                    disabled={!selectedBuild}
                                    variant='outline-success'
                                    onClick={() => setBuildModalShown(true)}
                                >
                                    Build
                                </Button>
                            }
                            {
                                //@ts-ignore
                                <Button
                                    variant='outline-primary'
                                    onClick={() => setNewModelShown(true)}
                                >
                                    Create new Model
                                </Button>
                            }
                            {
                                //@ts-ignore
                                <Button
                                    variant='outline-primary'
                                    onClick={() => setNewImageShown(true)}
                                >
                                    Convert an image
                                </Button>
                            }
                        </div>
                    </div>

                    <div className='w-50 unselectable'>
                        <h4>Preview</h4>
                        {selectedBuild &&
                            createElement(
                                viewerMap[builds[selectedBuild].type],
                                {
                                    build: builds[selectedBuild],
                                    buildName: selectedBuild,
                                    width: '100%',
                                    height: '100%',
                                    editable: true
                                }
                            )}
                    </div>
                </div>
            </div>
            {selectedBuild && (
                <BuildModal
                    show={buildModalShown}
                    hide={() => setBuildModalShown(false)}
                    build={builds[selectedBuild]}
                    buildName={selectedBuild ?? ''}
                />
            )}

            <NewModelModalModal
                show={newModelShown}
                hide={() => setNewModelShown(false)}
            />
            <NewImageModalModal
                show={newImageShown}
                hide={() => setNewImageShown(false)}
            />
        </div>
    )
}
