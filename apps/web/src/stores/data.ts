import { create } from 'zustand'
import type { Build, CompressedBuild, Printer, Task } from '../utils/types'
import { useConfig } from './config'
import { useMemo } from 'react'
import { array3DToString } from 'utils'
import { compress } from '../utils/utils'

interface dataStore {
    builds: Record<string, CompressedBuild>
    printers?: Printer[]
    currentTask?: Task
    fetchBuilds: () => void
    fetchPrinters: () => void
    fetchCurrentTask: () => void
    setBuild: (name: string, build: CompressedBuild) => void
    updateBuild: (name: string, build: Build) => void
}

const store = create<dataStore>((set, get) => {
    const fetchBuilds = () => {
        const { address } = useConfig.getState()
        fetch(`${address}/builds`, { method: 'GET' })
            .then(res => res.json())
            .then(data => data as Record<string, CompressedBuild>)
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
                if (res.status === 204) return undefined
                return res.json()
            })
            .then(data => data as Task | undefined)
            .then(currentTask => set({ currentTask }))
    }

    /**
     * set a build in the store
     * @param name name of the build
     * @param build the commpressed build
     */

    const setBuild = (name: string, build: CompressedBuild) => {
        const builds = get().builds
        builds[name] = build
        set({ builds })
    }

    /**
     * edit a build on the server and in the store (using setBuild internally)
     * @param name name of the build
     * @param build the uncompressed build
     */
    const updateBuild = (name: string, build: Build) => {
        const { address } = useConfig.getState()
        const compressedBuild: CompressedBuild = {
            ...build,
            shape: array3DToString(build.shape, compress)
        }
        setBuild(name, compressedBuild)
        fetch(`${address}/builds`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                [name]: compressedBuild
            })
        }).catch(err => {
            console.log('an error occured while updating model : ', err)
        })
    }

    fetchBuilds()
    fetchPrinters()
    fetchCurrentTask()

    return {
        builds: {},
        printers: undefined,
        currentTask: undefined,
        fetchBuilds,
        fetchPrinters,
        fetchCurrentTask,
        setBuild,
        updateBuild
    }
})

export const useData = store

export const useBuilds = () => {
    const state = useData()
    return useMemo(
        () => ({
            builds: state.builds,
            fetchBuilds: state.fetchBuilds,
            updateBuild: state.updateBuild,
            setBuild: state.setBuild
        }),
        [state.builds, state.fetchBuilds, state.updateBuild, state.setBuild]
    )
}
export const usePrinters = () => {
    const state = useData()
    return useMemo(
        () => ({
            printers: state.printers,
            fetchPrinters: state.fetchPrinters
        }),
        [state.printers, state.fetchPrinters]
    )
}
export const useCurrentTask = () => {
    const state = useData()
    return useMemo(
        () => ({
            currentTask: state.currentTask,
            fetchCurrentTask: state.fetchCurrentTask
        }),
        [state.currentTask, state.fetchCurrentTask]
    )
}
