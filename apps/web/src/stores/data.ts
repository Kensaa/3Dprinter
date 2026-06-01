import { create } from 'zustand'
import type { Printer, Task } from '../utils/types'
import { useConfig } from './config'
import { CompressedBuild } from 'build-bindings'

interface dataStore {
    builds: Record<string, CompressedBuild>
    printers?: Printer[]
    currentTask?: Task
    fetchBuilds: () => void
    fetchPrinters: () => void
    fetchCurrentTask: () => void
    setBuild: (name: string, build: CompressedBuild) => void
    updateBuild: (name: string, build: CompressedBuild) => void
}

const store = create<dataStore>((set, get) => {
    const fetchBuilds = () => {
        const { address } = useConfig.getState()
        fetch(`${address}/builds`, { method: 'GET' })
            .then(res => res.json())
            .then(data => data as Record<string, string>)
            .then(builds =>
                Object.fromEntries(
                    Object.entries(builds).map(([name, data]) => [
                        name,
                        CompressedBuild.deserialize(data)
                    ])
                )
            )
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
            .then(currentTask => {
                const prev = get().currentTask
                if (!prev) {
                    console.log('update')
                    set({ currentTask })
                } else {
                    if (!areTasksEqual(prev, currentTask)) {
                        console.log('update')
                        set({ currentTask })
                    }
                }
            })
    }

    /**
     * set a build in the store
     * @param name name of the build
     * @param build the commpressed build
     */

    const setBuild = (name: string, build: CompressedBuild) => {
        const builds = get().builds
        builds[name] = build
        set({ builds: { ...builds, [name]: build } })
    }

    /**
     * edit a build on the server and in the store (using setBuild internally)
     * @param name name of the build
     * @param build the compressed build
     */
    const updateBuild = (name: string, build: CompressedBuild) => {
        const { address } = useConfig.getState()
        setBuild(name, build)
        fetch(`${address}/builds`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                [name]: build.serialize()
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

export const usePrinters = () => {
    const printers = useData(state => state.printers)
    const fetchPrinters = useData(state => state.fetchPrinters)
    return { printers, fetchPrinters }
}

export const useBuilds = () => {
    const builds = useData(state => state.builds)
    const fetchBuilds = useData(state => state.fetchBuilds)
    const updateBuild = useData(state => state.updateBuild)
    const setBuild = useData(state => state.setBuild)
    return { builds, fetchBuilds, updateBuild, setBuild }
}

export const useCurrentTask = () => {
    const currentTask = useData(state => state.currentTask)
    const fetchCurrentTask = useData(state => state.fetchCurrentTask)
    return { currentTask, fetchCurrentTask }
}

export function areTasksEqual(a?: Task, b?: Task): boolean {
    if (a === b) return true
    if (a !== undefined && b !== undefined) {
        return (
            a.buildName === b.buildName &&
            a.partCount === b.partCount &&
            a.nextPart === b.nextPart &&
            a.startedAt === b.startedAt &&
            a.divisionWidth === b.divisionWidth &&
            a.divisionHeight === b.divisionHeight &&
            a.divisionDepth === b.divisionDepth &&
            areArraysEqual(
                a.currentlyBuildingParts,
                b.currentlyBuildingParts
            ) &&
            areArraysEqual(a.completedParts, b.completedParts) &&
            arePositionsEqual(a.partsPositions, b.partsPositions)
        )
    } else {
        return false
    }
}

function areArraysEqual(a: number[], b: number[]): boolean {
    return a.length === b.length && a.every((v, i) => v === b[i])
}

function arePositionsEqual(
    a: [number, number, number][],
    b: [number, number, number][]
): boolean {
    return (
        a.length === b.length &&
        a.every(
            (v, i) => v[0] === b[i][0] && v[1] === b[i][1] && v[2] === b[i][2]
        )
    )
}
