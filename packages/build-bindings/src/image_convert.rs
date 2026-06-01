use std::io::{BufRead, Cursor, Seek};

use base64::prelude::*;
use image::{imageops::FilterType, GenericImageView, GrayImage, ImageFormat, ImageReader, Luma};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct ConvertImageOptions {
    pub threshold: u8,
    pub inverted: bool,
    pub scale: f32,
    pub horizontal_mirror: bool,
    pub vertical_mirror: bool,
}

#[wasm_bindgen(js_class = ConvertImageOptions)]
impl ConvertImageOptions {
    pub fn default() -> Self {
        Self {
            threshold: 50,
            inverted: true,
            scale: 1.,
            horizontal_mirror: false,
            vertical_mirror: false,
        }
    }

    pub fn new(
        threshold: Option<u8>,
        inverted: Option<bool>,
        scale: Option<f32>,
        horizontal_mirror: Option<bool>,
        vertical_mirror: Option<bool>,
    ) -> Self {
        let default = Self::default();
        Self {
            threshold: threshold.unwrap_or(default.threshold),
            inverted: inverted.unwrap_or(default.inverted),
            scale: scale.unwrap_or(default.scale),
            horizontal_mirror: horizontal_mirror.unwrap_or(default.horizontal_mirror),
            vertical_mirror: vertical_mirror.unwrap_or(default.vertical_mirror),
        }
    }
}

pub fn compute_preview(shape: &Vec<Vec<u8>>) -> String {
    let height = shape.len();
    let width = shape[0].len();
    let mut image = GrayImage::from_pixel(width as u32, height as u32, Luma([255]));

    for y in 0..height {
        for x in 0..width {
            if shape[y][x] != 0 {
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

pub fn convert_image<D>(
    image_data: D,
    options: ConvertImageOptions,
) -> Result<Vec<Vec<u8>>, JsValue>
where
    D: BufRead + Seek,
{
    let mut image = ImageReader::new(image_data)
        .with_guessed_format()
        .map_err(|err| format!("failed to guess image format : {}", err))?
        .decode()
        .map_err(|err| format!("failed to decode image : {}", err))?;

    if options.scale != 1. {
        let nwidth = (image.width() as f32 * options.scale).round() as u32;
        let nheight = (image.height() as f32 * options.scale).round() as u32;
        image = image.resize(nwidth, nheight, FilterType::Lanczos3)
    }

    if options.horizontal_mirror {
        image = image.fliph();
    }
    if options.vertical_mirror {
        image = image.flipv();
    }

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

    Ok(output)
}
