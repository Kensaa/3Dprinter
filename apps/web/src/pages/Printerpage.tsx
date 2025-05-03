import AppNavbar from '../components/AppNavbar'
import { useCurrentTask, usePrinters } from '../stores/data'
import PrinterTable from '../components/PrinterTable'
import { useInterval } from 'usehooks-ts'
import type { Task } from '../utils/types'
import ProgressViewer from '../components/ProgressViewer'
import Button from '../components/Button'

export default function Printerpage() {
    const { printers, fetchPrinters } = usePrinters()
    const { currentTask, fetchCurrentTask } = useCurrentTask()

    useInterval(() => {
        fetchPrinters()
        fetchCurrentTask()
    }, 1000)

    return (
        <div className='page'>
            <AppNavbar />
            <div className='content'>
                <CurrentTask currentTask={currentTask} />
                <PrinterTable printers={printers} currentTask={currentTask} />
                <div className='my-5'>
                    <Button
                        className='mx-1'
                        variant='outline-secondary'
                        onClick={() => {
                            navigator.clipboard.writeText(
                                `wget ${document.location.protocol}//${document.location.host}/clients/turtle.lua startup`
                            )
                        }}
                    >
                        Copy turtle install command
                    </Button>
                    <Button
                        className='mx-1'
                        variant='outline-secondary'
                        onClick={() => {
                            navigator.clipboard.writeText(
                                `wget ${document.location.protocol}//${document.location.host}/clients/drone.lua startup`
                            )
                        }}
                    >
                        Copy drone install command
                    </Button>
                </div>
            </div>
        </div>
    )
}

function CurrentTask({ currentTask }: { currentTask: Task | undefined }) {
    if (!currentTask) {
        return (
            <div>
                <h4>Current Task: None</h4>
            </div>
        )
    }

    return (
        <div className='w-100 d-flex flex-column justify-content-center align-items-center'>
            <h4>Current Task: {currentTask.buildName}</h4>
            <h4>
                Progress: {currentTask.completedParts.length} /{' '}
                {currentTask.partCount} parts built
            </h4>
            <h4>Time Elapsed: {timeSince(currentTask.startedAt)}</h4>
            <ProgressViewer width='100%' height='300px' />
        </div>
    )
}

function timeSince(date: number): string {
    const totalSeconds = Math.floor((Date.now() - date) / 1000)

    const hours = Math.floor(totalSeconds / 3600)
        .toString()
        .padStart(2, '0')
    const minutes = Math.floor((totalSeconds % 3600) / 60)
        .toString()
        .padStart(2, '0')
    const seconds = (totalSeconds % 60).toString().padStart(2, '0')

    return `${hours}:${minutes}:${seconds}`
}
