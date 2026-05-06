export function edit3DArray<T>(
    arr: T[][][],
    x: number,
    y: number,
    z: number,
    element: T,
    nullElement: T
) {
    if (y < 0) {
        const count = -y
        for (let i = 0; i < count; i++) {
            arr.unshift(
                generate2DArray(arr[0][0].length, arr[0].length, nullElement)
            )
        }
    } else if (y > arr.length - 1) {
        const count = y - (arr.length - 1)
        for (let i = 0; i < count; i++) {
            arr.push(
                generate2DArray(arr[0][0].length, arr[0].length, nullElement)
            )
        }
    }

    if (z < 0) {
        const count = -z
        for (let i = 0; i < arr.length; i++) {
            for (let j = 0; j < count; j++) {
                arr[i].unshift(generate1DArray(arr[0][0].length, nullElement))
            }
        }
    } else if (z > arr[0].length - 1) {
        const count = z - (arr[0].length - 1)
        for (let i = 0; i < arr.length; i++) {
            for (let j = 0; j < count; j++) {
                arr[i].push(generate1DArray(arr[0][0].length, nullElement))
            }
        }
    }

    if (x < 0) {
        const count = -x
        for (let i = 0; i < arr.length; i++) {
            for (let j = 0; j < arr[0].length; j++) {
                for (let k = 0; k < count; k++) {
                    arr[i][j].unshift(nullElement)
                }
            }
        }
    } else if (x > arr[0][0].length - 1) {
        const count = x - (arr[0][0].length - 1)
        for (let i = 0; i < arr.length; i++) {
            for (let j = 0; j < arr[0].length; j++) {
                for (let k = 0; k < count; k++) {
                    arr[i][j].push(nullElement)
                }
            }
        }
    }

    arr[y < 0 ? 0 : y][z < 0 ? 0 : z][x < 0 ? 0 : x] = element
    return arr
}

function generate1DArray<T>(width: number, element: T): T[] {
    return new Array(width).fill(element)
}

function generate2DArray<T>(width: number, height: number, element: T): T[][] {
    return new Array(height)
        .fill(undefined)
        .map(_ => generate1DArray(width, element))
}

function is2DArrayEmpty<T>(arr: T[][], nullElement: T) {
    for (let y = 0; y < arr.length; y++) {
        if (!arr[y].every(e => e === nullElement)) {
            return false
        }
    }
    return true
}

function startIndex<T>(arr: T[], nullElement: T) {
    for (let i = 0; i < arr.length; i++) {
        if (arr[i] !== nullElement) return i
    }
    return Infinity
}
function endIndex<T>(arr: T[], nullElement: T) {
    for (let i = arr.length - 1; i >= 0; i--) {
        if (arr[i] !== nullElement) return i
    }
    return -Infinity
}

