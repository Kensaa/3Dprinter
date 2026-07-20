import { useEffect, useMemo, useState } from 'react'
import { useAddress } from '../stores/config'
import { Modal, Form, Row, Col, Alert, Button } from 'react-bootstrap'
import BuildPreview from '../components/BuildPreview'
import { useLocation } from 'wouter'
import type { ProviderMode } from 'utils'
import { useBuilds } from '../stores/data'
import { ColorImageMetadata } from 'build-bindings'
import Tooltip from '../components/Tooltip'

interface BuildModalProps {
    buildName: string
    show: boolean
    hide: () => void
}
export default function BuildModal({ buildName, show, hide }: BuildModalProps) {
    const [, setLocation] = useLocation()
    const { builds } = useBuilds()
    const [providerMode, setProviderMode] = useState<ProviderMode>(
        (localStorage.getItem('providerMode') as ProviderMode) ?? 'managed'
    )
    const [block, setBlock] = useState(localStorage.getItem('block') ?? '')
    const [x, setX] = useState(localStorage.getItem('x') ?? '0')
    const [y, setY] = useState(localStorage.getItem('y') ?? '0')
    const [z, setZ] = useState(localStorage.getItem('z') ?? '0')

    const headings = ['East', 'South', 'West', 'North']
    const [heading, setHeading] = useState(0)

    const address = useAddress()

    const [error, setError] = useState('')

    const buildAction = (event: React.SubmitEvent<HTMLFormElement>) => {
        event.preventDefault()
        event.stopPropagation()
        fetch(`${address}/build`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                file: buildName,
                pos: [x, y, z].map(e => parseInt(e)),
                heading: heading + 1,
                providerMode,
                block
            })
        }).then(res => {
            if (res.ok) {
                hide()
                setLocation('/dashboard')
            }

            res.text().then(err => {
                setError(`an error has occured: ${err} (${res.status}) `)
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
        localStorage.setItem('providerMode', providerMode)
        localStorage.setItem('block', block)
    }, [x, y, z, providerMode, block])

    // Does this build need a specified block
    const needBlockID = useMemo(() => {
        const compressedBuild = builds[buildName]
        if (!compressedBuild) return false
        return !(compressedBuild.metadata.type instanceof ColorImageMetadata)
    }, [buildName, builds])

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
                        <div className='mb-5'>
                            <Tooltip
                                placement='right'
                                tooltipContent={
                                    <ul className='m-0'>
                                        <li className='tooltip-list'>
                                            Managed Mode: will use providers
                                            clients to provide block to the
                                            printers
                                        </li>
                                        <li className='tooltip-list'>
                                            Unmanaged Mode: enderchest are
                                            supposed already filled with blocks
                                        </li>
                                    </ul>
                                }
                                delay={{ show: 200, hide: 0 }}
                            >
                                <Form.Group>
                                    <Form.Label>Provider Mode</Form.Label>
                                    <Form.Select
                                        value={providerMode}
                                        onChange={e =>
                                            setProviderMode(
                                                e.target.value as ProviderMode
                                            )
                                        }
                                    >
                                        <option value='managed'>Managed</option>
                                        <option
                                            disabled={!needBlockID}
                                            value='unmanaged'
                                        >
                                            Unmanaged
                                        </option>
                                    </Form.Select>
                                </Form.Group>
                            </Tooltip>
                            {needBlockID ? (
                                <Tooltip
                                    placement='right'
                                    tooltipContent='the id of the block that will be used to build'
                                    delay={{ show: 200, hide: 0 }}
                                >
                                    <Form.Group>
                                        <Form.Label>Block:</Form.Label>
                                        <Form.Control
                                            placeholder='block'
                                            value={block}
                                            onChange={e =>
                                                setBlock(e.target.value)
                                            }
                                        />
                                    </Form.Group>
                                </Tooltip>
                            ) : undefined}
                        </div>
                        <Form.Label>Build Position : </Form.Label>
                        <Row>
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
                            <Button
                                type='submit'
                                disabled={needBlockID && block === ''}
                            >
                                Build
                            </Button>
                        </Form.Group>
                    </Form>
                    <BuildPreview buildName={buildName} />
                </div>
            </Modal.Body>
        </Modal>
    )
}
