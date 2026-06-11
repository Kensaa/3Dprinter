import { get_all_blocks } from 'build-bindings'
import { create } from 'zustand'

export const defaultPresets = {
    Everything: [
        'minecraft:grass_block',
        'minecraft:sandstone',
        'minecraft:cobweb',
        'minecraft:redstone_block',
        'minecraft:ice',
        'minecraft:iron_block',
        'minecraft:oak_leaves',
        'minecraft:white_concrete',
        'minecraft:clay',
        'minecraft:dirt',
        'minecraft:cobblestone',
        'minecraft:oak_slab',
        'minecraft:diorite',
        'minecraft:acacia_planks',
        'minecraft:magenta_concrete',
        'minecraft:light_blue_concrete',
        'minecraft:yellow_concrete',
        'minecraft:lime_concrete',
        'minecraft:pink_concrete',
        'minecraft:gray_concrete',
        'minecraft:light_gray_concrete',
        'minecraft:cyan_concrete',
        'minecraft:purple_concrete',
        'minecraft:blue_concrete',
        'minecraft:brown_concrete',
        'minecraft:green_concrete',
        'minecraft:red_concrete',
        'minecraft:black_concrete',
        'minecraft:gold_block',
        'minecraft:diamond_block',
        'minecraft:lapis_block',
        'minecraft:emerald_block',
        'minecraft:spruce_planks',
        'minecraft:netherrack',
        'minecraft:white_terracotta',
        'minecraft:orange_terracotta',
        'minecraft:magenta_terracotta',
        'minecraft:light_blue_terracotta',
        'minecraft:yellow_terracotta',
        'minecraft:lime_terracotta',
        'minecraft:pink_terracotta',
        'minecraft:gray_terracotta',
        'minecraft:light_gray_terracotta',
        'minecraft:cyan_terracotta',
        'minecraft:purple_terracotta',
        'minecraft:blue_terracotta',
        'minecraft:brown_terracotta',
        'minecraft:green_terracotta',
        'minecraft:red_terracotta',
        'minecraft:black_terracotta',
        'minecraft:crimson_nylium',
        'minecraft:crimson_slab',
        'minecraft:crimson_hyphae',
        'minecraft:warped_nylium',
        'minecraft:warped_stem',
        'minecraft:crimson_hyphae',
        'minecraft:warped_wart_block',
        'minecraft:deepslate',
        'minecraft:raw_iron_block',
        'minecraft:verdant_froglight'
    ],
    SimpleColors: [
        'minecraft:orange_concrete',
        'minecraft:magenta_concrete',
        'minecraft:light_blue_concrete',
        'minecraft:yellow_concrete',
        'minecraft:lime_concrete',
        'minecraft:pink_concrete',
        'minecraft:gray_concrete',
        'minecraft:light_gray_concrete',
        'minecraft:cyan_concrete',
        'minecraft:purple_concrete',
        'minecraft:blue_concrete',
        'minecraft:brown_concrete',
        'minecraft:green_concrete',
        'minecraft:red_concrete',
        'minecraft:black_concrete',
        'minecraft:white_terracotta',
        'minecraft:orange_terracotta',
        'minecraft:magenta_terracotta',
        'minecraft:light_blue_terracotta',
        'minecraft:yellow_terracotta',
        'minecraft:lime_terracotta',
        'minecraft:pink_terracotta',
        'minecraft:gray_terracotta',
        'minecraft:light_gray_terracotta',
        'minecraft:cyan_terracotta',
        'minecraft:purple_terracotta',
        'minecraft:blue_terracotta',
        'minecraft:brown_terracotta',
        'minecraft:green_terracotta',
        'minecraft:red_terracotta',
        'minecraft:black_terracotta'
    ],
    None: []
}

export const ALL_BLOCKS = get_all_blocks()
export interface BlockPresetStore {
    presets: Record<string, string[]>
    removePreset: (name: string) => void
    addPreset: (name: string, preset: string[]) => void
}

const PRESET_KEY = 'block-presets'

export const useBlockPresets = create<BlockPresetStore>((set, get) => {
    const blockPresetStorage = localStorage.getItem(PRESET_KEY)
    let presets
    if (blockPresetStorage) {
        presets = JSON.parse(blockPresetStorage)
    } else {
        presets = defaultPresets
        localStorage.setItem(PRESET_KEY, JSON.stringify(presets))
    }

    return {
        presets,
        addPreset(name, preset) {
            const presets = get().presets
            presets[name] = preset
            set({ presets })
            localStorage.setItem(PRESET_KEY, JSON.stringify(presets))
        },
        removePreset(name) {
            const presets = get().presets
            delete presets[name]
            set({ presets })
            localStorage.setItem(PRESET_KEY, JSON.stringify(presets))
        }
    }
})
