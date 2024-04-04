import { inflate, deflate } from 'pako'

export const edit3DArray = (
    arr: (typeof element)[][][],
    x: number,
    y: number,
    z: number,
    element: number
) => {
    if (y < 0) {
        const count = -y
        for (let i = 0; i < count; i++) {
            arr.unshift(generate2DArray(arr[0][0].length, arr[0].length))
        }
    } else if (y > arr.length - 1) {
        const count = y - (arr.length - 1)
        for (let i = 0; i < count; i++) {
            arr.push(generate2DArray(arr[0][0].length, arr[0].length))
        }
    }

    if (z < 0) {
        const count = -z
        for (let i = 0; i < arr.length; i++) {
            for (let j = 0; j < count; j++) {
                arr[i].unshift(generate1DArray(arr[0][0].length))
            }
        }
    } else if (z > arr[0].length - 1) {
        const count = z - (arr[0].length - 1)
        for (let i = 0; i < arr.length; i++) {
            for (let j = 0; j < count; j++) {
                arr[i].push(generate1DArray(arr[0][0].length))
            }
        }
    }

    if (x < 0) {
        const count = -x
        for (let i = 0; i < arr.length; i++) {
            for (let j = 0; j < arr[0].length; j++) {
                for (let k = 0; k < count; k++) {
                    arr[i][j].unshift(0)
                }
            }
        }
    } else if (x > arr[0][0].length - 1) {
        const count = x - (arr[0][0].length - 1)
        for (let i = 0; i < arr.length; i++) {
            for (let j = 0; j < arr[0].length; j++) {
                for (let k = 0; k < count; k++) {
                    arr[i][j].push(0)
                }
            }
        }
    }

    arr[y < 0 ? 0 : y][z < 0 ? 0 : z][x < 0 ? 0 : x] = element
    return arr
}

function generate1DArray(width: number, element = 0) {
    return new Array(width).fill(element) as (typeof element)[]
}

function generate2DArray(width: number, height: number, element = 0) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return new Array(height).fill(0).map(_ => generate1DArray(width, element))
}

function is2DArrayEmpty(arr: number[][], nullE = 0) {
    for (let y = 0; y < arr.length; y++) {
        if (!arr[y].every(e => e === nullE)) {
            return false
        }
    }
    return true
}

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

export function trim3DArray(arr: number[][][], nullE = 0) {
    // UP AND DOWN TRIM
    const emptyLayers = []
    for (let y = 0; y < arr.length; y++) {
        emptyLayers.push(is2DArrayEmpty(arr[y], nullE) ? 0 : 1)
    }

    const firstNonEmptyLayer = startIndex(emptyLayers, nullE)
    const lastNonEmptyLayer = endIndex(emptyLayers, nullE)

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
            startIndexes.push(startIndex(arr[layer][row], nullE))
            endIndexes.push(endIndex(arr[layer][row], nullE))
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
            startIndexes2.push(startIndex(a))
            endIndexes2.push(endIndex(a))
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

export function count3DArray(arr: number[][][], element = 1) {
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

export function rotate3DArray(
    arr: number[][][],
    xAxis = false,
    yAxis = false,
    zAxis = false
) {
    const newArr = []
    for (let y = 0; y < arr.length; y++) {
        newArr.push(generate2DArray(arr[0][0].length, arr[0].length, 0))
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

const BYTE_PER_PIXEL = 1
const BYTE_SIZE_VALUE = 2

export function array3DToString(arr: number[][][]) {
    const height = arr.length
    const depth = arr[0].length
    const width = arr[0][0].length

    const buffer = Buffer.alloc(
        height * depth * width * BYTE_PER_PIXEL + 3 * BYTE_SIZE_VALUE
    )
    // const buffer = Buffer.alloc(10 + 3 * 4)
    let offset = 0
    buffer.writeUintBE(height, offset, BYTE_SIZE_VALUE)
    offset += BYTE_SIZE_VALUE
    buffer.writeUintBE(depth, offset, BYTE_SIZE_VALUE)
    offset += BYTE_SIZE_VALUE
    buffer.writeUintBE(width, offset, BYTE_SIZE_VALUE)
    offset += BYTE_SIZE_VALUE

    for (let y = 0; y < height; y++) {
        for (let z = 0; z < depth; z++) {
            for (let x = 0; x < width; x++) {
                buffer.writeUintBE(arr[y][z][x], offset, BYTE_PER_PIXEL)
                offset += BYTE_PER_PIXEL
            }
        }
    }
    const compressed = Buffer.from(deflate(buffer, { level: 8 }))
    return compressed.toString('base64')
}

export function stringToArray3D(str: string) {
    const buffer = Buffer.from(str, 'base64')
    const decompressed = Buffer.from(inflate(buffer))
    let offset = 0
    const height = decompressed.readUIntBE(offset, BYTE_SIZE_VALUE)
    offset += BYTE_SIZE_VALUE
    const depth = decompressed.readUIntBE(offset, BYTE_SIZE_VALUE)
    offset += BYTE_SIZE_VALUE
    const width = decompressed.readUIntBE(offset, BYTE_SIZE_VALUE)
    offset += BYTE_SIZE_VALUE
    const output: number[][][] = []
    for (let y = 0; y < height; y++) {
        output.push([])
        for (let z = 0; z < depth; z++) {
            output[y].push([])
            for (let x = 0; x < width; x++) {
                output[y][z].push(
                    decompressed.readUIntBE(offset, BYTE_PER_PIXEL)
                )
                offset += BYTE_PER_PIXEL
            }
        }
    }
    return output
}
