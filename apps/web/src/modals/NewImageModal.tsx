import { useState, useEffect } from 'react'
import { Modal, Form, Button, Collapse } from 'react-bootstrap'
import { useBuilds } from '../stores/data'
import { FileUploader } from 'react-drag-drop-files'
import { useAddress } from '../stores/config'
import ImageViewer from '../components/ImageViewer'
import { CompressedBuild } from 'build-bindings'
import PaletteSelector from '../components/PaletteSelector'

interface NewImageModalProps {
    show: boolean
    hide: () => void
}

export default function NewImageModal({ show, hide }: NewImageModalProps) {
    const [image, setImage] = useState('')
    const [name, setName] = useState('')
    const [scale, setScale] = useState(1)
    const [horizontalMirror, setHorizontalMirror] = useState(false)
    const [verticalMirror, setVerticalMirror] = useState(false)

    const [hueRotation, setHueRotation] = useState(0)
    const [saturation, setSaturation] = useState(100)
    const [brightness, setBrightness] = useState(100)
    const [contrast, setContrast] = useState(100)

    const [type, setType] = useState('grayscale')
    const [threshold, setThreshold] = useState(50)
    const [inverted, setInverted] = useState(true)

    const [palette, setPalette] = useState<string[]>([])

    const [preview, setPreview] = useState<string>('')
    const [blockCount, setBlockCount] = useState<number>(0)
    const [individualBlockCount, setIndividualBlockCount] = useState<
        Record<string, number> | undefined
    >(undefined)

    const { setBuild } = useBuilds()
    const address = useAddress()

    const handleFileUpload = (file: File | File[]) => {
        if (Array.isArray(file)) file = file[0]
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

    const submit = (event: React.SubmitEvent<HTMLFormElement>) => {
        event.preventDefault()
        event.stopPropagation()

        if (!image) return
        if (!name) return
        fetch(`${address}/img/imageToBuild`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image,
                name,
                threshold,
                inverted,
                type,
                scale,
                horizontalMirror,
                verticalMirror,
                hue_rotate: hueRotation,
                saturation: saturation / 100,
                brightness: brightness / 100,
                contrast: contrast / 100,
                available_blocks: palette
            })
        })
            .then(res => res.json())
            .then(data => CompressedBuild.deserialize(data))
            .then(compressedBuild => {
                const buildname = name.endsWith('.json')
                    ? name.substring(0, name.length - 5)
                    : name
                setBuild(buildname, compressedBuild)
                hide()
            })
    }

    useEffect(() => {
        const updatePreview = () => {
            if (!image) return
            fetch(`${address}/img/imageToPreview`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image,
                    threshold,
                    inverted,
                    type,
                    scale,
                    horizontalMirror,
                    verticalMirror,
                    hue_rotate: hueRotation,
                    saturation: saturation / 100,
                    brightness: brightness / 100,
                    contrast: contrast / 100,
                    available_blocks: palette
                })
            })
                .then(res => res.json())
                .then(res => {
                    if (!res.preview || !res.blockCount) return
                    setPreview(res.preview)
                    setBlockCount(res.blockCount)
                    setIndividualBlockCount(res.individualBlockCount)
                })
        }
        // this is a debounced useEffect, updatePreview will only be called if the deps of the hook weren't updated in the last 70ms
        const timeout = setTimeout(updatePreview, 70)
        return () => clearTimeout(timeout)
    }, [
        image,
        palette,
        threshold,
        inverted,
        scale,
        horizontalMirror,
        verticalMirror,
        hueRotation,
        saturation,
        brightness,
        contrast,
        address,
        type
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
                        <CollapsibleFormGroup label='Image Pre-processing'>
                            <Form.Group>
                                <Form.Label>
                                    Hue Rotation : {hueRotation}
                                </Form.Label>
                                <Form.Range
                                    value={hueRotation}
                                    min={-180}
                                    max={180}
                                    onChange={e =>
                                        setHueRotation(parseInt(e.target.value))
                                    }
                                ></Form.Range>
                            </Form.Group>
                            <Form.Group>
                                <Form.Label>
                                    Saturation: {saturation}%
                                </Form.Label>
                                <Form.Range
                                    value={saturation}
                                    min={0}
                                    max={200}
                                    onChange={e =>
                                        setSaturation(parseInt(e.target.value))
                                    }
                                ></Form.Range>
                            </Form.Group>
                            <Form.Group>
                                <Form.Label>
                                    Brightness: {brightness}%
                                </Form.Label>
                                <Form.Range
                                    value={brightness}
                                    min={0}
                                    max={200}
                                    onChange={e =>
                                        setBrightness(parseInt(e.target.value))
                                    }
                                ></Form.Range>
                            </Form.Group>
                            <Form.Group>
                                <Form.Label>Contrast: {contrast}%</Form.Label>
                                <Form.Range
                                    value={contrast}
                                    min={0}
                                    max={200}
                                    onChange={e =>
                                        setContrast(parseInt(e.target.value))
                                    }
                                ></Form.Range>
                            </Form.Group>
                        </CollapsibleFormGroup>

                        <Form.Group className='mb-5'>
                            <Form.Label>Conversion Type</Form.Label>
                            <Form.Select
                                value={type}
                                onChange={e => setType(e.target.value)}
                            >
                                <option value='grayscale'>Grayscale</option>
                                <option value='color_flat'>Color (Flat)</option>
                            </Form.Select>
                        </Form.Group>

                        {type === 'grayscale' ? (
                            <>
                                <Form.Group>
                                    <Form.Label>
                                        Detection Threshold:{' '}
                                    </Form.Label>
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
                                            setThreshold(
                                                parseInt(e.target.value)
                                            )
                                        }
                                    ></Form.Range>
                                </Form.Group>
                                <Form.Group>
                                    <Form.Label>Inverted: </Form.Label>
                                    <Form.Check
                                        type='switch'
                                        checked={inverted}
                                        onChange={e =>
                                            setInverted(e.target.checked)
                                        }
                                    />
                                </Form.Group>
                            </>
                        ) : (
                            <>
                                <Form.Group>
                                    <Form.Label>Palette</Form.Label>
                                    <PaletteSelector
                                        defaultPreset='Everything'
                                        onChange={setPalette}
                                    />
                                </Form.Group>
                            </>
                        )}

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
                            individualBlockCount={individualBlockCount}
                            width='50%'
                            maxHeight='80%'
                        />
                    )}
                </div>
            </Modal.Body>
        </Modal>
    )
}

function CollapsibleFormGroup({
    label,
    children
}: {
    label: string
    children: React.ReactNode
}) {
    const [open, setOpen] = useState(false)

    return (
        <Form.Group>
            <div
                onClick={() => setOpen(o => !o)}
                style={{ cursor: 'pointer', userSelect: 'none' }}
                className='d-flex align-items-center gap-2'
            >
                <span>{open ? '▾' : '▸'}</span>
                <Form.Label className='mb-0'>{label}</Form.Label>
            </div>
            <Collapse in={open}>
                <div className='mx-4 mt-1'>{children}</div>
            </Collapse>
        </Form.Group>
    )
}
