/* eslint-disable @typescript-eslint/ban-ts-comment */
import { useMemo, useState } from 'react'
import { Spinner, Table } from 'react-bootstrap'
import type { Printer } from '../utils/types'
import RemoteControlModal from '../modals/RemoteControlModal'
import { Move } from 'lucide-react'
import Button from './Button'

interface PrinterTableProps {
    printers: Printer[]
    width?: string
    height?: string
}

export default function PrinterTable({
    printers,
    width = '100%',
    height = '30%'
}: PrinterTableProps) {
    const sortedPrinters = useMemo(
        () => printers.sort((a, b) => a.id - b.id),
        [printers]
    )

    if (sortedPrinters.length === 0) {
        return (
            <div
                style={{ width, height }}
                className='d-flex justify-content-center align-items-center border'
            >
                <Spinner animation='border' />
            </div>
        )
    }

    return (
        <>
            <Table style={{ width, height }}>
                <thead>
                    <tr className='unselectable'>
                        <th>ID</th>
                        <th>Label</th>
                        <th>State</th>
                        <th>Connected</th>
                        <th>Position</th>
                        <th>Progress</th>
                        <th>Control</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedPrinters.map((printer, i) => (
                        <TableRow printer={printer} key={i} />
                    ))}
                </tbody>
            </Table>
        </>
    )
}

interface TableRowProps {
    printer: Printer
}

function TableRow({ printer }: TableRowProps) {
    const [controlling, setControlling] = useState(false)

    const { id, label, state, connected, pos, progress } = printer
    return (
        <>
            <tr className=''>
                <td>{id}</td>
                <td>{label}</td>
                <td>{capitalise(state)}</td>
                <td>{connected ? 'Connected' : 'Disconnected'}</td>
                <td>{pos ? pos.join(' ') : 'Unknown'}</td>
                <td>
                    {progress !== undefined
                        ? progress.toFixed(2) + '%'
                        : 'Unknown'}
                </td>
                <td>
                    <Button
                        onClick={() => setControlling(true)}
                        variant='outline-primary'
                    >
                        <Move />
                    </Button>
                </td>
            </tr>
            <RemoteControlModal
                hide={() => setControlling(false)}
                printer={printer}
                show={controlling}
            />
        </>
    )
}

function capitalise(str: string): string {
    if (str[0].toUpperCase() === str[0]) return str
    return str[0].toUpperCase() + str.substring(1)
}
