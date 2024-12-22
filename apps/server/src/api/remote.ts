import { z } from 'zod'
import { APIRouter } from '../api'
import { sendAsync } from '../utils'
import { HTTPError } from 'express-api-router'

export function remoteHandler(router: APIRouter) {
    return router.createRouteHandler({
        authed: false,
        bodySchema: z.object({
            printer: z.number(),
            command: z.enum([
                'forward',
                'backward',
                'turnRight',
                'turnLeft',
                'up',
                'down',
                'goTo',
                'headTo',
                'refuel',
                'emptyInventory',
                'pause',
                'reboot'
            ]),
            data: z.number().or(z.string()).array().optional()
        }),
        paramsSchema: z.object({}),
        querySchema: z.object({}),
        responseSchema: z.void(),
        handler: async (req, res, instances) => {
            const { printer, command, data } = req.body

            const current = instances.printers.find(p => p.id === printer)
            if (!current) throw new HTTPError(404, 'printer not found')
            if (!current.connected)
                throw new HTTPError(404, 'printer not connected')

            await sendAsync(
                current.ws,
                JSON.stringify({ type: 'remote', command, data })
            )
        }
    })
}
