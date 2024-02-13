import { useAddress } from '../stores/config'
import AppNavbar from '../components/AppNavbar'
import { useEffect, useState } from 'react'
import type { PrinterConfig } from 'printer-types'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Configpage() {
    const address = useAddress()
    const [config, setConfig] = useState<PrinterConfig | undefined>()
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        setLoading(true)
        fetch(`${address}/config`)
            .then(res => res.json())
            .then(config => {
                setConfig(config)
                setLoading(false)
            })
    }, [address])

    return (
        <div className='page'>
            <AppNavbar />
            <div className='content'>
                {loading ? (
                    <LoadingSpinner style={{ width: '100%', height: '100%' }} />
                ) : (
                    <pre>{JSON.stringify(config, null, 4)}</pre>
                )}
            </div>
        </div>
    )
}
