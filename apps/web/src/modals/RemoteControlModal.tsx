import { createElement } from 'react'
import { Modal } from 'react-bootstrap'
import Button from '../components/Button'
import { Printer } from '../utils/types'
import {
    ArrowDownToLine,
    ArrowUpFromLine,
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
