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
    build: Build
    buildName: string
    length: number // total number of parts
    completedParts: number
    queue: BuildMessage[]
    startedAt: number
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
}
