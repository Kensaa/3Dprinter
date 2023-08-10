/* eslint-disable @typescript-eslint/ban-ts-comment */
import { useState, useEffect } from 'react'
import AppNavbar from '../components/AppNavbar'
import ModelViewer from '../components/ModelViewer'
import dataStore from '../stores/data'
import Selector from '../components/Selector'
import { Button } from 'react-bootstrap'
import BuildModal from '../modals/3DBuildModal'
import CreateModal from '../modals/NewModelModal'

export default function Homepage() {
    const { models, fetchModels } = dataStore(state => ({ ...state }))
    const [buildModalShown, setBuildModalShown] = useState(false)
    const [createModalShown, setCreateModalShown] = useState(false)
    const [selectedModel, setSelectedModel] = useState<string>()

    useEffect(() => fetchModels, [fetchModels])

    return (
        <div className='page'>
            <AppNavbar />
            <div className='content'>
                <div className='w-100 h-75 d-flex justify-content-between'>
                    <div className='mx-2 w-25 unselectable'>
                        <h4>Select a model</h4>
                        <Selector
                            width='100%'
                            elements={Object.keys(models)}
                            onChange={setSelectedModel}
                        />
                        <div className='w-100 d-flex justify-content-between'>
                            {
                                //@ts-ignore
                                <Button
                                    disabled={!selectedModel}
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
                        <ModelViewer
                            width='100%'
                            height='100%'
                            modelName={selectedModel ?? ''}
                            model={
                                selectedModel
                                    ? models[selectedModel]
                                    : undefined
                            }
                            editable
                        />
                    </div>
                </div>
            </div>
            <BuildModal
                show={buildModalShown}
                hide={() => setBuildModalShown(false)}
                model={selectedModel ? models[selectedModel] : undefined}
                modelName={selectedModel ?? ''}
            />
            <CreateModal
                show={createModalShown}
                hide={() => setCreateModalShown(false)}
            />
        </div>
    )
}
