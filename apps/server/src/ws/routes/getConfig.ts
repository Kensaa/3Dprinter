import type { WsRequest } from '../websocketServer'

export async function getConfigHandler(request: WsRequest) {
    request.websocket.send(
        JSON.stringify({
            type: 'config',
            body: request.instances.printerConfig
        })
    )
}
