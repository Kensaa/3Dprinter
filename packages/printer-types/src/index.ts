import { z } from 'zod'
import type { WebSocket } from 'ws'

export const buildMetadataSchema = z.discriminatedUnion('type', [
    z.object({ type: z.literal('model') }),
    z.object({
        type: z.literal('image'),
        preview: z.string(),
        blockCount: z.number()
    })
])

export const buildSchema = z.intersection(
    buildMetadataSchema,
    z.object({ shape: z.number().array().array().array() })
)

export const compressedBuildSchema = z.intersection(
    buildMetadataSchema,
    z.object({ shape: z.string() })
)

export type Build = z.infer<typeof buildSchema>
export type CompressedBuild = z.infer<typeof compressedBuildSchema>

export interface BuildMessage {
    pos: [number, number, number]
    heading: number
    data: number[][][]
    height: number
    depth: number
    width: number
    heightOffset: number
    depthOffset: number
    widthOffset: number
}

export interface Task {
    buildName: string
    partCount: number
    parts: BuildMessage[]
    partsPositions: [number, number, number][]
    currentlyBuildingParts: number[]
    completedParts: number[]
    nextPart: number
    startedAt: number

    divisionWidth: number
    divisionHeight: number
    divisionDepth: number
}

export type PrinterState = 'idle' | 'building' | 'moving' | 'refueling'
export interface Printer {
    ws: WebSocket
    id: number
    label: string
    state: PrinterState
    connected: boolean
    pos?: [number, number, number]
    progress?: number
    partIndex?: number
}

export const printerConfigSchema = z.object({
    buildBlock: z.string(),
    gpsTry: z.number().positive(),
    minPressure: z.number().positive(),
    maxBuildBatch: z.number().positive(),
    refuelPosition: z.tuple([z.number(), z.number(), z.number()]),
    restockPosition: z.tuple([z.number(), z.number(), z.number()])
})

export type PrinterConfig = z.infer<typeof printerConfigSchema>
