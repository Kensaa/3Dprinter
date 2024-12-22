import { z } from 'zod'
import { APIRouter } from '../../api'
import jimp from 'jimp'
import {
    arrayToImage,
    count2DArray,
    imageToArray,
    trim2Darray
} from '../../utils'
import { HTTPError } from 'express-api-router'

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
            let image
            try {
                image = await jimp.read(Buffer.from(req.body.image, 'base64'))
            } catch {
                throw new HTTPError(400, 'failed to read image')
            }
            const imageArray = imageToArray(image, req.body)
            trim2Darray(imageArray)
            const preview = await arrayToImage(imageArray).getBase64Async(
                jimp.MIME_PNG
            )

            const blockCount = count2DArray(imageArray, 1)

            return { preview, blockCount }
        }
    })
}
