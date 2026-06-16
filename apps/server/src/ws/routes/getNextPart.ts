import z from 'zod'
import type { WsRequest } from '../websocketServer'
import { clientsTable } from '../../db/schema'
import { eq } from 'drizzle-orm'
import { Instances, sendPartToPrinter } from '../../utils'

const responseSchema = z.object({
    newPart: z.boolean()
})
export async function getNextPartHandler({
    client,
    instances,
    sendResponse,
    websocket
}: WsRequest) {
    if (!client) return
    if (!instances.currentTask) {
        // No current task, clear any work assigned to client
        await setClientPart(instances.database, client.id, null)
        return sendResponse(responseSchema, { newPart: false })
    }

    const currentTask = instances.currentTask

    if (client.partIndex !== null) {
        // If the current printer has a task assigned, it means that it just fininshed that task, mark it as fininshed
        currentTask.completedParts.add(client.partIndex)
        currentTask.currentlyBuildingParts.delete(client.partIndex)
    }

    // Check if the task is finished
    if (currentTask.partCount === currentTask.completedParts.size) {
        // Task is fininshed
        instances.currentTask = undefined
        await setClientPart(instances.database, client.id, null)
        return sendResponse(responseSchema, { newPart: false })
    }

    // Check if there is more parts
    if (currentTask.nextPart === currentTask.partCount) {
        // No more parts
        await setClientPart(instances.database, client.id, null)
        return sendResponse(responseSchema, { newPart: false })
    }

    // There is more parts
    const nextPartIndex = currentTask.nextPart++
    const nextPart = currentTask.parts[nextPartIndex]
    await setClientPart(instances.database, client.id, nextPartIndex)
    currentTask.currentlyBuildingParts.add(nextPartIndex)

    sendResponse(responseSchema, { newPart: true })
    await sendPartToPrinter(websocket, nextPart)
}

async function setClientPart(
    database: Instances['database'],
    clientID: number,
    partIndex: number | null
) {
    await database
        .update(clientsTable)
        .set({ partIndex })
        .where(eq(clientsTable.id, clientID))
}
