import nbt from 'prismarine-nbt'
import fs from 'fs'

export async function convertSchematic(data: Buffer) {
    const { parsed, type } = await nbt.parse(data)
    console.log('type:', type)
    console.log('data:', parsed)

    //fs.writeFileSync('test.json', JSON.stringify(parsed, null, 2))

    if (parsed.value.BlockData?.type !== 'byteArray')
        throw new Error('Invalid schematics file')
    if (parsed.value.Width?.type !== 'short')
        throw new Error('Invalid schematics file')
    if (parsed.value.Length?.type !== 'short')
        throw new Error('Invalid schematics file')
    if (parsed.value.Height?.type !== 'short')
        throw new Error('Invalid schematics file')
    const blocks = parsed.value.BlockData.value
    const width = parsed.value.Width.value
    const length = parsed.value.Length.value
    const height = parsed.value.Height.value

    let shape: number[][][] = []
    for (let y = 0; y < height; y++) {
        shape.push([])
        for (let z = 0; z < length; z++) {
            shape[y].push([])
            for (let x = 0; x < width; x++) {
                const index = y * width * length + z * width + x
                const block = blocks[index]
                shape[y][z].push(block === 0 ? 0 : 1)
            }
        }
    }

    return shape
}
/*
;(async () => {
    const data = fs.readFileSync('test.litematic')
    const shape = await convertSchematic(data)
    //console.log(shape)
})()
*/
