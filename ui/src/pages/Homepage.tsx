/* eslint-disable @typescript-eslint/ban-ts-comment */
import { useState, useEffect, ClipboardEvent } from 'react'
import AppNavbar from '../components/AppNavbar'
import ModelViewer from '../components/ModelViewer'
import dataStore from '../stores/data'
import configStore from '../stores/config'
import Selector from '../components/Selector'
import { Button, Modal, Form, Row, Col, Alert } from 'react-bootstrap'
import { Model } from '../types'

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

interface BuildModalProps {
    modelName: string
    model?: Model
    show: boolean
    hide: () => void
}
function BuildModal({ modelName, model, show, hide }: BuildModalProps) {
    const [x, setX] = useState('0')
    const [y, setY] = useState('0')
    const [z, setZ] = useState('0')

    const headings = ['East', 'South', 'West', 'North']
    const [heading, setHeading] = useState(0)

    const address = configStore(store => store.address)

    const [error, setError] = useState('')

    const build = () => {
        fetch(`${address}/build`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                file: modelName,
                pos: [x, y, z].map(e => parseInt(e)),
                heading: heading + 1
            })
        }).then(res => {
            if (res.ok) return hide()
            setError(`an error has occured (status code : ${res.status})`)
        })
    }

    const pasteShortcut = (e: ClipboardEvent) => {
        const data = e.clipboardData.getData('Text')
        if (isNaN(+data)) {
            e.preventDefault()
            const split = data.trim().split(' ')
            if (split.length !== 3) return
            setX(split[0].trim())
            setY(split[1].trim())
            setZ(split[2].trim())
        }
    }

    if (!model) {
        return
    }

    return (
        <Modal show={show} onHide={hide}>
            <Modal.Header closeButton>
                <Modal.Title>Building model "{modelName}"</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {error && (
                    <Alert
                        dismissible
                        variant='danger'
                        onClose={() => setError('')}
                    >
                        {error}
                    </Alert>
                )}
                <div className='d-flex flex-column align-items-center'>
                    <Form onSubmit={build}>
                        <Form.Label>Build Position : </Form.Label>
                        <Row>
                            {
                                //@ts-ignore
                                <Form.Group as={Col}>
                                    <Form.Label>X:</Form.Label>
                                    <Form.Control
                                        placeholder='X'
                                        type='number'
                                        value={x}
                                        onChange={e => setX(e.target.value)}
                                        onPaste={pasteShortcut}
                                    />
                                </Form.Group>
                            }
                            {
                                //@ts-ignore
                                <Form.Group as={Col}>
                                    <Form.Label>Y:</Form.Label>

                                    <Form.Control
                                        placeholder='Y'
                                        type='number'
                                        value={y}
                                        onChange={e => setY(e.target.value)}
                                        onPaste={pasteShortcut}
                                    />
                                </Form.Group>
                            }
                            {
                                //@ts-ignore
                                <Form.Group as={Col}>
                                    <Form.Label>Z:</Form.Label>

                                    <Form.Control
                                        placeholder='Z'
                                        type='number'
                                        value={z}
                                        onChange={e => setZ(e.target.value)}
                                        onPaste={pasteShortcut}
                                    />
                                </Form.Group>
                            }
                        </Row>
                        <Form.Group className='mt-3'>
                            <Form.Label>Heading:</Form.Label>
                            <Form.Select
                                value={heading}
                                onChange={e =>
                                    setHeading(parseInt(e.target.value))
                                }
                            >
                                {headings.map((heading, i) => (
                                    <option key={i} value={i}>
                                        {heading}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                        <ModelViewer
                            width='100%'
                            height='100%'
                            modelName={modelName}
                            model={model}
                        />
                        <Form.Group className='d-flex justify-content-center mt-2'>
                            <Button type='submit'>Build</Button>
                        </Form.Group>
                    </Form>
                </div>
            </Modal.Body>
        </Modal>
    )
}

interface CreateModalProps {
    show: boolean
    hide: () => void
}

function CreateModal({ show, hide }: CreateModalProps) {
    const [error, setError] = useState('')
    const [name, setName] = useState('')
    const { models, updateModel } = dataStore(state => ({
        models: state.models,
        updateModel: state.updateModel
    }))

    const create = () => {
        const modelNames = Object.keys(models)
        if (modelNames.includes(name) || modelNames.includes(name + '.json')) {
            setError('model already exists')
            setName('')
        } else {
            const newModel = {
                shape: [[[1]]]
            }
            updateModel(name, newModel)
            hide()
        }
    }

    return (
        <Modal show={show} onHide={hide}>
            <Modal.Header closeButton>
                <Modal.Title>Creating a new model</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {error && (
                    <Alert
                        dismissible
                        variant='danger'
                        onClose={() => setError('')}
                    >
                        {error}
                    </Alert>
                )}
                <div className='d-flex flex-column align-items-center'>
                    <Form onSubmit={create}>
                        <Form.Control
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder='Name of the model'
                        ></Form.Control>
                        <div className='w-100 d-flex justify-content-center mt-2'>
                            <Button type='submit'>Create</Button>
                        </div>
                    </Form>
                </div>
            </Modal.Body>
        </Modal>
    )
}
