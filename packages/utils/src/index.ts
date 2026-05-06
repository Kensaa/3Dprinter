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

export const buildMessageSchema = z.object({
    pos: z.tuple([z.number(), z.number(), z.number()]),
    heading: z.number(),
    data: z.number().array().array().array(),
    blockCount: z.number(),
    height: z.number(),
    depth: z.number(),
    width: z.number(),
    heightOffset: z.number(),
    depthOffset: z.number(),
    widthOffset: z.number()
})

export type BuildMessage = z.infer<typeof buildMessageSchema>

export const taskSchema = z.object({
    buildName: z.string(),
    partCount: z.number(),
    parts: buildMessageSchema.array(),
    partsPositions: z.tuple([z.number(), z.number(), z.number()]).array(),
    currentlyBuildingParts: z.number().array(),
    completedParts: z.number().array(),
    nextPart: z.number(),
    startedAt: z.number(),

    divisionWidth: z.number(),
    divisionHeight: z.number(),
    divisionDepth: z.number()
})

export type Task = z.infer<typeof taskSchema>

export const printerStateSchema = z.enum([
    'idle',
    'building',
    'moving',
    'refueling'
])
export type PrinterState = z.infer<typeof printerStateSchema>

// Schema for the printer info sent by api
export const printerSchema = z.object({
    id: z.number(),
    label: z.string(),
    state: printerStateSchema,
    connected: z.boolean(),
    pos: z.tuple([z.number(), z.number(), z.number()]).optional(),
    fuel: z.number().optional(),
    progress: z.number().optional(),
    partIndex: z.number().optional()
})

// Type of the printer stored on the server
export type Printer = z.infer<typeof printerSchema> & {
    // printer also stores a instance of a websocket
    ws: WebSocket
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
