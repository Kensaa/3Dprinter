import { create } from 'zustand'
import { Model, Printer } from '../types'
import config from './config'

interface dataStore {
    models: Record<string, Model>
    printers: Printer[]
    fetchModels: () => void
    updateModel: (name: string, model: Model) => void
    fetchPrinters: () => void
}

export default create<dataStore>((set, get) => {
    const fetchModels = () => {
        const { address } = config.getState()
        fetch(`${address}/3D/models`, { method: 'GET' })
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

    const updateModel = (name: string, model: Model) => {
        const { address } = config.getState()
        const models = get().models
        models[name] = model
        set({ models })
        fetch(`${address}/3D/model`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...models })
        })
    }

    fetchModels()
    fetchPrinters()

    return {
        models: {},
        printers: [],
        fetchModels,
        updateModel,
        fetchPrinters
    }
})
