import ws from 'ws'
import type { Server as HTTPServer } from 'http'
import { z } from 'zod'
import { getTime, type DatabaseClient, type Instances } from '../utils'
import { clientsTable } from '../db/schema'
import { eq } from 'drizzle-orm'

export type WsRequest = {
    websocket: ws.WebSocket
    request: string
    body: unknown
    instances: Instances
    sendResponse: <R>(schema: z.ZodType<R>, response: R) => Promise<void>
    client?: DatabaseClient
}

type RouteHandler = (request: WsRequest, next: () => void) => Promise<void>

const requestSchema = z.object({
    request: z.string(),
    body: z.unknown()
})

/*
LUA sends message (request) of the form
{
    request:"[action]",
    body: {} (additional data)
}

Server sends back
{
    type:"response" 
    body: {
        request:"[action]"
        success: boolean
        response: {} (response data) (if success == true)
        error:string (if success == false)
    } 
}
*/

export class WebsocketServer {
    private wss: ws.Server
    private routes: Map<string, RouteHandler[]> = new Map()

    constructor(
        server: HTTPServer,
        instances: Instances,
        onConnect?: (ws: ws.WebSocket) => Promise<void>,
        onDisconnect?: (ws: ws.WebSocket) => Promise<void>
    ) {
        this.wss = new ws.Server({ server })

        this.wss.on('connection', async ws => {
            const sendRequestResponse = async (response: unknown) => {
                await new Promise(resolve => setTimeout(resolve, 100))
                ws.send(JSON.stringify({ type: 'response', body: response }))
            }

            if (onConnect) {
                await onConnect(ws)
            }

            ws.on('close', () => {
                if (onDisconnect) {
                    onDisconnect(ws)
                }
            })

            ws.on('message', async message => {
                try {
                    const { request, body } = requestSchema.parse(
                        JSON.parse(message.toString())
                    )
                    if (!this.routes.has(request)) {
                        // No route found
                        await sendRequestResponse({
                            request,
                            response: {
                                type: 'error',
                                success: false,
                                error: 'Invalid request (no route found)'
                            }
                        })
                        return
                    }

                    const requestObject: WsRequest = {
                        websocket: ws,
                        request,
                        body: body,
                        instances,
                        sendResponse: async function <R>(
                            schema: z.ZodType<R>,
                            response: R
                        ) {
                            const parseResult = schema.safeParse(response)
                            if (parseResult.success) {
                                return sendRequestResponse({
                                    request,
                                    success: true,
                                    response: parseResult.data
                                })
                            } else {
                                console.log(
                                    'Invalid response',
                                    parseResult.error
                                )
                                return sendRequestResponse({
                                    request,
                                    response: {
                                        type: 'error',
                                        success: false,
                                        error: 'Invalid response (internal server error)'
                                    }
                                })
                            }
                        }
                    }

                    const handlers = this.routes.get(request)!
                    for (const handler of handlers) {
                        let goNext = false
                        const nextFn = () => (goNext = true)
                        try {
                            await handler(requestObject, nextFn)
                        } catch (error) {
                            if (error instanceof Error) {
                                console.error('Error in handler', error)
                                sendRequestResponse({
                                    request,
                                    response: {
                                        type: 'error',
                                        success: false,
                                        message: error.message
                                    }
                                })
                            }
                        }
                        if (!goNext) {
                            break
                        }
                    }
                } catch (error) {
                    // TODO: better error handling
                    console.error(error)
                }
            })
        })
    }

    addRoute(request: string, ...handlers: RouteHandler[]) {
        this.routes.set(request, [getClientMiddleware, ...handlers])
    }
}

async function getClientMiddleware(request: WsRequest, next: () => void) {
    const clientID = request.instances.clientMapping.get(request.websocket)

    if (clientID) {
        const client = await request.instances.database
            .select()
            .from(clientsTable)
            .where(eq(clientsTable.id, clientID))

        if (client.length > 0) {
            request.client = client[0]
        }
    }
    next()
}

export async function logMiddleware(request: WsRequest, next: () => void) {
    const label = request.client ? request.client.label : 'Unregistered'
    const logMsg = `[${getTime()}] ${label} called ${request.request} with body ${JSON.stringify(request.body)}`

    console.log(logMsg)
    request.instances.logs.push(logMsg)
    if (request.instances.logs.length > 400) request.instances.logs.shift()
    next()
}
