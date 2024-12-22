import { z } from 'zod'
import { APIRouter } from '../api'
import { compressedBuildSchema, printerConfigSchema } from 'printer-types'
import fs from 'fs'
import path from 'path'
import { sendAsync } from '../utils'

export function editConfigHandler(router: APIRouter) {
    return router.createRouteHandler({
        authed: false,
        bodySchema: printerConfigSchema.partial(),
        paramsSchema: z.object({}),
        querySchema: z.object({}),
        responseSchema: z.void(),
        handler: async (req, res, instances) => {
            instances.printerConfig = {
                ...instances.printerConfig,
                ...req.body
            }
            fs.writeFileSync(
                instances.env.CONFIG_FILE,
                JSON.stringify(instances.printerConfig, null, 2)
            )

            for (const printer of instances.printers) {
                if (!printer.connected) continue
                await sendAsync(
                    printer.ws,
                    JSON.stringify({
                        type: 'config',
                        config: instances.printerConfig
                    })
                )
            }
        }
    })
}
