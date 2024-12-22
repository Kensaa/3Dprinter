import { z } from 'zod'
import { APIRouter } from '../api'

export function getLogsHandler(router: APIRouter) {
    return router.createRouteHandler({
        authed: false,
        bodySchema: z.object({}),
        paramsSchema: z.object({}),
        querySchema: z.object({}),
        responseSchema: z.string().array(),
        handler: (req, res, instances) => {
            return instances.logs
        }
    })
}
