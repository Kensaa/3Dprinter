import z from 'zod'
import type { WsRequest } from '../websocketServer'
import { printerStateSchema } from 'utils'
import { clientsTable } from '../../db/schema'
import { eq } from 'drizzle-orm'

const bodySchema = z.union([
    z.object({
        property: z.enum(['fuel', 'progress']),
        value: z.number()
    }),
    z.object({
        property: z.literal('state'),
        value: printerStateSchema
    }),
    z.object({
        property: z.literal('position'),
        value: z.tuple([z.number(), z.number(), z.number()])
    })
])
export async function setPropertyHandler(request: WsRequest) {
    if (!request.client) return
    const body = bodySchema.parse(request.body)

    await request.instances.database
        .update(clientsTable)
        .set({ [body.property]: body.value })
        .where(eq(clientsTable.id, request.client.id))
}
