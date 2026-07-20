import fs from 'fs'
import path from 'path'
import { get_all_blocks } from 'build-bindings'

if (process.argv.length < 3) {
    console.error(
        `Usage: ${process.argv[0]} ${process.argv[1]} <textures file>`
    )
    process.exit(1)
}
const textures_file = process.argv[2]

const textures = JSON.parse(fs.readFileSync(textures_file))

const blocks = get_all_blocks().flat()
const blockMap = new Set(blocks)
blockMap.add('minecraft:barrier')

const output_dir = path.join('public', 'block')
fs.mkdirSync(output_dir, { recursive: true })
console.log(path.resolve(output_dir))
for (const texture of textures) {
    const id = texture.id
    if (blockMap.has(id)) {
        const file = path.join(output_dir, id.split(':')[1] + '.png')
        fs.writeFileSync(file, Buffer.from(texture.image, 'base64'))
    }
}
