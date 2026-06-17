import { z } from 'zod'

export const providerModeSchema = z.enum([
    'managed', // uses a provider to put block in the enderchest
    'unmanaged' // block are already in the enderchest at all time (only for grayscale which uses a single block)
])
export type ProviderMode = z.infer<typeof providerModeSchema>

// Type of the message sent from the server to the printer
export const buildMessageSchema = z.object({
    pos: z.tuple([z.number(), z.number(), z.number()]),
    heading: z.number(),
    data: z.number().array().array().array(),
    palette: z.string().array(),
    blockCount: z.number(),
    height: z.number(),
    depth: z.number(),
    width: z.number(),
    heightOffset: z.number(),
    depthOffset: z.number(),
    widthOffset: z.number(),
    providerMode: providerModeSchema
})
export type BuildMessage = z.infer<typeof buildMessageSchema>

// Type of the task stored on the server
export const taskSchema = z.object({
    buildName: z.string(),
    partCount: z.number(),
    parts: buildMessageSchema.array(),
    partsPositions: z.tuple([z.number(), z.number(), z.number()]).array(),
    currentlyBuildingParts: z.set(z.number()),
    completedParts: z.set(z.number()),
    nextPart: z.number(),
    startedAt: z.number(),
    providerMode: providerModeSchema,

    divisionWidth: z.number(),
    divisionHeight: z.number(),
    divisionDepth: z.number()
})
export type Task = z.infer<typeof taskSchema>

// Type of the task returned by the web API
export const apiTaskSchema = z.intersection(
    taskSchema.omit({
        currentlyBuildingParts: true,
        completedParts: true,
        parts: true
    }),
    z.object({
        currentlyBuildingParts: z.number().array(),
        completedParts: z.number().array()
    })
)
export type ApiTask = z.infer<typeof apiTaskSchema>

export const printerStateSchema = z.enum([
    'idle',
    'building',
    'moving',
    'refueling'
])
export type PrinterState = z.infer<typeof printerStateSchema>

// Type of the printer send by the web API
export const printerSchema = z.object({
    id: z.number(),
    label: z.string(),
    state: printerStateSchema,
    connected: z.boolean(),
    position: z.tuple([z.number(), z.number(), z.number()]).nullable(),
    fuel: z.number().nullable(),
    progress: z.number().nullable(),
    partIndex: z.number().nullable()
})
export type Printer = z.infer<typeof printerSchema>

// Type of the config
export const printerConfigSchema = z.object({
    buildBlock: z.string(),
    gpsTry: z.number().positive(),
    minPressure: z.number().positive(),
    maxBuildBatch: z.number().positive(),
    refuelPosition: z.tuple([z.number(), z.number(), z.number()]),
    restockPosition: z.tuple([z.number(), z.number(), z.number()])
})
export type PrinterConfig = z.infer<typeof printerConfigSchema>
