/* eslint-disable @typescript-eslint/ban-ts-comment */
import { useState, useEffect } from 'react'
import { Button, Modal, Form } from 'react-bootstrap'
import dataStore from '../stores/data'
import { FileUploader } from 'react-drag-drop-files'
import configStore from '../stores/config'
import ImageViewer from '../components/ImageViewer'
import { Build } from '../utils/types'

interface NewImageModalProps {
    show: boolean
    hide: () => void
}

export default function NewImageModalModal({ show, hide }: NewImageModalProps) {
    const [image, setImage] = useState('')
    const [name, setName] = useState('')
    const [threshold, setThreshold] = useState(50)
    const [scale, setScale] = useState(1)
    const [inverted, setInverted] = useState(true)
    const [horizontalMirror, setHorizontalMirror] = useState(false)
    const [verticalMirror, setVerticalMirror] = useState(false)

    const [build, setBuild] = useState<{
        type: 'image'
        preview: string
        shape: number[][][]
    }>()

    const updateBuild = dataStore(state => state.updateBuild)
    const address = configStore(state => state.address)

    const handleFileUpload = (file: File) => {
        console.log(file)
        const filename = file.name

        setName(filename.substring(0, filename.lastIndexOf('.')))
        const reader = new FileReader()
        reader.addEventListener('load', event => {
            if (!event.target) return
            const result = event.target.result as string

            setImage(result.split(',')[1])
        })
        reader.readAsDataURL(file)
    }

    const submit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        event.stopPropagation()
        if (!build) return
        updateBuild(name, build)
        hide()
    }

    useEffect(() => {
        const updatePreview = () => {
            if (!image) return
            fetch(`${address}/convertImage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image,
                    threshold,
                    inverted,
                    scale,
                    horizontalMirror,
                    verticalMirror
                })
            })
                .then(res => res.json())
                .then(res => {
                    const build = res as Build
                    if (build.type !== 'image') return
                    setBuild(build)
                })
        }
        // this is a debounced useEffect, updatePreview will only be called if the deps of the hook weren't updated in the last 0ms
        const timeout = setTimeout(updatePreview, 70)
        return () => clearTimeout(timeout)
    }, [
        image,
        threshold,
        inverted,
        scale,
        horizontalMirror,
        verticalMirror,
        address
    ])

    return (
        <Modal show={show} onHide={hide} dialogClassName='large-modal'>
            <Modal.Header closeButton>
                <Modal.Title>Converting an image</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className='d-flex w-100 h-100'>
                    <Form onSubmit={submit} className=' w-50'>
                        <div className='d-flex justify-content-center'>
                            <FileUploader
                                handleChange={handleFileUpload}
                                name='file'
                                types={['JPG', 'PNG', 'GIF']}
                                label='Upload or drop the image you want to convert here '
                                required
                            />
                        </div>
                        <Form.Group>
                            <Form.Label>Name: </Form.Label>
                            <Form.Control
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                        </Form.Group>
                        <Form.Group>
                            <Form.Label>Detection Threshold: </Form.Label>
                            <Form.Control
                                readOnly
                                value={threshold}
                                plaintext
                            />
                            <Form.Range
                                value={threshold}
                                min={0}
                                max={255}
                                onChange={e =>
                                    setThreshold(parseInt(e.target.value))
                                }
                            ></Form.Range>
                        </Form.Group>
                        <Form.Group>
                            <Form.Label>Scale: </Form.Label>
                            <Form.Control
                                type='number'
                                value={scale}
                                onChange={e =>
                                    setScale(parseFloat(e.target.value))
                                }
                            />
                        </Form.Group>
                        <Form.Group>
                            <Form.Label>Inverted: </Form.Label>
                            <Form.Check
                                type='switch'
                                checked={inverted}
                                onChange={e => setInverted(e.target.checked)}
                            />
                        </Form.Group>
                        <Form.Group>
                            <Form.Label>Horizontal Mirror: </Form.Label>
                            <Form.Check
                                type='switch'
                                checked={horizontalMirror}
                                onChange={e =>
                                    setHorizontalMirror(e.target.checked)
                                }
                            />
                        </Form.Group>
                        <Form.Group>
                            <Form.Label>Vertical Mirror: </Form.Label>
                            <Form.Check
                                type='switch'
                                checked={verticalMirror}
                                onChange={e =>
                                    setVerticalMirror(e.target.checked)
                                }
                            />
                        </Form.Group>
                        <div className='d-flex justify-content-center'>
                            {
                                //@ts-ignore
                                <Button type='submit'>Convert</Button>
                            }
                        </div>
                    </Form>
                    {build ? (
                        <ImageViewer
                            image={build.preview}
                            width='50%'
                            maxHeight='80%'
                        />
                    ) : undefined}
                </div>
            </Modal.Body>
        </Modal>
    )
}
