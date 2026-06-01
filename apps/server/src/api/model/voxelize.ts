import { z } from 'zod'
import { APIRouter } from '../../api'
import path from 'path'
import fs from 'fs'
import { Build } from 'build-bindings'

export function voxelizeHandler(router: APIRouter) {
    return router.createRouteHandler({
        authed: false,
        bodySchema: z.object({
            file: z.string(),
            name: z.string(),
            scale: z.number().positive().default(1)
        }),
        paramsSchema: z.object({}),
        querySchema: z.object({}),
        responseSchema: z.string(),
        handler: async (req, res, instances) => {
            const { file: fileBase64, scale, name } = req.body

            const model = Buffer.from(fileBase64, 'base64')
            const build = Build.from_model(model, scale)
            const compressed = build.compress()

            const filename = name.endsWith('.json') ? name : name + '.json'
            const buildString = compressed.serialize()
            fs.writeFileSync(
                path.join(instances.env.BUILDS_FOLDER, filename),
                buildString
            )
            return buildString
        }
    })
}
