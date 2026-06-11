use std::{
    collections::{HashMap, HashSet},
    io::{BufRead, Cursor, Seek},
};

use base64::prelude::*;
use image::{
    imageops::FilterType, DynamicImage, GenericImageView, GrayImage, ImageFormat, ImageReader,
    Luma, Rgb, RgbImage,
};
use wasm_bindgen::prelude::*;

use crate::{
    array_utils::{
        count_equal_3d_array, count_not_null_3d_array, get_shape_3d_array, trim_3d_array,
    },
    color_data::{Color, MapColor},
    Build, BuildMetadata, BuildType, ColorImageMetadata, GrayImageMetadata,
};

macro_rules! wasm_struct {
    (
        $(#[$meta:meta])*
        pub struct $name:ident {
            $(pub $field:ident: $ty:ty = $default:expr),* $(,)?
        }
    ) => {
        #[derive(Clone)]
        #[wasm_bindgen(getter_with_clone)]
        $(#[$meta])*
        pub struct $name {
            $(pub $field: $ty,)*
        }

        impl Default for $name {
            fn default() -> Self {
                Self {
                    $($field: $default,)*
                }
            }
        }

        #[wasm_bindgen(js_class = $name)]
        impl $name {
            #[wasm_bindgen(constructor)]
            pub fn new($($field: Option<$ty>),*) -> Self {
                let default = Self::default();
                Self {
                    $($field: $field.unwrap_or(default.$field),)*
                }
            }
        }
    };
}

wasm_struct! {
    #[derive(Copy)]
    pub struct BaseConvertImageOptions {
        pub scale: f32 = 1.,
        pub horizontal_mirror: bool = false,
        pub vertical_mirror: bool = false,
    }
}
wasm_struct! {
    pub struct GrayscaleConvertImageOptions {
        pub threshold: u8 = 50,
        pub inverted: bool = true,
        pub base: BaseConvertImageOptions = BaseConvertImageOptions::default(),
    }
}

wasm_struct! {
    pub struct ColorFlatConvertImageOptions {
        pub available_blocks:Vec<String> = Vec::new(),
        pub base: BaseConvertImageOptions = BaseConvertImageOptions::default(),
    }
}

pub fn compute_color_preview(shape: &Vec<Vec<Vec<u8>>>, palette: &Vec<String>) -> String {
    let usable_colors = get_usable_colors(palette);
    let height = shape[0].len();
    let width = shape[0][0].len();
    let mut image = RgbImage::from_pixel(width as u32, height as u32, Rgb([255, 255, 255]));

    // panic!("{:#?}\n{:#?}", palette, usable_colors);
    let block_to_color: HashMap<String, MapColor> = palette
        .into_iter()
        .filter_map(|block| {
            usable_colors
                .iter()
                .find(|(_, v)| *v == block)
                .map(|(k, v)| (v.to_string(), *k))
        })
        .collect();

    for y in 0..height {
        for x in 0..width {
            if shape[0][y][x] != 0 {
                let block = &palette[shape[0][y][x] as usize];
                let color = block_to_color
                    .get(block)
                    .expect(&format!("no color found for block {}", block));
                let (r, g, b) = color.shades()[1];
                image.put_pixel(x as u32, y as u32, Rgb([r, g, b]));
            }
        }
    }

    let mut bytes = Vec::new();
    image
        .write_to(&mut Cursor::new(&mut bytes), ImageFormat::Png)
        .unwrap();
    let b64 = BASE64_STANDARD.encode(&bytes);
    format!("data:image/png;base64,{b64}")
}

pub fn compute_grayscale_preview(shape: &Vec<Vec<Vec<u8>>>) -> String {
    let height = shape[0].len();
    let width = shape[0][0].len();
    let mut image = GrayImage::from_pixel(width as u32, height as u32, Luma([255]));

    for y in 0..height {
        for x in 0..width {
            if shape[0][y][x] != 0 {
                image.put_pixel(x as u32, y as u32, Luma([0]));
            }
        }
    }

    let mut bytes = Vec::new();
    image
        .write_to(&mut Cursor::new(&mut bytes), ImageFormat::Png)
        .unwrap();
    let b64 = BASE64_STANDARD.encode(&bytes);
    format!("data:image/png;base64,{b64}")
}

pub fn open_image<I>(
    image_data: I,
    base_options: BaseConvertImageOptions,
) -> Result<DynamicImage, JsValue>
where
    I: BufRead + Seek,
{
    let mut image = ImageReader::new(image_data)
        .with_guessed_format()
        .map_err(|err| format!("failed to guess image format : {}", err))?
        .decode()
        .map_err(|err| format!("failed to decode image : {}", err))?;

    if base_options.scale != 1. {
        let nwidth = (image.width() as f32 * base_options.scale).round() as u32;
        let nheight = (image.height() as f32 * base_options.scale).round() as u32;
        image = image.resize(nwidth, nheight, FilterType::CatmullRom)
    }

    if base_options.horizontal_mirror {
        image = image.fliph();
    }
    if base_options.vertical_mirror {
        image = image.flipv();
    }
    Ok(image)
}

pub fn convert_image_grayscale(
    image: DynamicImage,
    options: GrayscaleConvertImageOptions,
) -> Result<Build, JsValue> {
    let width = image.width();
    let height = image.height();

    let mut output = Vec::with_capacity(height as usize);
    for y in 0..height {
        let mut line = Vec::with_capacity(width as usize);
        for x in 0..width {
            let [r, g, b, a] = image.get_pixel(x, y).0;
            if a == 0 {
                line.push(0);
            } else {
                let grayscale = ((r as u16 + g as u16 + b as u16) / 3) as u8;
                if grayscale > options.threshold {
                    if options.inverted {
                        line.push(0);
                    } else {
                        line.push(1);
                    }
                } else {
                    if options.inverted {
                        line.push(1);
                    } else {
                        line.push(0)
                    }
                }
            }
        }
        output.push(line);
    }

    let mut shape = vec![output];
    trim_3d_array(&mut shape, 0);
    let (height, depth, width) = get_shape_3d_array(&shape);
    let block_count = count_not_null_3d_array(&shape, 0) as u32;

    let palette = Vec::new(); // TODO: change that ?;
    let preview = compute_grayscale_preview(&shape);
    Ok(Build {
        shape,
        palette,
        metadata: BuildMetadata {
            r#type: BuildType::GrayImage(GrayImageMetadata { preview }),
            width,
            depth,
            height,
            block_count,
        },
    })
}

pub fn convert_image_color_flat(
    image: DynamicImage,
    options: ColorFlatConvertImageOptions,
) -> Result<Build, JsValue> {
    let usable_colors = get_usable_colors(&options.available_blocks);

    let width = image.width();
    let height = image.height();

    let mut lookup_table: HashMap<Color, MapColor> = HashMap::new();
    let mut output = Vec::with_capacity(height as usize);
    let mut palette = HashSet::with_capacity(usable_colors.len());
    for y in 0..height {
        let mut line = Vec::with_capacity(width as usize);
        for x in 0..width {
            let [r, g, b, a] = image.get_pixel(x, y).0;
            if a == 0 {
                // no need to add None to the palette here because it is manually added later when building the palette vector
                line.push(MapColor::None);
            } else {
                if let Some(cached) = lookup_table.get(&(r, g, b)) {
                    line.push(*cached)
                } else {
                    let c = usable_colors
                        .keys()
                        .min_by_key(|c| {
                            let (r2, g2, b2) = c.shades()[1];
                            let dr = (r as i32 - r2 as i32).pow(2);
                            let dg = (g as i32 - g2 as i32).pow(2);
                            let db = (b as i32 - b2 as i32).pow(2);
                            dr + dg + db
                        })
                        .ok_or(format!("no color found for ({},{},{})", r, g, b))?;
                    lookup_table.insert((r, g, b), *c);
                    line.push(*c);
                    palette.insert(*c);
                }
            }
        }
        output.push(line)
    }

    let mut palette_indices: HashMap<MapColor, usize> = palette
        .iter()
        .enumerate()
        .map(|(i, b)| (*b, i + 1))
        .collect();
    palette_indices.insert(MapColor::None, 0);

    let output: Vec<Vec<u8>> = output
        .into_iter()
        .map(|line| {
            line.into_iter()
                .map(|color| *palette_indices.get(&color).unwrap() as u8)
                .collect()
        })
        .collect();

    let mut shape = vec![output];
    // panic!("{:#?}", shape);
    trim_3d_array(&mut shape, 0);
    let (height, depth, width) = get_shape_3d_array(&shape);
    let block_count = count_not_null_3d_array(&shape, 0) as u32;
    let mut palette: Vec<String> = palette
        .iter()
        .map(|color| {
            usable_colors
                .get(color)
                .expect(&format!(
                    "failed to find a match for color {} in the usable color",
                    color
                ))
                .to_string()
        })
        .collect();
    palette.insert(0, "minecraft:air".to_string());

    let preview = compute_color_preview(&shape, &palette);

    let individual_block_count: HashMap<String, usize> = palette
        .iter()
        .enumerate()
        .skip(1)
        .map(|(i, b)| (b.clone(), count_equal_3d_array(&shape, i as u8)))
        .collect();

    Ok(Build {
        shape,
        palette,
        metadata: BuildMetadata {
            r#type: BuildType::ColorImage(ColorImageMetadata {
                preview,
                individual_block_count,
            }),
            width,
            depth,
            height,
            block_count,
        },
    })
}

/// From a list of blocks, return a map mapping a MapColor Variant to the block from the block list that represent it
fn get_usable_colors(available_blocks: &Vec<String>) -> HashMap<MapColor, &str> {
    MapColor::all()
        .into_iter()
        .filter_map(|variant| {
            let set = variant.blocks();
            available_blocks
                .iter()
                .find(|b| set.contains(b.as_str()))
                .map(|b| (variant, b.as_str()))
        })
        .collect()
}
