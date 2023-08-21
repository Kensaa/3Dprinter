import { create } from 'zustand'
import { Build, Printer } from '../types'
import config from './config'

interface dataStore {
    builds: Record<string, Build>
    printers: Printer[]
    fetchBuilds: () => void
    updateBuild: (name: string, build: Build) => void
    fetchPrinters: () => void
}

export default create<dataStore>((set, get) => {
    const fetchBuilds = () => {
        const { address } = config.getState()
        fetch(`${address}/build`, { method: 'GET' })
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

    const updateBuild = (name: string, build: Build) => {
        const { address } = config.getState()
        const builds = get().builds
        builds[name] = build
        set({ builds })
        fetch(`${address}/build`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...builds })
        }).catch(err => {
            console.log('an error occured while updating model : ', err)
        })
    }

    fetchBuilds()
    fetchPrinters()

    return {
        builds: {},
        printers: [],
        fetchBuilds,
        updateBuild,
        fetchPrinters
    }
})
