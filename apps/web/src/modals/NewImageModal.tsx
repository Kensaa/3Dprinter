import { useState, useEffect } from 'react'
import { Modal, Form } from 'react-bootstrap'
import Button from '../components/Button'
import { useBuilds } from '../stores/data'
import { FileUploader } from 'react-drag-drop-files'
import { useAddress } from '../stores/config'
import ImageViewer from '../components/ImageViewer'
import type { CompressedBuild } from '../utils/types'

interface NewImageModalProps {
    show: boolean
    hide: () => void
}

export default function NewImageModal({ show, hide }: NewImageModalProps) {
    const [image, setImage] = useState('')
    const [name, setName] = useState('')
    const [threshold, setThreshold] = useState(50)
    const [scale, setScale] = useState(1)
    const [inverted, setInverted] = useState(true)
    const [horizontalMirror, setHorizontalMirror] = useState(false)
    const [verticalMirror, setVerticalMirror] = useState(false)

    const [preview, setPreview] = useState<string>('')
    const [blockCount, setBlockCount] = useState<number>(0)

    const { setBuild } = useBuilds()
    const address = useAddress()

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

        if (!image) return
        if (!name) return
        fetch(`${address}/convertImageToBuild`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image,
                name,
                threshold,
                inverted,
                scale,
                horizontalMirror,
                verticalMirror
            })
        })
            .then(res => res.json())
            .then(res => {
                const buildname = name.endsWith('.json')
                    ? name.substring(0, name.length - 5)
                    : name
                setBuild(buildname, res as CompressedBuild)
                hide()
            })
    }

    useEffect(() => {
        const updatePreview = () => {
            if (!image) return
            fetch(`${address}/convertImageToPreview`, {
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
                    if (!res.preview || !res.blockCount) return
                    setPreview(res.preview)
                    setBlockCount(res.blockCount)
                })
        }
        // this is a debounced useEffect, updatePreview will only be called if the deps of the hook weren't updated in the last 70ms
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
                            <Button disabled={!image || !name} type='submit'>
                                Convert
                            </Button>
                        </div>
                    </Form>
                    {preview && (
                        <ImageViewer
                            image={preview}
                            blockCount={blockCount}
                            width='50%'
                            maxHeight='80%'
                        />
                    )}
                </div>
            </Modal.Body>
        </Modal>
    )
}
