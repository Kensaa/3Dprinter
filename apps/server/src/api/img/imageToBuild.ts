import { z } from 'zod'
import { APIRouter } from '../../api'
import { Jimp, JimpMime } from 'jimp'
import { arrayToImage, imageToArray } from '../../utils'
import {
    array3DToString,
    CompressedBuild,
    compressedBuildSchema,
    count2DArray,
    trim2Darray
} from 'utils'
import path from 'path'
import fs from 'fs'
import { HTTPError } from 'express-api-router'
import { compress_buffer } from 'build-bindings'

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
                image = await Jimp.fromBuffer(
                    Buffer.from(req.body.image, 'base64')
                )
            } catch {
                throw new HTTPError(400, 'failed to read image')
            }

            const imageArray = imageToArray(image, req.body)
            trim2Darray(imageArray, 0)
            const preview = await arrayToImage(imageArray).getBase64(
                JimpMime.png
            )

            const blockCount = count2DArray(imageArray, 1)

            const compressedShape = array3DToString(
                [imageArray],
                compress_buffer
            )

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
