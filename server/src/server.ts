import * as express from 'express'
import * as cors from 'cors'
import * as http from 'http'
import * as ws from 'ws'
import * as fs from 'fs'
import * as path from 'path'

const WEB_SERVER_PORT = 4054
const BUILDS_FOLDER = path.join('__dirname', '..', 'builds')
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

    interface Printer {
        ws: ws.WebSocket
        id: number
        label: string
    }
    const printers: Printer[] = []

    wsServer.on('connection', ws => {
        const current = printers.find(p => p.ws === ws)
        if (current) {
            printers.splice(printers.indexOf(current))
        }
    })

    expressApp.get('/', (req, res) => {
        res.sendStatus(200)
    })

    expressApp.post('/build', (req, res) => {
        interface Params {
            file: string
            pos: [number, number, number]
            heading: number
        }
        interface Build {
            shape: number[][][]
        }

        const { file, pos, heading } = req.body as Params
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

        let build
        try {
            build = JSON.parse(fs.readFileSync(filepath, 'utf-8')) as Build
        } catch {
            return res.status(400).send('file is not json')
        }
        if (!build.shape)
            return res.status(400).send('file does not contain a "shape" field')
        // do the things to build
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
