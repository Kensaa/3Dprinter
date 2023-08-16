/* eslint-disable @typescript-eslint/ban-ts-comment */
import { useState } from 'react'
import { Model } from '../types'
import configStore from '../stores/config'
import { Button, Modal, Form, Row, Col, Alert } from 'react-bootstrap'
import ModelViewer from '../components/ModelViewer'

interface BuildModalProps {
    modelName: string
    model?: Model
    show: boolean
    hide: () => void
}
export default function BuildModal({
    modelName,
    model,
    show,
    hide
}: BuildModalProps) {
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

    const pasteShortcut = (e: React.ClipboardEvent) => {
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
                            {
                                //@ts-ignore
                                <Button type='submit'>Build</Button>
                            }
                        </Form.Group>
                    </Form>
                </div>
            </Modal.Body>
        </Modal>
    )
}
