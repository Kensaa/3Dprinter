import { create } from 'zustand'
import { Model, Printer } from '../types'
import config from './config'

interface dataStore {
    models: Record<string, Model>
    printers: Printer[]
    fetchModels: () => void
    fetchPrinters: () => void
}

export default create<dataStore>(set => {
    const fetchModels = () => {
        const { address } = config.getState()
        fetch(`${address}/models`, { method: 'GET' })
            .then(res => res.json())
            .then(data => data as Record<string, Model>)
            .then(models => set({ models }))
    }
    const fetchPrinters = () => {
        const { address } = config.getState()
        fetch(`${address}/printers`, { method: 'GET' })
            .then(res => res.json())
            .then(data => data as Printer[])
            .then(printers => set({ printers }))
    }

    fetchModels()
    fetchPrinters()

    return {
        models: {},
        printers: [],
        fetchModels,
        fetchPrinters
    }
})
