import { z } from 'zod'
import { APIRouter } from '../../api'
import {
    BaseConvertImageOptions,
    Build,
    ColorFlatConvertImageOptions,
    GrayscaleConvertImageOptions
} from 'build-bindings'
import path from 'path'
import fs from 'fs'

export function imageToBuildHandler(router: APIRouter) {
    return router.createRouteHandler({
        authed: false,
        bodySchema: z.intersection(
            z.object({
                image: z.string(),
                name: z.string(),
                scale: z.number().positive().default(1),
                horizontalMirror: z.boolean().default(false),
                verticalMirror: z.boolean().default(false)
            }),
            z.discriminatedUnion('type', [
                z.object({
                    type: z.literal('grayscale'),
                    threshold: z.number().positive().default(50),
                    inverted: z.boolean().default(true)
                }),
                z.object({
                    type: z.literal('color_flat'),
                    available_blocks: z.string().array()
                })
            ])
        ),
        paramsSchema: z.object({}),
        querySchema: z.object({}),
        responseSchema: z.string(),
        handler: async (req, res, instances) => {
            const baseOptions = new BaseConvertImageOptions(
                req.body.scale,
                req.body.horizontalMirror,
                req.body.verticalMirror
            )

            const imageBuffer = Buffer.from(req.body.image, 'base64')
            let build
            switch (req.body.type) {
                case 'grayscale': {
                    build = Build.from_image_grayscale(
                        imageBuffer,
                        new GrayscaleConvertImageOptions(
                            req.body.threshold,
                            req.body.inverted,
                            baseOptions
                        )
                    )
                    break
                }
                case 'color_flat': {
                    build = Build.from_image_color_flat(
                        imageBuffer,
                        new ColorFlatConvertImageOptions(
                            req.body.available_blocks,
                            baseOptions
                        )
                    )
                    break
                }
            }

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
