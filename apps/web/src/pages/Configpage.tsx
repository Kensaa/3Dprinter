import { useAddress } from '../stores/config'
import AppNavbar from '../components/AppNavbar'
import { useEffect, useState } from 'react'
import type { PrinterConfig } from 'printer-types'
import LoadingSpinner from '../components/LoadingSpinner'
import AceEditor from 'react-ace'
import Button from '../components/Button'

import 'ace-builds/src-noconflict/theme-github'
import 'ace-builds/src-noconflict/mode-json5'
import { Alert } from 'react-bootstrap'

export default function Configpage() {
    const address = useAddress()
    const [config, setConfig] = useState<PrinterConfig | undefined>()
    const [value, setValue] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        setLoading(true)
        fetch(`${address}/config`)
            .then(res => res.json())
            .then(config => {
                setConfig(config)
                setLoading(false)
            })
    }, [address])

    const save = () => {
        fetch(`${address}/config`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: value
        }).then(res => {
            if (res.status === 400) {
                setError('Invalid Config')
            }
        })
    }

    return (
        <div className='page'>
            <AppNavbar />
            <div className='content'>
                {loading ? (
                    <LoadingSpinner style={{ width: '100%', height: '100%' }} />
                ) : (
                    <>
                        {error && (
                            <Alert
                                dismissible
                                variant='danger'
                                onClose={() => setError('')}
                            >
                                {error}
                            </Alert>
                        )}
                        <h1>Config Editor</h1>
                        <AceEditor
                            mode='json5'
                            theme='github'
                            onChange={val => setValue(val)}
                            defaultValue={JSON.stringify(config, null, 2)}
                            value={value}
                            name='ConfigEditor'
                            editorProps={{ $blockScrolling: true }}
                        />
                        <Button onClick={save}>Save</Button>
                    </>
                )}
            </div>
        </div>
    )
}
