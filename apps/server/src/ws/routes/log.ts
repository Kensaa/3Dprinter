import z from 'zod'
import { getTime } from '../../utils'
import type { WsRequest } from '../websocketServer'

const bodySchema = z.object({
    message: z.string()
})
export async function logHandler(request: WsRequest) {
    if (!request.client) return
    const body = bodySchema.parse(request.body)

    const logMsg = `[${getTime()}] (${request.client.label}): ${body.message}`
    console.log(logMsg)
    request.instances.logs.push(logMsg)
    if (request.instances.logs.length > 400) request.instances.logs.shift()
}