export function trim2Darray<T>(arr: T[][], nullElement: T) {
    const startIndexes = []
    const endIndexes = []
    for (let row = 0; row < arr.length; row++) {
        startIndexes.push(startIndex(arr[row], nullElement))
        endIndexes.push(endIndex(arr[row], nullElement))
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

export function trim3DArray<T>(arr: T[][][], nullElement: T) {
    // UP AND DOWN TRIM
    const emptyLayers = []
    for (let y = 0; y < arr.length; y++) {
        emptyLayers.push(is2DArrayEmpty(arr[y], nullElement) ? 0 : 1)
    }

    const firstNonEmptyLayer = startIndex(emptyLayers, 0)
    const lastNonEmptyLayer = endIndex(emptyLayers, 0)

    let layersRemoved = 0
    for (let y = 0; y < firstNonEmptyLayer; y++) {
        arr.shift()
        layersRemoved++
    }
    const end = arr.length + layersRemoved
    for (let y = lastNonEmptyLayer; y < end - 1; y++) {
        arr.pop()
    }

    // LEFT AND RIGHT TRIM
    const startIndexes = []
    const endIndexes = []
    for (let layer = 0; layer < arr.length; layer++) {
        for (let row = 0; row < arr[layer].length; row++) {
            startIndexes.push(startIndex(arr[layer][row], nullElement))
            endIndexes.push(endIndex(arr[layer][row], nullElement))
        }
    }

    const minStart = Math.min(...startIndexes)
    const maxEnd = Math.max(...endIndexes)

    let spliced = 0
    for (let x = 0; x < minStart; x++) {
        for (let y = 0; y < arr.length; y++) {
            for (let z = 0; z < arr[0].length; z++) {
                arr[y][z].shift()
            }
        }
        spliced++
    }

    const end2 = arr[0][0].length + spliced
    for (let x = maxEnd; x < end2 - 1; x++) {
        for (let y = 0; y < arr.length; y++) {
            for (let z = 0; z < arr[0].length; z++) {
                arr[y][z].pop()
            }
        }
    }

    //TOP AND BOTTOM TRIM

    const startIndexes2 = []
    const endIndexes2 = []

    for (let y = 0; y < arr.length; y++) {
        for (let x = 0; x < arr[y][0].length; x++) {
            const a = []
            for (let z = 0; z < arr[y].length; z++) {
                a.push(arr[y][z][x])
            }
            startIndexes2.push(startIndex(a, nullElement))
            endIndexes2.push(endIndex(a, nullElement))
        }
    }
    const minStart2 = Math.min(...startIndexes2)
    const maxEnd2 = Math.max(...endIndexes2)

    let spliced2 = 0
    for (let z = 0; z < minStart2; z++) {
        for (let y = 0; y < arr.length; y++) {
            arr[y].shift()
        }
        spliced2++
    }

    for (let y = 0; y < arr.length; y++) {
        const end = arr[y].length + spliced2
        for (let z = maxEnd2; z < end - 1; z++) {
            arr[y].pop()
        }
    }
}

export function count2DArray<T>(arr: T[][], value: T) {
    let count = 0
    for (let y = 0; y < arr.length; y++) {
        for (let x = 0; x < arr[y].length; x++) {
            if (arr[y][x] === value) count++
        }
    }
    return count
}

export function count3DArray<T>(arr: T[][][], element: T) {
    let count = 0
    for (let y = 0; y < arr.length; y++) {
        for (let z = 0; z < arr[y].length; z++) {
            for (let x = 0; x < arr[y][z].length; x++) {
                if (arr[y][z][x] === element) count++
            }
        }
    }
    return count
}

export function rotate3DArray<T>(
    arr: T[][][],
    xAxis = false,
    yAxis = false,
    zAxis = false,
    nullElement: T
) {
    const newArr = []
    for (let y = 0; y < arr.length; y++) {
        newArr.push(
            generate2DArray(arr[0][0].length, arr[0].length, nullElement)
        )
    }

    const height = arr.length
    const width = arr[0][0].length

    for (let y = 0; y < arr.length; y++) {
        for (let z = 0; z < arr[y].length; z++) {
            for (let x = 0; x < arr[y][z].length; x++) {
                if (xAxis) {
                    newArr[y][z][x] = arr[height - z - 1][y][x]
                }
                if (yAxis) {
                    newArr[y][z][x] = arr[y][x][width - z - 1]
                }
                if (zAxis) {
                    newArr[y][z][x] = arr[x][z][width - y - 1]
                }
            }
        }
    }
    return newArr
}

export type CompressFunction = (data: ArrayBuffer, level: number) => ArrayBuffer
export type DecompressFunction = (data: ArrayBuffer) => ArrayBuffer

const BYTE_PER_PIXEL = 1
const BYTE_SIZE_VALUE = 2

function arrayBufferToBase64(buffer: ArrayBufferLike): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (const byte of bytes) {
        binary += String.fromCharCode(byte)
    }
    return btoa(binary)
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
}
export function array3DToString(arr: number[][][], compress: CompressFunction) {
    const height = arr.length
    const depth = arr[0].length
    const width = arr[0][0].length

    const arr_buffer = new ArrayBuffer(
        height * depth * width * BYTE_PER_PIXEL + 3 * BYTE_SIZE_VALUE
    )
    const view = new DataView(arr_buffer)
    let offset = 0
    view.setUint16(offset, height)
    offset += BYTE_SIZE_VALUE
    view.setUint16(offset, depth)
    offset += BYTE_SIZE_VALUE
    view.setUint16(offset, width)
    offset += BYTE_SIZE_VALUE

    for (let y = 0; y < height; y++) {
        for (let z = 0; z < depth; z++) {
            for (let x = 0; x < width; x++) {
                view.setUint8(offset, arr[y][z][x])
                offset += BYTE_PER_PIXEL
            }
        }
    }
    return arrayBufferToBase64(compress(arr_buffer, 7))
}

export function stringToArray3D(str: string, decompress: DecompressFunction) {
    const buffer = base64ToArrayBuffer(str)
    const decompressed = new DataView(decompress(buffer))
    let offset = 0
    const height = decompressed.getUint16(offset)
    offset += BYTE_SIZE_VALUE
    const depth = decompressed.getUint16(offset)
    offset += BYTE_SIZE_VALUE
    const width = decompressed.getUint16(offset)
    offset += BYTE_SIZE_VALUE
    const output: number[][][] = []
    for (let y = 0; y < height; y++) {
        output.push([])
        for (let z = 0; z < depth; z++) {
            output[y].push([])
            for (let x = 0; x < width; x++) {
                output[y][z].push(decompressed.getUint8(offset))
                offset += BYTE_PER_PIXEL
            }
        }
    }
    return output
}
