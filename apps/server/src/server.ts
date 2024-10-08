import express from 'express'
import cors from 'cors'
import http from 'http'
import ws from 'ws'
import fs from 'fs'
import path from 'path'
import { ZodError, z } from 'zod'
import jimp from 'jimp'
import {
    arrayToImage,
    imageToArray,
    trim2Darray,
    array3DToString,
    stringToArray3D,
    count2DArray
} from './utils'
import { voxelize } from './voxelization'
import {
    buildSchema,
    compressedBuildSchema,
    printerConfigSchema
} from 'printer-types'
import type {
    Build,
    CompressedBuild,
    BuildMessage,
    Task,
    PrinterState,
    Printer,
    PrinterConfig
} from 'printer-types'

const WEB_SERVER_PORT = parseInt(process.env.PORT ?? '9513')
const DATA_FOLDER =
    process.env.DATA_FOLDER ??
    (process.env.NODE_ENV === 'production'
        ? '/data'
        : path.join(__dirname, '..', 'data'))
const BUILDS_FOLDER = path.join(DATA_FOLDER, 'builds')
const CONFIG_FILE = path.join(DATA_FOLDER, 'config.json')

const URL = process.env.URL ?? 'http://localhost:' + WEB_SERVER_PORT

console.log('URL:', URL)

if (!fs.existsSync(DATA_FOLDER)) fs.mkdirSync(DATA_FOLDER)
if (!fs.existsSync(BUILDS_FOLDER)) fs.mkdirSync(BUILDS_FOLDER)

const websocketMessageSchema = z.discriminatedUnion('type', [
    z.object({ type: z.literal('log'), message: z.string() }),
    z.object({
        type: z.literal('register'),
        id: z.number(),
        label: z.string()
    }),
    z.object({ type: z.literal('setState'), state: z.string() }),
    z.object({ type: z.literal('setPos'), pos: z.array(z.number()).length(3) }),
    z.object({ type: z.literal('setFuel'), fuel: z.number() }),
    z.object({ type: z.literal('setProgress'), progress: z.number() }),
    z.object({ type: z.literal('nextPart') }),
    z.object({ type: z.literal('currentPart') }),
    z.object({ type: z.literal('config') })
])

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function sendAsync(ws: ws.WebSocket, data: string) {
    return new Promise<void>((resolve, reject) => {
        ws.send(data, err => {
            if (err) reject(err)
            else resolve()
        })
    })
}

let currentTask: undefined | Task
const logs: string[] = []
const defaultPrinterConfig: PrinterConfig = {
    buildBlock: 'minecraft:cobblestone',
    gpsTry: 5,
    minPressure: 4,
    maxBuildBatch: 500,
    refuelPosition: [0, 0, 0],
    restockPosition: [0, 0, 0]
}
let printerConfig: PrinterConfig = defaultPrinterConfig

if (fs.existsSync(CONFIG_FILE)) {
    const fileContent = fs.readFileSync(CONFIG_FILE, 'utf-8')
    try {
        printerConfig = JSON.parse(fileContent)
    } catch {
        console.error('config file is not json')
    }
} else {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(printerConfig, null, 2))
}

