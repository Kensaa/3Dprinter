import { createElement, useState } from 'react'
import { Form, Modal } from 'react-bootstrap'
import Button from '../components/Button'
import { Printer } from '../utils/types'
import {
    ArrowDownToLine,
    ArrowUpFromLine,
    Fuel,
    MoveDown,
    MoveUp,
    RotateCcw,
    RotateCw
} from 'lucide-react'
import configStore from '../stores/config'

interface BuildModalProps {
    printer: Printer
    show: boolean
    hide: () => void
}

export default function RemoteControlModal({
    show,
    hide,
    printer
}: BuildModalProps) {
    return (
        <Modal show={show} onHide={hide}>
            <Modal.Header closeButton>
                <Modal.Title>Remote Controlling "{printer.label}"</Modal.Title>
            </Modal.Header>
            <Modal.Body className='d-flex flex-column align-items-center justify-content-center'>
                <div className='m-1'>
                    <CommandButton
                        name='forward'
                        icon={MoveUp}
                        printer={printer}
                    />
                </div>
                <div className='m-1'>
                    <CommandButton
                        name='turnLeft'
                        icon={RotateCcw}
                        printer={printer}
                    />
                    <CommandButton
                        name='turnRight'
                        icon={RotateCw}
                        printer={printer}
                    />
                </div>
                <div className='m-1'>
                    <CommandButton
                        name='backward'
                        icon={MoveDown}
                        printer={printer}
                    />
                </div>
                <div className='m-1'>
                    <CommandButton
                        name='down'
                        icon={ArrowDownToLine}
                        printer={printer}
                    />
                    <CommandButton
                        name='up'
                        icon={ArrowUpFromLine}
                        printer={printer}
                    />
                </div>
                <div className='mt-3'>
                    <CommandButton
                        name='refuel'
                        icon={Fuel}
                        printer={printer}
                    />
                </div>
                <GoToForm printer={printer} />
                <HeadToForm printer={printer} />
            </Modal.Body>
        </Modal>
    )
}

type CommandButtonProps = {
    name: string
    icon: React.FunctionComponent
    printer: Printer
}

function CommandButton({ name, icon, printer }: CommandButtonProps) {
    const address = configStore(store => store.address)
    const action = () => {
        // TODO : POST REQUEST
        console.log(name)
        fetch(`${address}/remote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ printer: printer.id, command: name })
        })
    }

    return (
        <Button variant='outline-primary' onClick={action} className='mx-1'>
            {createElement(icon)}
        </Button>
    )
}

interface GoToFormProps {
    printer: Printer
}

function GoToForm({ printer }: GoToFormProps) {
    const [x, setX] = useState<number | undefined>()
    const [y, setY] = useState<number | undefined>()
    const [z, setZ] = useState<number | undefined>()

    const address = configStore(store => store.address)

    const submit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        e.stopPropagation()

        if (!(x && y && z)) {
            return
        }

        fetch(`${address}/remote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                printer: printer.id,
                command: 'goTo',
                data: [x, y, z]
            })
        })
    }

    const pasteShortcut = (e: React.ClipboardEvent) => {
        const data = e.clipboardData.getData('Text')
        if (isNaN(+data)) {
            e.preventDefault()
            const split = data.trim().split(' ')
            if (split.length !== 3) return
            setX(parseInt(split[0].trim()))
            setY(parseInt(split[1].trim()))
            setZ(parseInt(split[2].trim()))
        }
    }

    return (
        <Form
            onSubmit={submit}
            className='d-flex flex-row justify-content-center mt-5 w-100'
        >
            <div className='d-flex flex-row w-75 mx-1'>
                <Form.Control
                    type='number'
                    placeholder='X'
                    value={x}
                    onChange={e => setX(parseInt(e.currentTarget.value))}
                    onPaste={pasteShortcut}
                />
                <Form.Control
                    type='number'
                    placeholder='Y'
                    value={y}
                    onChange={e => setY(parseInt(e.currentTarget.value))}
                    onPaste={pasteShortcut}
                />
                <Form.Control
                    type='number'
                    placeholder='Z'
                    value={z}
                    onChange={e => setZ(parseInt(e.currentTarget.value))}
                    onPaste={pasteShortcut}
                />
            </div>
            <Button
                disabled={!(x && y && z)}
                variant='outline-primary'
                type='submit'
            >
                Go To
            </Button>
        </Form>
    )
}

const headings = ['East', 'South', 'West', 'North']
function HeadToForm({ printer }: GoToFormProps) {
    const [heading, setHeading] = useState<number>(0)

    const address = configStore(store => store.address)

    const submit = (e: React.FormEvent<HTMLFormElement>) => {
        console.log('aa')
        e.preventDefault()
        e.stopPropagation()

        fetch(`${address}/remote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                printer: printer.id,
                command: 'headTo',
                data: [heading + 1]
            })
        })
    }

    return (
        <Form
            onSubmit={submit}
            className='d-flex flex-row justify-content-center mt-3 w-100'
        >
            <Form.Select
                value={heading}
                onChange={e => setHeading(parseInt(e.target.value))}
                className='w-75 mx-1'
            >
                {headings.map((heading, i) => (
                    <option key={i} value={i}>
                        {heading}
                    </option>
                ))}
            </Form.Select>
            <Button variant='outline-primary' type='submit'>
                Head To
            </Button>
        </Form>
    )
}
