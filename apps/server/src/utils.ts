import type { WebSocket } from 'ws'
import { RawData } from 'ws'
import { BuildMessage, Printer, PrinterConfig, Task } from 'utils'
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { clientsTable, lockQueueTable, lockStateTable } from './db/schema'
import { and, eq } from 'drizzle-orm'
import { messageSchema } from './ws/websocketServer'

export interface Instances {
    database: Database
    clientMapping: BijectiveMap<WebSocket, number> // Maps a websocket object to the corresponding ID in the database
    currentTask?: Task
    logs: string[]
    printerConfig: PrinterConfig
    env: {
        WEB_SERVER_PORT: number
        DATA_FOLDER: string
        BUILDS_FOLDER: string
        CONFIG_FILE: string
    }
}

export type Database = BetterSQLite3Database<Record<string, never>>
export type DatabaseClient = typeof clientsTable.$inferSelect

export interface ImageToArrayOptions {
    threshold: number
    inverted: boolean
    scale: number
    horizontalMirror: boolean
    verticalMirror: boolean
}

/**
 * divide a 3D array in parts of dimension (xsize,ysize,zsize)
 * @param arr input array
 * @param xsize x size of the divided parts
 * @param ysize z size of the divided parts
 * @param zsize z size of the divided parts
 * @returns a 3D array where each cell is another 3D array
 */
export function divide3D(
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
export function getTime() {
    const date = new Date()
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    const seconds = date.getSeconds().toString().padStart(2, '0')
    return `${hours}:${minutes}:${seconds}`
}

export function omit(obj: any, ...keys: string[]) {
    const newObj: any = {}
    for (const key of Object.keys(obj)) {
        if (!keys.includes(key)) newObj[key] = obj[key]
    }
    return newObj
}

export async function wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

export async function sendAsync(ws: WebSocket, data: string) {
    return new Promise<void>((resolve, reject) => {
        ws.send(data, err => {
            if (err) reject(err)
            else resolve()
        })
    })
}

export async function sendPartToPrinter(ws: WebSocket, part: BuildMessage) {
    const strMsg = JSON.stringify(part)
    const msgParts = strMsg.match(/.{1,40000}/g) ?? [strMsg]

    await sendAsync(
        ws,
        JSON.stringify({
            type: 'buildStart',
            body: { partCount: msgParts.length }
        })
    )
    // await wait(100)
    let i = 0
    for (const chunk of msgParts) {
        await sendAsync(
            ws,
            JSON.stringify({ type: 'buildChunk', body: { chunk, index: i } })
        )
        i++
    }
    // await wait(100)

    await sendAsync(ws, JSON.stringify({ type: 'buildEnd' }))
}

export class BijectiveMap<K, V> {
    private map1: Map<K, V>
    private map2: Map<V, K>

    constructor() {
        this.map1 = new Map()
        this.map2 = new Map()
    }

    has(key: K | V): boolean {
        return this.map1.has(key as K) || this.map2.has(key as V)
    }

    set(a: K, b: V): void {
        this.map1.set(a, b)
        this.map2.set(b, a)
    }

    delete(e: K): void
    delete(e: V): void
    delete(e: K | V): void {
        if (this.map1.has(e as K)) {
            const v = this.map1.get(e as K)!
            this.map1.delete(e as K)
            this.map2.delete(v)
        } else if (this.map2.has(e as V)) {
            const v = this.map2.get(e as V)!
            this.map2.delete(e as V)
            this.map1.delete(v)
        }
    }

    get(key: K): V | undefined
    get(key: V): K | undefined
    get(key: K | V): K | V | undefined {
        if (this.map1.has(key as K)) {
            return this.map1.get(key as K)
        }

        return this.map2.get(key as V)
    }
    get size() {
        return this.map1.size
    }

    keys(): K[] {
        return this.map1.keys().toArray()
    }

    values(): V[] {
        return this.map1.values().toArray()
    }

    entries(): [K, V][] {
        return this.map1.entries().toArray()
    }
}

/**
 * Releases a enderchest lock
 * @param database The database instance
 * @param clientMapping the ClientMapping instance
 * @param providerID the ID of the lock's provider
 * @param clientID the ID of the client currently owning the lock
 */
export async function releaseLock(
    database: Instances['database'],
    clientMapping: Instances['clientMapping'],
    providerID: number,
    clientID: number
) {
    const lockState = await database
        .select()
        .from(lockStateTable)
        .where(eq(lockStateTable.providerID, providerID))

    if (lockState.length === 0) {
        throw 'the current lock is not owned by any printer'
    }
    const lock = lockState[0]
    if (lock.clientID !== clientID) {
        throw 'you do not own the lock'
    }
    await database
        .delete(lockStateTable)
        .where(
            and(
                eq(lockStateTable.clientID, lock.clientID),
                eq(lockStateTable.providerID, lock.providerID)
            )
        )

    const queue = await database
        .select()
        .from(lockQueueTable)
        .where(eq(lockQueueTable.providerID, providerID))
        .orderBy(lockQueueTable.created_at)

    for (const queueMember of queue) {
        await database
            .delete(lockQueueTable)
            .where(
                and(
                    eq(lockQueueTable.clientID, queueMember.clientID),
                    eq(lockQueueTable.providerID, queueMember.providerID)
                )
            )

        const ws = clientMapping.get(queueMember.clientID)
        if (ws) {
            await database.insert(lockStateTable).values({
                clientID: queueMember.clientID,
                providerID: queueMember.providerID
            })
            ws.send(JSON.stringify({ type: 'lockAcquired' }))
            break
        }
    }
}

export async function sendRequestAndWaitForResponse(
    websocket: WebSocket,
    request: string,
    body: unknown
): Promise<unknown> {
    return new Promise((resolve, reject) => {
        const listener = (msg: RawData) => {
            try {
                const message = messageSchema.parse(JSON.parse(msg.toString()))
                if (message.type !== 'response') return
                const response = message.body
                if (response.request !== request) return

                websocket.off('message', listener)

                if (!response.success) {
                    // console.error(`failed to ${request}: `, response.error)
                    reject(response.error)
                    // return sendResponse(responseSchema, { success: false })
                } else {
                    resolve(response.response)
                }
            } catch {
                websocket.off('message', listener)
            }
        }
        websocket.on('message', listener)

        websocket.send(
            JSON.stringify({
                type: 'request',
                body: {
                    request,
                    body: body
                }
            })
        )
    })
}
