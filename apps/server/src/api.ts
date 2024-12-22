import { APIRouter as BaseAPIRouter } from 'express-api-router'
import { Printer, PrinterConfig, Task } from 'printer-types'

import { getPrintersHandler } from './api/getPrinters'
import { getCurrentTaskHandler } from './api/getCurrentTask'
import { getBuildsHandler } from './api/getBuilds'
import { editBuildsHandler } from './api/editBuilds'
import { imageToPreviewHandler } from './api/img/imageToPreview'
import { imageToBuildHandler } from './api/img/imageToBuild'
import { regeneratePreviewHandler } from './api/img/regeneratePreview'
import { voxelizeHandler } from './api/model/voxelize'
import { buildHandler } from './api/build'
import { remoteHandler } from './api/remote'
import { getLogsHandler } from './api/getLogs'
import { getConfigHandler } from './api/getConfig'
import { editConfigHandler } from './api/editConfig'

export interface Instances {
    printers: Printer[]
    currentTask?: Task
    logs: string[]
    printerConfig: PrinterConfig
    env: {
        WEB_SERVER_PORT: number
        DATA_FOLDER: string
        BUILDS_FOLDER: string
        CONFIG_FILE: string
    }
}

export function initApi(instances: Instances) {
    const router = new BaseAPIRouter<Instances, never>(instances)

    router.registerRoute('get', '/printers', getPrintersHandler(router))
    router.registerRoute('get', '/currentTask', getCurrentTaskHandler(router))
    router.registerRoute('get', '/builds', getBuildsHandler(router))
    router.registerRoute('post', '/builds', editBuildsHandler(router))

    router.registerRoute(
        'post',
        '/img/imageToPreview',
        imageToPreviewHandler(router)
    )
    router.registerRoute(
        'post',
        '/img/imageToBuild',
        imageToBuildHandler(router)
    )
    router.registerRoute(
        'post',
        '/img/regeneratePreview',
        regeneratePreviewHandler(router)
    )

    router.registerRoute('post', '/3d/voxelize', voxelizeHandler(router))

    router.registerRoute('post', '/build', buildHandler(router))
    router.registerRoute('post', '/remote', remoteHandler(router))
    router.registerRoute('get', '/logs', getLogsHandler(router))
    router.registerRoute('get', '/config', getConfigHandler(router))
    router.registerRoute('post', '/config', editConfigHandler(router))

    return router
}

export type APIRouter = ReturnType<typeof initApi>
