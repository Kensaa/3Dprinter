import { z } from 'zod'
import { APIRouter } from '../../api'
import jimp from 'jimp'
import {
    array3DToString,
    arrayToImage,
    count2DArray,
    imageToArray,
    trim2Darray
} from '../../utils'
import { CompressedBuild, compressedBuildSchema } from 'printer-types'
import path from 'path'
import fs from 'fs'
import { HTTPError } from 'express-api-router'

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
        responseSchema: compressedBuildSchema,
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

            const compressedShape = array3DToString([imageArray])

            const build: CompressedBuild = {
                type: 'image',
                shape: compressedShape,
                preview: preview,
                blockCount
            }

            const filename = req.body.name.endsWith('.json')
                ? req.body.name
                : req.body.name + '.json'

            fs.writeFileSync(
                path.join(instances.env.BUILDS_FOLDER, filename),
                JSON.stringify(build)
            )

            return build
        }
    })
}
