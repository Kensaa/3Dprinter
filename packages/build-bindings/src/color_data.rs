use phf::phf_set;
use wasm_bindgen::prelude::*;

pub type Color = (u8, u8, u8);

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, strum::Display)]
#[repr(u8)]
#[wasm_bindgen]
pub enum MapColor {
    // #000000
    None = 0,

    // #7FB238
    Grass,

    // #F7E9A3
    Sand,

    // #C7C7C7
    Wool,

    // #FF0000
    Fire,

    // #A0A0FF
    Ice,

    // #A7A7A7
    Metal,

    // #007C00
    Plant,

    // #FFFFFF
    Snow,

    // #A4A8B8
    Clay,

    // #976D4D
    Dirt,

    // #707070
    Stone,

    // #4040FF
    Water,

    // #8F7748
    Wood,

    // #FFFCF5
    Quartz,

    // #D87F33
    Orange,

    // #B24CD8
    Magenta,

    // #6699D8
    LightBlue,

    // #E5E533
    Yellow,

    // #7FCC19
    LightGreen,

    // #F27FA5
    Pink,

    // #4C4C4C
    Gray,

    // #999999
    LightGray,

    // #4C7F99
    Cyan,

    // #7F3FB2
    Purple,

    // #334CB2
    Blue,

    // #664C33
    Brown,

    // #667F33
    Green,

    // #993333
    Red,

    // #191919
    Black,

    // #FAEE4D
    Gold,

    // #5CDBD5
    Diamond,

    // #4A80FF
    Lapis,

    // #00D93A
    Emerald,

    // #815631
    Podzol,

    // #700200
    Nether,

    // #D1B1A1
    TerracottaWhite,

    // #9F5224
    TerracottaOrange,

    // #95576C
    TerracottaMagenta,

    // #706C8A
    TerracottaLightBlue,

    // #BA8524
    TerracottaYellow,

    // #677535
    TerracottaLightGreen,

    // #A04D4E
    TerracottaPink,

    // #392923
    TerracottaGray,

    // #876B62
    TerracottaLightGray,

    // #575C5C
    TerracottaCyan,

    // #7A4958
    TerracottaPurple,

    // #4C3E5C
    TerracottaBlue,

    // #4C3223
    TerracottaBrown,

    // #4C522A
    TerracottaGreen,

    // #8E3C2E
    TerracottaRed,

    // #251610
    TerracottaBlack,

    // #BD3031
    CrimsonNylium,

    // #943F61
    CrimsonStem,

    // #5C191D
    CrimsonHyphae,

    // #167E86
    WarpedNylium,

    // #3A8E8C
    WarpedStem,

    // #562C3E
    WarpedHyphae,

    // #14B485
    WarpedWartBlock,

    // #646464
    Deepslate,

    // #D8AF93
    RawIron,

    // #7FA796
    GlowLichen,
}

impl MapColor {
    pub fn all() -> Vec<MapColor> {
        vec![
            Self::None,
            Self::Grass,
            Self::Sand,
            Self::Wool,
            Self::Fire,
            Self::Ice,
            Self::Metal,
            Self::Plant,
            Self::Snow,
            Self::Clay,
            Self::Dirt,
            Self::Stone,
            Self::Water,
            Self::Wood,
            Self::Quartz,
            Self::Orange,
            Self::Magenta,
            Self::LightBlue,
            Self::Yellow,
            Self::LightGreen,
            Self::Pink,
            Self::Gray,
            Self::LightGray,
            Self::Cyan,
            Self::Purple,
            Self::Blue,
            Self::Brown,
            Self::Green,
            Self::Red,
            Self::Black,
            Self::Gold,
            Self::Diamond,
            Self::Lapis,
            Self::Emerald,
            Self::Podzol,
            Self::Nether,
            Self::TerracottaWhite,
            Self::TerracottaOrange,
            Self::TerracottaMagenta,
            Self::TerracottaLightBlue,
            Self::TerracottaYellow,
            Self::TerracottaLightGreen,
            Self::TerracottaPink,
            Self::TerracottaGray,
            Self::TerracottaLightGray,
            Self::TerracottaCyan,
            Self::TerracottaPurple,
            Self::TerracottaBlue,
            Self::TerracottaBrown,
            Self::TerracottaGreen,
            Self::TerracottaRed,
            Self::TerracottaBlack,
            Self::CrimsonNylium,
            Self::CrimsonStem,
            Self::CrimsonHyphae,
            Self::WarpedNylium,
            Self::WarpedStem,
            Self::WarpedHyphae,
            Self::WarpedWartBlock,
            Self::Deepslate,
            Self::RawIron,
            Self::GlowLichen,
        ]
    }

