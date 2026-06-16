import type { WsRequest } from '../websocketServer'
import { and, eq } from 'drizzle-orm'
import { clientsTable, lockQueueTable, lockStateTable } from '../../db/schema'

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

    const lockState = await instances.database
        .select()
        .from(lockStateTable)
        .where(eq(lockStateTable.providerID, provider.id))

    if (lockState.length === 0) {
        throw 'the current lock is not owned by any printer'
    }
    const lock = lockState[0]
    if (lock.clientID !== client.id) {
        throw 'you do not own the lock'
    }

    await instances.database
        .delete(lockStateTable)
        .where(
            and(
                eq(lockStateTable.clientID, lock.clientID),
                eq(lockStateTable.providerID, lock.providerID)
            )
        )

    const queue = await instances.database
        .select()
        .from(lockQueueTable)
        .where(eq(lockQueueTable.providerID, provider.id))
        .orderBy(lockQueueTable.created_at)

    for (const queueMember of queue) {
        await instances.database
            .delete(lockQueueTable)
            .where(
                and(
                    eq(lockQueueTable.clientID, queueMember.clientID),
                    eq(lockQueueTable.providerID, queueMember.providerID)
                )
            )

        const ws = instances.clientMapping.get(queueMember.clientID)
        if (ws) {
            await instances.database.insert(lockStateTable).values({
                clientID: queueMember.clientID,
                providerID: queueMember.providerID
            })
            ws.send(JSON.stringify({ type: 'lockAcquired' }))
            break
        }
    }
}
