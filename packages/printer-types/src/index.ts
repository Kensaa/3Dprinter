import { z } from 'zod'
import type { WebSocket } from 'ws'

export const buildSchema = z.intersection(
    z.discriminatedUnion('type', [
        z.object({ type: z.literal('model') }),
        z.object({ type: z.literal('image'), preview: z.string() })
    ]),
    z.object({ shape: z.number().array().array().array() })
)
export type Build = z.infer<typeof buildSchema>

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
    completedParts: number
    nextPart: number
    parts: BuildMessage[]
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
