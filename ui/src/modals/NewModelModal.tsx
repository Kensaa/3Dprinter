/* eslint-disable @typescript-eslint/ban-ts-comment */
import { useState } from 'react'
import { Button, Modal, Form, Alert } from 'react-bootstrap'
import dataStore from '../stores/data'

interface CreateModalProps {
    show: boolean
    hide: () => void
}

export default function CreateModal({ show, hide }: CreateModalProps) {
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
                            {
                                //@ts-ignore
                                <Button type='submit'>Create</Button>
                            }
                        </div>
                    </Form>
                </div>
            </Modal.Body>
        </Modal>
    )
}
