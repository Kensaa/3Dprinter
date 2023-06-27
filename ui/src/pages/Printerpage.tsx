import AppNavbar from '../components/AppNavbar'
import dataStore from '../stores/data'
import { useInterval } from 'usehooks-ts'
import PrinterTable from '../components/PrinterTable'

export default function Printerpage() {
    const { printers, fetchPrinters } = dataStore(state => ({ ...state }))

    useInterval(fetchPrinters, 1000)

    return (
        <div className='page'>
            <AppNavbar />
            <div className='content'>
                <PrinterTable printers={printers} />
            </div>
        </div>
    )
}
