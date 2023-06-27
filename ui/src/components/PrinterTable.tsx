import { Spinner, Table } from 'react-bootstrap'
import { Printer } from '../types'

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
    if (!printers) {
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
        <Table
            style={{ width, height }}
            /*className='mt-5 mx-2'
            bordered
            hover*/
        >
            <thead>
                <tr className='unselectable'>
                    <th>ID</th>
                    <th>Label</th>
                    <th>State</th>
                    <th>Connected</th>
                    <th>Position</th>
                    <th>Progress</th>
                </tr>
            </thead>
            <tbody>
                {printers.map((printer, i) => (
                    <TableRow printer={printer} key={i} />
                ))}
            </tbody>
        </Table>
    )
}

interface TableRowProps {
    printer: Printer
}

function TableRow({ printer }: TableRowProps) {
    const { id, label, state, connected, pos, progress } = printer
    return (
        <tr className='unselectable'>
            <td>{id}</td>
            <td>{label}</td>
            <td>{capitalise(state)}</td>
            <td>{connected ? 'Connected' : 'Disconnected'}</td>
            <td>{pos ? pos.join(',') : 'Unknown'}</td>
            <td>{progress ? progress.toFixed(2) + '%' : 'Unknown'}</td>
        </tr>
    )
}

function capitalise(str: string): string {
    if (str[0].toUpperCase() === str[0]) return str
    return str[0].toUpperCase() + str.substring(1)
}