;(async () => {
    const expressApp = express()
    expressApp.use(express.json({ limit: '5000mb' }))
    expressApp.use(cors({ origin: '*' }))

    const httpServer = http.createServer(expressApp)
    const wsServer = new ws.Server({ server: httpServer })

    httpServer.listen(WEB_SERVER_PORT, () =>
        console.log(`server started on port ${WEB_SERVER_PORT}`)
    )

    const printers: Printer[] = []

    wsServer.on('connection', ws => {
        ws.on('close', () => {
            const current = printers.find(p => p.ws === ws)
            if (current) {
                current.connected = false
                console.log(
                    `"${
                        current.label
                    }" disconnected, total connected printers: ${
                        printers.filter(p => p.connected).length
                    }`
                )
            }
        })

        ws.on('message', async data => {
            const parseResult = websocketMessageSchema.safeParse(
                JSON.parse(data.toString())
            )
            if (!parseResult.success) return
            const msg = { ...parseResult.data }
            if (msg.type == 'log') {
                const printer = printers.find(p => p.ws === ws)
                if (!printer) return
                const logMsg = `[${getTime()}] (${printer.label}): ${
                    msg.message
                }`
                console.log(logMsg)
                logs.push(logMsg)
                if (logs.length > 400) logs.shift()
            } else if (msg.type === 'register') {
                const printer = printers.find(
                    p => p.id === msg.id && p.label === msg.label
                )
                if (printer) {
                    printer.ws = ws
                    printer.connected = true
                    printer.state = 'idle'
                } else {
                    printers.push({
                        ws,
                        label: msg.label,
                        id: msg.id,
                        state: 'idle',
                        connected: true
                    })
                }
                console.log(
                    `registered "${msg.label}" (${msg.id}) (${
                        printers.filter(p => p.connected).length
                    } printer available)`
                )
                await sendAsync(
                    ws,
                    JSON.stringify({ type: 'config', config: printerConfig })
                )
            } else if (msg.type === 'setState') {
                const printer = printers.find(p => p.ws === ws)
                if (!printer) return
                printer.state = msg.state as PrinterState
            } else if (msg.type === 'setPos') {
                const printer = printers.find(p => p.ws === ws)
                if (!printer) return
                printer.pos = msg.pos as [number, number, number]
            } else if (msg.type === 'setFuel') {
                const printer = printers.find(p => p.ws === ws)
                if (!printer) return
                printer.fuel = msg.fuel
            } else if (msg.type === 'setProgress') {
                const printer = printers.find(p => p.ws === ws)
                if (!printer) return
                printer.progress = msg.progress
            } else if (msg.type === 'nextPart') {
                const printer = printers.find(p => p.ws === ws)
                if (!printer) return
                if (!currentTask) {
                    printer.partIndex = undefined
                    return await sendAsync(
                        printer.ws,
                        JSON.stringify({ type: 'noNextPart' })
                    )
                }

                currentTask.completedParts.push(printer.partIndex!)
                currentTask.currentlyBuildingParts =
                    currentTask.currentlyBuildingParts.filter(
                        e => e !== printer.partIndex
                    )
                if (
                    currentTask.partCount === currentTask.completedParts.length
                ) {
                    currentTask = undefined
                    printer.partIndex = undefined
                    return await sendAsync(
                        printer.ws,
                        JSON.stringify({ type: 'noNextPart' })
                    )
                } else {
                    if (currentTask.nextPart === currentTask.partCount) {
                        printer.partIndex = undefined
                        await sendAsync(
                            printer.ws,
                            JSON.stringify({ type: 'noNextPart' })
                        )
                    } else {
                        const nextPart =
                            currentTask.parts[currentTask.nextPart] ?? undefined
                        if (!nextPart) {
                            currentTask = undefined
                            return
                        }
                        printer.partIndex = currentTask.nextPart++
                        currentTask.currentlyBuildingParts.push(
                            printer.partIndex
                        )
                        await sendPartToPrinter(printer, nextPart)
                    }
                }
            } else if (msg.type === 'currentPart') {
                const printer = printers.find(p => p.ws === ws)
                if (!printer) return console.log('printer not found')
                if (!currentTask) return console.log('no current task')
                if (!printer.partIndex) return console.log('no part index')
                const part = currentTask.parts[printer.partIndex] ?? undefined
                if (!part) return console.log('part not found')
                await sendPartToPrinter(printer, part)
            } else if (msg.type === 'config') {
                await sendAsync(
                    ws,
                    JSON.stringify({ type: 'config', config: printerConfig })
                )
            }
        })
    })

    expressApp.get('/printers', (req, res) => {
        const out: Omit<Printer, 'ws'>[] = []
        for (const printer of printers) {
            const { ws, ...printerWithoutWS } = printer
            out.push(printerWithoutWS)
        }
        res.status(200).json(out)
    })

    expressApp.get('/currentTask', (req, res) => {
        if (!currentTask) return res.sendStatus(204)
        res.status(200).json(omit(currentTask, 'parts'))
    })

    expressApp.get('/builds', (req, res) => {
        const modelsNames = fs.readdirSync(BUILDS_FOLDER)
        const builds: Record<string, CompressedBuild> = {}
        for (const name of modelsNames) {
            const strData = fs.readFileSync(
                path.join(BUILDS_FOLDER, name),
                'utf-8'
            )
            try {
                builds[path.parse(name).name] = JSON.parse(strData)
            } catch {
                return res.status(400).send('file is not json')
            }
        }

        res.status(200).json(builds)
    })

    expressApp.post('/editBuilds', (req, res, next) => {
        const schema = z.record(z.string(), compressedBuildSchema)
        const parseResult = schema.safeParse(req.body)
        if (!parseResult.success) return next(parseResult.error)
        const body = parseResult.data

        for (const [name, build] of Object.entries(body)) {
            fs.writeFileSync(
                path.join(
                    BUILDS_FOLDER,
                    name.endsWith('.json') ? name : name + '.json'
                ),
                JSON.stringify(build)
            )
        }
        res.sendStatus(200)
    })

    expressApp.post('/convertImageToPreview', async (req, res, next) => {
        const schema = z.object({
            image: z.string(),
            threshold: z.number().positive().default(50),
            inverted: z.boolean().default(true),
            scale: z.number().positive().default(1),
            horizontalMirror: z.boolean().default(false),
            verticalMirror: z.boolean().default(false)
        })

        const parseResult = schema.safeParse(req.body)
        if (!parseResult.success) return next(parseResult.error)
        const { image: imageString, ...options } = parseResult.data

        let image
        try {
            image = await jimp.read(Buffer.from(imageString, 'base64'))
        } catch {
            return res.sendStatus(400)
        }
        const imageArray = imageToArray(image, options)
        trim2Darray(imageArray)
        const preview = await arrayToImage(imageArray).getBase64Async(
            jimp.MIME_PNG
        )

        const blockCount = count2DArray(imageArray, 1)

        res.status(200).json({ preview, blockCount })
    })

    expressApp.post('/convertImageToBuild', async (req, res, next) => {
        const schema = z.object({
            image: z.string(),
            name: z.string(),
            threshold: z.number().positive().default(50),
            inverted: z.boolean().default(true),
            scale: z.number().positive().default(1),
            horizontalMirror: z.boolean().default(false),
            verticalMirror: z.boolean().default(false)
        })
        const parseResult = schema.safeParse(req.body)
        if (!parseResult.success) return next(parseResult.error)
        const { image: imageString, ...options } = parseResult.data

        let image
        try {
            image = await jimp.read(Buffer.from(imageString, 'base64'))
        } catch {
            return res.sendStatus(400)
        }
        const imageArray = imageToArray(image, options)
        trim2Darray(imageArray)
        const preview = await arrayToImage(imageArray).getBase64Async(
            jimp.MIME_PNG
        )

        const blockCount = count2DArray(imageArray, 1)

        const compressedShape = array3DToString([imageArray])

        const build: CompressedBuild = {
            type: 'image',
            shape: compressedShape,
            preview: preview,
            blockCount
        }

        const filename = options.name.endsWith('.json')
            ? options.name
            : options.name + '.json'

        fs.writeFileSync(
            path.join(BUILDS_FOLDER, filename),
            JSON.stringify(build)
        )

        res.status(200).json(build)
    })

    expressApp.post('/regeneratePreview', async (req, res, next) => {
        const schema = z.object({
            file: z.string()
        })
        const parseResult = schema.safeParse(req.body)
        if (!parseResult.success) return next(parseResult.error)
        const { file } = parseResult.data
        let filepath = path.join(BUILDS_FOLDER, file)
        if (!filepath.endsWith('.json')) filepath = filepath + '.json'
        if (!fs.existsSync(filepath))
            return res.status(404).send('file not found')
        const strData = fs.readFileSync(filepath, 'utf-8')
        let build: CompressedBuild
        try {
            build = JSON.parse(strData)
        } catch {
            return res.status(400).send('file is not json')
        }
        if (!build.shape)
            return res.status(400).send('file does not contain a "shape" field')
        if (build.type !== 'image')
            return res.status(400).send('file is not an image')

        const imageArray = stringToArray3D(build.shape)
        const image = arrayToImage(imageArray[0])
        build.preview = await image.getBase64Async(jimp.MIME_PNG)
        fs.writeFileSync(filepath, JSON.stringify(build))
        res.sendStatus(200)
    })

    expressApp.post('/voxelize', async (req, res, next) => {
        const schema = z.object({
            file: z.string(),
            name: z.string(),
            scale: z.number().positive().default(1)
        })

        const parseResult = schema.safeParse(req.body)
        if (!parseResult.success) return next(parseResult.error)
        const { file: fileBase64, scale, name } = parseResult.data

        const file = Buffer.from(fileBase64, 'base64').toString('utf-8')
        const output = voxelize(file, scale)
        const compressedShape = array3DToString(output)
        const build: CompressedBuild = {
            type: 'model',
            shape: compressedShape
        }
        const filename = name.endsWith('.json') ? name : name + '.json'
        fs.writeFileSync(
            path.join(BUILDS_FOLDER, filename),
            JSON.stringify(build)
        )
        res.status(200).json(build)
    })

    expressApp.post('/build', async (req, res, next) => {
        const schema = z.object({
            file: z.string(),
            pos: z.array(z.number()).length(3),
            heading: z.number().gte(1).lte(4).default(1)
        })
        const parseResult = schema.safeParse(req.body)
        if (!parseResult.success) return next(parseResult.error)
        const { file, pos, heading } = parseResult.data

        const connectedPrinters = printers.filter(p => p.connected)
        const printerCount = connectedPrinters.length
        if (!file) return res.status(500).send('missing field "file"')
        if (!pos) return res.status(500).send('missing field "pos"')
        if (!Array.isArray(pos))
            return res.status(500).send('field "pos" is not an array')
        if (pos.length !== 3)
            return res.status(500).send('field "pos" is not the right size')
        let filepath = path.join(BUILDS_FOLDER, file)
        if (!filepath.endsWith('.json')) filepath += '.json'
        if (!fs.existsSync(filepath))
            return res.status(404).send('file not found')
        if (printerCount === 0) return res.status(404).send('no printer found')
        let build: CompressedBuild
        try {
            build = JSON.parse(
                fs.readFileSync(filepath, 'utf-8')
            ) as CompressedBuild
        } catch {
            return res.status(400).send('file is not json')
        }
        if (!build.shape)
            return res.status(400).send('file does not contain a "shape" field')
        if (currentTask)
            return res.status(400).send('a build is already running')

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
                if (!part.some(e1 => e1.some(e2 => e2.some(e3 => e3 === 1))))
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

                const msg: BuildMessage = {
                    pos: pos as [number, number, number],
                    heading,
                    data: part,
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

        currentTask = {
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
            const part = queue[currentTask.nextPart] ?? undefined
            if (!part) break
            printer.partIndex = currentTask.nextPart++
            currentTask.currentlyBuildingParts.push(printer.partIndex)
            await sendPartToPrinter(printer, part)
            await wait(200)
        }
    })

    expressApp.post('/remote', async (req, res, next) => {
        const schema = z.object({
            printer: z.number(),
            command: z.enum([
                'forward',
                'backward',
                'turnRight',
                'turnLeft',
                'up',
                'down',
                'goTo',
                'headTo',
                'refuel',
                'emptyInventory',
                'pause'
            ]),
            data: z.number().or(z.string()).array().optional()
        })
        const parseResult = schema.safeParse(req.body)
        if (!parseResult.success) return next(parseResult.error)
        const { printer, command, data } = parseResult.data

        const current = printers.find(p => p.id === printer)
        if (!current) return res.status(404).send('printer not found')
        if (!current.connected)
            return res.status(404).send('printer not connected')

        await sendAsync(
            current.ws,
            JSON.stringify({ type: 'remote', command, data })
        )
        res.sendStatus(200)
    })

    expressApp.get('/logs', (req, res) => {
        res.status(200).json(logs)
    })

    expressApp.get('/config', (req, res) => {
        res.status(200).json(printerConfig)
    })

    expressApp.post('/config', async (req, res, next) => {
        const parseResult = printerConfigSchema.partial().safeParse(req.body)
        if (!parseResult.success) return next(parseResult.error)
        const body = parseResult.data

        printerConfig = { ...printerConfig, ...body }
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(printerConfig, null, 2))

        for (const printer of printers) {
            await sendAsync(
                printer.ws,
                JSON.stringify({ type: 'config', config: printerConfig })
            )
        }

        res.sendStatus(200)
    })

    const CLIENTS_PATH = path.resolve(
        process.env.NODE_ENV === 'production'
            ? './clients/'
            : path.join(__dirname, '..', '..', 'clients/')
    )

    console.log('clients folder :', CLIENTS_PATH)
    expressApp.get('/clients/:file', (req, res) => {
        let file = req.params.file
        if (!file.endsWith('.lua')) file = file + '.lua'
        const filepath = path.join(CLIENTS_PATH, file)
        let fileContent = fs.readFileSync(filepath, 'utf-8')

        fileContent = fileContent.replace('$WEB_URL$', URL)
        fileContent = fileContent.replace(
            '$WS_URL$',
            URL.replace('http', 'ws').replace('https', 'wss')
        )

        res.status(200).send(fileContent)
    })

    const PUBLIC_PATH = path.resolve(
        process.env.NODE_ENV === 'production'
            ? './public/'
            : path.join(__dirname, '..', 'public/')
    )

    if (!fs.existsSync(PUBLIC_PATH)) fs.mkdirSync(PUBLIC_PATH)
    console.log('public folder :', PUBLIC_PATH)
    expressApp.use('/', express.static(PUBLIC_PATH))
    expressApp.get('*', (req: express.Request, res: express.Response) => {
        res.sendFile(path.join(PUBLIC_PATH, 'index.html'))
    })

    expressApp.use(
        (
            err: Error,
            req: express.Request,
            res: express.Response,
            next: express.NextFunction
        ) => {
            if (err instanceof ZodError) {
                res.status(400).json(err.errors)
            } else {
                res.status(500).json(err.stack)
            }
        }
    )
})()

