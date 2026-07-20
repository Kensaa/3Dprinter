import { useAddress } from '../stores/config'
import AppNavbar from '../components/AppNavbar'
import { useEffect, useState } from 'react'
import type { PrinterConfig } from 'utils'
import LoadingSpinner from '../components/LoadingSpinner'
import { Alert, Button } from 'react-bootstrap'
import { Editor } from '@monaco-editor/react'

export default function Configpage() {
    const address = useAddress()
    const [config, setConfig] = useState<PrinterConfig | undefined>()
    const [value, setValue] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [hasSyntaxError, setHasSyntaxError] = useState(false)

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
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
                        <Editor
                            width='50%'
                            height='400px'
                            language='json'
                            theme='light'
                            value={value}
                            options={{
                                minimap: {
                                    enabled: false
                                },
                                scrollBeyondLastLine: false
                            }}
                            onValidate={e => setHasSyntaxError(e.length !== 0)}
                            defaultValue={JSON.stringify(config, null, 2)}
                            onChange={e => setValue(e || '')}
                        />
                        <Button
                            onClick={save}
                            disabled={hasSyntaxError || loading}
                        >
                            Save
                        </Button>
                    </>
                )}
            </div>
        </div>
    )
}
