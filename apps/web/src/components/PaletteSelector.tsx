import { Button, Col, Form, Modal, Row } from 'react-bootstrap'
import { defaultPresets, useBlockPresets } from '../stores/blockPreset'
import { useEffect, useMemo, useState } from 'react'
import PaletteEditor from './PaletteEditor'

interface PaletteSelectorProps {
    defaultPreset: string
    onChange: (palette: string[]) => void
}
export default function PaletteSelector({
    defaultPreset,
    onChange
}: PaletteSelectorProps) {
    const { presets, removePreset, addPreset } = useBlockPresets()
    const [presetName, setPresetName] = useState<string>(defaultPreset)
    const [currentPalette, setCurrentPalette] = useState<string[]>(
        presets[defaultPreset]
    )
    const [showSaveConfirm, setShowSaveConfirm] = useState(false)

    const equalToPreset = useMemo(() => {
        const preset = presets[presetName]
        if (!preset) return false
        const paletteSet = new Set(currentPalette)
        return preset.every(e => paletteSet.has(e))
    }, [presets, presetName, currentPalette])

    const isDefaultPreset = useMemo(() => {
        return Object.keys(defaultPresets).includes(presetName)
    }, [presetName])

    useEffect(() => {
        onChange(currentPalette)
    }, [onChange, currentPalette])

    return (
        <div>
            <Row>
                <Form.Group as={Col}>
                    <Form.Select
                        value={presetName}
                        onChange={e => {
                            setPresetName(e.target.value)
                            setCurrentPalette(presets[e.target.value])
                        }}
                    >
                        {Object.keys(presets).map(name => (
                            <option value={name} key={name} onClick={() => {}}>
                                {name}
                            </option>
                        ))}
                    </Form.Select>
                </Form.Group>
                <Form.Group as={Col}>
                    <Button
                        className='mx-1'
                        disabled={equalToPreset}
                        onClick={() => setCurrentPalette(presets[presetName])}
                    >
                        Reset
                    </Button>
                    <Button
                        className='mx-1'
                        variant='success'
                        disabled={equalToPreset}
                        onClick={() => {
                            setShowSaveConfirm(true)
                        }}
                    >
                        Save
                    </Button>
                    <Button
                        className='mx-1'
                        variant='danger'
                        disabled={isDefaultPreset}
                        onClick={() => {
                            removePreset(presetName)
                            setCurrentPalette(Object.values(presets)[0])
                        }}
                    >
                        Delete
                    </Button>
                </Form.Group>
            </Row>
            <PaletteEditor
                palette={currentPalette}
                onChange={setCurrentPalette}
            />
            <SaveConfirmModal
                show={showSaveConfirm}
                hide={() => setShowSaveConfirm(false)}
                onConfirm={name => addPreset(name, currentPalette)}
                defaultName={isDefaultPreset ? '' : presetName}
            />
        </div>
    )
}

interface SaveConfirmModalProps {
    show: boolean
    hide: () => void
    onConfirm: (name: string) => void
    defaultName?: string
}
function SaveConfirmModal({
    show,
    hide,
    onConfirm,
    defaultName
}: SaveConfirmModalProps) {
    const [name, setName] = useState(defaultName ?? '')

    return (
        <Modal show={show} onHide={hide}>
            <Modal.Header>
                <Modal.Title>Confirm Save</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className='d-flex flex-column align-items-center'>
                    <Form.Control
                        placeholder='Preset name'
                        value={name}
                        onChange={e => setName(e.target.value)}
                    />
                    <Form.Group className='mt-3'>
                        <Button
                            className='mx-1'
                            variant='success'
                            disabled={name === undefined || name === ''}
                            onClick={() => {
                                onConfirm(name!)
                                hide()
                            }}
                        >
                            Save
                        </Button>
                        <Button
                            className='mx-1'
                            variant='danger'
                            onClick={hide}
                        >
                            Cancel
                        </Button>
                    </Form.Group>
                </div>
            </Modal.Body>
        </Modal>
    )
}
