import {
    messageSchema,
    responseSchema as wsResponseSchema,
    type WsRequest
} from '../websocketServer'
import { and, eq } from 'drizzle-orm'
import { clientsTable, lockStateTable } from '../../db/schema'
import z from 'zod'
import type { RawData } from 'ws'

const bodySchema = z.record(z.string(), z.number())
const responseSchema = z.object({
    success: z.boolean()
})
export async function requestBLocksHandler({
    client,
    instances,
    body,
    sendResponse
}: WsRequest) {
    if (!client) return
    if (client.type !== 'printer') return
    const blocks = bodySchema.parse(body)

    const matchingProviders = await instances.database
        .select()
        .from(clientsTable)
        .where(
            and(
                eq(clientsTable.type, 'provider'),
                eq(clientsTable.chest_nbt, client.chest_nbt)
            )
        )

    if (matchingProviders.length === 0) {
        throw "No provider matching the client's nbt"
    }

    const provider = matchingProviders[0]

    const lockState = await instances.database
        .select()
        .from(lockStateTable)
        .where(eq(lockStateTable.providerID, provider.id))

    if (lockState.length === 0 || lockState[0].clientID !== client.id) {
        throw 'you do not own the lock'
    }

    const providerSocket = instances.clientMapping.get(provider.id)
    if (!providerSocket) {
        throw 'cannot find the provider in the list of connected clients'
    }

    const listener = (msg: RawData) => {
        try {
            const message = messageSchema.parse(JSON.parse(msg.toString()))
            if (message.type !== 'response') return
            const response = message.body
            if (response.request !== 'putBlocks') return

            providerSocket.off('message', listener)

            if (!response.success) {
                console.error('failed to put blocks : ', response.error)
                return sendResponse(responseSchema, { success: false })
            }
            sendResponse(responseSchema, { success: true })
        } catch {
            providerSocket.off('message', listener)
        }
    }
    providerSocket.on('message', listener)

    providerSocket.send(
        JSON.stringify({
            type: 'request',
            body: {
                request: 'putBlocks',
                body: blocks
            }
        })
    )
}
