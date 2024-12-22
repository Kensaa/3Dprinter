import { z } from 'zod'
import { APIRouter } from '../api'
import { taskSchema } from 'printer-types'
import { HTTPError } from 'express-api-router'
import { omit } from '../utils'

export function getCurrentTaskHandler(router: APIRouter) {
    return router.createRouteHandler({
        authed: false,
        bodySchema: z.object({}),
        paramsSchema: z.object({}),
        querySchema: z.object({}),
        responseSchema: taskSchema.omit({
            // dont send the parts
            parts: true
        }),
        handler: (req, res, instances) => {
            if (!instances.currentTask) throw new HTTPError(204, 'no task')
            return omit(instances.currentTask, 'parts')
        }
    })
}
