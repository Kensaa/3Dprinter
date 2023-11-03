import * as jimp from 'jimp'

function startIndex(arr: number[], nullE = 0) {
    for (let i = 0; i < arr.length; i++) {
        if (arr[i] !== nullE) return i
    }
    return Infinity
}
function endIndex(arr: number[], nullE = 0) {
    for (let i = arr.length - 1; i >= 0; i--) {
        if (arr[i] !== nullE) return i
    }
    return -Infinity
}

export function trim2Darray(arr: number[][], nullE = 0) {
    const startIndexes = []
    const endIndexes = []
    for (let row = 0; row < arr.length; row++) {
        startIndexes.push(startIndex(arr[row], nullE))
        endIndexes.push(endIndex(arr[row], nullE))
    }

    const minStart = Math.min(...startIndexes)
    const maxEnd = Math.max(...endIndexes)

    let spliced = 0
    for (let x = 0; x < minStart; x++) {
        for (let y = 0; y < arr.length; y++) {
            arr[y].shift()
        }
        spliced++
    }

    const end = arr[0].length + spliced
    for (let x = maxEnd; x < end - 1; x++) {
        for (let y = 0; y < arr.length; y++) {
            arr[y].pop()
        }
    }
}

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
    image: jimp,
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
    image.flip(horizontalMirror, verticalMirror)
    const output: number[][] = []
    const width = image.getWidth()
    const height = image.getHeight()
    for (let y = 0; y < height; y++) {
        output.push([])
        for (let x = 0; x < width; x++) {
            const color = jimp.intToRGBA(image.getPixelColor(x, y))
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
    const img = new jimp(width, height, 'white')
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (arr[y][x] === 1) {
                img.setPixelColor(0x000000ff, x, y)
            }
        }
    }
    return img
}
