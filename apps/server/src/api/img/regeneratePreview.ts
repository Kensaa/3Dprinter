import { z } from 'zod'
import { APIRouter } from '../../api'
import jimp from 'jimp'
import { arrayToImage, stringToArray3D } from '../../utils'
import { CompressedBuild } from 'printer-types'
import path from 'path'
import fs from 'fs'
import { HTTPError } from 'express-api-router'

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
            let build: CompressedBuild
            try {
                build = JSON.parse(strData)
            } catch {
                throw new HTTPError(400, 'file is not json')
            }
            if (!build.shape)
                throw new HTTPError(
                    400,
                    'file does not contain a "shape" field'
                )
            if (build.type !== 'image')
                throw new HTTPError(400, 'file is not an image')

            const imageArray = stringToArray3D(build.shape)
            const image = arrayToImage(imageArray[0])
            build.preview = await image.getBase64Async(jimp.MIME_PNG)
            fs.writeFileSync(filepath, JSON.stringify(build))
        }
    })
}
