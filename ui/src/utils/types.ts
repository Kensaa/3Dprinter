import { z } from 'zod'

export const buildSchema = z.intersection(
    z.discriminatedUnion('type', [
        z.object({ type: z.literal('model') }),
        z.object({ type: z.literal('image'), preview: z.string() })
    ]),
    z.object({ shape: z.number().array().array().array() })
)

export type Build = z.infer<typeof buildSchema>

export type PrinterState = 'idle' | 'building' | 'moving'
export interface Printer {
    id: number
    label: string
    state: PrinterState
    connected: boolean
    pos?: [number, number, number]
    progress?: number
}
