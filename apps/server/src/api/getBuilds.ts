import { z } from 'zod'
import { APIRouter } from '../api'
import { CompressedBuild, compressedBuildSchema } from 'printer-types'
import { HTTPError } from 'express-api-router'
import fs from 'fs'
import path from 'path'

export function getBuildsHandler(router: APIRouter) {
    return router.createRouteHandler({
        authed: false,
        bodySchema: z.object({}),
        paramsSchema: z.object({}),
        querySchema: z.object({}),
        responseSchema: z.record(z.string(), compressedBuildSchema),
        handler: (req, res, instances) => {
            const modelsNames = fs.readdirSync(instances.env.BUILDS_FOLDER)
            const builds: Record<string, CompressedBuild> = {}
            for (const name of modelsNames) {
                const strData = fs.readFileSync(
                    path.join(instances.env.BUILDS_FOLDER, name),
                    'utf-8'
                )
                try {
                    builds[path.parse(name).name] = JSON.parse(strData)
                } catch {
                    throw new HTTPError(400, 'file is not json')
                }
            }

            return builds
        }
    })
}
