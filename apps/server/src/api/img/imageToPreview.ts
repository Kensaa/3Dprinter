import { z } from 'zod'
import { APIRouter } from '../../api'
import { Build, ConvertImageOptions, ImageMetadata } from 'build-bindings'

export function imageToPreviewHandler(router: APIRouter) {
    return router.createRouteHandler({
        authed: false,
        bodySchema: z.object({
            image: z.string(),
            threshold: z.number().positive().default(50),
            inverted: z.boolean().default(true),
            scale: z.number().positive().default(1),
            horizontalMirror: z.boolean().default(false),
            verticalMirror: z.boolean().default(false)
        }),
        paramsSchema: z.object({}),
        querySchema: z.object({}),
        responseSchema: z.object({
            preview: z.string(),
            blockCount: z.number()
        }),
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

            const preview = (build.metadata.type as ImageMetadata).preview
            const blockCount = build.metadata.block_count

            return { preview, blockCount }
        }
    })
}
