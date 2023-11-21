import { create } from 'zustand'
import type { Build, Printer, Task } from '../utils/types'
import config from './config'

interface dataStore {
    builds: Record<string, Build>
    printers: Printer[]
    currentTask?: Task
    fetchBuilds: () => void
    fetchPrinters: () => void
    fetchCurrentTask: () => void
    updateBuild: (name: string, build: Build) => void
}

export default create<dataStore>((set, get) => {
    const fetchBuilds = () => {
        const { address } = config.getState()
        fetch(`${address}/builds`, { method: 'GET' })
            .then(res => res.json())
            .then(data => data as Record<string, Build>)
            .then(builds => set({ builds }))
    }
    const fetchPrinters = () => {
        const { address } = config.getState()
        fetch(`${address}/printers`, { method: 'GET' })
            .then(res => res.json())
            .then(data => data as Printer[])
            .then(printers => set({ printers }))
    }

    const fetchCurrentTask = () => {
        const { address } = config.getState()
        fetch(`${address}/current`, { method: 'GET' })
            .then(res => {
                if (res.status === 404) return undefined
                return res.json()
            })
            .then(data => data as Task | undefined)
            .then(currentTask => set({ currentTask }))
    }

    const updateBuild = (name: string, build: Build) => {
        const { address } = config.getState()
        const builds = get().builds
        builds[name] = build
        set({ builds })
        fetch(`${address}/editBuilds`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...builds })
        }).catch(err => {
            console.log('an error occured while updating model : ', err)
        })
    }

    fetchBuilds()
    fetchPrinters()
    fetchCurrentTask()

    return {
        builds: {},
        printers: [],
        fetchBuilds,
        fetchPrinters,
        fetchCurrentTask,
        updateBuild
    }
})
