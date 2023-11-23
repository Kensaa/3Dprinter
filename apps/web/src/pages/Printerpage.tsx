import AppNavbar from '../components/AppNavbar'
import dataStore from '../stores/data'
import PrinterTable from '../components/PrinterTable'
import { useInterval } from 'usehooks-ts'
import type { Task } from '../utils/types'

export default function Printerpage() {
    const { printers, currentTask, fetchPrinters, fetchCurrentTask } =
        dataStore(state => ({
            printers: state.printers,
            currentTask: state.currentTask,
            fetchPrinters: state.fetchPrinters,
            fetchCurrentTask: state.fetchCurrentTask
        }))

    useInterval(() => {
        fetchPrinters()
        fetchCurrentTask()
    }, 1000)

    return (
        <div className='page'>
            <AppNavbar />
            <div className='content'>
                <CurrentTask currentTask={currentTask} />
                <PrinterTable printers={printers} />
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
        <div>
            <h4>Current Task: {currentTask.buildName}</h4>
            <h4>
                Progress: {currentTask.completedParts} / {currentTask.length}{' '}
                part{currentTask.length > 1 ? 's' : ''} built
            </h4>
        </div>
    )
}
