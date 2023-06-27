import { useState, useEffect } from 'react'
import AppNavbar from '../components/AppNavbar'
import ModelViewer from '../components/ModelViewer'
import dataStore from '../stores/data'
import configStore from '../stores/config'
import Selector from '../components/Selector'
import { Model, Printer } from '../types'
import { Button, Modal } from 'react-bootstrap'

export default function Homepage() {
    const { models, fetchModels } = dataStore(state => ({ ...state }))
    const address = configStore(store => store.address)
    const [buildModalShown, setBuildModalShown] = useState(false)
    const [selectedModel, setSelectedModel] = useState<string>()

    useEffect(() => fetchModels, [fetchModels])

    /*const build = () => {
        fetch(`${address}/build`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        })
    }*/

    return (
        <div className='page'>
            <AppNavbar />
            <div className='content'>
                <div className='w-100 h-75 d-flex justify-content-between'>
                    <div className='w-25'>
                        <h4>Select a model</h4>
                        <Selector
                            width='100%'
                            height='100%'
                            elements={Object.keys(models)}
                            onChange={setSelectedModel}
                        />
                    </div>

                    <div className='w-50'>
                        <h4>Preview</h4>
                        <ModelViewer
                            width='100%'
                            height='100%'
                            model={
                                selectedModel
                                    ? models[selectedModel]
                                    : undefined
                            }
                        />
                    </div>
                </div>
                {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    //@ts-ignore
                    <Button onClick={() => setBuildModalShown(true)}>
                        Build
                    </Button>
                }
            </div>
            <BuildModal
                show={buildModalShown}
                hide={() => setBuildModalShown(false)}
                modelName={selectedModel ?? ''}
            />
        </div>
    )
}

interface BuildModalProps {
    modelName: string
    show: boolean
    hide: () => void
}
function BuildModal({ modelName, show, hide }: BuildModalProps) {
    return (
        <Modal show={show} dialogClassName='large-modal' onHide={hide}>
            <Modal.Header closeButton>
                <Modal.Title>Building model "{modelName}"</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className='d-flex flex-column align-items-center'></div>
            </Modal.Body>
        </Modal>
    )
}
