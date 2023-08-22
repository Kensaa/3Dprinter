export const edit3DArray = (
    arr: (typeof element)[][][],
    x: number,
    y: number,
    z: number,
    element: number
) => {
    if (y < 0) {
        console.log('extend down')
        const count = -y
        for (let i = 0; i < count; i++) {
            arr.unshift(generate2DArray(arr[0][0].length, arr[0].length))
        }
    } else if (y > arr.length - 1) {
        console.log('extend up')
        const count = y - (arr.length - 1)
        for (let i = 0; i < count; i++) {
            arr.push(generate2DArray(arr[0][0].length, arr[0].length))
        }
    }

    if (z < 0) {
        console.log('extend north')
        const count = -z
        for (let i = 0; i < arr.length; i++) {
            for (let j = 0; j < count; j++) {
                arr[i].unshift(generate1DArray(arr[0][0].length))
            }
        }
    } else if (z > arr[0].length - 1) {
        console.log('extend south')
        const count = z - (arr[0].length - 1)
        for (let i = 0; i < arr.length; i++) {
            for (let j = 0; j < count; j++) {
                arr[i].push(generate1DArray(arr[0][0].length))
            }
        }
    }

    if (x < 0) {
        console.log('extend east')
        const count = -x
        for (let i = 0; i < arr.length; i++) {
            for (let j = 0; j < arr[0].length; j++) {
                for (let k = 0; k < count; k++) {
                    arr[i][j].unshift(0)
                }
            }
        }
    } else if (x > arr[0][0].length - 1) {
        console.log('extend west')
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
    return new Array(width).fill(element)
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

    console.log(arr)
    console.log(minStart2)
    console.log(maxEnd2)

    let spliced2 = 0
    for (let z = 0; z < minStart2; z++) {
        for (let y = 0; y < arr.length; y++) {
            arr[y].shift()
        }
        spliced2++
    }
    console.log(arr)
    console.log(spliced2)
    for (let y = 0; y < arr.length; y++) {
        const end = arr[y].length + spliced2
        for (let z = maxEnd2; z < end - 1; z++) {
            arr[y].pop()
        }
    }
}
