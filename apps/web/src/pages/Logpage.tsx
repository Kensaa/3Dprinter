import { useState } from 'react'
import { useInterval } from 'usehooks-ts'
import { useAddress } from '../stores/config'
import AppNavbar from '../components/AppNavbar'

export default function Logpage() {
    const [logs, setLogs] = useState<string[]>([])
    const address = useAddress()

    useInterval(() => {
        fetch(`${address}/logs`)
            .then(res => res.json())
            .then(logs => logs as string[])
            .then(setLogs)
    }, 1000)

    return (
        <div className='page'>
            <AppNavbar />
            <div className='content'>
                {logs.map((log, i) => (
                    <p className='m-0' key={i}>
                        {log}
                    </p>
                ))}
            </div>
        </div>
    )
}
