import { z } from 'zod'
import { APIRouter } from '../api'
import { compressedBuildSchema } from 'printer-types'
import fs from 'fs'
import path from 'path'

export function editBuildsHandler(router: APIRouter) {
    return router.createRouteHandler({
        authed: false,
        bodySchema: z.record(z.string(), compressedBuildSchema),
        paramsSchema: z.object({}),
        querySchema: z.object({}),
        responseSchema: z.void(),
        handler: (req, res, instances) => {
            for (const [name, build] of Object.entries(req.body)) {
                fs.writeFileSync(
                    path.join(
                        instances.env.BUILDS_FOLDER,
                        name.endsWith('.json') ? name : name + '.json'
                    ),
                    JSON.stringify(build)
                )
            }
            return
        }
    })
}
