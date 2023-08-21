/* eslint-disable @typescript-eslint/ban-ts-comment */
import { useState } from 'react'
import { Button, Modal, Form, Alert } from 'react-bootstrap'
import dataStore from '../stores/data'
import { Build } from '../types'

interface CreateModalProps {
    show: boolean
    hide: () => void
}

export default function CreateModal({ show, hide }: CreateModalProps) {
    const [error, setError] = useState('')
    const [name, setName] = useState('')
    const { builds, updateBuild } = dataStore(state => ({
        builds: state.builds,
        updateBuild: state.updateBuild
    }))

    const create = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        event.stopPropagation()
        const modelNames = Object.keys(builds)
        if (modelNames.includes(name) || modelNames.includes(name + '.json')) {
            setError('model already exists')
            setName('')
        } else {
            const newBuild = {
                type: 'model',
                shape: [[[1]]]
            } as Build
            updateBuild(name, newBuild)
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
