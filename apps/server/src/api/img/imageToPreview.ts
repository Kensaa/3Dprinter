import { z } from 'zod'
import { APIRouter } from '../../api'
import {
    BaseConvertImageOptions,
    Build,
    ColorFlatConvertImageOptions,
    ColorImageMetadata,
    GrayImageMetadata,
    GrayscaleConvertImageOptions
} from 'build-bindings'

export function imageToPreviewHandler(router: APIRouter) {
    return router.createRouteHandler({
        authed: false,
        bodySchema: z.intersection(
            z.object({
                image: z.string(),
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
        responseSchema: z.object({
            preview: z.string(),
            blockCount: z.number(),
            individualBlockCount: z.record(z.string(), z.number()).optional()
        }),
        handler: async (req, res, instances) => {
            const baseOptions = new BaseConvertImageOptions(
                req.body.scale,
                req.body.horizontalMirror,
                req.body.verticalMirror
            )

            const imageBuffer = Buffer.from(req.body.image, 'base64')
            let build
            let preview
            let individualBlockCount
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
                    preview = (build.metadata.type as GrayImageMetadata).preview
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
                    const metadata = build.metadata.type as ColorImageMetadata
                    preview = metadata.preview
                    individualBlockCount = metadata.individual_block_count
                    break
                }
            }

            // const preview = (build.metadata.type as ImageMetadata).preview
            const blockCount = build.metadata.block_count

            return {
                preview,
                blockCount,
                individualBlockCount: individualBlockCount
                    ? Object.fromEntries(individualBlockCount)
                    : undefined
            }
        }
    })
}
