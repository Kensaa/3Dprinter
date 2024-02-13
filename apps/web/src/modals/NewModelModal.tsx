import { useState } from 'react'
import { Modal, Form } from 'react-bootstrap'
import Button from '../components/Button'
import { FileUploader } from 'react-drag-drop-files'
import { useBuilds } from '../stores/data'
import { useAddress } from '../stores/config'

interface NewModelModalProps {
    show: boolean
    hide: () => void
}

export default function NewModelModal({ show, hide }: NewModelModalProps) {
    const [name, setName] = useState('')
    const [scale, setScale] = useState(20)
    const [objectFile, setObjectFile] = useState('')

    const { updateBuild } = useBuilds()
    const address = useAddress()

    const handleFileUpload = (file: File) => {
        console.log(file)
        const filename = file.name

        setName(filename.substring(0, filename.lastIndexOf('.')))
        const reader = new FileReader()
        reader.addEventListener('load', event => {
            if (!event.target) return
            const result = event.target.result as string
            setObjectFile(result.split(',')[1])
        })
        reader.readAsDataURL(file)
    }

    const submit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        event.stopPropagation()
        fetch(`${address}/voxelize`, {
            method: 'POST',
            body: JSON.stringify({ file: objectFile, scale }),
            headers: {
                'Content-Type': 'application/json'
            }
        })
            .then(res => res.json())
            .then(build => {
                updateBuild(name, build)
                hide()
            })
    }

    return (
        <Modal show={show} onHide={hide}>
            <Modal.Header closeButton>
                <Modal.Title>Converting a 3D model</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form onSubmit={submit}>
                    <div className='d-flex justify-content-center'>
                        <FileUploader
                            handleChange={handleFileUpload}
                            name='file'
                            types={['OBJ']}
                            label='Upload or drop the image you want to convert here'
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
                            onChange={e => setScale(parseInt(e.target.value))}
                        />
                    </Form.Group>

                    <div className='d-flex justify-content-center'>
                        <Button type='submit'>Convert</Button>
                    </div>
                </Form>
            </Modal.Body>
        </Modal>
    )
}
