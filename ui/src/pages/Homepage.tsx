/* eslint-disable @typescript-eslint/ban-ts-comment */
import { useState, useEffect } from 'react'
import AppNavbar from '../components/AppNavbar'
import ModelViewer from '../components/ModelViewer'
import dataStore from '../stores/data'
import Selector from '../components/Selector'
import { Button } from 'react-bootstrap'
import BuildModal from '../modals/3DBuildModal'
import CreateModal from '../modals/NewModelModal'
import ImageViewer from '../components/ImageViewer'

export default function Homepage() {
    const { builds, fetchBuilds } = dataStore(state => ({
        builds: state.builds,
        fetchBuilds: state.fetchBuilds
    }))
    const [buildModalShown, setBuildModalShown] = useState(false)
    const [createModalShown, setCreateModalShown] = useState(false)
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
                                    onClick={() => setCreateModalShown(true)}
                                >
                                    Create new Model
                                </Button>
                            }
                        </div>
                    </div>

                    <div className='w-50 unselectable'>
                        <h4>Preview</h4>
                        {selectedBuild ? (
                            builds[selectedBuild].type === 'model' ? (
                                <ModelViewer
                                    width='100%'
                                    height='100%'
                                    buildName={selectedBuild}
                                    build={builds[selectedBuild]}
                                    editable
                                />
                            ) : (
                                <ImageViewer
                                    width='100%'
                                    height='100%'
                                    build={builds[selectedBuild]}
                                />
                            )
                        ) : (
                            ''
                        )}
                    </div>
                </div>
            </div>
            <BuildModal
                show={buildModalShown}
                hide={() => setBuildModalShown(false)}
                model={selectedBuild ? builds[selectedBuild] : undefined}
                modelName={selectedBuild ?? ''}
            />
            <CreateModal
                show={createModalShown}
                hide={() => setCreateModalShown(false)}
            />
        </div>
    )
}
