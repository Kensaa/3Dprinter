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
                'reboot',
                'shutdown',
                'setHome',
                'goToHome'
            ]),
            data: z.number().or(z.string()).array().optional()
        }),
        paramsSchema: z.object({}),
        querySchema: z.object({}),
        responseSchema: z.void(),
        handler: async (req, res, instances) => {
            const { printer, command, data } = req.body

            const ws = instances.clientMapping.get(printer)
            if (!ws)
                throw new HTTPError(404, 'printer not found or not connected')
            await sendAsync(
                ws,
                JSON.stringify({ type: 'remote', body: { command, data } })
            )
        }
    })
}
