import { z } from 'zod'
import { APIRouter } from '../../api'
import path from 'path'
import fs from 'fs'
import { HTTPError } from 'express-api-router'
import { CompressedBuild } from 'build-bindings'

export function regeneratePreviewHandler(router: APIRouter) {
    return router.createRouteHandler({
        authed: false,
        bodySchema: z.object({
            file: z.string()
        }),
        paramsSchema: z.object({}),
        querySchema: z.object({}),
        responseSchema: z.void(),
        handler: async (req, res, instances) => {
            const { file } = req.body
            let filepath = path.join(instances.env.BUILDS_FOLDER, file)
            if (!filepath.endsWith('.json')) filepath = filepath + '.json'
            if (!fs.existsSync(filepath))
                throw new HTTPError(404, 'file not found')
            const strData = fs.readFileSync(filepath, 'utf-8')
            const compressed = CompressedBuild.deserialize(strData)
            const build = compressed.uncompress()
            build.regenerate_preview()
            const recompressed = build.compress()

            fs.writeFileSync(filepath, recompressed.serialize())
        }
    })
}
