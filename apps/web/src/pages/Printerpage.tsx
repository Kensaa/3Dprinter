import AppNavbar from '../components/AppNavbar'
import { useCurrentTask, usePrinters } from '../stores/data'
import PrinterTable from '../components/PrinterTable'
import { useInterval } from 'usehooks-ts'
import type { Task } from '../utils/types'
import ProgressViewer from '../components/ProgressViewer'

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
