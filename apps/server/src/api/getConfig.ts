import { z } from 'zod'
import { APIRouter } from '../api'
import { printerConfigSchema } from 'utils'

export function getConfigHandler(router: APIRouter) {
    return router.createRouteHandler({
        authed: false,
        bodySchema: z.undefined(),
        paramsSchema: z.object({}),
        querySchema: z.object({}),
        responseSchema: printerConfigSchema,
        handler: (req, res, instances) => {
            return instances.printerConfig
        }
    })
}
