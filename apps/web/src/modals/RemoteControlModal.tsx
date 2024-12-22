import { createElement, useMemo, useState } from 'react'
import { Form, Modal } from 'react-bootstrap'
import Button from '../components/Button'
import { Printer } from '../utils/types'
import {
    ArrowDownToLine,
    ArrowUpFromLine,
    Fuel,
    MoveDown,
    MoveUp,
    PackageX,
    Pause,
    Power,
    RotateCcw,
    RotateCw
} from 'lucide-react'
import { useAddress } from '../stores/config'

interface RemoteControlModalProps {
    printers: Printer[]
    show: boolean
    hide: () => void
}

export default function RemoteControlModal({
    show,
    hide,
    printers
}: RemoteControlModalProps) {
    const name = useMemo(() => {
        return printers.length > 1 ? 'Multiple Printers' : printers[0].label
    }, [printers])

    return (
        <Modal show={show} onHide={hide}>
            <Modal.Header closeButton>
                <Modal.Title>Remote Controlling {name}</Modal.Title>
            </Modal.Header>
            <Modal.Body className='d-flex flex-column align-items-center justify-content-center'>
                <div className='m-1'>
                    <CommandButton
                        name='forward'
                        icon={MoveUp}
                        printers={printers}
                    />
                </div>
                <div className='m-1'>
                    <CommandButton
                        name='turnLeft'
                        icon={RotateCcw}
                        printers={printers}
                    />
                    <CommandButton
                        name='turnRight'
                        icon={RotateCw}
                        printers={printers}
                    />
                </div>
                <div className='m-1'>
                    <CommandButton
                        name='backward'
                        icon={MoveDown}
                        printers={printers}
                    />
                </div>
                <div className='m-1'>
                    <CommandButton
                        name='down'
                        icon={ArrowDownToLine}
                        printers={printers}
                    />
                    <CommandButton
                        name='up'
                        icon={ArrowUpFromLine}
                        printers={printers}
                    />
                </div>
                <div className='mt-3'>
                    <CommandButton
                        name='refuel'
                        icon={Fuel}
                        printers={printers}
                    />
                    <CommandButton
                        name='emptyInventory'
                        icon={PackageX}
                        printers={printers}
                    />
                </div>
                <div className='mt-3'>
                    <CommandButton
                        name='pause'
                        icon={Pause}
                        printers={printers}
                    />
                    <CommandButton
                        name='reboot'
                        icon={Power}
                        printers={printers}
                    />
                </div>
                <GoToForm printers={printers} />
                <HeadToForm printers={printers} />
                {printers.length > 1 && (
                    <>
                        <LineForm printers={printers} />
                    </>
                )}
            </Modal.Body>
        </Modal>
    )
}

type CommandButtonProps = {
    name: string
    icon: React.FunctionComponent
    printers: Printer[]
}

function CommandButton({ name, icon, printers }: CommandButtonProps) {
    const address = useAddress()
    const action = () => {
        console.log(name)
        for (const printer of printers) {
            fetch(`${address}/remote`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ printer: printer.id, command: name })
            })
        }
    }

    return (
        <Button variant='outline-primary' onClick={action} className='mx-1'>
            {createElement(icon)}
        </Button>
    )
}

interface GoToFormProps {
    printers: Printer[]
}

function GoToForm({ printers }: GoToFormProps) {
    const [x, setX] = useState<number | undefined>()
    const [y, setY] = useState<number | undefined>()
    const [z, setZ] = useState<number | undefined>()

    const address = useAddress()

    const submit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        e.stopPropagation()

        if (!(x && y && z)) {
            return
        }
        for (const printer of printers) {
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
function HeadToForm({ printers }: GoToFormProps) {
    const [heading, setHeading] = useState<number>(0)

    const address = useAddress()

    const submit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        e.stopPropagation()
        for (const printer of printers) {
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

function LineForm({ printers }: GoToFormProps) {
    const [x, setX] = useState<number | undefined>()
    const [y, setY] = useState<number | undefined>()
    const [z, setZ] = useState<number | undefined>()
    const [heading, setHeading] = useState<number>(0)

    const address = useAddress()

    const submit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        e.stopPropagation()
        if (!(x && y && z)) {
            return
        }
        const currentPos = [x, y, z]
        for (const printer of printers) {
            fetch(`${address}/remote`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    printer: printer.id,
                    command: 'goTo',
                    data: currentPos
                })
            })

            switch (heading) {
                case 0:
                    currentPos[0] += 1
                    break
                case 1:
                    currentPos[2] += 1
                    break
                case 2:
                    currentPos[0] -= 1
                    break
                case 3:
                    currentPos[2] -= 1
                    break
                default:
                    console.error('invalid heading ' + heading)
                    return
            }
        }
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
            className='d-flex flex-column align-items-center w-100 mt-3'
        >
            <Form.Label>Move printers in a line starting from: </Form.Label>
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
            <Form.Label>Heading: </Form.Label>
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
            <Button
                variant='outline-primary'
                type='submit'
                className='mt-1'
                disabled={!(x && y && z)}
            >
                Go
            </Button>
        </Form>
    )
}
