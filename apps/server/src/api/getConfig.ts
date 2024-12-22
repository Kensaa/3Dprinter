import { z } from 'zod'
import { APIRouter } from '../api'
import { printerConfigSchema } from 'printer-types'

export function getConfigHandler(router: APIRouter) {
    return router.createRouteHandler({
        authed: false,
        bodySchema: z.object({}),
        paramsSchema: z.object({}),
        querySchema: z.object({}),
        responseSchema: printerConfigSchema,
        handler: (req, res, instances) => {
            return instances.printerConfig
        }
    })
}
