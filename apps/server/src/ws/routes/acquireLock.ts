import type { WsRequest } from '../websocketServer'
import { and, eq } from 'drizzle-orm'
import { clientsTable, lockQueueTable, lockStateTable } from '../../db/schema'

export async function acquireLockHandler({
    client,
    instances,
    websocket
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

    const lockState = await instances.database
        .select()
        .from(lockStateTable)
        .where(eq(lockStateTable.providerID, provider.id))

    if (lockState.length > 0) {
        // the current lock is already owned by another client, push the current one to the queue
        await instances.database.insert(lockQueueTable).values({
            clientID: client.id,
            providerID: provider.id,
            created_at: new Date()
        })
    } else {
        // the current lock is free
        await instances.database.insert(lockStateTable).values({
            clientID: client.id,
            providerID: provider.id
        })
        websocket.send(JSON.stringify({ type: 'lockAcquired' }))
    }
}
