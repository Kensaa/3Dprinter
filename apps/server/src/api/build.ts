import { z } from 'zod'
import { APIRouter } from '../api'
import {
    divide3D,
    sendPartToPrinter,
    sendRequestAndWaitForResponse,
    wait
} from '../utils'
import { BuildMessage, providerModeSchema } from 'utils'
import path from 'path'
import fs from 'fs'
import { HTTPError } from 'express-api-router'
import { ColorImageMetadata, CompressedBuild } from 'build-bindings'
import { clientsTable } from '../db/schema'
import { and, eq } from 'drizzle-orm'

export function buildHandler(router: APIRouter) {
    return router.createRouteHandler({
        authed: false,
        bodySchema: z.object({
            file: z.string(),
            pos: z.tuple([z.number(), z.number(), z.number()]),
            heading: z.number().gte(1).lte(4).default(1),
            providerMode: providerModeSchema,
            block: z.string().optional()
        }),
        paramsSchema: z.object({}),
        querySchema: z.object({}),
        responseSchema: z.void(),
        handler: async (req, res, instances) => {
            const { file, pos, heading, providerMode, block } = req.body
            const connectedPrinters = await instances.database
                .select()
                .from(clientsTable)
                .where(
                    and(
                        eq(clientsTable.connected, true),
                        eq(clientsTable.type, 'printer')
                    )
                )

            const printerCount = connectedPrinters.length
            let filepath = path.join(instances.env.BUILDS_FOLDER, file)
            if (!filepath.endsWith('.json')) filepath += '.json'
            if (!fs.existsSync(filepath))
                throw new HTTPError(404, 'file not found')
            if (printerCount === 0) throw new HTTPError(404, 'no printer found')
            const compressedBuild = CompressedBuild.deserialize(
                fs.readFileSync(filepath, 'utf-8')
            )
            if (instances.currentTask)
                throw new HTTPError(400, 'a build is already running')

            const build = compressedBuild.uncompress()

            const palette = build.palette
            if (!(build.metadata.type instanceof ColorImageMetadata)) {
                // build is grayscale or model -> the palette is empty -> need to fill it for the requests to work
                if (block === undefined)
                    throw new HTTPError(
                        400,
                        'A grayscale image or model needs to have a block specified to be printed'
                    )
                palette.push(block)
            }
            // Managed mode (uses providers to get blocks in the enderchest)
            // Unmanaged mode (blocks are already in the enderchest)
            if (providerMode === 'unmanaged') {
                if (build.metadata.type instanceof ColorImageMetadata) {
                    throw new HTTPError(
                        500,
                        'A color image cannot be printed in unmanaged mode'
                    )
                }
            }

            if (build.metadata.type instanceof ColorImageMetadata) {
                // Build is a color image, check if all the blocks are available
                const neededBlocks = Object.fromEntries(
                    build.metadata.type.individual_block_count.entries()
                )
                const providers = await instances.database
                    .select()
                    .from(clientsTable)
                    .where(
                        and(
                            eq(clientsTable.connected, true),
                            eq(clientsTable.type, 'provider')
                        )
                    )
                if (providers.length === 0)
                    throw new HTTPError(404, 'No provider found')
                const provider = providers[0]
                const providerSocket = instances.clientMapping.get(provider.id)
                if (!providerSocket) {
                    throw new HTTPError(
                        500,
                        'Provider was marked as connected, but no socket can be found'
                    )
                }
                const missing = (await sendRequestAndWaitForResponse(
                    providerSocket,
                    'checkStorage',
                    neededBlocks
                )) as Record<string, number>

                if (Object.keys(missing).length > 0) {
                    const msg = Object.entries(missing)
                        .map(([block, count]) => `${block}: ${count}`)
                        .join(', ')
                    throw new HTTPError(400, 'missing: ' + msg)
                }
            }

            const shape = build.get_shape()
            const height = shape.length // z
            const depth = shape[0].length // y
            const width = shape[0][0].length // x
            console.log('build height : ', height)
            console.log('build depth : ', depth)
            console.log('build width : ', width)
            console.log('available printers', printerCount)
            //each turtle build the entire height of the build
            // make 4 times more parts than printers (see excalidraw)
            const sqrtCount = Math.floor(Math.sqrt(printerCount)) * 2
            const xDivide = Math.max(Math.ceil(width / sqrtCount), 3)
            const yDivide = Math.max(Math.ceil(depth / sqrtCount), 3)
            console.log('xDivide', xDivide)
            console.log('yDivide', yDivide)
            const divided = divide3D(shape, xDivide, yDivide, height).flat() //flattened because the turtle will build the height of the build
            console.log('parts : ', divided.length * divided[0].length)

            const queue: BuildMessage[] = []
            const partsPositions: [number, number, number][] = []
            for (let partRow = 0; partRow < divided.length; partRow++) {
                for (let partCol = 0; partCol < divided[0].length; partCol++) {
                    const part = divided[partRow][partCol]
                    const blockCount = countDiff3DArray(part, 0)
                    //remove empty parts
                    if (blockCount === 0) continue
                    const partHeight = part.length
                    const partDepth = part[0].length
                    const partWidth = part[0][0].length
                    function calcDepthOffset(
                        arr: number[][][][][],
                        index: number
                    ): number {
                        if (index === 0) return 0
                        return (
                            arr[index - 1][0][0].length +
                            calcDepthOffset(arr, index - 1)
                        )
                    }
                    function calcWidthOffset(
                        arr: number[][][][][],
                        index: number
                    ): number {
                        if (index === 0) return 0
                        return (
                            arr[0][index - 1][0][0].length +
                            calcWidthOffset(arr, index - 1)
                        )
                    }
                    const heightOffset = 0 // always 0 because there is no division verically (one printer does the all height of the build)
                    const depthOffset = calcDepthOffset(divided, partRow)
                    const widthOffset = calcWidthOffset(divided, partCol)
                    // count the number of blocks in the part
                    const msg: BuildMessage = {
                        pos: pos,
                        providerMode,
                        palette,
                        heading,
                        data: part,
                        blockCount,
                        height: partHeight,
                        depth: partDepth,
                        width: partWidth,
                        heightOffset,
                        depthOffset,
                        widthOffset
                    }
                    queue.push(msg)
                    partsPositions.push([partRow, 0, partCol])
                }
            }
            instances.currentTask = {
                buildName: file,
                providerMode,
                parts: queue,
                partsPositions,
                partCount: queue.length,
                currentlyBuildingParts: new Set(),
                completedParts: new Set(),
                nextPart: 0,
                startedAt: Date.now(),
                divisionWidth: divided[0].length,
                divisionHeight: 1,
                divisionDepth: divided.length
            }
            res.sendStatus(200)
            for (const printer of connectedPrinters) {
                if (printer.state !== 'idle') continue
                const part = queue[instances.currentTask.nextPart] ?? undefined
                if (!part) break
                // printer.partIndex = instances.currentTask.nextPart++
                const partIndex = instances.currentTask.nextPart++
                await instances.database
                    .update(clientsTable)
                    .set({ partIndex: partIndex })
                    .where(eq(clientsTable.id, printer.id))
                instances.currentTask.currentlyBuildingParts.add(partIndex)
                const ws = instances.clientMapping.get(printer.id)!
                await sendPartToPrinter(ws, part)
                await wait(200)
            }
        }
    })
}

/**
 * Count the number of element in the 3D array `arr` that are different from `element`
 * @param arr the 3D array
 * @param element the element
 * @returns the count
 */
function countDiff3DArray<T>(arr: T[][][], element: T) {
    let count = 0
    for (let y = 0; y < arr.length; y++) {
        for (let z = 0; z < arr[y].length; z++) {
            for (let x = 0; x < arr[y][z].length; x++) {
                if (arr[y][z][x] !== element) count++
            }
        }
    }
    return count
}
