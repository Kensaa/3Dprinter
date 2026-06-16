import { z } from 'zod'
import { APIRouter } from '../api'
import { printerSchema } from 'utils'
import { clientsTable } from '../db/schema'

export function getPrintersHandler(router: APIRouter) {
    return router.createRouteHandler({
        authed: false,
        bodySchema: z.undefined(),
        paramsSchema: z.object({}),
        querySchema: z.object({}),
        responseSchema: printerSchema.array(),
        handler: async (req, res, instances) => {
            const printers = await instances.database
                .select()
                .from(clientsTable)
            // const out: Omit<Printer, 'ws'>[] = []
            // for (const printer of instances.printers) {
            //     const { ws, ...printerWithoutWS } = printer
            //     out.push(printerWithoutWS)
            // }

            return printers
        }
    })
}