/**
 * divide a 3D array in parts of dimension (xsize,ysize,zsize)
 * @param arr input array
 * @param xsize x size of the divided parts
 * @param ysize z size of the divided parts
 * @param zsize z size of the divided parts
 * @returns a 3D array where each cell is another 3D array
 */
function divide3D(
    arr: number[][][],
    xsize: number,
    ysize: number,
    zsize: number
) {
    const result: number[][][][][][] = []
    for (let i = 0; i < arr.length / zsize; i++) {
        result.push([])
        for (let j = 0; j < arr[0].length / ysize; j++) {
            result[i].push([])
        }
    }

    for (let dz = 0; dz < arr.length; dz += zsize) {
        for (let dy = 0; dy < arr[dz].length; dy += ysize) {
            for (let dx = 0; dx < arr[dz][dy].length; dx += xsize) {
                result[dz / zsize][dy / ysize][dx / xsize] = arr
                    .slice(dz, dz + zsize)
                    .map(e => e.slice(dy, dy + ysize))
                    .map(e1 => e1.map(e2 => e2.slice(dx, dx + xsize)))
            }
        }
    }

    return result
}

/**
 * return the current time as a string
 * @returns the current time
 */
function getTime() {
    const date = new Date()
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    const seconds = date.getSeconds().toString().padStart(2, '0')
    return `${hours}:${minutes}:${seconds}`
}

async function sendPartToPrinter(printer: Printer, part: BuildMessage) {
    /*console.log('sending build to ', printer.label)
    console.log('\t.....')*/

    const strMsg = JSON.stringify(part)
    const msgParts = strMsg.match(/.{1,40000}/g) ?? [strMsg]

    await sendAsync(printer.ws, JSON.stringify({ type: 'sendStart' }))
    await wait(100)
    for (const chunk of msgParts) {
        await sendAsync(
            printer.ws,
            JSON.stringify({ type: 'chunk', chunk: chunk })
        )
        await wait(50)
    }
    await wait(100)

    await sendAsync(printer.ws, JSON.stringify({ type: 'sendEnd' }))
    //console.log('\tpart sent')
}

function omit(obj: any, ...keys: string[]) {
    const newObj: any = {}
    for (const key of Object.keys(obj)) {
        if (!keys.includes(key)) newObj[key] = obj[key]
    }
    return newObj
}

function pick(obj: any, ...keys: string[]) {
    const newObj: any = {}
    for (const key of Object.keys(obj)) {
        if (keys.includes(key)) newObj[key] = obj[key]
    }
    return newObj
}
