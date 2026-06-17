import type { Server as HTTPServer } from 'http'
import ws from 'ws'
import { Instances, releaseLock } from '../utils'
import { logMiddleware, WebsocketServer } from './websocketServer'
import { clientsTable, lockStateTable } from '../db/schema'
import { eq } from 'drizzle-orm'
import { getConfigHandler } from './routes/getConfig'
import { logHandler } from './routes/log'
import { registerHandler } from './routes/register'
import { setPropertyHandler } from './routes/setProperty'
import { getCurrentPartHandler } from './routes/getCurrentPart'
import { getNextPartHandler } from './routes/getNextPart'
import { pingHandler } from './routes/ping'
import { releaseLockHandler } from './routes/releaseLock'
import { acquireLockHandler } from './routes/acquireLock'
import { requestBLocksHandler } from './routes/requestBlocks'

export function initWSAPI(httpServer: HTTPServer, instances: Instances) {
    async function onConnect(ws: ws.WebSocket) {}
    async function onDisconnect(ws: ws.WebSocket) {
        const clientID = instances.clientMapping.get(ws)
        if (clientID) {
            const client = await instances.database
                .update(clientsTable)
                .set({ connected: false })
                .where(eq(clientsTable.id, clientID))
                .returning()

            instances.clientMapping.delete(ws)

            // Check if the client owns a lock, and release it if there is one
            const lockState = await instances.database
                .select()
                .from(lockStateTable)
                .where(eq(lockStateTable.clientID, clientID))
            if (lockState.length > 0) {
                const lock = lockState[0]
                await releaseLock(
                    instances.database,
                    instances.clientMapping,
                    lock.providerID,
                    lock.clientID
                )
            }

            console.log(
                `"${client[0].label}" disconnected, total connected printers: ${
                    instances.clientMapping.size
                }`
            )
        }
    }

    const wsServer = new WebsocketServer(
        httpServer,
        instances,
        onConnect,
        onDisconnect
    )

    wsServer.addRoute('ping', pingHandler)
    wsServer.addRoute('register', logMiddleware, registerHandler)
    wsServer.addRoute('getConfig', logMiddleware, getConfigHandler)
    wsServer.addRoute('log', logHandler)
    wsServer.addRoute('setProperty', setPropertyHandler)
    wsServer.addRoute('getCurrentPart', logMiddleware, getCurrentPartHandler)
    wsServer.addRoute('getNextPart', logMiddleware, getNextPartHandler)

    wsServer.addRoute('acquireLock', logMiddleware, acquireLockHandler)
    wsServer.addRoute('releaseLock', logMiddleware, releaseLockHandler)
    wsServer.addRoute('requestBlocks', logMiddleware, requestBLocksHandler)

    return wsServer
}
