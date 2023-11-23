import obj from 'obj-file-parser'

export function voxelize(data: string, scale = 20) {
    const objFile = new obj(data).parse()

    const models = objFile.models[0]
    // get vertices as [x,y,z] arrays
    const vertices = models.vertices.map(vertice => Object.values(vertice))
    //normalize vertices

    const mins = [
        min(vertices.map(vertice => vertice[0])),
        min(vertices.map(vertice => vertice[1])),
        min(vertices.map(vertice => vertice[2]))
    ]
    const translatedVertices = vertices.map(vertice =>
        vertice.map((coord, index) => coord - mins[index])
    )

    const maxs = [
        max(translatedVertices.map(vertice => vertice[0])),
        max(translatedVertices.map(vertice => vertice[1])),
        max(translatedVertices.map(vertice => vertice[2]))
    ]

    const normalizedVertices = translatedVertices.map(vertice =>
        vertice.map((coord, index) => coord / maxs[index])
    )

    const scaledVertices = normalizedVertices.map(vertice =>
        vertice.map(coord => coord * scale)
    )

    // get faces (triangle) as [v1,v2,v3] with v1,v2,v3 3 vertices of triangles
    const faces = models.faces.map(face =>
        face.vertices.map(vertice => scaledVertices[vertice.vertexIndex - 1])
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

    interface Ray {
        origin: number[]
        direction: 'x' | 'y' | 'z'
    }

    function rayIntersectTriangle(
        ray: Ray,
        v0: number[],
        v1: number[],
        v2: number[]
    ) {
        function getRayDir(ray: Ray) {
            switch (ray.direction) {
                case 'x':
                    return [1, 0, 0]
                case 'y':
                    return [0, 1, 0]
                case 'z':
                    return [0, 0, 1]
            }
        }
        function cross(a: number[], b: number[]) {
            return [
                a[1] * b[2] - a[2] * b[1],
                a[2] * b[0] - a[0] * b[2],
                a[0] * b[1] - a[1] * b[0]
            ]
        }
        function dot(a: number[], b: number[]) {
            return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
        }

        const edge1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]]
        const edge2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]]
        const rayDir = getRayDir(ray)
        const h = cross(rayDir, edge2)
        const a = dot(edge1, h)
        if (a > -0.00001 && a < 0.00001) return undefined
        const f = 1.0 / a
        const s = [
            ray.origin[0] - v0[0],
            ray.origin[1] - v0[1],
            ray.origin[2] - v0[2]
        ]
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

    function generateRays(v0: number[], v1: number[], v2: number[]) {
        const rays: Ray[] = []
        const bound = [
            [0, 0, 0],
            [0, 0, 0]
        ]
        bound[0][0] = min([v0[0], v1[0], v2[0]])
        bound[0][1] = min([v0[1], v1[1], v2[1]])
        bound[0][2] = min([v0[2], v1[2], v2[2]])
        bound[1][0] = max([v0[0], v1[0], v2[0]])
        bound[1][1] = max([v0[1], v1[1], v2[1]])
        bound[1][2] = max([v0[2], v1[2], v2[2]])

        for (let y = bound[0][1]; y <= bound[1][1]; y++) {
            for (let z = bound[0][2]; z <= bound[1][2]; z++) {
                rays.push({
                    origin: [bound[0][0] - scale, y, z],
                    direction: 'x'
                })
                rays.push({
                    origin: [bound[1][0] + scale, y, z],
                    direction: 'x'
                })
            }
        }

        for (let x = bound[0][0]; x <= bound[1][0]; x++) {
            for (let z = bound[0][2]; z <= bound[1][2]; z++) {
                rays.push({
                    origin: [x, bound[0][1] - scale, z],
                    direction: 'y'
                })
                rays.push({
                    origin: [x, bound[1][1] + scale, z],
                    direction: 'y'
                })
            }
        }

        for (let x = bound[0][0]; x <= bound[1][0]; x++) {
            for (let y = bound[0][1]; y <= bound[1][1]; y++) {
                rays.push({
                    origin: [x, y, bound[0][2] - scale],
                    direction: 'z'
                })
                rays.push({
                    origin: [x, y, bound[1][2] + scale],
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
            const pos = [0, 0, 0]
            if (intersection) {
                pos[0] = Math.abs(Math.floor(intersection[0]))
                pos[1] = Math.abs(Math.floor(intersection[1]))
                pos[2] = Math.abs(Math.floor(intersection[2]))
                //console.log(pos);
                output[pos[0]][pos[1]][pos[2]] = 1
            }
        }
    }

    // convert to weird 3d printer array format

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

    return model
}
