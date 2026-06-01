import { z } from 'zod'
import { APIRouter } from '../../api'
import { Build, ConvertImageOptions } from 'build-bindings'
import path from 'path'
import fs from 'fs'

export function imageToBuildHandler(router: APIRouter) {
    return router.createRouteHandler({
        authed: false,
        bodySchema: z.object({
            image: z.string(),
            name: z.string(),
            threshold: z.number().positive().default(50),
            inverted: z.boolean().default(true),
            scale: z.number().positive().default(1),
            horizontalMirror: z.boolean().default(false),
            verticalMirror: z.boolean().default(false)
        }),
        paramsSchema: z.object({}),
        querySchema: z.object({}),
        responseSchema: z.string(),
        handler: async (req, res, instances) => {
            const build = Build.from_image(
                Buffer.from(req.body.image, 'base64'),
                ConvertImageOptions.new(
                    req.body.threshold,
                    req.body.inverted,
                    req.body.scale,
                    req.body.horizontalMirror,
                    req.body.verticalMirror
                )
            )

            const compressed = build.compress()

            const filename = req.body.name.endsWith('.json')
                ? req.body.name
                : req.body.name + '.json'

            const buildString = compressed.serialize()
            fs.writeFileSync(
                path.join(instances.env.BUILDS_FOLDER, filename),
                buildString
            )

            return buildString
        }
    })
}
