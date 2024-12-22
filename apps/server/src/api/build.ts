import { z } from 'zod'
import { APIRouter } from '../api'
import {
    count3DArray,
    divide3D,
    sendPartToPrinter,
    stringToArray3D,
    wait
} from '../utils'
import { BuildMessage, CompressedBuild } from 'printer-types'
import path from 'path'
import fs from 'fs'
import { HTTPError } from 'express-api-router'

export function buildHandler(router: APIRouter) {
    return router.createRouteHandler({
        authed: false,
        bodySchema: z.object({
            file: z.string(),
            pos: z.array(z.number()).length(3),
            heading: z.number().gte(1).lte(4).default(1)
        }),
        paramsSchema: z.object({}),
        querySchema: z.object({}),
        responseSchema: z.void(),
        handler: async (req, res, instances) => {
            const { file, pos, heading } = req.body

            const connectedPrinters = instances.printers.filter(
                p => p.connected
            )
            const printerCount = connectedPrinters.length

            if (!file) throw new HTTPError(500, 'missing field "file"')
            if (!pos) throw new HTTPError(500, 'missing field "pos"')
            if (!Array.isArray(pos))
                throw new HTTPError(500, 'field "pos" is not an array')
            if (pos.length !== 3)
                throw new HTTPError(500, 'field "pos" is not the right size')

            let filepath = path.join(instances.env.BUILDS_FOLDER, file)
            if (!filepath.endsWith('.json')) filepath += '.json'
            if (!fs.existsSync(filepath))
                throw new HTTPError(404, 'file not found')
            if (printerCount === 0) throw new HTTPError(404, 'no printer found')

            let build: CompressedBuild
            try {
                build = JSON.parse(fs.readFileSync(filepath, 'utf-8'))
            } catch {
                throw new HTTPError(400, 'file is not json')
            }
            if (!build.shape)
                throw new HTTPError(
                    400,
                    'file does not contain a "shape" field'
                )
            if (instances.currentTask)
                throw new HTTPError(400, 'a build is already running')

            const shape = stringToArray3D(build.shape)
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

                    //remove empty parts
                    if (
                        !part.some(e1 => e1.some(e2 => e2.some(e3 => e3 === 1)))
                    )
                        continue

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
                    const blockCount = count3DArray(part, 1)

                    const msg: BuildMessage = {
                        pos: pos as [number, number, number],
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
                parts: queue,
                partsPositions,
                partCount: queue.length,
                currentlyBuildingParts: [],
                completedParts: [],
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
                printer.partIndex = instances.currentTask.nextPart++
                instances.currentTask.currentlyBuildingParts.push(
                    printer.partIndex
                )
                await sendPartToPrinter(printer, part)
                await wait(200)
            }
        }
    })
}
