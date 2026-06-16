import z from 'zod'
import type { WsRequest } from '../websocketServer'
import { sendPartToPrinter } from '../../utils'

const responseSchema = z.object({
    hasCurrentPart: z.boolean()
})
export async function getCurrentPartHandler({
    client,
    instances,
    websocket,
    sendResponse
}: WsRequest) {
    if (!client) return
    if (!instances.currentTask) {
        return sendResponse(responseSchema, { hasCurrentPart: false })
    }

    const currentTask = instances.currentTask

    if (!client.partIndex) {
        return sendResponse(responseSchema, { hasCurrentPart: false })
    }

    const part = currentTask.parts[client.partIndex]
    sendResponse(responseSchema, { hasCurrentPart: true })
    await sendPartToPrinter(websocket, part)
}
