import { z } from 'zod'
import { APIRouter } from '../api'
import { ApiTask, apiTaskSchema, taskSchema } from 'utils'
import { HTTPError } from 'express-api-router'
import { omit } from '../utils'

export function getCurrentTaskHandler(router: APIRouter) {
    return router.createRouteHandler({
        authed: false,
        bodySchema: z.undefined(),
        paramsSchema: z.object({}),
        querySchema: z.object({}),
        responseSchema: apiTaskSchema,
        handler: (req, res, instances) => {
            if (!instances.currentTask) throw new HTTPError(204, 'no task')
            const currentTask = instances.currentTask
            const omitedTask = omit(
                currentTask,
                'parts',
                'currentlyBuildingParts',
                'completedParts'
            )

            return {
                ...omitedTask,
                currentlyBuildingParts: currentTask.currentlyBuildingParts
                    .values()
                    .toArray(),
                completedParts: currentTask.completedParts.values().toArray()
            }
        }
    })
}
