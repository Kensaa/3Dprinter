/* eslint-disable @typescript-eslint/ban-ts-comment */
import { useState } from 'react'
import { Button, Modal, Form } from 'react-bootstrap'
import { FileUploader } from 'react-drag-drop-files'
import dataStore from '../stores/data'
import configStore from '../stores/config'

interface NewSchematicModalProps {
    show: boolean
    hide: () => void
}

export default function NewSchematicModal({
    show,
    hide
}: NewSchematicModalProps) {
    const [name, setName] = useState('')
    const [schFile, setSchFile] = useState('')

    const updateBuild = dataStore(state => state.updateBuild)
    const address = configStore(store => store.address)

    const handleFileUpload = (file: File) => {
        console.log(file)
        const filename = file.name

        setName(filename.substring(0, filename.lastIndexOf('.')))
        const reader = new FileReader()
        reader.addEventListener('load', event => {
            if (!event.target) return
            const result = event.target.result as string
            setSchFile(result.split(',')[1])
        })
        reader.readAsDataURL(file)
    }

    const submit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        event.stopPropagation()
        fetch(`${address}/convertSchematic`, {
            method: 'POST',
            body: JSON.stringify({ schematic: schFile }),
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
                            types={['schem', 'schematic']}
                            label='Upload or drop the schematic you want to convert here'
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
                    <div className='d-flex justify-content-center'>
                        {
                            //@ts-ignore
                            <Button type='submit'>Convert</Button>
                        }
                    </div>
                </Form>
            </Modal.Body>
        </Modal>
    )
}
