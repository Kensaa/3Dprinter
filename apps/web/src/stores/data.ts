import { create } from 'zustand'
import type { Build, Printer, Task } from '../utils/types'
import { useConfig } from './config'

interface dataStore {
    builds: Record<string, Build>
    printers: Printer[]
    currentTask?: Task
    fetchBuilds: () => void
    fetchPrinters: () => void
    fetchCurrentTask: () => void
    updateBuild: (name: string, build: Build) => void
}

const store = create<dataStore>((set, get) => {
    const fetchBuilds = () => {
        const { address } = useConfig.getState()
        fetch(`${address}/builds`, { method: 'GET' })
            .then(res => res.json())
            .then(data => data as Record<string, Build>)
            .then(builds => set({ builds }))
    }
    const fetchPrinters = () => {
        const { address } = useConfig.getState()
        fetch(`${address}/printers`, { method: 'GET' })
            .then(res => res.json())
            .then(data => data as Printer[])
            .then(printers => set({ printers }))
    }

    const fetchCurrentTask = () => {
        const { address } = useConfig.getState()
        fetch(`${address}/currentTask`, { method: 'GET' })
            .then(res => {
                if (res.status === 404) return undefined
                return res.json()
            })
            .then(data => data as Task | undefined)
            .then(currentTask => set({ currentTask }))
    }

    const updateBuild = (name: string, build: Build) => {
        const { address } = useConfig.getState()
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
        currentTask: undefined,
        fetchBuilds,
        fetchPrinters,
        fetchCurrentTask,
        updateBuild
    }
})

export const useData = store

export const useBuilds = () =>
    useData(state => ({
        builds: state.builds,
        fetchBuilds: state.fetchBuilds,
        updateBuild: state.updateBuild
    }))
export const usePrinters = () =>
    useData(state => ({
        printers: state.printers,
        fetchPrinters: state.fetchPrinters
    }))
export const useCurrentTask = () =>
    useData(state => ({
        currentTask: state.currentTask,
        fetchCurrentTask: state.fetchCurrentTask
    }))
