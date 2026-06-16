import { z } from 'zod'
import type { WsRequest } from '../websocketServer'

const responseSchema = z.object({ type: z.literal('pong') })

export async function pingHandler(request: WsRequest) {
    await request.sendResponse(responseSchema, { type: 'pong' })
}
