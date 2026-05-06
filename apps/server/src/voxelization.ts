import obj from 'obj-file-parser'

type Point = [number, number, number]
type Triangle = [Point, Point, Point]
interface Ray {
    origin: Point
    direction: 'x' | 'y' | 'z'
}

function rayIntersectTriangle(
    ray: Ray,
    v0: Point,
    v1: Point,
    v2: Point
): Point | undefined {
    function getRayDir(ray: Ray): Point {
        switch (ray.direction) {
            case 'x':
                return [1, 0, 0]
            case 'y':
                return [0, 1, 0]
            case 'z':
                return [0, 0, 1]
        }
    }
    function cross(a: Point, b: Point): Point {
        return [
            a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0]
        ]
    }
    function dot(a: Point, b: Point) {
        return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
    }

    const edge1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]] as Point
    const edge2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]] as Point
    const rayDir = getRayDir(ray)
    const h = cross(rayDir, edge2)
    const a = dot(edge1, h)
    if (a > -0.00001 && a < 0.00001) return undefined
    const f = 1.0 / a
    const s = [
        ray.origin[0] - v0[0],
        ray.origin[1] - v0[1],
        ray.origin[2] - v0[2]
    ] as Point
    const u = f * dot(s, h)
    if (u < 0.0 || u > 1.0) return undefined
    const q = cross(s, edge1)
    const v = f * dot(rayDir, q)
    if (v < 0.0 || u + v > 1.0) return undefined
    const t = f * dot(edge2, q)
    if (t > 0.00001) {
        return [
            ray.origin[0] + t * rayDir[0],
            ray.origin[1] + t * rayDir[1],
            ray.origin[2] + t * rayDir[2]
        ]
    }
}

function min(args: number[]) {
    let min = args[0]
    for (const arg of args) {
        if (arg < min) min = arg
    }
    return min
}

function max(args: number[]) {
    let max = args[0]
    for (const arg of args) {
        if (arg > max) max = arg
    }
    return max
}

export function voxelize(data: string, scale = 20) {
    const objFile = new obj(data).parse()

    const models = objFile.models[0]
    // get vertices as [x,y,z] arrays
    const vertices = models.vertices.map(
        vertice => Object.values(vertice) as Point
    )
    //normalize vertices

    const mins = [
        min(vertices.map(vertice => vertice[0])),
        min(vertices.map(vertice => vertice[1])),
        min(vertices.map(vertice => vertice[2]))
    ]
    const translatedVertices = vertices.map(vertice =>
        vertice.map((coord, index) => coord - mins[index])
    )

    // To change, stop scaling each dimension independently, scale all dimensions by the same factor to preserve aspect ratio, otherwise the model will always be a square
    const maxs = [
        max(translatedVertices.map(vertice => vertice[0])),
        max(translatedVertices.map(vertice => vertice[1])),
        max(translatedVertices.map(vertice => vertice[2]))
    ]
    const globalMax = max(maxs)

    const scaledVertices = translatedVertices.map(
        v => v.map(coord => (coord / globalMax) * scale) as Point
    )

    // get faces (triangle) as [v1,v2,v3] with v1,v2,v3 3 vertices of triangles
    const faces = models.faces.map(
        face =>
            face.vertices.map(
                vertice => scaledVertices[vertice.vertexIndex - 1]
            ) as Triangle
    )

    // console.log(vertices);
    // console.log(mins);

    // console.log(translatedVertices);
    // console.log(normalizedVertices);
    // console.log(scaledVertices);

    const output: number[][][] = []
    for (let i = 0; i <= scale; i++) {
        output.push([])
        for (let j = 0; j <= scale; j++) {
            output[i].push([])
            for (let k = 0; k <= scale; k++) {
                output[i][j].push(0)
            }
        }
    }

    function* samplePositions(lo: number, hi: number): Iterable<number> {
        for (let n = Math.floor(lo); n <= Math.ceil(hi); n++) {
            yield n
            yield n + 0.5
        }
    }
    function generateRays(v0: Point, v1: Point, v2: Point) {
        const rays: Ray[] = []
        const lowBound = [
            min([v0[0], v1[0], v2[0]]),
            min([v0[1], v1[1], v2[1]]),
            min([v0[2], v1[2], v2[2]])
        ]
        const highBound = [
            max([v0[0], v1[0], v2[0]]),
            max([v0[1], v1[1], v2[1]]),
            max([v0[2], v1[2], v2[2]])
        ]

        for (const y of samplePositions(lowBound[1], highBound[1])) {
            for (const z of samplePositions(lowBound[2], highBound[2])) {
                rays.push({
                    origin: [lowBound[0] - scale, y, z],
                    direction: 'x'
                })
                rays.push({
                    origin: [highBound[0] + scale, y, z],
                    direction: 'x'
                })
            }
        }

        for (const x of samplePositions(lowBound[0], highBound[0])) {
            for (const z of samplePositions(lowBound[2], highBound[2])) {
                rays.push({
                    origin: [x, lowBound[1] - scale, z],
                    direction: 'y'
                })
                rays.push({
                    origin: [x, highBound[1] + scale, z],
                    direction: 'y'
                })
            }
        }

        for (const x of samplePositions(lowBound[0], highBound[0])) {
            for (const y of samplePositions(lowBound[1], highBound[1])) {
                rays.push({
                    origin: [x, y, lowBound[2] - scale],
                    direction: 'z'
                })
                rays.push({
                    origin: [x, y, highBound[2] + scale],
                    direction: 'z'
                })
            }
        }
        return rays
    }

    for (const face of faces) {
        const rays = generateRays(face[0], face[1], face[2])
        for (const ray of rays) {
            const intersection = rayIntersectTriangle(
                ray,
                face[0],
                face[1],
                face[2]
            )
            if (intersection) {
                const x = Math.round(intersection[0])
                const y = Math.round(intersection[1])
                const z = Math.round(intersection[2])
                if (
                    x >= 0 &&
                    x <= scale &&
                    y >= 0 &&
                    y <= scale &&
                    z >= 0 &&
                    z <= scale
                ) {
                    output[x][y][z] = 1
                }
            }
        }
    }

    // convert to weird 3d printer array format ([x][y][z] -> [y][z][x])

    const model: number[][][] = []

    for (let x = 0; x <= scale; x++) {
        model.push([])
        for (let y = 0; y <= scale; y++) {
            model[x].push([])
            for (let z = 0; z <= scale; z++) {
                model[x][y].push(0)
            }
        }
    }

    for (let y = 0; y <= scale; y++) {
        for (let z = 0; z <= scale; z++) {
            for (let x = 0; x <= scale; x++) {
                model[y][z][x] = output[x][y][z]
            }
        }
    }

    return model
}
