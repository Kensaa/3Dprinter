import * as express from 'express'
import * as cors from 'cors'
import * as http from 'http'
import * as ws from 'ws'
import * as fs from 'fs'
import * as path from 'path'
import { z } from 'zod'
import 'dotenv/config'

const WEB_SERVER_PORT = 9513
const BUILDS_FOLDER =
    process.env.buildsFolder ?? path.join(__dirname, '..', 'builds')
if (!fs.existsSync(BUILDS_FOLDER)) fs.mkdirSync(BUILDS_FOLDER)
;(async () => {
    const expressApp = express()
    expressApp.use(express.json())
    expressApp.use(cors())

    const httpServer = http.createServer(expressApp)
    const wsServer = new ws.Server({ server: httpServer })

    httpServer.listen(WEB_SERVER_PORT, () =>
        console.log(`server started on port ${WEB_SERVER_PORT}`)
    )

    type PrinterState = 'idle' | 'building' | 'moving'
    interface Printer {
        ws: ws.WebSocket
        id: number
        label: string
        state: PrinterState
        connected: boolean
        pos?: [number, number, number]
        progress?: number
    }
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

        ws.on('message', data => {
            const msg = JSON.parse(data.toString())
            if (msg.type == 'log') {
                const printer = printers.find(p => p.ws === ws)
                if (!printer) return
                console.log(`[${getTime()}] (${printer.label}): ${msg.message}`)
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
            } else if (msg.type === 'setState') {
                const printer = printers.find(p => p.ws === ws)
                if (!printer) return
                printer.state = msg.state
            } else if (msg.type === 'setPos') {
                const printer = printers.find(p => p.ws === ws)
                if (!printer) return
                printer.pos = msg.pos
            } else if (msg.type === 'setProgress') {
                const printer = printers.find(p => p.ws === ws)
                if (!printer) return
                printer.progress = msg.progress
            }
        })
    })
    interface Model {
        shape: number[][][]
    }

    expressApp.get('/models', (req, res) => {
        const modelsNames = fs.readdirSync(BUILDS_FOLDER)
        const models: Record<string, Model> = {}
        for (const name of modelsNames) {
            const strData = fs.readFileSync(
                path.join(BUILDS_FOLDER, name),
                'utf-8'
            )
            try {
                models[path.parse(name).name] = JSON.parse(strData)
            } catch {}
        }

        res.status(200).json(models)
    })
    expressApp.post('/model', (req, res) => {
        const schema = z.record(
            z.string(),
            z.object({
                shape: z.number().array().array().array()
            })
        )
        const body = schema.parse(req.body)
        for (const key of Object.keys(body)) {
            const model = body[key]
            fs.writeFileSync(
                path.join(
                    BUILDS_FOLDER,
                    key.endsWith('.json') ? key : key + '.json'
                ),
                JSON.stringify(model, null, 4)
            )
        }

        res.status(200)
    })

    expressApp.get('/printers', (req, res) => {
        const out: Omit<Printer, 'ws'>[] = []
        for (const printer of printers) {
            const { ws, ...printerWithoutWS } = printer
            out.push(printerWithoutWS)
        }
        res.status(200).json(out)
    })

    expressApp.post('/build', (req, res) => {
        interface Params {
            file: string
            pos: [number, number, number]
            heading: number
        }

        const { file, pos, heading } = req.body as Params
        //const printerCount: number = 9
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
        let build
        try {
            build = JSON.parse(fs.readFileSync(filepath, 'utf-8')) as Model
        } catch {
            return res.status(400).send('file is not json')
        }
        if (!build.shape)
            return res.status(400).send('file does not contain a "shape" field')
        // do the things to build
        const { shape } = build
        const height = shape.length // z
        const depth = shape[0].length // y
        const width = shape[0][0].length // x
        console.log('build height : ', height)
        console.log('build depth : ', depth)
        console.log('build width : ', width)
        console.log('available printers', printerCount)
        //each turtle build the entier height of the build
        //divided by 2 in the smallest side
        //divided by printerCount / 2 in the biggest side (/2 because of the previous line)
        let xDivide = 0,
            yDivide = 0
        if (width >= depth) {
            yDivide = printerCount == 1 ? depth : Math.ceil(depth / 2)
            xDivide = Math.ceil(width / Math.ceil(printerCount / 2))
        } else {
            xDivide = printerCount == 1 ? width : Math.ceil(width / 2)
            yDivide = Math.ceil(depth / Math.ceil(printerCount / 2))
        }

        xDivide = Math.max(3, xDivide) // set the minimal divide to 3, to avoid bugs where a turtle places a single block
        yDivide = Math.max(3, yDivide)

        console.log('xDivide', xDivide)
        console.log('yDivide', yDivide)

        const divided = divide3D(shape, xDivide, yDivide, height).flat()
        console.log('parts : ', divided.length * divided[0].length)

        //fs.writeFileSync('output.json', JSON.stringify(divided))

        if (divided.length * divided[0].length > printerCount)
            return res
                .status(500)
                .send(
                    'problem with the division of the build, more part than printer'
                )

        let printerIndex = 0
        for (let partRow = 0; partRow < divided.length; partRow++) {
            for (let partCol = 0; partCol < divided[0].length; partCol++) {
                const part = divided[partRow][partCol]
                const printer = connectedPrinters[printerIndex]

                //TODO: Trim empty layer from the build to optimise build

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

                const msg = {
                    pos,
                    heading,
                    data: part,
                    height: partHeight,
                    depth: partDepth,
                    width: partWidth,

                    heightOffset,
                    depthOffset,
                    widthOffset
                }
                console.log('printer : ', printer.label)
                console.log('\tpart height', partHeight)
                console.log('\tpart depth', partDepth)
                console.log('\tpart width', partWidth)
                console.log('\theight offset', heightOffset)
                console.log('\tdepth offset', depthOffset)
                console.log('\twidth offset', widthOffset)

                printer.ws.send(JSON.stringify(msg))
                printerIndex++
            }
        }

        res.sendStatus(200)
    })

    const PUBLIC_FOLDER = 'public/'
    let publicPath = ''
    if (process.env.NODE_ENV === 'production') {
        publicPath = PUBLIC_FOLDER
    } else {
        publicPath = path.join(__dirname, '..', PUBLIC_FOLDER)
    }
    if (!fs.existsSync(publicPath)) fs.mkdirSync(publicPath)
    console.log('public folder :', publicPath)
    expressApp.use('/', express.static(publicPath))
    expressApp.get('*', (req: express.Request, res: express.Response) => {
        res.sendFile(path.join(publicPath, 'index.html'))
    })
})()

/**
 * divide a 3D array in parts of dimension (xsize,ysize,zsize)
 * @param arr input array
 * @param xsize x size of the divided parts
 * @param ysize z size of the divided parts
 * @param zsize z size of the divided parts
 * @returns a 3D array where each cell is an other 3D array
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