    pub const fn base_rgb(self) -> Color {
        match self {
            Self::None => (0, 0, 0),
            Self::Grass => (127, 178, 56),
            Self::Sand => (247, 233, 163),
            Self::Wool => (199, 199, 199),
            Self::Fire => (255, 0, 0),
            Self::Ice => (160, 160, 255),
            Self::Metal => (167, 167, 167),
            Self::Plant => (0, 124, 0),
            Self::Snow => (255, 255, 255),
            Self::Clay => (164, 168, 184),
            Self::Dirt => (151, 109, 77),
            Self::Stone => (112, 112, 112),
            Self::Water => (64, 64, 255),
            Self::Wood => (143, 119, 72),
            Self::Quartz => (255, 252, 245),
            Self::Orange => (216, 127, 51),
            Self::Magenta => (178, 76, 216),
            Self::LightBlue => (102, 153, 216),
            Self::Yellow => (229, 229, 51),
            Self::LightGreen => (127, 204, 25),
            Self::Pink => (242, 127, 165),
            Self::Gray => (76, 76, 76),
            Self::LightGray => (153, 153, 153),
            Self::Cyan => (76, 127, 153),
            Self::Purple => (127, 63, 178),
            Self::Blue => (51, 76, 178),
            Self::Brown => (102, 76, 51),
            Self::Green => (102, 127, 51),
            Self::Red => (153, 51, 51),
            Self::Black => (25, 25, 25),
            Self::Gold => (250, 238, 77),
            Self::Diamond => (92, 219, 213),
            Self::Lapis => (74, 128, 255),
            Self::Emerald => (0, 217, 58),
            Self::Podzol => (129, 86, 49),
            Self::Nether => (112, 2, 0),
            Self::TerracottaWhite => (209, 177, 161),
            Self::TerracottaOrange => (159, 82, 36),
            Self::TerracottaMagenta => (149, 87, 108),
            Self::TerracottaLightBlue => (112, 108, 138),
            Self::TerracottaYellow => (186, 133, 36),
            Self::TerracottaLightGreen => (103, 117, 53),
            Self::TerracottaPink => (160, 77, 78),
            Self::TerracottaGray => (57, 41, 35),
            Self::TerracottaLightGray => (135, 107, 98),
            Self::TerracottaCyan => (87, 92, 92),
            Self::TerracottaPurple => (122, 73, 88),
            Self::TerracottaBlue => (76, 62, 92),
            Self::TerracottaBrown => (76, 50, 35),
            Self::TerracottaGreen => (76, 82, 42),
            Self::TerracottaRed => (142, 60, 46),
            Self::TerracottaBlack => (37, 22, 16),
            Self::CrimsonNylium => (189, 48, 49),
            Self::CrimsonStem => (148, 63, 97),
            Self::CrimsonHyphae => (92, 25, 29),
            Self::WarpedNylium => (22, 126, 134),
            Self::WarpedStem => (58, 142, 140),
            Self::WarpedHyphae => (86, 44, 62),
            Self::WarpedWartBlock => (20, 180, 133),
            Self::Deepslate => (100, 100, 100),
            Self::RawIron => (216, 175, 147),
            Self::GlowLichen => (127, 167, 150),
        }
    }

