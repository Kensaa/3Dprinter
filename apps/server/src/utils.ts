import { intToRGBA, Jimp, JimpInstance } from 'jimp'
import type { WebSocket } from 'ws'
import { BuildMessage, Printer } from 'utils'

export type JimpImage =
    | JimpInstance
    | Awaited<ReturnType<typeof Jimp.fromBuffer>>

export interface ImageToArrayOptions {
    threshold: number
    inverted: boolean
    scale: number
    horizontalMirror: boolean
    verticalMirror: boolean
}

/**
 * Convert an Jimp image into a 2D array
 * @param image image to convert
 * @param options options (see ImageToArrayOptions interface)
 * @returns a 2D array representing the image's pixels
 */
export function imageToArray(
    image: JimpImage,
    options: Partial<ImageToArrayOptions>
) {
    const {
        threshold = 50,
        inverted = true,
        scale = 1,
        horizontalMirror = false,
        verticalMirror = false
    } = options
    image.scale(scale)
    image.flip({ horizontal: horizontalMirror, vertical: verticalMirror })
    const output: number[][] = []
    const width = image.width
    const height = image.height
    for (let y = 0; y < height; y++) {
        output.push([])
        for (let x = 0; x < width; x++) {
            const color = intToRGBA(image.getPixelColor(x, y))
            const gray = (color.r + color.g + color.b) / 3

            if (color.a === 0) {
                output[y].push(0)
            } else {
                if (gray > threshold) {
                    output[y].push(inverted ? 0 : 1)
                } else {
                    output[y].push(inverted ? 1 : 0)
                }
            }
        }
    }
    return output
}

export function arrayToImage(arr: number[][]) {
    const width = arr[0].length
    const height = arr.length
    const img = new Jimp({ width, height, color: 'white' })
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (arr[y][x] === 1) {
                img.setPixelColor(0x000000ff, x, y)
            }
        }
    }
    return img
}

/**
 * divide a 3D array in parts of dimension (xsize,ysize,zsize)
 * @param arr input array
 * @param xsize x size of the divided parts
 * @param ysize z size of the divided parts
 * @param zsize z size of the divided parts
 * @returns a 3D array where each cell is another 3D array
 */
export function divide3D(
    arr: number[][][],
    xsize: number,
    ysize: number,
    zsize: number
) {
    const result: number[][][][][][] = []
    for (let i = 0; i < arr.length / zsize; i++) {
        result.push([])
        for (let j = 0; j < arr[0].length / ysize; j++) {
            result[i].push([])
        }
    }

    for (let dz = 0; dz < arr.length; dz += zsize) {
        for (let dy = 0; dy < arr[dz].length; dy += ysize) {
            for (let dx = 0; dx < arr[dz][dy].length; dx += xsize) {
                result[dz / zsize][dy / ysize][dx / xsize] = arr
                    .slice(dz, dz + zsize)
                    .map(e => e.slice(dy, dy + ysize))
                    .map(e1 => e1.map(e2 => e2.slice(dx, dx + xsize)))
            }
        }
    }

    return result
}

/**
 * return the current time as a string
 * @returns the current time
 */
export function getTime() {
    const date = new Date()
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    const seconds = date.getSeconds().toString().padStart(2, '0')
    return `${hours}:${minutes}:${seconds}`
}

export function omit(obj: any, ...keys: string[]) {
    const newObj: any = {}
    for (const key of Object.keys(obj)) {
        if (!keys.includes(key)) newObj[key] = obj[key]
    }
    return newObj
}

export async function wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

export async function sendAsync(ws: WebSocket, data: string) {
    return new Promise<void>((resolve, reject) => {
        ws.send(data, err => {
            if (err) reject(err)
            else resolve()
        })
    })
}

export async function sendPartToPrinter(printer: Printer, part: BuildMessage) {
    const strMsg = JSON.stringify(part)
    const msgParts = strMsg.match(/.{1,40000}/g) ?? [strMsg]

    await sendAsync(printer.ws, JSON.stringify({ type: 'sendStart' }))
    await wait(100)
    for (const chunk of msgParts) {
        await sendAsync(
            printer.ws,
            JSON.stringify({ type: 'chunk', chunk: chunk })
        )
        await wait(50)
    }
    await wait(100)

    await sendAsync(printer.ws, JSON.stringify({ type: 'sendEnd' }))
}
