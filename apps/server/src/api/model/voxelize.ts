import { z } from 'zod'
import { APIRouter } from '../../api'
import { array3DToString } from '../../utils'
import { CompressedBuild, compressedBuildSchema } from 'printer-types'
import path from 'path'
import fs from 'fs'
import { voxelize } from '../../voxelization'

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
        responseSchema: compressedBuildSchema,
        handler: async (req, res, instances) => {
            const { file: fileBase64, scale, name } = req.body

            const file = Buffer.from(fileBase64, 'base64').toString('utf-8')
            const output = voxelize(file, scale)
            const compressedShape = array3DToString(output)
            const build: CompressedBuild = {
                type: 'model',
                shape: compressedShape
            }
            const filename = name.endsWith('.json') ? name : name + '.json'
            fs.writeFileSync(
                path.join(instances.env.BUILDS_FOLDER, filename),
                JSON.stringify(build)
            )
            return build
        }
    })
}
