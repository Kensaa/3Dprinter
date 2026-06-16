import z from 'zod'
import type { WsRequest } from '../websocketServer'
import { clientsTable } from '../../db/schema'
import { eq } from 'drizzle-orm'

const bodySchema = z.object({
    id: z.number(),
    label: z.string()
})
export async function registerHandler(request: WsRequest) {
    const body = bodySchema.parse(request.body)
    const instances = request.instances

    const clients = await instances.database
        .select()
        .from(clientsTable)
        .where(eq(clientsTable.id, body.id))
    if (clients.length > 0) {
        const client = clients[0]

        const existingWs = instances.clientMapping.get(body.id)
        if (existingWs) {
            // There is already a websocket registered as this client, disconnect it
            existingWs.close()
            instances.clientMapping.delete(existingWs)
        }

        // Set the client to connected in the database
        await instances.database
            .update(clientsTable)
            .set({ connected: true, state: 'idle' })
            .where(eq(clientsTable.id, client.id))
    } else {
        // New client, create the database entry
        await instances.database.insert(clientsTable).values({
            id: body.id,
            label: body.label,
            state: 'idle',
            connected: true
        })
    }
    // Set the current ws as the ws of the client
    instances.clientMapping.set(request.websocket, body.id)

    console.log(
        `registered "${body.label}" (${body.id}) (${
            instances.clientMapping.size
        } client connected)`
    )

    request.sendResponse(z.object(), {})
}
