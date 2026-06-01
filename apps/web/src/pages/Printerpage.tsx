import AppNavbar from '../components/AppNavbar'
import { useCurrentTask } from '../stores/data'
import PrinterTable from '../components/PrinterTable'
import { useInterval } from 'usehooks-ts'
import ProgressViewer from '../components/ProgressViewer'
import Button from '../components/Button'
import { useEffect, useState } from 'react'

export default function Printerpage() {
    return (
        <div className='page'>
            <AppNavbar />
            <div className='content'>
                <CurrentTask />
                <PrinterTable />
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

function CurrentTask() {
    const { currentTask, fetchCurrentTask } = useCurrentTask()
    useInterval(fetchCurrentTask, 1000)

    if (!currentTask) {
        return (
            <div>
                <h4>Current Task: None</h4>
            </div>
        )
    }

    return (
        <div className='w-100 d-flex flex-row justify-content-center align-items-center sticky-header border-bottom'>
            <div className='w-25 d-flex flex-column justify-content-center align-items-center'>
                <h4>Current Task: {currentTask.buildName}</h4>
                <h4>
                    Progress: {currentTask.completedParts.length} /{' '}
                    {currentTask.partCount} parts built
                </h4>
                <ElapsedTime startedAt={currentTask.startedAt} />
            </div>
            <ProgressViewer width='75%' height='100%' />
        </div>
    )
}

function ElapsedTime({ startedAt }: { startedAt: number }) {
    const [elapsed, setElapsed] = useState(() => timeSince(startedAt))
    useEffect(() => {
        const id = setInterval(() => setElapsed(timeSince(startedAt)), 1000)
        return () => clearInterval(id)
    }, [startedAt])

    return <h4>Time Elapsed: {elapsed}</h4>
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
