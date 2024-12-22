import { z } from 'zod'
import { APIRouter } from '../api'
import { Printer, printerSchema } from 'printer-types'

export function getPrintersHandler(router: APIRouter) {
    return router.createRouteHandler({
        authed: false,
        bodySchema: z.object({}),
        paramsSchema: z.object({}),
        querySchema: z.object({}),
        responseSchema: printerSchema.array(),
        handler: (req, res, instances) => {
            const out: Omit<Printer, 'ws'>[] = []
            for (const printer of instances.printers) {
                const { ws, ...printerWithoutWS } = printer
                out.push(printerWithoutWS)
            }

            return out
        }
    })
}