    pub const fn blocks(self) -> phf::Set<&'static str> {
        match self {
            Self::None => phf_set! {},
            Self::Grass => phf_set! {
                "minecraft:grass_block",
                "minecraft:slime_block",
            },
            Self::Sand => phf_set! {
                "minecraft:sand",
                "minecraft:sandstone",
                "minecraft:glowstone",
            },
            Self::Wool => phf_set! {
                "minecraft:cobweb",
                "minecraft:mushroom_stem",
            },
            Self::Fire => phf_set! {
                "minecraft:tnt",
                "minecraft:redstone_block",
            },
            Self::Ice => phf_set! {
                "minecraft:ice",
                "minecraft:packed_ice",
                "minecraft:blue_ice",
            },
            Self::Metal => phf_set! {
                "minecraft:iron_block",
                "minecraft:iron_trapdoor",
            },
            Self::Plant => phf_set! {
                "minecraft:oak_leaves",
                "minecraft:spruce_leaves",
                "minecraft:birch_leaves",
                "minecraft:jungle_leaves",
                "minecraft:acacia_leaves",
                "minecraft:dark_oak_leaves",
                "minecraft:mangrove_leaves",
                "minecraft:azalea_leaves",
                "minecraft:flowering_azalea_leaves",
            },
            Self::Snow => phf_set! {
                "minecraft:snow_block",
                "minecraft:white_wool",
                "minecraft:white_stained_glass",
                "minecraft:white_concrete",
            },
            Self::Clay => phf_set! {
                "minecraft:clay"
            },
            Self::Dirt => phf_set! {
                "minecraft:dirt",
                "minecraft:granite"
            },
            Self::Stone => phf_set! {
                "minecraft:cobblestone",
                "minecraft:stone",
                "minecraft:stone_bricks",
            },
            Self::Water => phf_set! {},
            Self::Wood => phf_set! {
                "minecraft:oak_planks",
                "minecraft:oak_slab",
            },
            Self::Quartz => phf_set! {
                "minecraft:diorite",
                "minecraft:quartz_block",
                "minecraft:quartz_slab",
            },
            Self::Orange => phf_set! {
                "minecraft:orange_wool",
                "minecraft:orange_stained_glass",
                "minecraft:orange_concrete",
                "minecraft:acacia_planks",
                "minecraft:red_sandstone",
            },
            Self::Magenta => phf_set! {
                "minecraft:magenta_wool",
                "minecraft:magenta_stained_glass",
                "minecraft:magenta_concrete",
            },
            Self::LightBlue => phf_set! {
                "minecraft:light_blue_wool",
                "minecraft:light_blue_stained_glass",
                "minecraft:light_blue_concrete",
            },
            Self::Yellow => phf_set! {
                "minecraft:yellow_wool",
                "minecraft:yellow_stained_glass",
                "minecraft:yellow_concrete",
            },
            Self::LightGreen => phf_set! {
                "minecraft:lime_wool",
                "minecraft:lime_stained_glass",
                "minecraft:lime_concrete",
            },
            Self::Pink => phf_set! {
                "minecraft:pink_wool",
                "minecraft:pink_stained_glass",
                "minecraft:pink_concrete",
            },
            Self::Gray => phf_set! {
                "minecraft:gray_wool",
                "minecraft:gray_stained_glass",
                "minecraft:gray_concrete",
            },
            Self::LightGray => phf_set! {
                "minecraft:light_gray_wool",
                "minecraft:light_gray_stained_glass",
                "minecraft:light_gray_concrete",
            },
            Self::Cyan => phf_set! {
                "minecraft:cyan_wool",
                "minecraft:cyan_stained_glass",
                "minecraft:cyan_concrete",
            },
            Self::Purple => phf_set! {
                "minecraft:purple_wool",
                "minecraft:purple_stained_glass",
                "minecraft:purple_concrete",
            },
            Self::Blue => phf_set! {
                "minecraft:blue_wool",
                "minecraft:blue_stained_glass",
                "minecraft:blue_concrete",
            },
            Self::Brown => phf_set! {
                "minecraft:brown_wool",
                "minecraft:brown_stained_glass",
                "minecraft:brown_concrete",
            },
            Self::Green => phf_set! {
                "minecraft:green_wool",
                "minecraft:green_stained_glass",
                "minecraft:green_concrete",
            },
            Self::Red => phf_set! {
                "minecraft:red_wool",
                "minecraft:red_stained_glass",
                "minecraft:red_concrete",
            },
            Self::Black => phf_set! {
                "minecraft:black_wool",
                "minecraft:black_stained_glass",
                "minecraft:black_concrete",
            },
            Self::Gold => phf_set! {
                "minecraft:gold_block"
            },
            Self::Diamond => phf_set! {
                "minecraft:diamond_block"
            },
            Self::Lapis => phf_set! {
                "minecraft:lapis_block"
            },
            Self::Emerald => phf_set! {
                "minecraft:emerald_block"
            },
            Self::Podzol => phf_set! {
                "minecraft:podzol",
                "minecraft:spruce_planks"
            },
            Self::Nether => phf_set! {
                "minecraft:netherrack",
                "minecraft:nether_bricks"
            },
            Self::TerracottaWhite => phf_set! {
                "minecraft:white_terracotta"
            },
            Self::TerracottaOrange => phf_set! {
                "minecraft:orange_terracotta"
            },
            Self::TerracottaMagenta => phf_set! {
                "minecraft:magenta_terracotta"
            },
            Self::TerracottaLightBlue => phf_set! {
                "minecraft:light_blue_terracotta"
            },
            Self::TerracottaYellow => phf_set! {
                "minecraft:yellow_terracotta"
            },
            Self::TerracottaLightGreen => phf_set! {
                "minecraft:lime_terracotta"
            },
            Self::TerracottaPink => phf_set! {
                "minecraft:pink_terracotta"
            },
            Self::TerracottaGray => phf_set! {
                "minecraft:gray_terracotta"
            },
            Self::TerracottaLightGray => phf_set! {
                "minecraft:light_gray_terracotta"
            },
            Self::TerracottaCyan => phf_set! {
                "minecraft:cyan_terracotta"
            },
            Self::TerracottaPurple => phf_set! {
                "minecraft:purple_terracotta"
            },
            Self::TerracottaBlue => phf_set! {
                "minecraft:blue_terracotta"
            },
            Self::TerracottaBrown => phf_set! {
                "minecraft:brown_terracotta"
            },
            Self::TerracottaGreen => phf_set! {
                "minecraft:green_terracotta"
            },
            Self::TerracottaRed => phf_set! {
                "minecraft:red_terracotta"
            },
            Self::TerracottaBlack => phf_set! {
                "minecraft:black_terracotta"
            },
            Self::CrimsonNylium => phf_set! {
                "minecraft:crimson_nylium"
            },
            Self::CrimsonStem => phf_set! {
                "minecraft:crimson_stem",
                "minecraft:crimson_planks",
                "minecraft:crimson_slab",
            },
            Self::CrimsonHyphae => phf_set! {
                "minecraft:crimson_hyphae"
            },
            Self::WarpedNylium => phf_set! {
                "minecraft:warped_nylium"
            },
            Self::WarpedStem => phf_set! {
                "minecraft:warped_stem"
            },
            Self::WarpedHyphae => phf_set! {
                "minecraft:warped_hyphae"
            },
            Self::WarpedWartBlock => phf_set! {
                "minecraft:warped_wart_block"
            },
            Self::Deepslate => phf_set! {
                "minecraft:deepslate"
            },
            Self::RawIron => phf_set! {
                "minecraft:raw_iron_block"
            },
            Self::GlowLichen => phf_set! {
                "minecraft:verdant_froglight"
            },
        }
    }

    pub const fn base_hex(self) -> u32 {
        let (r, g, b) = self.base_rgb();
        ((r as u32) << 16) | ((g as u32) << 8) | (b as u32)
    }

    pub fn shades(self) -> [Color; 4] {
        const MULTS: [u16; 4] = [180, 220, 255, 135];
        let base = self.base_rgb();
        let r = base.0 as u16;
        let g = base.1 as u16;
        let b = base.2 as u16;
        MULTS.map(|m| {
            (
                ((r * m) / 255) as u8,
                ((g * m) / 255) as u8,
                ((b * m) / 255) as u8,
            )
        })
    }
}

#[wasm_bindgen]
pub fn get_base_color(color: MapColor) -> u32 {
    color.base_hex()
}

#[wasm_bindgen]
pub fn get_map_color_name(color: MapColor) -> String {
    color.to_string()
}

#[wasm_bindgen]
pub fn get_blocks(color: MapColor) -> Vec<String> {
    color.blocks().iter().map(|s| s.to_string()).collect()
}

#[wasm_bindgen(typescript_custom_section)]
const MapColorBlocks: &'static str = r#"
export type MapColorBlocks = string[][]
"#;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "MapColorBlocks")]
    pub type MapColorBlocks;
}

#[wasm_bindgen]
pub fn get_all_blocks() -> MapColorBlocks {
    let map: Vec<Vec<String>> = MapColor::all()
        .into_iter()
        .map(|color| color.blocks().into_iter().map(|s| s.to_string()).collect())
        .collect();
    serde_wasm_bindgen::to_value(&map).unwrap().into()
}
