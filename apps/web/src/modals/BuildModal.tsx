/* eslint-disable @typescript-eslint/ban-ts-comment */
import { useEffect, useState } from 'react'
import { useAddress } from '../stores/config'
import { Modal, Form, Row, Col, Alert } from 'react-bootstrap'
import Button from '../components/Button'
import BuildPreview from '../components/BuildPreview'
import { useLocation } from 'wouter'

interface BuildModalProps {
    buildName: string
    show: boolean
    hide: () => void
}
export default function BuildModal({ buildName, show, hide }: BuildModalProps) {
    const [, setLocation] = useLocation()
    const [x, setX] = useState(localStorage.getItem('x') ?? '0')
    const [y, setY] = useState(localStorage.getItem('y') ?? '0')
    const [z, setZ] = useState(localStorage.getItem('z') ?? '0')

    const headings = ['East', 'South', 'West', 'North']
    const [heading, setHeading] = useState(0)

    const address = useAddress()

    const [error, setError] = useState('')

    const buildAction = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        event.stopPropagation()
        fetch(`${address}/build`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                file: buildName,
                pos: [x, y, z].map(e => parseInt(e)),
                heading: heading + 1
            })
        }).then(res => {
            if (res.ok) {
                hide()
                setLocation('/dashboard')
            }

            res.text().then(err => {
                setError(`an error has occured ${err} (${res.status}) `)
            })
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

    useEffect(() => {
        localStorage.setItem('x', x)
        localStorage.setItem('y', y)
        localStorage.setItem('z', z)
    }, [x, y, z])

    return (
        <Modal show={show} onHide={hide} dialogClassName='large-modal'>
            <Modal.Header closeButton>
                <Modal.Title>Building "{buildName}"</Modal.Title>
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
                <div className='d-flex w-100 h-75'>
                    <Form onSubmit={buildAction} className='mx-2 w-50'>
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
                        <Form.Group className='d-flex justify-content-center mt-2'>
                            {
                                //@ts-ignore
                                <Button type='submit'>Build</Button>
                            }
                        </Form.Group>
                    </Form>
                    <BuildPreview buildName={buildName} />
                </div>
            </Modal.Body>
        </Modal>
    )
}
