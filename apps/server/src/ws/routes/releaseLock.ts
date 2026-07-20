import type { WsRequest } from '../websocketServer'
import { and, eq } from 'drizzle-orm'
import { clientsTable } from '../../db/schema'
import { releaseLock } from '../../utils'

export async function releaseLockHandler({
    client,
    instances,
    websocket,
    sendResponse
}: WsRequest) {
    if (!client) return
    if (client.type !== 'printer') return

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

    await releaseLock(
        instances.database,
        instances.clientMapping,
        provider.id,
        client.id
    )
}
