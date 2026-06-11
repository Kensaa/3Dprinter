import { useMemo, useState } from 'react'
import { Button, Table } from 'react-bootstrap'
import RemoteControlModal from '../modals/RemoteControlModal'
import { Move } from 'lucide-react'
import LoadingSpinner from './LoadingSpinner'
import { useCurrentTask, usePrinters } from '../stores/data'
import type { Printer } from '../utils/types'
import { useInterval } from 'usehooks-ts'

interface PrinterTableProps {
    width?: string
    height?: string
}

export default function PrinterTable({
    width = '100%',
    height = '30%'
}: PrinterTableProps) {
    const { printers, fetchPrinters } = usePrinters()

    useInterval(() => {
        fetchPrinters()
    }, 1000)
    const { currentTask } = useCurrentTask()
    const [controlingAllPrinters, setControllingAllPrinters] = useState(false)

    const sortedPrinters = useMemo(() => {
        if (!printers) return undefined
        printers.sort((a, b) => a.id - b.id)
        if (currentTask) {
            printers.sort((a, b) => {
                const aState =
                    a.state !== 'idle' ? (a.state === 'building' ? 2 : 1) : 0
                const bState =
                    b.state !== 'idle' ? (b.state === 'building' ? 2 : 1) : 0
                return bState - aState
            })
        }
        return printers
    }, [printers, currentTask])

    if (!sortedPrinters) {
        return <LoadingSpinner style={{ width, height }} />
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
                        <th>Fuel</th>
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
            <Button
                variant='outline-primary'
                disabled={sortedPrinters.length === 0}
                onClick={() => setControllingAllPrinters(true)}
            >
                Remote control all printers
            </Button>

            <RemoteControlModal
                hide={() => setControllingAllPrinters(false)}
                printers={sortedPrinters}
                show={controlingAllPrinters}
            />
        </>
    )
}

interface TableRowProps {
    printer: Printer
}

function TableRow({ printer }: TableRowProps) {
    const [controlling, setControlling] = useState(false)

    const { id, label, state, connected, pos, progress, fuel } = printer
    return (
        <>
            <tr className=''>
                <td>{id}</td>
                <td>{label}</td>
                <td>{capitalise(state)}</td>
                <td>{connected ? 'Connected' : 'Disconnected'}</td>
                <td>
                    {pos ? pos.map(p => Math.round(p)).join(' ') : 'Unknown'}
                </td>
                <td>{fuel !== undefined ? fuel.toFixed(2) : 'Unknown'}</td>
                <td>
                    {progress !== undefined
                        ? progress.toFixed(2) + '%'
                        : 'Unknown'}
                </td>
                <td>
                    <Button
                        onClick={() => setControlling(true)}
                        variant='outline-primary'
                        disabled={!connected}
                    >
                        <Move />
                    </Button>
                </td>
            </tr>
            <RemoteControlModal
                hide={() => setControlling(false)}
                printers={[printer]}
                show={controlling}
            />
        </>
    )
}

function capitalise(str: string): string {
    if (str[0].toUpperCase() === str[0]) return str
    return str[0].toUpperCase() + str.substring(1)
}
