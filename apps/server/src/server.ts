import express from 'express'
import cors from 'cors'
import http from 'http'
import fs from 'fs'
import path from 'path'
import { z } from 'zod'
import { BijectiveMap, Instances } from './utils'
import type { PrinterConfig } from 'utils'
import { initApi } from './api'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { initWSAPI } from './ws/wsAPI'

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

const defaultPrinterConfig: PrinterConfig = {
    fuel: 'minecraft:coal',
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

process.on('SIGINT', () => {
    console.log('Shutting down...')
    process.exit(0)
})
;(async () => {
    const sqlite = new Database(':memory:')
    const database = drizzle({ client: sqlite })
    migrate(database, {
        migrationsFolder: path.join(__dirname, '..', 'drizzle')
    })

    const expressApp = express()
    expressApp.use(express.json({ limit: '5000mb' }))
    expressApp.use(cors({ origin: '*' }))

    const instances: Instances = {
        database,
        clientMapping: new BijectiveMap(),
        currentTask: undefined,
        logs: [],
        printerConfig,
        env: {
            WEB_SERVER_PORT,
            DATA_FOLDER,
            BUILDS_FOLDER,
            CONFIG_FILE
        }
    }
    const httpServer = http.createServer(expressApp)

    const wsServer = initWSAPI(httpServer, instances)
    httpServer.listen(WEB_SERVER_PORT, () =>
        console.log(`server started on port ${WEB_SERVER_PORT}`)
    )

    const apiRouter = initApi(instances)
    expressApp.use(apiRouter.getRouter())

    // wsServer.on('connection', ws => {
    //     ws.on('close', () => {
    //         const current = instances.printers.find(p => p.ws === ws)
    //         if (current) {
    //             current.connected = false
    //             console.log(
    //                 `"${
    //                     current.label
    //                 }" disconnected, total connected printers: ${
    //                     instances.printers.filter(p => p.connected).length
    //                 }`
    //             )
    //         }
    //     })

    //     ws.on('message', async data => {
    //         const parseResult = websocketMessageSchema.safeParse(
    //             JSON.parse(data.toString())
    //         )
    //         if (!parseResult.success) return
    //         const msg = { ...parseResult.data }
    //         if (msg.type == 'log') {
    //             const printer = instances.printers.find(p => p.ws === ws)
    //             if (!printer) return
    //             const logMsg = `[${getTime()}] (${printer.label}): ${
    //                 msg.message
    //             }`
    //             console.log(logMsg)
    //             instances.logs.push(logMsg)
    //             if (instances.logs.length > 400) instances.logs.shift()
    //         } else if (msg.type === 'register') {
    //             const printer = instances.printers.find(
    //                 p => p.id === msg.id && p.label === msg.label
    //             )
    //             if (printer) {
    //                 printer.ws = ws
    //                 printer.connected = true
    //                 printer.state = 'idle'
    //             } else {
    //                 instances.printers.push({
    //                     ws,
    //                     label: msg.label,
    //                     id: msg.id,
    //                     state: 'idle',
    //                     connected: true
    //                 })
    //             }
    //             console.log(
    //                 `registered "${msg.label}" (${msg.id}) (${
    //                     instances.printers.filter(p => p.connected).length
    //                 } printer available)`
    //             )
    //             await sendAsync(
    //                 ws,
    //                 JSON.stringify({ type: 'config', config: printerConfig })
    //             )
    //         } else if (msg.type === 'setState') {
    //             const printer = instances.printers.find(p => p.ws === ws)
    //             if (!printer) return
    //             printer.state = msg.state as PrinterState
    //         } else if (msg.type === 'setPos') {
    //             const printer = instances.printers.find(p => p.ws === ws)
    //             if (!printer) return
    //             printer.pos = msg.pos as [number, number, number]
    //         } else if (msg.type === 'setFuel') {
    //             const printer = instances.printers.find(p => p.ws === ws)
    //             if (!printer) return
    //             printer.fuel = msg.fuel
    //         } else if (msg.type === 'setProgress') {
    //             const printer = instances.printers.find(p => p.ws === ws)
    //             if (!printer) return
    //             printer.progress = msg.progress
    //         } else if (msg.type === 'nextPart') {
    //             const printer = instances.printers.find(p => p.ws === ws)
    //             if (!printer) return
    //             if (!instances.currentTask) {
    //                 printer.partIndex = undefined
    //                 return await sendAsync(
    //                     printer.ws,
    //                     JSON.stringify({ type: 'noNextPart' })
    //                 )
    //             }

    //             instances.currentTask.completedParts.push(printer.partIndex!)
    //             instances.currentTask.currentlyBuildingParts =
    //                 instances.currentTask.currentlyBuildingParts.filter(
    //                     e => e !== printer.partIndex
    //                 )
    //             if (
    //                 instances.currentTask.partCount ===
    //                 instances.currentTask.completedParts.length
    //             ) {
    //                 instances.currentTask = undefined
    //                 printer.partIndex = undefined
    //                 return await sendAsync(
    //                     printer.ws,
    //                     JSON.stringify({ type: 'noNextPart' })
    //                 )
    //             } else {
    //                 if (
    //                     instances.currentTask.nextPart ===
    //                     instances.currentTask.partCount
    //                 ) {
    //                     printer.partIndex = undefined
    //                     await sendAsync(
    //                         printer.ws,
    //                         JSON.stringify({ type: 'noNextPart' })
    //                     )
    //                 } else {
    //                     const nextPart =
    //                         instances.currentTask.parts[
    //                             instances.currentTask.nextPart
    //                         ] ?? undefined
    //                     if (!nextPart) {
    //                         instances.currentTask = undefined
    //                         return
    //                     }
    //                     printer.partIndex = instances.currentTask.nextPart++
    //                     instances.currentTask.currentlyBuildingParts.push(
    //                         printer.partIndex
    //                     )
    //                     await sendPartToPrinter(printer, nextPart)
    //                 }
    //             }
    //         } else if (msg.type === 'currentPart') {
    //             const printer = instances.printers.find(p => p.ws === ws)
    //             if (!printer) return console.log('printer not found')
    //             if (!instances.currentTask)
    //                 return console.log('no current task')
    //             if (!printer.partIndex) return console.log('no part index')
    //             const part =
    //                 instances.currentTask.parts[printer.partIndex] ?? undefined
    //             if (!part) return console.log('part not found')
    //             await sendPartToPrinter(printer, part)
    //         } else if (msg.type === 'config') {
    //             await sendAsync(
    //                 ws,
    //                 JSON.stringify({ type: 'config', config: printerConfig })
    //             )
    //         }
    //     })
    // })

    const CLIENTS_PATH = path.dirname(require.resolve('clients'))

    console.log('clients folder :', CLIENTS_PATH)
    expressApp.get('/clients/:file', (req, res) => {
        let file = req.params.file
        if (!file.endsWith('.lua')) file = file + '.lua'
        const filepath = path.join(CLIENTS_PATH, file)
        const fileContent = readClientFile(filepath)

        res.status(200).contentType('lua').send(fileContent)
    })
    expressApp.get('/libs/:file', (req, res) => {
        let file = req.params.file
        if (!file.endsWith('.lua')) file = file + '.lua'
        const filepath = path.join(CLIENTS_PATH, 'libs', file)
        const fileContent = readClientFile(filepath)

        res.status(200).contentType('lua').send(fileContent)
    })
    function readClientFile(filepath: string): string {
        const fileContent = fs.readFileSync(filepath, 'utf-8')
        return fileContent
            .replaceAll('$WEB_URL$', URL)
            .replaceAll(
                '$WS_URL$',
                URL.replaceAll('http', 'ws').replaceAll('https', 'wss')
            )
    }

    const PUBLIC_PATH = path.resolve(__dirname, '..', 'public/')

    if (!fs.existsSync(PUBLIC_PATH)) fs.mkdirSync(PUBLIC_PATH)
    console.log('public folder :', PUBLIC_PATH)
    expressApp.use('/', express.static(PUBLIC_PATH))
    expressApp.use((req: express.Request, res: express.Response) => {
        res.sendFile(path.join(PUBLIC_PATH, 'index.html'))
    })
})()
